# 🚀 Quick Reference

## Start Server
```bash
cd /Users/phobosair/Documents/GitHub/cruis-api
node server.js
```

## Access Test Interface
```
http://localhost:3001/test.html
```

## Quick Test (Browser)
1. Open test.html
2. Click "🔐 Authenticate" 
3. Click "m1/vehicles"
4. Click "🚀 Send Request"
5. ✅ Done!

## Quick Test (Command Line)
```bash
# Authenticate
SESSION_ID=$(curl -s -X POST http://localhost:3001/api/auth \
  -H 'Content-Type: application/json' \
  -d '{"cardNumber":"1001600244772"}' | jq -r '.sessionId')

# Make API call
curl http://localhost:3001/api/motor/m1/vehicles \
  -H "X-Session-Id: $SESSION_ID" | jq .
```

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth` | Authenticate with card number |
| GET | `/api/motor/*` | Proxy Motor API (any path) |
| DELETE | `/api/session/:id` | Delete session |
| GET | `/health` | Health check |

## Test Interface Features
- ✅ Real-time status (server, session, active sessions)
- ✅ One-click authentication
- ✅ Example endpoints (click to use)
- ✅ Custom API calls (GET/POST/PUT/DELETE)
- ✅ Session management (clear, delete, copy)
- ✅ Formatted JSON responses
- ✅ Success/error feedback

## Common Paths
```
m1/vehicles              # Vehicles page
m1/api/vehicles          # Vehicles API
m1/api/ui/css/bootstrap  # Bootstrap CSS
m1/api/makes             # Vehicle makes
m1/api/models            # Vehicle models
```

## Troubleshooting

### Server not responding?
```bash
lsof -ti:3001 | xargs kill -9  # Kill process on port 3001
node server.js                 # Restart server
```

### Authentication failing?
- Check card number: `1001600244772`
- Wait 6-8 seconds for Puppeteer
- Check server logs for errors

### API returns 401?
- Session expired → re-authenticate
- Invalid session ID → check X-Session-Id header

### Proxy returns HTML?
- Expected for web UI endpoints
- HTML wrapped in `{"html": "..."}`
- Try `/m1/api/*` paths for JSON

## Files
```
server.js              # Backend server
public/test.html       # Test interface
README_NEW.md          # Full docs
TEST_INTERFACE.md      # UI guide
SETUP_SUMMARY.md       # Complete setup
QUICK_REFERENCE.md     # This file
```

## Architecture
```
Browser → Express → Puppeteer → EBSCO → Motor
           ↓ Session (UUID)
           ↓ Cookies (AuthUserInfo)
Browser → Express → Puppeteer → Motor API → JSON
```

## Status
✅ Server: Running on port 3001
✅ Auth: Puppeteer-based (6-8s)
✅ Proxy: Browser-context fetch
✅ UI: Modern test interface
✅ Docs: Complete

---

**Ready to use! 🎉**
