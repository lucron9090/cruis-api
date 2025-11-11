const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const playwrightAWSLambda = require('playwright-aws-lambda');

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Server-side session - ONE session for ALL clients
let serverSession = {
  credentials: null,
  createdAt: null,
  expiresAt: null,
  sessionId: null,
  isAuthenticating: false
};

const LIBRARY_CARD = '1001600244772';

// PLAYWRIGHT AUTHENTICATION (converted from original Puppeteer logic)
async function performAuthentication() {
  if (serverSession.isAuthenticating) {
    console.log('Authentication already in progress, waiting...');
    while (serverSession.isAuthenticating) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return serverSession.credentials;
  }

  serverSession.isAuthenticating = true;

  try {
    // Check if we have valid credentials
    if (serverSession.credentials && serverSession.expiresAt && new Date() < serverSession.expiresAt) {
      console.log(`[AUTH] Using existing session: ${serverSession.sessionId}`);
      serverSession.isAuthenticating = false;
      return serverSession.credentials;
    }

    console.log('[AUTH] Session expired or missing, authenticating...');

    let browser;
    try {
      const cardNumber = LIBRARY_CARD;
      const correlationId = uuidv4();
      console.log(`\n[AUTH] Starting authentication for card: ${cardNumber} (correlation=${correlationId})`);
      
      let page;
      
      console.log('[AUTH] Using playwright-aws-lambda for Firebase...');
      browser = await playwrightAWSLambda.launchChromium();
      page = await browser.newPage();
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
      });
      
      console.log('[AUTH] Navigating to EBSCO login...');
      
      await page.goto('https://search.ebscohost.com/login.aspx?authtype=ip,cpid&custid=s5672256&groupid=main&profile=autorepso', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      console.log('[AUTH] Waiting for card number input...');
      
      const inputSelector = 'input[data-auto="prompt-input"], input#prompt-input';
      await page.waitForSelector(inputSelector, { timeout: 15000 });
      await page.fill(inputSelector, cardNumber);
      
      console.log('[AUTH] Submitting card number...');
      
      await page.click('button[data-auto="login-submit-btn"]');
      
      console.log('[AUTH] Waiting for redirect to Motor...');
      
      let motorCookies = null;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts && !motorCookies) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
        const currentUrl = page.url();
        console.log(`[AUTH] Attempt ${attempts}: ${currentUrl.substring(0, 60)}...`);
        
        if (currentUrl.includes('motor.com')) {
          console.log('[AUTH] ✓ Reached Motor domain!');
          
          const allCookies = await page.context().cookies();
          const motorDomainCookies = allCookies.filter(c => c.domain.includes('motor.com'));
          
          console.log(`[AUTH] Captured ${motorDomainCookies.length} Motor cookies`);
          
          const authCookie = motorDomainCookies.find(c => c.name === 'AuthUserInfo');
          
          if (authCookie) {
            try {
              const decoded = Buffer.from(authCookie.value, 'base64').toString('utf-8');
              const credentials = JSON.parse(decoded);
              
              console.log('[AUTH] ✓ Extracted credentials:');
              console.log(`  PublicKey: ${credentials.PublicKey}`);
              console.log(`  ApiTokenKey: ${credentials.ApiTokenKey}`);
              console.log(`  Expiration: ${credentials.ApiTokenExpiration}`);
              
              const cookieString = motorDomainCookies
                .map(c => `${c.name}=${c.value}`)
                .join('; ');
              
              motorCookies = {
                ...credentials,
                _cookieString: cookieString,
                _cookies: motorDomainCookies
              };
              
            } catch (e) {
              console.error('[AUTH] Failed to decode AuthUserInfo:', e.message);
            }
          }
        }
      }
      
      await browser.close();
      
      if (motorCookies) {
        serverSession.credentials = motorCookies;
        serverSession.createdAt = new Date();
        serverSession.expiresAt = new Date(motorCookies.ApiTokenExpiration || Date.now() + 24 * 60 * 60 * 1000);
        serverSession.sessionId = uuidv4(); // Generate a session ID for the server-side session
        console.log(`[AUTH] ✓ Server-side session established: ${serverSession.sessionId}`);
        serverSession.isAuthenticating = false;
        return serverSession.credentials;
      } else {
        console.error('[AUTH] Authentication timeout: Failed to reach Motor domain or extract credentials');
        serverSession.isAuthenticating = false;
        return null;
      }
      
    } catch (error) {
      console.error('[AUTH] Error during authentication:', error.message);
      if (browser) {
        await browser.close();
      }
      serverSession.isAuthenticating = false;
      return null;
    }
  } catch (error) {
    console.error('[AUTH] Authentication failed:', error.message);
    serverSession.isAuthenticating = false;
    return null;
  }
}

// Ensure authentication before making API calls
async function ensureAuthenticated() {
  const credentials = await performAuthentication();
  if (!credentials) {
    throw new Error('Authentication failed');
  }
  return credentials;
}

// Health check endpoint
app.get('/health', (req, res) => {
  const isAuthenticated = serverSession.credentials && 
                         serverSession.expiresAt && 
                         new Date() < serverSession.expiresAt;
  
  res.json({
    status: 'ok',
    authenticated: isAuthenticated,
    sessionId: serverSession.sessionId,
    expiresAt: serverSession.expiresAt,
    timestamp: new Date().toISOString()
  });
});

// Motor API proxy endpoint
app.all('/api/motor-proxy/*', async (req, res) => {
  try {
    console.log(`[PROXY] ${req.method} ${req.url}`);
    
    // Ensure we're authenticated
    const credentials = await ensureAuthenticated();
    
    // Extract the target URL (remove /api/motor-proxy prefix)
    const targetPath = req.url.replace('/api/motor-proxy', '');
    const targetUrl = `https://sites.motor.com/m1${targetPath}`;
    
    console.log(`[PROXY] Forwarding to: ${targetUrl}`);
    
    // Check if this is an image/binary request based on path
    const isImageRequest = targetPath.includes('/graphic/') || 
                          targetPath.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/i);
    
    // Prepare headers
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'Accept': isImageRequest ? 'image/*, */*' : 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Cookie': credentials._cookieString,
      'X-Requested-With': 'XMLHttpRequest'
    };
    
    // Copy relevant headers from the original request
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }
    
    // Make the request to Motor API
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: headers,
      data: req.body,
      timeout: 30000,
      responseType: isImageRequest ? 'arraybuffer' : 'json', // Handle binary data for images
      validateStatus: () => true // Don't throw on HTTP error status codes
    });
    
    console.log(`[PROXY] Response: ${response.status} ${response.statusText} (${isImageRequest ? 'binary' : 'json'})`);
    
    // Forward the response with proper CORS headers
    res.status(response.status);
    
    // Copy safe headers from response
    const safeHeaders = ['content-type', 'content-encoding', 'content-length', 'cache-control', 'etag', 'last-modified'];
    safeHeaders.forEach(header => {
      if (response.headers[header]) {
        res.set(header, response.headers[header]);
      }
    });
    
    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    // Send binary data as buffer for images, otherwise as JSON
    if (isImageRequest) {
      res.send(Buffer.from(response.data));
    } else {
      res.send(response.data);
    }
    
  } catch (error) {
    console.error('[PROXY] Error:', error.message);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message
    });
  }
});

// Export the Express app as a Firebase Function
exports.motorproxy = onRequest({
  timeoutSeconds: 60,
  memory: '512MiB'
}, app);