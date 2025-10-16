# Firebase Functions Conversion Guide

## Overview

Yes, this Express server **can be converted to Firebase Functions**, but there are important considerations due to Puppeteer usage.

---

## 🚨 Critical Considerations

### 1. Puppeteer in Firebase Functions

**Challenge:** Puppeteer requires a Chromium binary, which has special requirements in serverless environments.

**Solutions:**

#### Option A: Use Firebase Functions 2nd Gen + puppeteer-core (Recommended)
```javascript
// Use puppeteer-core with @sparticuz/chromium
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const browser = await puppeteer.launch({
  args: chromium.args,
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});
```

**Requirements:**
- Firebase Functions 2nd Generation
- 2GB+ memory allocation
- 540s timeout (9 minutes)
- Node.js 18 or higher

#### Option B: Use Separate Service for Authentication
```
Firebase Functions (Motor API proxy)
         ↓
    Cloud Run (Puppeteer auth)
         ↓
     Return credentials
```

Split architecture:
- **Firebase Functions:** Handle Motor API calls (fast, cheap)
- **Cloud Run:** Handle Puppeteer authentication (flexible, more resources)

#### Option C: Pre-authenticate Externally
- Run authentication locally or on a separate server
- Store credentials in Firebase Firestore
- Firebase Functions only handle Motor API proxying

---

## 📦 Conversion Options

### Option 1: Full Firebase Functions (With Puppeteer)

**Best for:** All-in-one deployment

**Limitations:**
- Higher cold start time (~10-15 seconds)
- Higher memory usage (2GB minimum)
- More expensive per invocation
- Timeout limits (540s max)

**Estimated Cost:**
- ~$0.10-0.30 per authentication
- ~$0.01 per Motor API call

### Option 2: Hybrid (Cloud Run + Firebase Functions)

**Best for:** Production use with high traffic

**Benefits:**
- Cloud Run handles Puppeteer (no timeout limits)
- Firebase Functions handle Motor API (fast, cheap)
- Better resource optimization
- More scalable

**Estimated Cost:**
- ~$0.05-0.15 per authentication (Cloud Run)
- ~$0.001 per Motor API call (Firebase Functions)

### Option 3: Firebase Functions Only (No Puppeteer)

**Best for:** Client-side authentication

**Architecture:**
- Client handles EBSCO authentication in browser
- Client sends credentials to Firebase Functions
- Firebase Functions proxy Motor API calls

**Benefits:**
- Simplest Firebase Functions deployment
- Lowest cost
- Fast cold starts
- No Puppeteer complexity

**Estimated Cost:**
- ~$0.001 per Motor API call
- No authentication cost

---

## 🔧 Implementation Examples

### Full Firebase Functions Version

```javascript
// functions/index.js
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

// Store sessions in Firestore instead of memory
const db = admin.firestore();
const sessionsRef = db.collection('sessions');

// Authentication endpoint
app.post('/api/auth', async (req, res) => {
  const { cardNumber } = req.body;
  
  if (!cardNumber) {
    return res.status(400).json({ error: 'cardNumber is required' });
  }

  let browser;
  try {
    console.log('[AUTH] Starting authentication...');
    
    // Launch Puppeteer with Chromium
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    // Navigate to EBSCO
    await page.goto('https://search.ebscohost.com/login.aspx?authtype=ip,cpid&custid=s5672256&groupid=main&profile=autorepso', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Fill and submit
    await page.waitForSelector('input[data-auto="prompt-input"]');
    await page.type('input[data-auto="prompt-input"]', cardNumber);
    await page.click('button[data-auto="login-submit-btn"]');
    
    // Wait for Motor domain
    let motorCookies = null;
    let attempts = 0;
    
    while (attempts < 30 && !motorCookies) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      
      const currentUrl = page.url();
      
      if (currentUrl.includes('motor.com')) {
        const allCookies = await page.cookies();
        const motorDomainCookies = allCookies.filter(c => c.domain.includes('motor.com'));
        
        const authCookie = motorDomainCookies.find(c => c.name === 'AuthUserInfo');
        
        if (authCookie) {
          const decoded = Buffer.from(authCookie.value, 'base64').toString('utf-8');
          const credentials = JSON.parse(decoded);
          
          const cookieString = motorDomainCookies
            .map(c => `${c.name}=${c.value}`)
            .join('; ');
          
          motorCookies = {
            ...credentials,
            _cookieString: cookieString,
            _cookies: motorDomainCookies
          };
        }
      }
    }
    
    await browser.close();
    
    if (motorCookies) {
      const sessionId = admin.firestore().collection('sessions').doc().id;
      
      // Store in Firestore
      await sessionsRef.doc(sessionId).set({
        credentials: motorCookies,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(motorCookies.ApiTokenExpiration || Date.now() + 24 * 60 * 60 * 1000)
      });
      
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
        error: 'Authentication timeout'
      });
    }
    
  } catch (error) {
    console.error('[AUTH] Error:', error);
    if (browser) await browser.close();
    return res.status(500).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
});

// Motor API proxy
app.all('/api/motor/*', async (req, res) => {
  const motorPath = req.params[0];
  const sessionId = req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.status(401).json({ error: 'x-session-id header is required' });
  }
  
  try {
    // Get session from Firestore
    const sessionDoc = await sessionsRef.doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    const session = sessionDoc.data();
    const credentials = session.credentials;
    
    // Make direct HTTP request to Motor API
    const targetUrl = `https://sites.motor.com/${motorPath}`;
    
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': credentials._cookieString,
        'User-Agent': 'Mozilla/5.0'
      },
      params: req.query,
      data: req.body,
      validateStatus: () => true
    });
    
    res.status(response.status).json(response.data);
    
  } catch (error) {
    console.error('[MOTOR API] Error:', error.message);
    res.status(500).json({
      error: 'Motor API request failed',
      message: error.message
    });
  }
});

// Export as Firebase Function with extended timeout and memory
exports.api = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB'
  })
  .https
  .onRequest(app);
```

### package.json for Firebase Functions

```json
{
  "name": "functions",
  "engines": {
    "node": "18"
  },
  "dependencies": {
    "firebase-functions": "^4.5.0",
    "firebase-admin": "^11.11.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "axios": "^1.6.0",
    "puppeteer-core": "^21.0.0",
    "@sparticuz/chromium": "^119.0.0",
    "uuid": "^9.0.0"
  }
}
```

### firebase.json

```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  },
  "hosting": {
    "public": "public",
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      }
    ]
  }
}
```

---

## 📊 Comparison Matrix

| Feature | Current Express | Firebase Functions (Full) | Hybrid (Cloud Run + Functions) | Functions Only (No Puppeteer) |
|---------|----------------|---------------------------|-------------------------------|-------------------------------|
| **Deployment** | Manual server | `firebase deploy` | Cloud Run + Firebase | `firebase deploy` |
| **Scaling** | Manual | Auto | Auto | Auto |
| **Cold Start** | None | 10-15s | 5-10s (Cloud Run), <1s (Functions) | <1s |
| **Memory** | Any | 2GB minimum | Flexible | 256MB-1GB |
| **Timeout** | Unlimited | 540s max | Unlimited (Cloud Run), 60s (Functions) | 60s |
| **Cost** | Server + bandwidth | $0.10-0.30/auth, $0.01/API | $0.05-0.15/auth, $0.001/API | $0.001/API |
| **Complexity** | Low | High | Medium | Low |
| **Puppeteer** | ✅ Full support | ⚠️ Limited | ✅ Full support | ❌ Not needed |
| **Best For** | Development | All-in-one | Production | Simple proxy |

---

## 🚀 Recommended Approach

### For Your Use Case: **Hybrid Architecture**

**Why:**
1. Authentication is rare (once per session)
2. Motor API calls are frequent
3. Puppeteer needs resources
4. Want to minimize costs

**Architecture:**

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │
       │ POST /auth {cardNumber}
       ▼
┌─────────────────────────────┐
│  Cloud Run (Puppeteer)      │
│  - Full resources           │
│  - No timeout limit         │
│  - Handles authentication   │
└──────┬──────────────────────┘
       │
       │ Returns: {sessionId, credentials}
       │ (Stored in Firestore)
       │
┌──────▼───────┐
│   Client     │
└──────┬───────┘
       │
       │ GET /api/motor/* + X-Session-Id
       ▼
┌─────────────────────────────┐
│  Firebase Functions         │
│  - Fast & cheap             │
│  - Direct HTTP only         │
│  - Proxies Motor API        │
└─────────────────────────────┘
```

**Benefits:**
- ✅ Best of both worlds
- ✅ Optimal resource usage
- ✅ Lowest cost
- ✅ Most scalable
- ✅ No cold start for API calls

---

## 📝 Migration Steps

### Option 1: Full Firebase Functions

```bash
# 1. Initialize Firebase
firebase init functions

# 2. Copy code to functions/index.js
cp server.js functions/index.js

# 3. Modify for Firebase Functions (see example above)

# 4. Update package.json
cd functions
npm install firebase-functions firebase-admin puppeteer-core @sparticuz/chromium

# 5. Deploy
firebase deploy --only functions
```

### Option 2: Hybrid Approach

```bash
# 1. Create Cloud Run service for auth
# 2. Create Firebase Functions for Motor API
# 3. Update authentication endpoint to call Cloud Run
# 4. Deploy both services
```

---

## 💡 Quick Decision Guide

**Choose Firebase Functions (Full) if:**
- ✅ You want simplest deployment
- ✅ You're okay with higher costs
- ✅ Authentication frequency is low
- ✅ You need Firebase integration

**Choose Hybrid if:**
- ✅ You want optimal performance
- ✅ Cost is important
- ✅ You need production-grade scaling
- ✅ You're comfortable with multi-service architecture

**Choose Functions Only if:**
- ✅ You can handle auth client-side
- ✅ You want minimal complexity
- ✅ You want lowest cost
- ✅ You only need Motor API proxying

---

## 🎯 Next Steps

1. **Decision:** Choose architecture based on your needs
2. **Setup:** Initialize Firebase project
3. **Code:** Adapt server.js to chosen approach
4. **Test:** Deploy to Firebase staging
5. **Monitor:** Watch logs and costs
6. **Optimize:** Adjust based on real usage

Would you like me to:
1. Create a complete Firebase Functions implementation?
2. Create a hybrid Cloud Run + Functions setup?
3. Set up the simpler Functions-only version?

Let me know which approach fits your needs best!
