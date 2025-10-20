# cruis-api

Backend API server for EBSCO authentication and Motor API proxy services.

## Features

- **Motor API Proxy** - Direct HTTP proxy to Motor Web Services API
- **EBSCO Authentication** - Authenticate with library card using automated Puppeteer browser
- **Session Management** - Cached credentials with automatic expiration
- **Interactive Web Frontend** - User-friendly interface for API interaction
- **OpenAPI/Swagger Documentation** - Complete API specification with downloadable swagger.json
- CORS enabled for cross-origin requests
- Runs on port 3001

## Architecture

### Two-Stage Design

This server uses a **two-stage architecture** that clearly separates authentication from API usage:

#### Stage 1: Authentication (Uses Puppeteer)
- **Endpoint:** `POST /api/auth`
- **Method:** Automated browser (Puppeteer)
- **Purpose:** Navigate EBSCO OAuth flow to obtain Motor API credentials
- **Process:**
  1. Launch headless Chrome browser
  2. Navigate to EBSCO login page
  3. Fill in library card number
  4. Follow OAuth redirects to Motor
  5. Extract Motor API cookies and credentials
  6. Return session ID with credentials
- **Why Puppeteer?** EBSCO's OAuth flow requires JavaScript execution and handles redirects that are difficult to follow with plain HTTP

#### Stage 2: Motor API Calls (Uses Direct HTTP)
- **Endpoint:** `ALL /api/motor/*`
- **Method:** Direct HTTP requests with axios
- **Purpose:** Proxy authenticated requests to Motor API
- **Process:**
  1. Receive request with session ID
  2. Look up Motor cookies from session
  3. Make direct HTTP request to Motor API
  4. Forward JSON response to client
- **Why Direct HTTP?** Fast, efficient, scalable - no browser overhead needed after authentication

### Key Principle

> **EBSCO is only used for authentication. All Motor API calls are direct HTTP requests.**

This design provides the best of both worlds:
- ✅ Reliable authentication (Puppeteer handles complex OAuth)
- ✅ Fast API calls (direct HTTP, sub-second responses)
- ✅ Low resource usage (no browser for each API request)

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

The server will start on `http://localhost:3001`

## Quick Start

### 1. Get Motor API Credentials

#### Option A: Via EBSCO Login with Puppeteer (Recommended - Automated Browser)
Uses a headless browser to complete the full OAuth flow including JavaScript execution:

```bash
curl -X POST http://localhost:3001/api/auth/ebsco-browser \
  -H "Content-Type: application/json" \
  -d '{"cardNumber":"1001600244772"}'
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid-here",
  "credentials": {
    "PublicKey": "S5dFutoiQg",
    "ApiTokenKey": "HrNGZ",
    "ApiTokenValue": "pvzPAY7S6u7mxxYjVPTHg0nW7",
    "ApiTokenExpiration": "2025-10-14T14:21:24Z",
    "UserName": "TruSpeedTrialEBSCO",
    "FirstName": "TruSpeed Trial",
    "LastName": "EBSCO",
    "Subscriptions": ["TruSpeed"]
  }
}
```

#### Option B: Via EBSCO Login (Legacy - axios-based)
```bash
curl -X POST http://localhost:3001/api/auth/ebsco \
  -H "Content-Type: application/json" \
  -d '{"cardNumber":"1001600244772"}'
```

Note: The legacy endpoint may not complete the full OAuth flow. Use `/api/auth/ebsco-browser` for reliable authentication.

#### Option C: Manual Credentials
If you have Motor API credentials directly, you can use them without EBSCO authentication.

### 2. Use Motor API Proxy

#### With Session ID
```bash
curl -X GET http://localhost:3001/api/motor/year/2024/makes \
  -H "X-Session-Id: your-session-id"
```

#### With Direct Credentials
```bash
curl -X GET "http://localhost:3001/api/motor/year/2024/makes?PublicKey=S5dFutoiQg&ApiTokenKey=abc123&ApiTokenValue=xyz789"
```

Or using headers:
```bash
curl -X GET http://localhost:3001/api/motor/year/2024/makes \
  -H "X-Public-Key: S5dFutoiQg" \
  -H "X-Api-Token-Key: abc123" \
  -H "X-Api-Token-Value: xyz789"
```

## API Endpoints

### POST /api/auth/ebsco

Authenticates with EBSCO using library card and returns Motor API credentials.

**Request Body:**
```json
{
  "cardNumber": "1001600244772"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid-here",
  "credentials": {
    "PublicKey": "S5dFutoiQg",
    "ApiTokenKey": "abc123",
    "ApiTokenValue": "xyz789",
    "ApiTokenExpiration": "2025-10-14T13:20:33Z",
    "UserName": "TruSpeedTrialEBSCO",
    "Subscriptions": ["TruSpeed"]
  },
  "message": "Authentication successful. Use sessionId or credentials for Motor API requests."
}
```

### ALL /api/motor/*

Proxy endpoint for Motor M1 API requests. Forwards to `https://sites.motor.com/m1/api/*`

**Authentication:** One of the following:
- Header: `X-Session-Id: your-session-id`
- Headers: `X-Public-Key`, `X-Api-Token-Key`, `X-Api-Token-Value`
- Query params: `PublicKey`, `ApiTokenKey`, `ApiTokenValue`

**Examples:**

Get vehicle years:
```bash
curl http://localhost:3001/api/motor/m1/api/years \
  -H "X-Session-Id: session-id"
```

Get vehicle makes for 2024:
```bash
curl http://localhost:3001/api/motor/m1/api/year/2024/makes \
  -H "X-Session-Id: session-id"
```

### ALL /api/motorv1/*

Proxy endpoint for Motor V1 API requests. Forwards to `https://api.motor.com/v1/*`

**Authentication:** Same as M1 API (uses same EBSCO authentication):
- Header: `X-Session-Id: your-session-id`
- Headers: `X-Public-Key`, `X-Api-Token-Key`, `X-Api-Token-Value`
- Query params: `PublicKey`, `ApiTokenKey`, `ApiTokenValue`

**Examples:**

Test connection:
```bash
curl http://localhost:3001/api/motorv1/HelloWorld \
  -H "X-Session-Id: session-id"
```

Get Chek-Chart vehicle years:
```bash
curl http://localhost:3001/api/motorv1/Information/Chek-Chart/Years \
  -H "X-Session-Id: session-id"
```

Get makes for 2024:
```bash
curl http://localhost:3001/api/motorv1/Information/Chek-Chart/Year/2024/Makes \
  -H "X-Session-Id: session-id"
```

**Note:** The V1 and M1 APIs use the same authentication session but have different endpoint structures. See `/public/swagger-v1.json` for complete V1 API documentation.

### POST /api/motor/token

Create a Motor API token (calls Motor's /v1/Token endpoint).

**Request Body:**
```json
{
  "sessionId": "your-session-id"
}
```
Or:
```json
{
  "PublicKey": "S5dFutoiQg",
  "ApiTokenKey": "abc123",
  "ApiTokenValue": "xyz789"
}
```

**Response:** Motor API token response

### DELETE /api/session/:sessionId

Delete a session and clear cached credentials.

**Response:**
```json
{
  "success": true,
  "message": "Session deleted"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Motor API Reference

The Motor Web Services API provides access to automotive repair information including:

- Vehicle information (years, makes, models)
- Technical Service Bulletins (TSBs)
- Diagnostic Trouble Codes (DTCs)
- Repair procedures
- Part information
- Labor times
- And more...

Full Motor API documentation is available in the `motor swagger.json` file.

## Web Interface

Access the interactive web interfaces:

### 🚗 **Motor API Swagger Test Interface** (Recommended)
**URL:** `http://localhost:3001/swagger-test.html`

**Features:**
- 📚 Auto-generated from swagger.json
- 🎯 One-click example tests with Quick Fill buttons
- 🔐 Automatic session management
- 📊 Real-time response visualization
- ⚡ Pre-configured Motor API endpoint examples

**Quick Fill Examples:**
- Get Years: `m1/api/years`
- Get Makes: `m1/api/year/2024/makes`
- Get Models: `m1/api/year/2024/make/Cadillac/models`
- Get Vehicle: `m1/api/source/GeneralMotors/100347105/motorvehicles`

[📖 See full documentation](./SWAGGER_TEST_INTERFACE.md)

### 🧪 **Advanced Test Interface**
**URL:** `http://localhost:3001/test.html`

Full-featured testing interface with manual endpoint input and advanced controls.

### 📄 **Main Interface**
**URL:** `http://localhost:3001/`

Traditional form-based interface with documentation and API reference.

---

## Authentication Flow

### EBSCO → Motor Authentication

1. Client sends library card number to `/api/auth/ebsco`
2. Server authenticates with EBSCO using OAuth/CPID flow
3. EBSCO redirects to Motor's `/connector` endpoint with auth params
4. Motor sets `AuthUserInfo` cookie with API credentials
5. Server extracts and returns Motor credentials
6. Client uses credentials to access Motor API through `/api/motor/*`

### Motor API Authentication

Motor API uses an `AuthUserInfo` cookie containing base64-encoded JSON:
```json
{
  "PublicKey": "S5dFutoiQg",
  "ApiTokenKey": "abc123",
  "ApiTokenValue": "xyz789",
  "ApiTokenExpiration": "2025-10-14T13:20:33Z",
  "UserName": "TruSpeedTrialEBSCO",
  "Subscriptions": ["TruSpeed"],
  "BypassIdentityServer": true
}
```

This server handles the encoding/decoding automatically.

## Dependencies

- express ^4.18.0
- cors ^2.8.5
- axios ^1.12.2
- uuid ^13.0.0

## License

ISC
