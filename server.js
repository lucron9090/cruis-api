const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Session storage
const sessions = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeSessions: sessions.size,
    timestamp: new Date().toISOString()
  });
});

// Step 1: Authenticate with EBSCO and capture Motor cookies
app.post('/api/auth', async (req, res) => {
  const { cardNumber } = req.body;
  
  if (!cardNumber) {
    return res.status(400).json({ error: 'cardNumber is required' });
  }

  let browser;
  try {
    console.log(`\n[AUTH] Starting authentication for card: ${cardNumber}`);
    
    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36');
    
    console.log('[AUTH] Navigating to EBSCO login...');
    
    // Navigate to EBSCO login page (this will redirect through OAuth flow to Motor)
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
            
            console.log('[AUTH] ✓ Extracted credentials:');
            console.log(`  PublicKey: ${credentials.PublicKey}`);
            console.log(`  ApiTokenKey: ${credentials.ApiTokenKey}`);
            console.log(`  Expiration: ${credentials.ApiTokenExpiration}`);
            
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
      // Create session
      const sessionId = uuidv4();
      sessions.set(sessionId, {
        credentials: motorCookies,
        createdAt: new Date(),
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

// Step 2: Proxy Motor API requests
app.all('/api/motor/*', async (req, res) => {
  const motorPath = req.params[0];
  const sessionId = req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.status(401).json({ error: 'x-session-id header is required' });
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  
  // Check expiration
  if (session.expiresAt && new Date() > session.expiresAt) {
    sessions.delete(sessionId);
    return res.status(401).json({ error: 'Session expired' });
  }
  
  const credentials = session.credentials;
  
  let browser;
  try {
    console.log(`\n[PROXY] ${req.method} /api/motor/${motorPath}`);
    console.log(`[PROXY] Session: ${sessionId}`);
    
    // Launch Puppeteer with authenticated session
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36');
    
    // Set cookies
    console.log('[PROXY] Setting Motor cookies...');
    for (const cookie of credentials._cookies) {
      await page.setCookie({
        ...cookie,
        domain: '.motor.com',
        path: '/'
      });
    }
    
    // Navigate to Motor to establish session
    console.log('[PROXY] Establishing Motor session...');
    await page.goto('https://sites.motor.com/m1/', {
      waitUntil: 'networkidle2',
      timeout: 15000
    });
    
    // Build target URL
    const targetUrl = `https://sites.motor.com/${motorPath}`;
    console.log(`[PROXY] Fetching: ${targetUrl}`);
    
    // Execute fetch in browser context
    const result = await page.evaluate(async (url, method, headers, body) => {
      try {
        const fetchOptions = {
          method: method,
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            ...headers
          },
          credentials: 'include'
        };
        
        if (method !== 'GET' && method !== 'HEAD' && body) {
          fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
        }
        
        const response = await fetch(url, fetchOptions);
        const contentType = response.headers.get('content-type') || '';
        
        let data;
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          
          // Try to extract JSON from HTML
          if (contentType.includes('text/html')) {
            // Try multiple extraction strategies for Angular/React apps
            let extracted = null;
            
            // Strategy 1: Look for JSON in script tags with type="application/json"
            const jsonScriptMatch = text.match(/<script[^>]*type=["']application\/json["'][^>]*id=["']([^"']+)["'][^>]*>(.*?)<\/script>/is);
            if (jsonScriptMatch) {
              try {
                extracted = JSON.parse(jsonScriptMatch[2]);
                return { status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers.entries()), data: extracted };
              } catch (e) {}
            }
            
            // Strategy 2: Look for window.__INITIAL_STATE__ or similar patterns
            const windowPatterns = [
              /window\.__INITIAL_STATE__\s*=\s*({.*?});/s,
              /window\.__DATA__\s*=\s*({.*?});/s,
              /window\.initialData\s*=\s*({.*?});/s,
              /window\.APP_STATE\s*=\s*({.*?});/s
            ];
            
            for (const pattern of windowPatterns) {
              const match = text.match(pattern);
              if (match) {
                try {
                  extracted = JSON.parse(match[1]);
                  return { status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers.entries()), data: extracted };
                } catch (e) {}
              }
            }
            
            // Strategy 3: Check if this is an Angular app and suggest using API endpoints
            if (text.includes('ng-version')) {
              // This is an Angular app page, not an API endpoint
              data = {
                error: 'HTML_PAGE_RETURNED',
                message: 'This endpoint returns an HTML page, not JSON. Try using /m1/api/ endpoints instead of /m1/ endpoints.',
                suggestions: [
                  '/m1/api/years',
                  '/m1/api/year/{year}/makes',
                  '/m1/api/year/{year}/make/{make}/models',
                  '/m1/api/source/{source}/{id}/motorvehicles'
                ],
                htmlPreview: text.substring(0, 500) + '...'
              };
            } else {
              // Generic HTML response
              data = {
                error: 'HTML_RESPONSE',
                message: 'Endpoint returned HTML instead of JSON',
                htmlLength: text.length,
                htmlPreview: text.substring(0, 500) + '...'
              };
            }
          } else {
            data = { text };
          }
        }
        
        return {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data
        };
      } catch (error) {
        return {
          status: 500,
          statusText: 'Fetch Error',
          error: error.message,
          data: null
        };
      }
    }, targetUrl, req.method, req.headers, req.body);
    
    await browser.close();
    
    console.log(`[PROXY] Response status: ${result.status}`);
    
    // Return the result
    res.status(result.status).json(result.data);
    
  } catch (error) {
    console.error('[PROXY] Error:', error.message);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({
      error: 'Proxy request failed',
      message: error.message
    });
  }
});

// Delete session
app.delete('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    console.log(`[SESSION] Deleted: ${sessionId}`);
    return res.json({ success: true, message: 'Session deleted' });
  }
  
  return res.status(404).json({ error: 'Session not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Motor API Proxy Server`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\nServer running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST   /api/auth                - Authenticate with EBSCO card`);
  console.log(`  ALL    /api/motor/*             - Proxy Motor API requests`);
  console.log(`  DELETE /api/session/:sessionId  - Delete session`);
  console.log(`  GET    /health                  - Health check`);
  console.log(`\nUsage:`);
  console.log(`  1. Authenticate:`);
  console.log(`     curl -X POST http://localhost:${PORT}/api/auth \\`);
  console.log(`       -H 'Content-Type: application/json' \\`);
  console.log(`       -d '{"cardNumber":"1001600244772"}'`);
  console.log(`\n  2. Use Motor API (with sessionId from step 1):`);
  console.log(`     curl http://localhost:${PORT}/api/motor/m1/vehicles \\`);
  console.log(`       -H 'X-Session-Id: YOUR_SESSION_ID'`);
  console.log(`\n${'='.repeat(60)}\n`);
});
