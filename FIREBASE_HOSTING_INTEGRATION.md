# Integrating into Firebase Hosting

## Simple Approach: Firebase Hosting + Firebase Functions

You can keep your current Express server with minimal changes and deploy it as a Firebase Function alongside your hosted app.

---

## 🚀 Quick Setup (15 minutes)

### Step 1: Initialize Firebase in Your Project

```bash
cd /Users/phobosair/Documents/GitHub/cruis-api

# Initialize Firebase (if not already done)
firebase init

# Select:
# ✓ Functions: Configure a Cloud Functions directory
# ✓ Hosting: Configure files for Firebase Hosting
```

Answer the prompts:
- **Use existing project or create new:** Choose your Firebase project
- **Language:** JavaScript
- **ESLint:** No (or Yes, your choice)
- **Install dependencies:** Yes
- **Public directory:** `public` (you already have this!)
- **Single-page app:** No
- **Set up automatic builds:** No

### Step 2: Move Your Server Code

```bash
# Your current structure
cruis-api/
├── server.js          # Current server
├── public/            # Already hosting-ready!
└── package.json

# After Firebase init
cruis-api/
├── functions/
│   ├── index.js       # Move server.js code here
│   └── package.json   # Firebase Functions dependencies
├── public/            # Stays the same!
├── firebase.json      # Configuration
└── .firebaserc        # Project config
```

### Step 3: Adapt server.js for Firebase Functions

Create `functions/index.js`:

```javascript
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

// Use Firestore for session storage instead of in-memory Map
const db = admin.firestore();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

// Authentication endpoint
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
    await page.goto('https://search.ebscohost.com/login.aspx?authtype=ip,cpid&custid=s5672256&groupid=main&profile=autorepso', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('[AUTH] Waiting for card number input...');
    await page.waitForSelector('input[data-auto="prompt-input"], input#prompt-input', { timeout: 15000 });
    await page.type('input[data-auto="prompt-input"], input#prompt-input', cardNumber);
    
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
        
        const allCookies = await page.cookies();
        const motorDomainCookies = allCookies.filter(c => c.domain.includes('motor.com'));
        
        console.log(`[AUTH] Captured ${motorDomainCookies.length} Motor cookies`);
        
        const authCookie = motorDomainCookies.find(c => c.name === 'AuthUserInfo');
        
        if (authCookie) {
          try {
            const decoded = Buffer.from(authCookie.value, 'base64').toString('utf-8');
            const credentials = JSON.parse(decoded);
            
            console.log('[AUTH] ✓ Extracted credentials');
            
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
      // Create session ID
      const sessionDoc = db.collection('sessions').doc();
      const sessionId = sessionDoc.id;
      
      // Store in Firestore with expiration
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

// Motor API proxy
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
    
    const targetUrl = `https://sites.motor.com/${motorPath}`;
    
    const headers = {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Cookie': credentials._cookieString,
      'Referer': 'https://sites.motor.com/m1/',
      'Origin': 'https://sites.motor.com'
    };
    
    const axiosConfig = {
      method: req.method,
      url: targetUrl,
      headers: headers,
      validateStatus: () => true
    };
    
    if (Object.keys(req.query).length > 0) {
      axiosConfig.params = req.query;
    }
    
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      axiosConfig.data = req.body;
    }
    
    const response = await axios(axiosConfig);
    
    console.log(`[MOTOR API] Response status: ${response.status}`);
    
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
          'Example: /m1/api/year/2024/makes'
        ],
        htmlPreview: htmlPreview + '...'
      });
    }
    
    res.status(response.status).json(response.data);
    
  } catch (error) {
    console.error('[MOTOR API] Error:', error.message);
    res.status(500).json({
      error: 'Motor API request failed',
      message: error.message
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
```

### Step 4: Update functions/package.json

```json
{
  "name": "functions",
  "description": "Motor API proxy Firebase Functions",
  "engines": {
    "node": "18"
  },
  "main": "index.js",
  "dependencies": {
    "firebase-functions": "^4.5.0",
    "firebase-admin": "^11.11.0",
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "axios": "^1.12.2",
    "puppeteer-core": "^21.0.0",
    "@sparticuz/chromium": "^119.0.0"
  }
}
```

### Step 5: Configure firebase.json

```json
{
  "functions": {
    "source": "functions"
  },
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      }
    ]
  }
}
```

This configuration:
- Serves your `public/` directory files (index.html, swagger-test.html, etc.)
- Routes all `/api/**` requests to your Firebase Function

### Step 6: Update Your Frontend Code

Change API URLs in your HTML files:

**Before (local):**
```javascript
fetch('http://localhost:3001/api/auth', {...})
fetch('http://localhost:3001/api/motor/m1/api/years', {...})
```

**After (Firebase):**
```javascript
fetch('/api/auth', {...})  // Relative URL works!
fetch('/api/motor/m1/api/years', {...})
```

Or use the full Firebase URL:
```javascript
fetch('https://YOUR-PROJECT.web.app/api/auth', {...})
```

### Step 7: Deploy to Firebase

```bash
# Install dependencies
cd functions
npm install

# Deploy everything
cd ..
firebase deploy

# Or deploy separately
firebase deploy --only hosting  # Just the website
firebase deploy --only functions # Just the API
```

---

## 📁 Final Directory Structure

```
cruis-api/
├── functions/
│   ├── index.js                    # Your API (adapted from server.js)
│   ├── package.json                # Firebase Functions dependencies
│   └── node_modules/
│
├── public/                         # Your hosting files
│   ├── index.html                  # Landing page
│   ├── swagger-test.html           # Test interface
│   ├── test.html                   # Advanced interface
│   ├── swagger.json                # API spec
│   └── (other static files)
│
├── firebase.json                   # Firebase config
├── .firebaserc                     # Project settings
├── server.js                       # Keep for local dev
├── package.json                    # Keep for local dev
└── README.md
```

---

## 🔧 Local Development

You can still run locally during development:

**Option 1: Use your existing server**
```bash
npm start  # Uses server.js on port 3001
```

**Option 2: Use Firebase Emulator**
```bash
firebase emulators:start  # Emulates hosting + functions
```

---

## 🌐 After Deployment

### Your URLs will be:

**Hosting (Static Files):**
- `https://YOUR-PROJECT.web.app/` → index.html
- `https://YOUR-PROJECT.web.app/swagger-test.html` → Test interface

**API Endpoints:**
- `https://YOUR-PROJECT.web.app/api/auth` → Authentication
- `https://YOUR-PROJECT.web.app/api/motor/m1/api/years` → Motor API
- `https://YOUR-PROJECT.web.app/api/health` → Health check

---

## 💰 Cost Considerations

### Firebase Hosting (Free!)
- Your static files (HTML, CSS, JS) are **FREE** on Spark plan
- 10GB storage, 360MB/day bandwidth

### Firebase Functions (Pay as you go)
- **Authentication:** ~$0.10-0.30 per call (Puppeteer is heavy)
- **Motor API:** ~$0.01 per call (simple HTTP proxy)
- **Free tier:** 2M invocations/month, 400k GB-seconds

### Firestore (Sessions)
- **Read/Write:** 50k reads, 20k writes per day FREE
- **Storage:** 1GB FREE
- Perfect for session storage

**Estimated monthly cost for moderate use:**
- 100 authentications: ~$10-30
- 10,000 Motor API calls: ~$5-10
- Total: ~$15-40/month

---

## ⚡ Performance Tips

### 1. Keep Functions Warm
Add a Cloud Scheduler job to ping your function every 5 minutes:
```bash
# Prevents cold starts
curl https://YOUR-PROJECT.web.app/api/health
```

### 2. Cache Sessions
Sessions stored in Firestore persist across function invocations.

### 3. Optimize Puppeteer
The `@sparticuz/chromium` package is optimized for serverless.

### 4. Use CDN
Firebase Hosting automatically uses Google's global CDN.

---

## 🚀 Quick Commands

```bash
# Initialize Firebase
firebase init

# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions

# View logs
firebase functions:log

# Test locally
firebase emulators:start

# View your site
firebase open hosting:site
```

---

## ✅ Advantages of This Approach

1. **Simple Integration** - Keep most of your code as-is
2. **One Domain** - API and frontend on same domain (no CORS issues!)
3. **Auto HTTPS** - Firebase provides SSL automatically
4. **Global CDN** - Fast loading worldwide
5. **Auto Scaling** - Handles traffic spikes
6. **Easy Deploy** - Single command deployment
7. **Keep Local Dev** - Still use server.js locally

---

## 📝 Migration Checklist

- [ ] Run `firebase init` in your project
- [ ] Create `functions/index.js` with adapted code
- [ ] Create `functions/package.json` with dependencies
- [ ] Configure `firebase.json` with rewrites
- [ ] Update frontend URLs to use `/api/` prefix
- [ ] Test locally with `firebase emulators:start`
- [ ] Deploy with `firebase deploy`
- [ ] Test live site
- [ ] Update DNS if using custom domain

---

Would you like me to generate the complete Firebase Functions code for you to drop into your project?
