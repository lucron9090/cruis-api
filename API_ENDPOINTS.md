# Motor API Endpoints Guide

## 🎯 Important: Use `/m1/api/*` for JSON Responses

The Motor application has two types of routes:

### 1. **API Endpoints** (Return Clean JSON) ✅
These endpoints are designed for programmatic access and return clean JSON data:

```
/m1/api/years
/m1/api/year/{year}/makes
/m1/api/year/{year}/make/{make}/models
/m1/api/source/{source}/{id}/motorvehicles
/m1/api/asset/{assetId}
```

**Example:**
```bash
curl http://localhost:3001/api/motor/m1/api/years \
  -H "X-Session-Id: YOUR_SESSION_ID"
```

**Response:**
```json
{
  "header": {
    "status": "OK",
    "statusCode": 200
  },
  "body": [1985, 1986, 1987, ...]
}
```

### 2. **Web Page Routes** (Return HTML) ⚠️
These endpoints return full Angular HTML pages, not JSON:

```
/m1/vehicles          ❌ Returns HTML page
/m1/                  ❌ Returns HTML page
```

When you call these endpoints, the proxy will detect the HTML response and return:

```json
{
  "error": "HTML_PAGE_RETURNED",
  "message": "This endpoint returns an HTML page, not JSON. Try using /m1/api/ endpoints instead.",
  "suggestions": [
    "/m1/api/years",
    "/m1/api/year/{year}/makes",
    ...
  ]
}
```

## 📋 Available API Endpoints

### Vehicle Years
```bash
GET /m1/api/years
```
Returns array of available years

### Makes by Year
```bash
GET /m1/api/year/{year}/makes
```
Returns array of vehicle makes for specified year

Example:
```bash
GET /m1/api/year/2024/makes
```

### Models by Year and Make
```bash
GET /m1/api/year/{year}/make/{make}/models
```
Returns array of vehicle models

Example:
```bash
GET /m1/api/year/2024/make/Cadillac/models
```

### Vehicle Information
```bash
GET /m1/api/source/{source}/{vehicleId}/motorvehicles
```
Returns detailed vehicle information

Example:
```bash
GET /m1/api/source/GeneralMotors/100347105/motorvehicles
```

### Vehicle Name
```bash
GET /m1/api/source/{source}/{vehicleId}/name
```
Returns vehicle name

### Vehicle Articles
```bash
GET /m1/api/source/{source}/vehicle/{vehicleId}/articles/v2?searchTerm={term}
```
Returns articles related to vehicle

### Assets
```bash
GET /m1/api/asset/{assetId}
```
Returns asset data (images, documents, etc.)

## 🔧 Usage with Proxy

1. **Authenticate** to get a session ID:
```bash
curl -X POST http://localhost:3001/api/auth \
  -H 'Content-Type: application/json' \
  -d '{"cardNumber":"1001600244772"}'
```

2. **Call API endpoints** with the session ID:
```bash
curl http://localhost:3001/api/motor/m1/api/years \
  -H "X-Session-Id: YOUR_SESSION_ID"
```

## 🎨 Response Format

All successful API responses follow this structure:

```json
{
  "header": {
    "messages": [],
    "date": "Wed, 15 Oct 2025 17:53:38 GMT",
    "status": "OK",
    "statusCode": 200
  },
  "body": [
    // Data array or object
  ]
}
```

## ⚙️ Enhanced HTML Detection

The proxy now intelligently detects HTML responses and provides helpful error messages:

- Detects Angular applications
- Suggests correct API endpoints
- Provides HTML preview for debugging
- Clean error messages instead of wrapped HTML

## 📝 Notes

- Sessions expire based on Motor's token expiration (typically 24 hours)
- Always use `/m1/api/*` routes for programmatic access
- Web page routes (`/m1/vehicles`, etc.) are meant for browser display only
