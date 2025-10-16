const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Use Firestore for session storage
const db = admin.firestore();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

// Step 1: Authenticate with EBSCO and capture Motor cookies
app.post('/auth', async (req, res) => {
  const { cardNumber } = req.body;
  
  if (!cardNumber) {
    return res.status(400).json({ error: 'cardNumber is required' });
  }

  let browser;
  try {
    console.log(`[AUTH] Starting authentication for card: ${cardNumber}`);
    
    // Launch Puppeteer with Chromium for serverless
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36');
    
    console.log('[AUTH] Navigating to EBSCO login...');
    
    // Navigate to EBSCO login page
    await page.goto('https://search.ebscohost.com/login.aspx?authtype=ip,cpid&custid=s5672256&groupid=main&profile=autorepso', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('[AUTH] Waiting for card number input...');
    
    // Wait for and fill card number input
    await page.waitForSelector('input[data-auto="prompt-input"], input#prompt-input', { timeout: 15000 });
    await page.type('input[data-auto="prompt-input"], input#prompt-input', cardNumber);
    
    console.log('[AUTH] Submitting card number...');
    
    // Submit form
    await page.click('button[data-auto="login-submit-btn"]');
    
    console.log('[AUTH] Waiting for redirect to Motor...');
    
    // Wait for navigation to Motor domain
    let motorCookies = null;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts && !motorCookies) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      const currentUrl = page.url();
      console.log(`[AUTH] Attempt ${attempts}: ${currentUrl.substring(0, 60)}...`);
      
      // Check if we've reached Motor
      if (currentUrl.includes('motor.com')) {
        console.log('[AUTH] ✓ Reached Motor domain!');
        
        // Get all cookies
        const allCookies = await page.cookies();
        const motorDomainCookies = allCookies.filter(c => c.domain.includes('motor.com'));
        
        console.log(`[AUTH] Captured ${motorDomainCookies.length} Motor cookies`);
        
        // Find AuthUserInfo cookie
        const authCookie = motorDomainCookies.find(c => c.name === 'AuthUserInfo');
        
        if (authCookie) {
          try {
            // Decode AuthUserInfo
            const decoded = Buffer.from(authCookie.value, 'base64').toString('utf-8');
            const credentials = JSON.parse(decoded);
            
            console.log('[AUTH] ✓ Extracted credentials');
            
            // Store all cookies as a cookie string
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
      // Create session in Firestore
      const sessionDoc = db.collection('sessions').doc();
      const sessionId = sessionDoc.id;
      
      await sessionDoc.set({
        credentials: motorCookies,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(motorCookies.ApiTokenExpiration || Date.now() + 24 * 60 * 60 * 1000)
      });
      
      console.log(`[AUTH] ✓ Session created: ${sessionId}`);
      
      return res.json({
        success: true,
        sessionId,
        credentials: {
          PublicKey: motorCookies.PublicKey,
          ApiTokenKey: motorCookies.ApiTokenKey,
          ApiTokenExpiration: motorCookies.ApiTokenExpiration,
          UserName: motorCookies.UserName,
          Subscriptions: motorCookies.Subscriptions
        }
      });
    } else {
      return res.status(500).json({
        error: 'Authentication timeout',
        message: 'Failed to reach Motor domain or extract credentials'
      });
    }
    
  } catch (error) {
    console.error('[AUTH] Error:', error.message);
    if (browser) {
      await browser.close();
    }
    return res.status(500).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
});

// Step 2: Proxy Motor API requests using direct HTTP calls
app.all('/motor/*', async (req, res) => {
  const motorPath = req.params[0];
  const sessionId = req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.status(401).json({ error: 'x-session-id header is required' });
  }
  
  try {
    // Get session from Firestore
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    const session = sessionDoc.data();
    
    // Check expiration
    if (session.expiresAt && new Date() > session.expiresAt.toDate()) {
      await sessionDoc.ref.delete();
      return res.status(401).json({ error: 'Session expired' });
    }
    
    const credentials = session.credentials;
    
    console.log(`[MOTOR API] ${req.method} /motor/${motorPath}`);
    console.log(`[MOTOR API] Session: ${sessionId}`);
    
    // Build target URL - direct to Motor API
    const targetUrl = `https://sites.motor.com/${motorPath}`;
    console.log(`[MOTOR API] Requesting: ${targetUrl}`);
    
    // Prepare headers with Motor API authentication
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'Cookie': credentials._cookieString,
      'Referer': 'https://sites.motor.com/m1/',
      'Origin': 'https://sites.motor.com'
    };
    
    // Add any custom headers from the request (except host, cookie, etc)
    const skipHeaders = ['host', 'cookie', 'x-session-id', 'content-length', 'connection'];
    for (const [key, value] of Object.entries(req.headers)) {
      if (!skipHeaders.includes(key.toLowerCase())) {
        headers[key] = value;
      }
    }
    
    console.log(`[MOTOR API] Using credentials:`, {
      PublicKey: credentials.PublicKey,
      ApiTokenKey: credentials.ApiTokenKey
    });
    
    // Make the HTTP request
    const axiosConfig = {
      method: req.method,
      url: targetUrl,
      headers: headers,
      validateStatus: () => true // Accept any status code
    };
    
    // Add query parameters if any
    if (Object.keys(req.query).length > 0) {
      axiosConfig.params = req.query;
    }
    
    // Add body for non-GET requests
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      axiosConfig.data = req.body;
    }
    
    const response = await axios(axiosConfig);
    
    console.log(`[MOTOR API] Response status: ${response.status}`);
    console.log(`[MOTOR API] Content-Type: ${response.headers['content-type']}`);
    
    // Check if response is HTML (indicates wrong endpoint or session issue)
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
      const htmlPreview = typeof response.data === 'string' 
        ? response.data.substring(0, 500) 
        : JSON.stringify(response.data).substring(0, 500);
      
      return res.status(400).json({
        error: 'HTML_RESPONSE',
        message: 'Motor API returned HTML instead of JSON.',
        suggestions: [
          'Use /m1/api/ endpoints for JSON responses',
          'Example: /m1/api/years',
          'Example: /m1/api/year/2024/makes',
          'Example: /m1/api/year/2024/make/ACURA/models'
        ],
        htmlPreview: htmlPreview + '...'
      });
    }
    
    // Forward the response
    res.status(response.status).json(response.data);
    
  } catch (error) {
    console.error('[MOTOR API] Error:', error.message);
    res.status(500).json({
      error: 'Motor API request failed',
      message: error.message,
      details: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : undefined
    });
  }
});

// Delete session
app.delete('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  
  try {
    await db.collection('sessions').doc(sessionId).delete();
    console.log(`[SESSION] Deleted: ${sessionId}`);
    return res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Export the Express app as a Firebase Function
exports.api = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB'
  })
  .https
  .onRequest(app);
