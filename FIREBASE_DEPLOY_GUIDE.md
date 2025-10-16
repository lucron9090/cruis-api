# 🚀 Quick Firebase Hosting Setup

## ✅ Ready to Deploy!

I've created all the necessary files for Firebase Hosting integration.

---

## 📁 New Files Created

```
functions/
├── index.js          # Your API (adapted from server.js)
├── package.json      # Dependencies
└── .gitignore        # Ignore node_modules

firebase.json          # Firebase configuration
```

---

## 🔧 Setup Steps

### 1. Install Firebase CLI (if not already installed)

```bash
npm install -g firebase-tools
```

### 2. Login to Firebase

```bash
firebase login
```

### 3. Initialize Firebase Project

```bash
cd /Users/phobosair/Documents/GitHub/cruis-api
firebase init

# When prompted, select:
# - Use existing project or create new one
# - When asked about functions, say "use existing" since we created it
# - When asked about hosting, say "use existing" since we have public/ directory
```

### 4. Install Function Dependencies

```bash
cd functions
npm install
cd ..
```

### 5. Test Locally (Optional)

```bash
# Start Firebase emulators
firebase emulators:start
```

This will run:
- Functions at: `http://localhost:5001/YOUR-PROJECT/us-central1/api`
- Hosting at: `http://localhost:5000`

### 6. Deploy to Firebase

```bash
# Deploy everything
firebase deploy

# Or deploy separately:
firebase deploy --only hosting   # Just static files
firebase deploy --only functions  # Just API
```

---

## 🌐 URLs After Deployment

### Your Static Site:
- `https://YOUR-PROJECT.web.app/`
- `https://YOUR-PROJECT.web.app/swagger-test.html`
- `https://YOUR-PROJECT.web.app/test.html`

### Your API Endpoints:
- `https://YOUR-PROJECT.web.app/api/health`
- `https://YOUR-PROJECT.web.app/api/auth`
- `https://YOUR-PROJECT.web.app/api/motor/m1/api/years`

---

## 📝 Update Your Frontend

Your HTML files need to use the new API path structure.

### Before (local):
```javascript
const API_BASE = 'http://localhost:3001/api';
```

### After (Firebase):
```javascript
const API_BASE = '/api';  // Relative URLs work!
```

Or for specific frontend updates:

**In `public/swagger-test.html`, `public/test.html`, etc:**

Find:
```javascript
fetch('http://localhost:3001/api/auth', {...})
```

Replace with:
```javascript
fetch('/api/auth', {...})
```

Firebase's rewrite rules will automatically route `/api/**` to your function!

---

## ⚙️ Configuration Explained

### firebase.json
```json
{
  "functions": {
    "source": "functions"  // Where your function code lives
  },
  "hosting": {
    "public": "public",    // Your static files
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"    // Route /api/* to Firebase Function
      }
    ]
  }
}
```

This means:
- `yoursite.web.app/` → Serves `public/index.html`
- `yoursite.web.app/api/auth` → Calls Firebase Function
- `yoursite.web.app/swagger-test.html` → Serves `public/swagger-test.html`

---

## 💰 Cost Estimate

### Free Tier Includes:
- **Hosting:** 10GB storage, 360MB/day bandwidth
- **Functions:** 2M invocations/month, 400k GB-seconds
- **Firestore:** 50k reads, 20k writes per day

### Estimated Costs (Beyond Free Tier):
- **Authentication call:** ~$0.10-0.30 (Puppeteer is resource-intensive)
- **Motor API call:** ~$0.01 (simple proxy)
- **Storage:** Minimal (sessions only)

**For moderate use (100 auth, 10k API calls/month):** ~$20-40/month

---

## 🔍 Monitoring

### View Logs
```bash
firebase functions:log
```

### View Live Functions
```bash
firebase open functions
```

### View Hosted Site
```bash
firebase open hosting:site
```

---

## 🐛 Troubleshooting

### "Command not found: firebase"
```bash
npm install -g firebase-tools
```

### "Permission denied"
```bash
firebase login
```

### Cold starts are slow
- Expected on first call (10-15 seconds)
- Consider Cloud Scheduler to keep warm:
  ```bash
  # Ping every 5 minutes to prevent cold starts
  curl https://YOUR-PROJECT.web.app/api/health
  ```

### Function timeout
- Default: 60 seconds
- Our config: 540 seconds (9 minutes)
- Should be enough for Puppeteer auth

---

## 🎯 Next Steps

1. **Run:** `firebase login`
2. **Run:** `firebase init` (select your project)
3. **Run:** `cd functions && npm install`
4. **Run:** `firebase deploy`
5. **Test:** Visit `https://YOUR-PROJECT.web.app`
6. **Celebrate:** 🎉

---

## 📚 Key Differences from Local Server

| Feature | Local (server.js) | Firebase (functions/index.js) |
|---------|-------------------|-------------------------------|
| **Puppeteer** | Regular `puppeteer` | `puppeteer-core` + `@sparticuz/chromium` |
| **Sessions** | In-memory `Map` | Firestore database |
| **Port** | 3001 | Auto (handled by Firebase) |
| **Static Files** | `express.static('public')` | Firebase Hosting |
| **URL** | `localhost:3001` | `your-project.web.app` |
| **Scaling** | Manual | Automatic |
| **HTTPS** | Optional | Always |

---

## ✅ What's Different in functions/index.js

1. **Puppeteer:** Uses `puppeteer-core` with `@sparticuz/chromium`
2. **Sessions:** Stored in Firestore (persists across function calls)
3. **Routes:** No `/api` prefix in function routes (Firebase adds it)
4. **Export:** `exports.api = functions.https.onRequest(app)`
5. **No server.listen():** Firebase handles this

---

## 🚨 Important Notes

1. **First deployment:** May take 5-10 minutes
2. **Cold starts:** First call after idle takes 10-15 seconds
3. **Memory:** Set to 2GB for Puppeteer (in functions/index.js)
4. **Timeout:** Set to 540 seconds for auth (in functions/index.js)
5. **Firestore:** Will be created automatically on first use

---

## 💡 Tips

- Keep `server.js` for local development
- Use `firebase emulators:start` to test before deploying
- Monitor costs in Firebase Console
- Set up budget alerts in Google Cloud Console
- Use `firebase deploy --only hosting` for quick frontend updates

---

Ready to deploy? Run:
```bash
firebase login
firebase init
cd functions && npm install && cd ..
firebase deploy
```

🚀 Your API will be live in minutes!
