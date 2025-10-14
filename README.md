# cruis-api

Backend API server for EBSCO authentication and Motor API proxy services.

## Features

- **Motor API Proxy** - Direct proxy to Motor Web Services API (https://api.motor.com)
- **EBSCO Authentication** - Authenticate with library card to access Motor through EBSCO
- **Session Management** - Cached credentials with automatic expiration
- **Interactive Web Frontend** - User-friendly interface for API interaction
- **OpenAPI/Swagger Documentation** - Complete API specification with downloadable swagger.json
- CORS enabled for cross-origin requests
- Runs on port 3001

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

Proxy endpoint for Motor API requests. Forwards to `https://sites.motor.com/m1/api/*`

**Authentication:** One of the following:
- Header: `X-Session-Id: your-session-id`
- Headers: `X-Public-Key`, `X-Api-Token-Key`, `X-Api-Token-Value`
- Query params: `PublicKey`, `ApiTokenKey`, `ApiTokenValue`

**Examples:**

Get vehicle years:
```bash
curl http://localhost:3001/api/motor/year/2024/makes \
  -H "X-Session-Id: session-id"
```

Get vehicle makes for 2024:
```bash
curl "http://localhost:3001/api/motor/year/2024/makes?PublicKey=xxx&ApiTokenKey=yyy&ApiTokenValue=zzz"
```

Search technical service bulletins:
```bash
curl http://localhost:3001/api/motor/Information/TSB/Search \
  -H "X-Session-Id: session-id" \
  -H "Content-Type: application/json" \
  -d '{"year": 2024, "make": "Toyota"}'
```

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

Access the interactive web interface at `http://localhost:3001`

The interface provides:
- **Authentication** - Form to authenticate with EBSCO
- **Motor API** - Test Motor API endpoints
- **API Documentation** - Complete API reference

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
