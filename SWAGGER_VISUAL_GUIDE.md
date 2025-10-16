# 🎬 Motor API Swagger Test Interface - Visual Walkthrough

This guide shows you exactly what you'll see when using the Swagger Test Interface.

---

## 🌐 Opening the Interface

**URL**: `http://localhost:3001/swagger-test.html`

### Welcome Screen

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│           🚗 Motor API - Interactive Test Interface           │
│           Swagger-based endpoint testing with live examples   │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Server Status  │  Session Status      │  Active Sessions      │
│  Connected ✅   │  Not Authenticated ⚪│       0               │
└────────────────────────────────────────────────────────────────┘

┌──────────┬─────────────────────────────────────────────────────┐
│📚 API    │                                                     │
│Endpoints │  Welcome to Motor API Test Interface                │
│          │                                                     │
│🔐 Auth   │  Select an endpoint from the sidebar to start       │
│ POST     │  testing, or authenticate first to access Motor API │
│ /api     │  endpoints.                                         │
│ /auth    │                                                     │
│          │  ┌────────────────────────────────────────────┐    │
│🚗 Motor  │  │ 🔐 Quick Start: Authentication              │    │
│ GET      │  │                                             │    │
│ /api     │  │ Start by authenticating with your library   │    │
│ /motor   │  │ card to get a session ID for Motor API      │    │
│          │  │ access.                                     │    │
│❤️ Health │  │                                             │    │
│ GET      │  │  [Go to Authentication →]                   │    │
│ /health  │  └────────────────────────────────────────────┘    │
│          │                                                     │
└──────────┴─────────────────────────────────────────────────────┘
```

---

## 🔐 Step 1: Authentication

### Click "POST /api/auth" in Sidebar

```
┌──────────┬─────────────────────────────────────────────────────┐
│📚 API    │                                                     │
│Endpoints │  POST /api/auth                                     │
│          │  Authenticate with EBSCO using library card         │
│          │  credentials                                        │
│🔐 Auth   │                                                     │
│►POST◄    │  ┌────────────────────────────────────────────┐    │
│ /api     │  │ Request Body                                │    │
│ /auth    │  │                                             │    │
│          │  │ Card Number *                               │    │
│🚗 Motor  │  │ ┌─────────────────────────────────────┐    │    │
│ GET      │  │ │ 1001600244772                       │    │    │
│ /api     │  │ └─────────────────────────────────────┘    │    │
│ /motor   │  │ Your library card number                    │    │
│          │  │                                             │    │
│❤️ Health │  │ ┌─────────────────────────────────────┐    │    │
│ GET      │  │ │      🚀 Send Request                │    │    │
│ /health  │  │ └─────────────────────────────────────┘    │    │
│          │  └────────────────────────────────────────────┘    │
└──────────┴─────────────────────────────────────────────────────┘
```

### After Clicking "Send Request"

```
┌────────────────────────────────────────────────────────────────┐
│  Server Status  │  Session Status      │  Active Sessions      │
│  Connected ✅   │  Active (a270beb8...) ✅│    1              │
└────────────────────────────────────────────────────────────────┘

┌──────────┬─────────────────────────────────────────────────────┐
│📚 API    │  POST /api/auth                                     │
│Endpoints │                                                     │
│          │  ┌────────────────────────────────────────────┐    │
│🔐 Auth   │  │ ✅ Authentication successful! Session saved.│    │
│►POST◄    │  └────────────────────────────────────────────┘    │
│ /api     │                                                     │
│ /auth    │  Response                                           │
│          │  ┌────────────────────────────────────────────┐    │
│🚗 Motor  │  │ Status: 200 │ Duration: 3247ms │ JSON     │    │
│ GET      │  └────────────────────────────────────────────┘    │
│ /api     │  ┌────────────────────────────────────────────┐    │
│ /motor   │  │ {                                          │    │
│          │  │   "success": true,                         │    │
│❤️ Health │  │   "sessionId": "a270beb8-...",             │    │
│ GET      │  │   "credentials": {                         │    │
│ /health  │  │     "PublicKey": "S5dFutoiQg",             │    │
│          │  │     "ApiTokenKey": "HrNGZ",                │    │
│          │  │     "ApiTokenValue": "pvzPAY7S6u7m...",    │    │
│          │  │     "ApiTokenExpiration": "2025-10-14...", │    │
│          │  │     "UserName": "TruSpeedTrialEBSCO",      │    │
│          │  │     "Subscriptions": ["TruSpeed"]          │    │
│          │  │   }                                        │    │
│          │  │ }                                          │    │
│          │  └────────────────────────────────────────────┘    │
└──────────┴─────────────────────────────────────────────────────┘
```

---

## 🚗 Step 2: Testing Motor API

### Click "GET /api/motor/{endpoint}" in Sidebar

```
┌──────────┬─────────────────────────────────────────────────────┐
│📚 API    │  GET /api/motor/{endpoint}                          │
│Endpoints │  Proxy requests to Motor API with authentication    │
│          │                                                     │
│🔐 Auth   │  ┌──────────────────────────────────────┐          │
│ POST     │  │ Quick Fill Examples:                 │          │
│ /api     │  │ [📅 Get Years]                       │          │
│ /auth    │  │ [🏭 Get Makes (2024)]                │          │
│          │  │ [🚗 Get Models (2024 Cadillac)]      │          │
│🚗 Motor  │  │ [📋 Get Vehicle Info]                │          │
│►GET◄     │  └──────────────────────────────────────┘          │
│ /api     │                                                     │
│ /motor   │  ┌────────────────────────────────────────────┐    │
│          │  │ Path Parameters                             │    │
│❤️ Health │  │                                             │    │
│ GET      │  │ endpoint *                                  │    │
│ /health  │  │ ┌─────────────────────────────────────┐    │    │
│          │  │ │ m1/api/years                        │    │    │
│          │  │ └─────────────────────────────────────┘    │    │
│          │  │ The Motor API endpoint path                 │    │
│          │  │                                             │    │
│          │  │ ┌─────────────────────────────────────┐    │    │
│          │  │ │      🚀 Send Request                │    │    │
│          │  │ └─────────────────────────────────────┘    │    │
│          │  └────────────────────────────────────────────┘    │
└──────────┴─────────────────────────────────────────────────────┘
```

### Using Quick Fill: Click "🏭 Get Makes (2024)"

```
┌──────────┬─────────────────────────────────────────────────────┐
│📚 API    │  GET /api/motor/{endpoint}                          │
│Endpoints │                                                     │
│          │  ┌────────────────────────────────────────────┐    │
│🔐 Auth   │  │ ℹ️ Example loaded! Click "Send Request"    │    │
│ POST     │  │    to test.                                 │    │
│ /api     │  └────────────────────────────────────────────┘    │
│ /auth    │                                                     │
│          │  ┌────────────────────────────────────────────┐    │
│🚗 Motor  │  │ Path Parameters                             │    │
│►GET◄     │  │                                             │    │
│ /api     │  │ endpoint *                                  │    │
│ /motor   │  │ ┌─────────────────────────────────────┐    │    │
│          │  │ │ m1/api/year/2024/makes              │◄──┐│    │
│❤️ Health │  │ └─────────────────────────────────────┘   ││    │
│ GET      │  │                                          Auto│    │
│ /health  │  │ ┌─────────────────────────────────────┐  filled│
│          │  │ │      🚀 Send Request                │    ││    │
│          │  │ └─────────────────────────────────────┘    ││    │
│          │  └───────────────────────────────────────────┬┘    │
└──────────┴──────────────────────────────────────────────┘─────┘
```

### After Sending Request

```
┌──────────┬─────────────────────────────────────────────────────┐
│📚 API    │  GET /api/motor/{endpoint}                          │
│Endpoints │                                                     │
│          │  ┌────────────────────────────────────────────┐    │
│🔐 Auth   │  │ ✅ Request successful (200)                 │    │
│ POST     │  └────────────────────────────────────────────┘    │
│ /api     │                                                     │
│ /auth    │  Response                                           │
│          │  ┌────────────────────────────────────────────┐    │
│🚗 Motor  │  │ Status: 200 │ Duration: 234ms │ JSON      │    │
│►GET◄     │  └────────────────────────────────────────────┘    │
│ /api     │  ┌────────────────────────────────────────────┐    │
│ /motor   │  │ {                                          │    │
│          │  │   "header": {                              │    │
│❤️ Health │  │     "status": "OK",                        │    │
│ GET      │  │     "statusCode": 200                      │    │
│ /health  │  │   },                                       │    │
│          │  │   "body": [                                │    │
│          │  │     {                                      │    │
│          │  │       "Id": 100346970,                     │    │
│          │  │       "Name": "Acura",                     │    │
│          │  │       "SortOrder": 0                       │    │
│          │  │     },                                     │    │
│          │  │     {                                      │    │
│          │  │       "Id": 100420387,                     │    │
│          │  │       "Name": "Alfa Romeo",                │    │
│          │  │       "SortOrder": 1                       │    │
│          │  │     },                                     │    │
│          │  │     ...                                    │    │
│          │  │   ]                                        │    │
│          │  │ }                                          │    │
│          │  └────────────────────────────────────────────┘    │
└──────────┴─────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Fill Examples in Action

### Example 1: Get All Years

**Click**: 📅 Get Years

**Auto-fills**: `m1/api/years`

**Response**:
```json
{
  "header": {
    "status": "OK",
    "statusCode": 200
  },
  "body": [
    1985, 1986, 1987, 1988, 1989, 1990,
    ..., 2022, 2023, 2024, 2025
  ]
}
```

**Status**: ✅ 200 | ⏱️ 156ms

---

### Example 2: Get Makes for 2024

**Click**: 🏭 Get Makes (2024)

**Auto-fills**: `m1/api/year/2024/makes`

**Response**:
```json
{
  "header": {
    "status": "OK",
    "statusCode": 200
  },
  "body": [
    {"Id": 100346970, "Name": "Acura", "SortOrder": 0},
    {"Id": 100420387, "Name": "Alfa Romeo", "SortOrder": 1},
    {"Id": 100346971, "Name": "Aston Martin", "SortOrder": 2},
    {"Id": 100346972, "Name": "Audi", "SortOrder": 3},
    ...
  ]
}
```

**Status**: ✅ 200 | ⏱️ 234ms

---

### Example 3: Get Models (2024 Cadillac)

**Click**: 🚗 Get Models (2024 Cadillac)

**Auto-fills**: `m1/api/year/2024/make/Cadillac/models`

**Response**:
```json
{
  "header": {
    "status": "OK",
    "statusCode": 200
  },
  "body": [
    {
      "Id": 100347095,
      "Name": "CT4",
      "MakeId": 100346978,
      "SortOrder": 0
    },
    {
      "Id": 100347096,
      "Name": "CT5",
      "MakeId": 100346978,
      "SortOrder": 1
    },
    {
      "Id": 100420461,
      "Name": "ESCALADE",
      "MakeId": 100346978,
      "SortOrder": 2
    },
    ...
  ]
}
```

**Status**: ✅ 200 | ⏱️ 189ms

---

### Example 4: Get Vehicle Details

**Click**: 📋 Get Vehicle Info

**Auto-fills**: `m1/api/source/GeneralMotors/100347105/motorvehicles`

**Response**:
```json
{
  "header": {
    "status": "OK",
    "statusCode": 200
  },
  "body": {
    "VehicleId": 100347105,
    "Source": "GeneralMotors",
    "Year": 2024,
    "Make": "Cadillac",
    "Model": "ESCALADE",
    "BodyStyle": "4D SUV AWD",
    "Engine": "6.2L V8",
    "Transmission": "10-Speed Automatic",
    "FuelType": "Premium Unleaded",
    "MPG": {
      "City": 14,
      "Highway": 19,
      "Combined": 16
    },
    "MSRP": 78895,
    "Invoice": 75123,
    "Specifications": {
      "Horsepower": 420,
      "Torque": 460,
      "Wheelbase": "120.9 in",
      "Length": "211.9 in",
      "Width": "81.0 in",
      "Height": "76.7 in",
      "CurbWeight": "5765 lbs",
      "TowingCapacity": "8300 lbs"
    },
    ...
  }
}
```

**Status**: ✅ 200 | ⏱️ 312ms

---

## 🎨 Visual Elements

### Status Bar Color Coding

```
Connected (Green):     Server Status: Connected ✅
Disconnected (Red):    Server Status: Disconnected ❌
Active (Blue):         Session Status: Active (a270beb8...) ✅
Not Auth (Gray):       Session Status: Not Authenticated ⚪
```

### Method Badges in Sidebar

```
🟢 GET    - Green badge
🔵 POST   - Blue badge
🟡 PUT    - Yellow badge
🔴 DELETE - Red badge
```

### Response Status Colors

```
🟢 200-299: Success (green text)
🟡 300-399: Redirect (yellow text)
🔴 400-499: Client Error (red text)
🔴 500-599: Server Error (red text)
```

### Alert Messages

```
✅ Success:
┌────────────────────────────────────────┐
│ ✅ Request successful (200)            │
└────────────────────────────────────────┘

❌ Error:
┌────────────────────────────────────────┐
│ ⚠️ Request failed (401)                │
└────────────────────────────────────────┘

ℹ️ Info:
┌────────────────────────────────────────┐
│ ℹ️ Example loaded! Click "Send Request"│
│    to test.                            │
└────────────────────────────────────────┘
```

---

## 📱 Responsive Design

### Desktop (1200px+)
```
┌──────────┬─────────────────────────────────────┐
│ Sidebar  │  Content Panel                      │
│ (300px)  │  (900px)                            │
│          │                                     │
│ List of  │  Endpoint details                   │
│ endpoints│  Parameters                         │
│          │  Response viewer                    │
└──────────┴─────────────────────────────────────┘
```

### Tablet (768px - 1199px)
```
┌──────────┬────────────────────────┐
│ Sidebar  │  Content Panel         │
│ (250px)  │  (518px)               │
│          │                        │
│ Compact  │  Stacked layout        │
│ list     │  Full-width elements   │
└──────────┴────────────────────────┘
```

### Mobile (<768px)
```
┌──────────────────────────┐
│  Full-width status bar   │
├──────────────────────────┤
│  Collapsible sidebar     │
├──────────────────────────┤
│  Content Panel           │
│  (full width)            │
│                          │
│  Stacked elements        │
└──────────────────────────┘
```

---

## 🎬 Complete Testing Flow

```
1. Open Interface
   ↓
2. Check Status Bar (should be "Connected")
   ↓
3. Click "POST /api/auth"
   ↓
4. Enter card number: 1001600244772
   ↓
5. Click "Send Request"
   ↓
6. See ✅ "Authentication successful!"
   ↓
7. Status Bar updates: "Active (a270beb8...)" ✅
   ↓
8. Click "GET /api/motor/{endpoint}"
   ↓
9. Click Quick Fill button (e.g., "Get Makes (2024)")
   ↓
10. Field auto-fills: m1/api/year/2024/makes
    ↓
11. Click "Send Request"
    ↓
12. See Response with:
    - Status: 200 (green)
    - Duration: ~200ms
    - Content-Type: application/json
    - Formatted JSON body
    ↓
13. Test other endpoints!
```

---

## 🎉 Success Checklist

After setup, you should see:

- ✅ Status bar showing "Connected" in green
- ✅ Sidebar with grouped endpoints
- ✅ Clickable endpoint items
- ✅ Welcome screen with Quick Start button
- ✅ After auth: "Active" session status
- ✅ Quick Fill buttons for Motor API
- ✅ Formatted JSON responses
- ✅ Color-coded status indicators
- ✅ Response metadata (status, duration, content-type)

---

**🚗 You're ready to test Motor API endpoints with ease!**

*For detailed documentation, see [SWAGGER_TEST_INTERFACE.md](./SWAGGER_TEST_INTERFACE.md)*
