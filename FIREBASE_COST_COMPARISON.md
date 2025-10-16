# Firebase Hosting + Functions vs App Hosting - Cost Comparison

## TL;DR

**For your use case: Firebase Hosting + Functions is MUCH cheaper!** ✅

App Hosting is designed for full-stack frameworks (Next.js, Angular) and has minimum costs even with no traffic. Functions + Hosting only charges for actual usage.

---

## 📊 Cost Breakdown

### Firebase Hosting + Functions (What we set up)

#### Firebase Hosting (Static Files)
- **FREE** on Spark plan
- **Paid tier:** $0.026/GB stored, $0.15/GB transferred
- Your use: HTML, CSS, JS files → **~$0-2/month**

#### Cloud Functions
**Pay only for:**
- Invocations: $0.40 per 1M calls
- Compute time: Based on memory × duration
- Networking: $0.12/GB egress

**Your actual costs:**
```
Authentication (2GB memory, ~30s):
- 100 calls/month × $0.30 = $30

Motor API (256MB memory, ~0.5s):
- 10,000 calls/month × $0.01 = $100

Total: ~$130/month
```

**Free tier offsets:**
- 2M invocations/month FREE
- 400,000 GB-seconds FREE
- 200,000 GHz-seconds FREE

**Realistic cost with free tier:**
- Light use (10 auth, 1000 API): **$0-5/month**
- Moderate use (100 auth, 10k API): **$20-40/month**
- Heavy use (1000 auth, 100k API): **$150-300/month**

---

### Firebase App Hosting (Alternative)

#### What is App Hosting?
New service for hosting full-stack apps (Next.js, Angular SSR, etc.) with built-in CI/CD from GitHub.

#### Pricing Structure
**MINIMUM costs even with zero traffic:**
- **$0.03/hour** = **~$22/month** base cost
- This is for a single instance running 24/7
- Plus additional usage costs

**Additional costs:**
- Compute: $0.052/vCPU-hour
- Memory: $0.0057/GB-hour
- Requests: $0.40/million
- Egress: $0.12/GB

**Your app on App Hosting:**
```
Base minimum: $22/month (always)
+ Compute for Puppeteer: ~$20-50/month
+ Memory (2GB): ~$8/month
+ Requests: ~$5/month
+ Egress: ~$5/month

Total: ~$60-90/month MINIMUM
```

---

## 💰 Side-by-Side Comparison

### Monthly Costs at Different Usage Levels

| Usage Level | Functions + Hosting | App Hosting | Savings |
|-------------|---------------------|-------------|---------|
| **None (idle)** | $0 | $22-30 | **$22-30** |
| **Light** (10 auth, 1k API) | $5 | $60 | **$55** |
| **Moderate** (100 auth, 10k API) | $30 | $90 | **$60** |
| **Heavy** (1000 auth, 100k API) | $200 | $250 | **$50** |

---

## 🎯 When to Use Each

### Use Functions + Hosting (What we set up) ✅

**Best for:**
- ✅ Pay-per-use pricing
- ✅ Sporadic traffic
- ✅ API-only backends
- ✅ Cost optimization
- ✅ No minimum costs
- ✅ Your use case!

**Advantages:**
- $0 when idle
- Scale to zero
- Pay only for actual usage
- Perfect for APIs
- Generous free tier

**Disadvantages:**
- Cold starts (10-15s first call)
- 9-minute timeout limit
- Stateless (use Firestore for sessions)

---

### Use App Hosting ❌ (Not for you)

**Best for:**
- Full-stack frameworks (Next.js, Nuxt, SvelteKit)
- Server-side rendering (SSR)
- Always-on applications
- Complex build processes
- Integrated CI/CD from GitHub

**Advantages:**
- No cold starts
- Full framework support
- Automatic deploys from Git
- Unified deployment

**Disadvantages:**
- **Minimum $22-30/month even with zero traffic**
- More expensive for APIs
- Overkill for simple backends
- Not cost-effective for your use case

---

## 💡 Cost Optimization Tips for Functions

### 1. Keep Functions Warm (Optional)
Use Cloud Scheduler to ping every 5 minutes:
```bash
# Prevents cold starts for important endpoints
# Free tier: 3 jobs/month
curl https://your-project.web.app/api/health
```

**Cost:** $0.10/month (if using paid scheduler)
**Benefit:** No cold starts, better UX

### 2. Optimize Puppeteer Memory
```javascript
// In functions/index.js
exports.api = functions.runWith({
  memory: '2GB',        // Required for Puppeteer
  timeoutSeconds: 540,  // 9 minutes max
})
```

### 3. Use Firestore Efficiently
```javascript
// Sessions are small (~1KB each)
// 50k reads/day FREE
// 20k writes/day FREE
// You'll likely stay in free tier
```

### 4. Cache Sessions
```javascript
// Sessions persist in Firestore
// Reuse for 24 hours
// No need to re-authenticate
```

### 5. Use Firebase Free Tier Wisely

**Free every month:**
- 2M function invocations
- 400k GB-seconds compute
- 5GB egress
- 50k Firestore reads
- 20k Firestore writes

**Your usage:**
- 100 auth + 10k API = 10,100 invocations (under 2M ✓)
- Compute: ~30GB-seconds (under 400k ✓)
- Firestore: ~10k reads (under 50k ✓)

**Likely to stay in free tier for moderate use!**

---

## 📈 Real-World Cost Examples

### Scenario 1: Personal Project
```
Traffic:
- 5 authentications/month
- 500 Motor API calls/month

Firebase Functions + Hosting:
- Within free tier = $0/month ✅

App Hosting:
- Base cost = $22/month ❌
```

### Scenario 2: Small Business
```
Traffic:
- 100 authentications/month
- 10,000 Motor API calls/month

Firebase Functions + Hosting:
- Functions: ~$25/month
- Hosting: ~$1/month
- Firestore: $0 (free tier)
- Total: ~$26/month ✅

App Hosting:
- Base: $22/month
- Compute: ~$50/month
- Memory: ~$8/month
- Requests: ~$5/month
- Total: ~$85/month ❌

Savings: $59/month
```

### Scenario 3: Growing Startup
```
Traffic:
- 1,000 authentications/month
- 100,000 Motor API calls/month

Firebase Functions + Hosting:
- Functions: ~$180/month
- Hosting: ~$5/month
- Firestore: ~$5/month
- Total: ~$190/month ✅

App Hosting:
- Base: $22/month
- Compute: ~$200/month
- Memory: ~$15/month
- Requests: ~$40/month
- Total: ~$277/month ❌

Savings: $87/month
```

---

## 🔍 Detailed Cost Calculator

### Firebase Functions Cost Formula

```
Cost = (Invocations × $0.40/M) + 
       (GB-seconds × $0.0000025) + 
       (Egress × $0.12/GB)
```

### Your Authentication Function
```
Memory: 2GB
Duration: 30 seconds average
Cost per call: $0.000150

Breakdown:
- Invocation: $0.0000004
- Compute: $0.000150 (2GB × 30s × $0.0000025)
- Egress: ~$0.000001

100 calls = $0.015 (within free tier)
1000 calls = $0.15
```

### Your Motor API Function
```
Memory: 256MB
Duration: 0.5 seconds average
Cost per call: $0.00000032

Breakdown:
- Invocation: $0.0000004
- Compute: $0.00000032 (0.256GB × 0.5s × $0.0000025)
- Egress: negligible

10,000 calls = $0.032
100,000 calls = $0.32
```

---

## 🎯 Recommendation

**For your Motor API proxy: Use Firebase Hosting + Functions** ✅

### Why?

1. **Cost-effective:** Only pay for usage, $0 when idle
2. **Generous free tier:** Light usage is FREE
3. **Perfect fit:** API-only backend
4. **Already set up:** We created all the files
5. **Scalable:** Handles traffic spikes automatically

### Estimated costs:
- **Personal use:** $0-5/month (likely FREE)
- **Small business:** $20-40/month
- **Medium business:** $100-200/month

### App Hosting would cost:
- **Any use level:** Minimum $60-90/month
- **Not worth it for your use case**

---

## 📋 Summary Table

| Feature | Functions + Hosting | App Hosting |
|---------|---------------------|-------------|
| **Minimum cost** | $0 | $22-30/month |
| **Idle cost** | $0 | $22-30/month |
| **Light use** | $0-5 | $60 |
| **Moderate use** | $20-40 | $90 |
| **Heavy use** | $150-200 | $250-300 |
| **Cold starts** | Yes (10-15s) | No |
| **Scale to zero** | Yes | No |
| **Best for** | APIs, sporadic | Full-stack SSR |
| **Your use case** | ✅ Perfect | ❌ Overkill |

---

## ✅ Final Answer

**Firebase Hosting + Functions is MUCH cheaper for your use case!**

- **Hosting is FREE** (under 10GB storage, 360MB/day)
- **Functions are pay-per-use** (likely within free tier)
- **No minimum costs** ($0 when idle)
- **Perfect for APIs** (what you have)

**App Hosting:**
- **Minimum $22-30/month** even with zero traffic
- Designed for Next.js/Angular SSR apps
- Overkill for a simple API proxy

**You made the right choice!** Stick with Firebase Hosting + Functions. 🎉

---

## 💡 Pro Tip

Monitor your costs in Firebase Console:
1. Go to Firebase Console
2. Click "Usage and billing"
3. Set up budget alerts
4. Watch your actual costs

You'll likely stay in the free tier for months! 🚀
