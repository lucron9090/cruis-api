# cruis-api

Backend API server for EBSCO authentication and proxy services.

## Features

- EBSCO authentication flow with library card number and password
- Proxy endpoint for authenticated EBSCO requests
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

## API Endpoints

### POST /api/auth/ebsco

Authenticates with EBSCO using library card credentials.

**Request Body:**
```json
{
  "cardNumber": "1001600244772",
  "password": "your-password"
}
```

**Response:**
```json
{
  "authToken": "ebsco-auth-cookie-value"
}
```

**Authentication Flow:**
1. GET login.ebsco.com with custId, groupId, profId, and requestIdentifier
2. POST to login API with card number
3. POST to login API with password
4. Follow redirects to extract authentication cookie
5. Return auth token

### ALL /api/ebsco-proxy/*

Proxy endpoint for making authenticated requests to EBSCO services.

**Headers:**
- `X-Auth-Token`: Required. The authentication token received from /api/auth/ebsco

**Example:**
```bash
curl -X GET http://localhost:3001/api/ebsco-proxy/search.ebscohost.com/api/v1/search \
  -H "X-Auth-Token: your-auth-token"
```

The proxy will forward the request to the target URL with the auth token as a cookie.

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

## Dependencies

- express ^4.18.0
- cors ^2.8.5
- axios ^1.12.2
- uuid ^13.0.0

## License

ISC
