# 🎯 Quick Reference: Motor API Swagger Test Interface

## 📍 Access Points

```
🌐 Main Interface:     http://localhost:3001/
🚗 Swagger Test:       http://localhost:3001/swagger-test.html
🧪 Advanced Test:      http://localhost:3001/test.html
📋 Swagger Spec:       http://localhost:3001/swagger.json
```

## 🚀 5-Second Quick Start

```bash
# Start server
npm start

# Open browser → http://localhost:3001/swagger-test.html

# Click: POST /api/auth
# Enter: 1001600244772
# Click: Send Request
# ✅ Authenticated!

# Click: GET /api/motor/{endpoint}
# Click: "🏭 Get Makes (2024)"
# Click: Send Request
# 🎉 See Results!
```

## 📚 Endpoint Groups

### Authentication
```
POST /api/auth
├─ Input: cardNumber
└─ Output: sessionId (auto-saved)
```

### Motor API (All GET requests)
```
/api/motor/{endpoint}
├─ m1/api/years
├─ m1/api/year/{year}/makes
├─ m1/api/year/{year}/make/{make}/models
└─ m1/api/source/{source}/{id}/motorvehicles
```

### Health
```
GET /health
└─ Check server status
```

## ⚡ Quick Fill Buttons

| Button | Endpoint | What It Tests |
|--------|----------|---------------|
| 📅 Get Years | `m1/api/years` | List all available years |
| 🏭 Get Makes (2024) | `m1/api/year/2024/makes` | Makes for year 2024 |
| 🚗 Get Models | `m1/api/year/2024/make/Cadillac/models` | Cadillac models for 2024 |
| 📋 Get Vehicle Info | `m1/api/source/GeneralMotors/100347105/motorvehicles` | Specific vehicle details |

## 🎨 UI Elements

### Status Bar (Top)
```
┌──────────────────────────────────────────────────┐
│ Server Status │ Session Status │ Active Sessions │
│   Connected   │   Active       │       1         │
└──────────────────────────────────────────────────┘
```

### Sidebar (Left)
```
📚 API Endpoints
├─ 🔐 Authentication
│  └─ POST /api/auth
├─ 🚗 Motor API
│  └─ GET /api/motor/{endpoint}
├─ 🔄 Proxy
└─ ❤️ Health
   └─ GET /health
```

### Content Panel (Right)
```
┌─────────────────────────────────────┐
│ GET /api/motor/{endpoint}           │
│ Proxy requests to Motor API         │
├─────────────────────────────────────┤
│ [Quick Fill Buttons]                │
├─────────────────────────────────────┤
│ Path Parameters:                    │
│ • endpoint: [input field]           │
├─────────────────────────────────────┤
│      [🚀 Send Request]              │
├─────────────────────────────────────┤
│ Response:                           │
│ • Status: 200 | Duration: 234ms     │
│ • Content-Type: application/json    │
│ {                                   │
│   "header": {"status": "OK"},       │
│   "body": [...]                     │
│ }                                   │
└─────────────────────────────────────┘
```

## 🔄 Typical Workflow

### First Time Setup
```
1. npm start
2. Open http://localhost:3001/swagger-test.html
3. Click "POST /api/auth" in sidebar
4. Enter card number
5. Send Request
6. ✅ Session saved!
```

### Testing Endpoints
```
1. Click endpoint in sidebar
2. Click Quick Fill button (or enter manually)
3. Send Request
4. View response
5. Repeat for other endpoints
```

### Session Management
```
✅ Session auto-saved to localStorage
✅ Auto-included in Motor API requests
✅ Persists across page reloads
✅ Visible in status bar
```

## 🎯 Example Test Cases

### Test Case 1: Get All Years
```
Endpoint: m1/api/years
Method: GET
Expected: Array of years [1985, 1986, ...]
Status: 200 OK
```

### Test Case 2: Get Makes for 2024
```
Endpoint: m1/api/year/2024/makes
Method: GET
Expected: Array of make objects
Status: 200 OK
```

### Test Case 3: Get Models
```
Endpoint: m1/api/year/2024/make/Cadillac/models
Method: GET
Expected: Array of model objects
Status: 200 OK
```

### Test Case 4: Get Vehicle Details
```
Endpoint: m1/api/source/GeneralMotors/100347105/motorvehicles
Method: GET
Expected: Detailed vehicle object
Status: 200 OK
```

## 🎨 Color Guide

### Method Badges
- 🟢 **GET** - Green background
- 🔵 **POST** - Blue background
- 🟡 **PUT** - Yellow background
- 🔴 **DELETE** - Red background

### Status Indicators
- 🟢 **Connected** - Server online
- 🔴 **Disconnected** - Server offline
- 🔵 **Active** - Session authenticated
- ⚪ **Not Authenticated** - No session

### Response Status
- 🟢 **200-299** - Success (green)
- 🔴 **400-499** - Client error (red)
- 🔴 **500-599** - Server error (red)

## ⌨️ Keyboard Shortcuts

```
Enter - Submit form (when focused)
Tab - Navigate between fields
Esc - Clear alerts (if implemented)
```

## 🔍 Response Metadata

Every response shows:
```
Status: HTTP status code (with color)
Duration: Request time in milliseconds
Content-Type: Response format
```

## 🛠️ Customization Quick Tips

### Change Colors
Edit CSS variables in `<style>` section:
```css
.btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Add Quick Fill
Edit `quickFillExample()` function:
```javascript
const examples = {
    myCustom: { endpoint: 'your/endpoint/here' }
};
```

### Modify Endpoint Grouping
Groups are auto-detected from swagger.json `tags`:
```json
{
    "tags": ["Authentication"],  // Appears in "Authentication" group
}
```

## 📱 Mobile Responsive

The interface adapts to screen size:
- Desktop: Sidebar + Content side-by-side
- Tablet: Stacked layout
- Mobile: Full-width cards

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Server disconnected | Run `npm start` |
| Not authenticated | Click POST /api/auth |
| HTML response | Use `/m1/api/*` endpoints |
| No response | Check browser console (F12) |
| Session lost | Re-authenticate |

## 📖 Related Docs

- **Full Guide**: [SWAGGER_TEST_INTERFACE.md](./SWAGGER_TEST_INTERFACE.md)
- **Setup**: [SWAGGER_SETUP_COMPLETE.md](./SWAGGER_SETUP_COMPLETE.md)
- **API Docs**: [API_ENDPOINTS.md](./API_ENDPOINTS.md)
- **Main README**: [README.md](./README.md)

## 💡 Pro Tips

1. **Quick Testing**: Use Quick Fill buttons for instant endpoint testing
2. **Session Persistence**: Your session survives page reloads
3. **Multiple Tabs**: Open multiple test interfaces for parallel testing
4. **Response Copying**: Right-click response to copy formatted JSON
5. **Endpoint Discovery**: All endpoints auto-load from swagger.json

## 🎉 Success Indicators

✅ **Green "Connected"** = Server running  
✅ **Blue "Active"** = Authenticated  
✅ **Green status code** = Request succeeded  
✅ **Formatted JSON** = Valid response  

---

**🚗 Happy Testing with Motor API!**

*Last updated: October 2025*
