const express = require('express');
const cors = require('cors');
const axios = require('axios');
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

  // correlation id: prefer incoming header (many possible variants), else generate
  function extractCorrelationId(req) {
    const hdrs = req.headers || {};
    const keys = Object.keys(hdrs);
    for (const k of keys) {
      const key = k.toLowerCase();
      if (key === 'x-correlation-id' || key === 'x-correlationid' || key === 'x-correlation' || key === 'xcorrelationid' ) return hdrs[k];
    }
    return null;
  }

  let browser;
  try {
    const incomingCorrelation = extractCorrelationId(req);
    const correlationId = incomingCorrelation || uuidv4();
    console.log(`\n[AUTH] Starting authentication for card: ${cardNumber} (correlation=${correlationId})`);
    
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
      console.log(`[AUTH] ✓ Session created: ${sessionId} (correlation=${correlationId})`);
      // Echo correlation back and also set the Motor-expected header when making further requests
      res.setHeader('X-Correlation-Id', correlationId);
      return res.json({
        success: true,
        sessionId,
        correlationId,
        credentials: {
          PublicKey: motorCookies.PublicKey,
          ApiTokenKey: motorCookies.ApiTokenKey,
          ApiTokenExpiration: motorCookies.ApiTokenExpiration,
          UserName: motorCookies.UserName,
          Subscriptions: motorCookies.Subscriptions
        }
      });
    } else {
      const failureCorrelation = correlationId || uuidv4();
      res.setHeader('X-Correlation-Id', failureCorrelation);
      return res.status(500).json({
        error: 'Authentication timeout',
        correlationId: failureCorrelation,
        message: 'Failed to reach Motor domain or extract credentials'
      });
    }
    
  } catch (error) {
    console.error('[AUTH] Error:', error.message);
    if (browser) {
      await browser.close();
    }
    const failureCorrelation = uuidv4();
    res.setHeader('X-Correlation-Id', failureCorrelation);
    return res.status(500).json({
      error: 'Authentication failed',
      correlationId: failureCorrelation,
      message: error.message
    });
  }
});

// Step 2: Proxy Motor M1 API requests using direct HTTP calls
// Helper to perform Motor proxy request (used by multiple routes)
async function performMotorProxy(req, res, motorPath, explicitSessionId) {
  // Determine session id: explicit param takes precedence, then header, then query
  const sessionId = explicitSessionId || req.headers['x-session-id'] || req.query.session;
  if (!sessionId) {
    return res.status(401).json({ error: 'x-session-id header or ?session= is required' });
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

  try {
    console.log(`\n[MOTOR M1 API] ${req.method} /api/motor/${motorPath}`);
    console.log(`[MOTOR M1 API] Session: ${sessionId}`);

    // Build target URL - always use sites.motor.com with m1 paths
    const targetUrl = `https://sites.motor.com/${motorPath}`;
    console.log(`[MOTOR M1 API] Requesting: ${targetUrl}`);

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
    const skipHeaders = ['host', 'cookie', 'x-session-id', 'content-length', 'connection', 'session'];
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

    // If the upstream returned HTML, forward it directly so callers can view the page
    // (useful for endpoints that intentionally return HTML or when diagnosing redirects/login pages)
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
      console.log('[MOTOR API] Forwarding HTML response from upstream');
      // Preserve upstream status and content-type
      res.setHeader('Content-Type', response.headers['content-type'] || 'text/html');
      if (typeof response.data === 'string' || Buffer.isBuffer(response.data)) {
        return res.status(response.status).send(response.data);
      }
      // Fallback: stringify non-string bodies
      return res.status(response.status).send(String(response.data));
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
}

// Helper to perform Motor V1 API proxy request
async function performMotorProxyV1(req, res, motorPath, explicitSessionId) {
  // Determine session id: explicit param takes precedence, then header, then query
  const sessionId = explicitSessionId || req.headers['x-session-id'] || req.query.session;
  if (!sessionId) {
    return res.status(401).json({ error: 'x-session-id header or ?session= is required' });
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

  try {
    console.log(`\n[MOTOR V1 API] ${req.method} /api/motorv1/${motorPath}`);
    console.log(`[MOTOR V1 API] Session: ${sessionId}`);

    // Build target URL - always use api.motor.com/v1 paths
    const targetUrl = `https://api.motor.com/v1/${motorPath}`;
    console.log(`[MOTOR V1 API] Requesting: ${targetUrl}`);

    // Prepare headers with Motor API authentication
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'Cookie': credentials._cookieString,
      'Referer': 'https://api.motor.com/',
      'Origin': 'https://api.motor.com'
    };

    // Add any custom headers from the request (except host, cookie, etc)
    const skipHeaders = ['host', 'cookie', 'x-session-id', 'content-length', 'connection', 'session'];
    for (const [key, value] of Object.entries(req.headers)) {
      if (!skipHeaders.includes(key.toLowerCase())) {
        headers[key] = value;
      }
    }

    console.log(`[MOTOR V1 API] Using credentials:`, {
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

    console.log(`[MOTOR V1 API] Response status: ${response.status}`);
    console.log(`[MOTOR V1 API] Content-Type: ${response.headers['content-type']}`);

    // If the upstream returned HTML, forward it directly
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
      console.log('[MOTOR V1 API] Forwarding HTML response from upstream');
      res.setHeader('Content-Type', response.headers['content-type'] || 'text/html');
      if (typeof response.data === 'string' || Buffer.isBuffer(response.data)) {
        return res.status(response.status).send(response.data);
      }
      return res.status(response.status).send(String(response.data));
    }

    // Forward the response
    res.status(response.status).json(response.data);

  } catch (error) {
    console.error('[MOTOR V1 API] Error:', error.message);
    res.status(500).json({
      error: 'Motor V1 API request failed',
      message: error.message,
      details: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : undefined
    });
  }
}

// Route: support query param ?session= on existing path
app.all('/api/motor/*', async (req, res) => {
  const motorPath = req.params[0];
  return performMotorProxy(req, res, motorPath, null);
});

// Shortcut route: pass session id in URL path
app.all('/api/motor-session/:sessionId/*', async (req, res) => {
  const motorPath = req.params[0];
  const sessionId = req.params.sessionId;
  return performMotorProxy(req, res, motorPath, sessionId);
});

// V1 API Routes: api.motor.com/v1
app.all('/api/motorv1/*', async (req, res) => {
  const motorPath = req.params[0];
  return performMotorProxyV1(req, res, motorPath);
});

app.all('/api/motorv1-session/:sessionId/*', async (req, res) => {
  const motorPath = req.params[0];
  const sessionId = req.params.sessionId;
  return performMotorProxyV1(req, res, motorPath, sessionId);
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
  console.log(`\nArchitecture:`);
  console.log(`  ✓ Stage 1: EBSCO auth uses Puppeteer (automated browser)`);
  console.log(`  ✓ Stage 2: Motor API uses direct HTTP (fast & efficient)`);
  console.log(`\nEndpoints:`);
  console.log(`  POST   /api/auth                - Authenticate via EBSCO (Puppeteer)`);
  console.log(`  ALL    /api/motor/*             - Motor M1 API proxy (sites.motor.com)`);
  console.log(`  ALL    /api/motorv1/*           - Motor V1 API proxy (api.motor.com/v1)`);
  console.log(`  DELETE /api/session/:sessionId  - Delete session`);
  console.log(`  GET    /health                  - Health check`);
  console.log(`\nUsage:`);
  console.log(`  1. Authenticate (uses Puppeteer for EBSCO OAuth):`);
  console.log(`     curl -X POST http://localhost:${PORT}/api/auth \\`);
  console.log(`       -H 'Content-Type: application/json' \\`);
  console.log(`       -d '{"cardNumber":"1001600244772"}'`);
  console.log(`\n  2. Call Motor M1 API (direct HTTP with session):`);
  console.log(`     curl http://localhost:${PORT}/api/motor/m1/api/years \\`);
  console.log(`       -H 'X-Session-Id: YOUR_SESSION_ID'`);
  console.log(`\n  3. Call Motor V1 API (direct HTTP with session):`);
  console.log(`     curl http://localhost:${PORT}/api/motorv1/HelloWorld \\`);
  console.log(`       -H 'X-Session-Id: YOUR_SESSION_ID'`);
  console.log(`\nWeb Interfaces:`);
  console.log(`  M1 API: http://localhost:${PORT}/test.html`);
  console.log(`  V1 API: http://localhost:${PORT}/test-v1.html`);
  console.log(`${'='.repeat(60)}\n`);
});
