# Motor API Proxy Server

A proxy server that authenticates with EBSCO and provides access to Motor API endpoints using browser-based session management.

## Overview

This server replicates the exact authentication flow captured in the traffic logs:
1. **EBSCO Login**: Submits library card number through EBSCO's OAuth flow
2. **Motor Redirect**: Follows redirects to Motor's connector endpoint which establishes the session
3. **Session Capture**: Extracts AuthUserInfo cookie and all Motor session cookies
4. **API Proxy**: Uses Puppeteer to make authenticated requests with the captured session

## Installation

```bash
npm install
```

## Usage

### 1. Start the Server

```bash
node server.js
```

The server will start on `http://localhost:3001`

### 2. Use the Test Interface (Recommended)

Open your browser to the visual test interface:

```
http://localhost:3001/test.html
```

**Features:**
- 🎨 Modern, intuitive UI with real-time status
- 🔐 One-click authentication with Puppeteer
- 🚀 Test Motor API endpoints visually
- 💾 Automatic session persistence (localStorage)
- 📋 Copy session IDs, view formatted responses
- ✅ Success/error feedback with detailed messages

See [TEST_INTERFACE.md](./TEST_INTERFACE.md) for detailed guide.

### 3. Use Command Line (Alternative)

### 3a. Authenticate (Command Line)

Get a session by authenticating with your EBSCO library card:

```bash
curl -X POST http://localhost:3001/api/auth \
  -H 'Content-Type: application/json' \
  -d '{"cardNumber":"YOUR_CARD_NUMBER"}'
```

Response:
```json
{
  "success": true,
  "sessionId": "uuid-here",
  "credentials": {
    "PublicKey": "...",
    "ApiTokenKey": "...",
    "ApiTokenExpiration": "2025-10-14T12:50:02Z",
    "UserName": "TruSpeedTrialEBSCO",
    "Subscriptions": ["TruSpeed"]
  }
}
```

### 3b. Make Motor API Calls (Command Line)

Use the `sessionId` from step 3a to make authenticated requests:

```bash
# Get vehicles page
curl http://localhost:3001/api/motor/m1/vehicles \
  -H 'X-Session-Id: YOUR_SESSION_ID'

# Make other Motor API calls
curl http://localhost:3001/api/motor/m1/api/vehicles \
  -H 'X-Session-Id: YOUR_SESSION_ID'
```

### 4. Check Health

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "activeSessions": 1,
  "timestamp": "2025-10-14T02:54:38Z"
}
```

### 5. Delete Session (Optional)

```bash
curl -X DELETE http://localhost:3001/api/session/YOUR_SESSION_ID
```

## API Endpoints

### POST /api/auth
Authenticate with EBSCO library card number and get a session ID.

**Request:**
```json
{
  "cardNumber": "1001600244772"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "credentials": { ... }
}
```

### ALL /api/motor/*
Proxy any Motor API request. The path after `/api/motor/` is appended to `https://sites.motor.com/`.

**Headers:**
- `X-Session-Id` (required): Session ID from authentication

**Example:**
```bash
# This proxies to: https://sites.motor.com/m1/vehicles
curl http://localhost:3001/api/motor/m1/vehicles \
  -H 'X-Session-Id: abc-123'
```

### DELETE /api/session/:sessionId
Delete a session.

### GET /health
Check server health and active session count.

## How It Works

### Authentication Flow

1. **Puppeteer Launch**: Headless Chrome browser starts
2. **Navigate to EBSCO**: Opens EBSCO login page with institutional parameters
3. **Submit Card Number**: Fills in library card number and submits
4. **Follow OAuth Flow**: Browser automatically follows redirects through EBSCO OAuth
5. **Reach Motor**: Eventually redirects to `motor.com/connector` with authentication signature
6. **Capture Cookies**: Motor sets `AuthUserInfo` and session cookies
7. **Extract Credentials**: Decode AuthUserInfo (base64 JSON) and store all cookies
8. **Create Session**: Generate UUID and store credentials with expiration

### Proxy Flow

1. **Validate Session**: Check if session ID exists and hasn't expired
2. **Launch Browser**: Start Puppeteer with authenticated cookies
3. **Set Cookies**: Inject all Motor cookies into browser context
4. **Navigate to Motor**: Visit Motor site to establish session
5. **Execute Fetch**: Run `fetch()` call inside browser context (preserves session)
6. **Parse Response**: Extract JSON (or parse embedded JSON from HTML)
7. **Return Data**: Send JSON response to client

## Session Management

- Sessions are stored in-memory (Map)
- Each session contains:
  - Decoded credentials (PublicKey, ApiTokenKey, ApiTokenValue, etc.)
  - All Motor cookies as array and string
  - Creation timestamp
  - Expiration timestamp (from ApiTokenExpiration)
- Sessions automatically expire based on Motor's token expiration
- Sessions can be manually deleted via DELETE endpoint

## Response Formats

The proxy attempts to return JSON for all requests:

1. **Native JSON**: If Motor returns `application/json`, return as-is
2. **Embedded JSON**: If HTML contains JSON in `<script type="application/json">` or `window.__INITIAL_STATE__`, extract and return
3. **HTML Wrapper**: If no JSON found, wrap HTML in `{ "html": "..." }`

## Traffic Capture Analysis

The implementation is based on analysis of actual traffic captures showing:

- **Connector URL Pattern**: `https://sites.motor.com/connector?pin=s5672256&Scheme=Shared&XDate=1760410478&ApiKey=S5dFutoiQg&Sig=...`
- **AuthUserInfo Cookie**: Base64-encoded JSON with `{PublicKey, ApiTokenKey, ApiTokenValue, ApiTokenExpiration, UserName, Subscriptions, BypassIdentityServer}`
- **Session Cookies**: `.AspNetCore.Cookies`, `SessionIdentifier`, `UIUserSettings`, and tracking cookies
- **API Calls**: Made to `sites.motor.com/m1/*` endpoints with all cookies present

## Troubleshooting

### Authentication Fails
- Verify card number is correct
- Check that EBSCO service is accessible
- Increase timeout if network is slow

### Proxy Returns HTML Instead of JSON
- Motor endpoint may be web UI page, not API
- Try different endpoint paths (e.g., `/m1/api/vehicles` instead of `/m1/vehicles`)
- Check Motor API documentation for correct endpoints

### Session Expired
- Sessions expire based on Motor's ApiTokenExpiration
- Re-authenticate to get a new session
- Consider implementing automatic token refresh

## Development

### Run with Auto-Restart
```bash
npx nodemon server.js
```

### Enable Debug Logging
The server logs all authentication and proxy steps to console.

### Test Authentication Only
```bash
node -e "
const axios = require('axios');
axios.post('http://localhost:3001/api/auth', {
  cardNumber: '1001600244772'
}).then(r => console.log(JSON.stringify(r.data, null, 2)));
"
```

## Dependencies

- `express`: Web server framework
- `cors`: Enable CORS
- `puppeteer`: Headless Chrome automation
- `uuid`: Generate session IDs

## License

ISC
