const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication route - uses EBSCO -> Motor flow via Puppeteer
app.post('/auth', async (req, res) => {
  const { cardNumber } = req.body;
  if (!cardNumber) return res.status(400).json({ error: 'cardNumber is required' });

  // correlation id extraction: accept multiple header variants
  function extractCorrelationId(req) {
    const hdrs = req.headers || {};
    const keys = Object.keys(hdrs);
    for (const k of keys) {
      const key = k.toLowerCase();
      if (key === 'x-correlation-id' || key === 'x-correlationid' || key === 'x-correlation' || key === 'xcorrelationid') return hdrs[k];
    }
    return null;
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0');

    await page.goto('https://search.ebscohost.com/login.aspx?authtype=ip,cpid&custid=s5672256&groupid=main&profile=autorepso', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('input[data-auto="prompt-input"], input#prompt-input', { timeout: 15000 });
    await page.type('input[data-auto="prompt-input"], input#prompt-input', cardNumber);
    await page.click('button[data-auto="login-submit-btn"]');

    let motorCookies = null;
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts && !motorCookies) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;
      const currentUrl = page.url();
      if (currentUrl.includes('motor.com')) {
        const allCookies = await page.cookies();
        const motorDomainCookies = allCookies.filter(c => c.domain.includes('motor.com'));
        const authCookie = motorDomainCookies.find(c => c.name === 'AuthUserInfo');
        if (authCookie) {
          try {
            const decoded = Buffer.from(authCookie.value, 'base64').toString('utf-8');
            const credentials = JSON.parse(decoded);
            const cookieString = motorDomainCookies.map(c => `${c.name}=${c.value}`).join('; ');
            motorCookies = { ...credentials, _cookieString: cookieString, _cookies: motorDomainCookies };
          } catch (e) {
            // ignore parse errors and continue waiting
          }
        }
      }
    }

    if (browser) await browser.close();

    if (!motorCookies) {
      const failureCorrelation = extractCorrelationId(req) || require('uuid').v4();
      res.setHeader('X-Correlation-Id', failureCorrelation);
      return res.status(500).json({ error: 'Authentication timeout', correlationId: failureCorrelation });
    }

    const sessionDoc = db.collection('sessions').doc();
    const sessionId = sessionDoc.id;
    await sessionDoc.set({
      credentials: motorCookies,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(motorCookies.ApiTokenExpiration || Date.now() + 24 * 60 * 60 * 1000)
    });

    const corr = extractCorrelationId(req) || require('uuid').v4();
    res.setHeader('X-Correlation-Id', corr);
    return res.json({ success: true, sessionId, correlationId: corr, credentials: { PublicKey: motorCookies.PublicKey, ApiTokenKey: motorCookies.ApiTokenKey } });

  } catch (error) {
    if (browser) await browser.close();
    console.error('[AUTH] Error:', error.message);
    const correlationId = require('uuid').v4();
    res.setHeader('X-Correlation-Id', correlationId);
    return res.status(500).json({ error: 'Authentication failed', correlationId, message: error.message });
  }
});

// Helper: perform motor proxy using Firestore session
async function performMotorProxyFirebase(req, res, motorPath, explicitSessionId) {
  try {
    const sessionId = explicitSessionId || req.headers['x-session-id'] || req.query.session;
    if (!sessionId) return res.status(401).json({ error: 'x-session-id header or ?session= is required' });

    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    if (!sessionDoc.exists) return res.status(401).json({ error: 'Invalid or expired session' });
    const session = sessionDoc.data();

    // If expiresAt is a Firestore timestamp, convert; otherwise, if Date, compare directly
    const expiresAt = session.expiresAt && session.expiresAt.toDate ? session.expiresAt.toDate() : session.expiresAt;
    if (expiresAt && new Date() > expiresAt) {
      await sessionDoc.ref.delete();
      return res.status(401).json({ error: 'Session expired' });
    }

    const credentials = session.credentials;

    console.log(`[MOTOR API] ${req.method} /motor/${motorPath}`);
    console.log(`[MOTOR API] Session: ${sessionId}`);

    // Always use sites.motor.com with m1 paths
    const targetUrl = `https://sites.motor.com/${motorPath}`;

    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
      'Cookie': credentials._cookieString,
      'Referer': 'https://sites.motor.com/m1/',
      'Origin': 'https://sites.motor.com'
    };

    const skipHeaders = ['host', 'cookie', 'x-session-id', 'content-length', 'connection', 'session'];
    for (const [key, value] of Object.entries(req.headers)) {
      if (!skipHeaders.includes(key.toLowerCase())) headers[key] = value;
    }

    const axiosConfig = {
      method: req.method,
      url: targetUrl,
      headers,
      validateStatus: () => true
    };

    if (Object.keys(req.query || {}).length > 0) axiosConfig.params = req.query;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) axiosConfig.data = req.body;

    const response = await axios(axiosConfig);

    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('text/html')) {
      console.log('[MOTOR API] Forwarding HTML response from upstream');
      res.setHeader('Content-Type', response.headers['content-type'] || 'text/html');
      if (typeof response.data === 'string' || Buffer.isBuffer(response.data)) {
        return res.status(response.status).send(response.data);
      }
      return res.status(response.status).send(String(response.data));
    }

    return res.status(response.status).json(response.data);

  } catch (error) {
    console.error('[MOTOR API] Error:', error && error.message ? error.message : error);
    return res.status(500).json({ error: 'Motor API request failed', message: error && error.message ? error.message : String(error) });
  }
}

// Route: proxy using query/header session
app.all('/motor/*', async (req, res) => {
  const motorPath = req.params[0];
  return performMotorProxyFirebase(req, res, motorPath, null);
});

// Route: pass session id in URL
app.all('/motor-session/:sessionId/*', async (req, res) => {
  const motorPath = req.params[0];
  const sessionId = req.params.sessionId;
  return performMotorProxyFirebase(req, res, motorPath, sessionId);
});

// Delete session
app.delete('/session/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    await db.collection('sessions').doc(sessionId).delete();
    console.log(`[SESSION] Deleted: ${sessionId}`);
    return res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    console.error('[SESSION] Delete error:', error && error.message ? error.message : error);
    return res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Export the Express app as a Firebase Function
exports.api = functions
  .runWith({ timeoutSeconds: 540, memory: '2GB' })
  .https.onRequest(app);
