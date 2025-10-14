# cruis-api Usage Guide

This guide provides comprehensive documentation on how to use the `cruis-api` backend. It covers authentication (logging in), retrieving tokens, and making authenticated API calls with example requests and responses.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication (Login)](#authentication-login)
  - [Login Request Example](#login-request-example)
  - [Login Response Example](#login-response-example)
- [Retrieving the Token](#retrieving-the-token)
- [Making Authenticated API Calls](#making-authenticated-api-calls)
  - [Example: Get User Profile](#example-get-user-profile)
  - [Example: Other API Calls](#example-other-api-calls)
- [Error Handling](#error-handling)
- [Further Reading](#further-reading)

---

## Getting Started

The `cruis-api` backend is a RESTful API built with JavaScript. To interact with it, you need:

- The base URL (e.g., `https://yourapi.example.com`)
- An HTTP client (e.g., `curl`, `Postman`, or a JavaScript library like `axios` or `fetch`)
- An account (username/email and password)

---

## Authentication (Login)

To access protected resources, you must log in and obtain a token. Typically, authentication uses JWT (JSON Web Token).

### Login Request Example

```http
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

#### curl Example

```sh
curl -X POST https://yourapi.example.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "yourpassword"}'
```

### Login Response Example

If login is successful, you'll receive a token:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

If credentials are invalid:

```json
{
  "error": "Invalid credentials"
}
```

---

## Retrieving the Token

The token is returned in the response body after a successful login. Store this token securely; you'll need it for subsequent API calls.

**Example (extracting token in JavaScript):**

```javascript
const response = await fetch('https://yourapi.example.com/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'yourpassword' })
});
const data = await response.json();
const token = data.token;
```

---

## Making Authenticated API Calls

For endpoints that require authentication, include the token in the `Authorization` header as a Bearer token.

### Example: Get User Profile

```http
GET /api/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

#### curl Example

```sh
curl -X GET https://yourapi.example.com/api/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..."
```

#### JavaScript (fetch):

```javascript
const profileResp = await fetch('https://yourapi.example.com/api/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const profileData = await profileResp.json();
```

### Example: Other API Calls

Any protected API endpoint can be called similarly:

```http
GET /api/items
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

---

## Error Handling

If your token is missing, invalid, or expired, the API will respond with an error:

```json
{
  "error": "Unauthorized"
}
```

Always check for error responses and handle them gracefully in your client.

---

## Further Reading

- [JWT Specification](https://jwt.io/)
- [Using curl](https://curl.se/docs/manpage.html)
- [Fetch API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [axios HTTP Client](https://github.com/axios/axios)

---

## Notes

- Always use HTTPS in production to keep your credentials and tokens safe.
- Never share your token publicly.
- Token expiration and refresh mechanisms are implementation-specific; consult your API's authentication documentation for details.
