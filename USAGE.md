     _   ___ ___ 
    /_\ | _ \_ _|
   /_ _\|  _/| | 
  /_/ \_\_| |___|

# CRUI-S API Proxy: The Definitive Guide

Authenticate with a card number and start making requests. No fluff.

---

## Table of Contents

- [The Lowdown](#the-lowdown)
- [Step 1: Get Your Auth Token](#step-1-get-your-auth-token)
- [Step 2: Make Proxied API Calls](#step-2-make-proxied-api-calls)
- [When Things Break](#when-things-break)
- [Dig Deeper](#dig-deeper)

---

## The Lowdown

Welcome to the CRUI-S API proxy. The process is simple:

1.  You trade your library card number for a temporary auth token.
2.  You use that token in a special header to make proxied requests to the real EBSCO API.

Let's get to it.

---

## Step 1: Get Your Auth Token

To get your session token, send a `POST` request to `/api/auth/ebsco` with your card number.

**Endpoint:** `POST /api/auth/ebsco`

```bash
curl -X POST http://localhost:3001/api/auth/ebsco \
  -H "Content-Type: application/json" \
  -d '{"cardNumber": "1001600244772"}'
```

#### The Token Response

A successful login gets you the golden ticket:

```json
{
  "authToken": "ebsco-auth-cookie-value"
}
```

If you mess up (missing field, bad card number), you'll see this instead:

```json
{
  "error": "Authentication failed - no auth token received"
}
```

---

## Step 2: Make Proxied API Calls

### The Golden Rule: The `X-Auth-Token` Header

Every single request to the `/api/ebsco-proxy/*` endpoint **must** include the `X-Auth-Token` header. No exceptions. Slap the `authToken` value you got from Step 1 in there.

### Example Proxied Requests

Here's how to run a GET request. Just replace `your-auth-token` with your actual token.

```bash
curl -X GET "http://localhost:3001/api/ebsco-proxy/search.ebscohost.com/api/v1/search?query=history" \
  -H "X-Auth-Token: your-auth-token"
```

Need to POST some data? No problem.

```bash
curl -X POST "http://localhost:3001/api/ebsco-proxy/search.ebscohost.com/api/v1/search" \
  -H "X-Auth-Token: your-auth-token" \
  -H "Content-Type: application/json" \
  -d '{"searchTerm": "climate"}'
```

**Heads Up:** This is **not** a standard `Authorization: Bearer` token. You must use the `X-Auth-Token` header exactly as shown.

---

## When Things Break

The API will let you know when something's wrong. Here's what to watch for:

**Forgot the token?** You'll get this error:

```json
{
  "error": "X-Auth-Token header is required"
}
```

**Invalid or Expired Token?** The proxy will complain like this:

```json
{
  "error": "Proxy request failed",
  "message": "...",
  "status": 401
}
```

Always check your responses for an `error` field.

---

## Dig Deeper

- [README.md – Endpoint Documentation](https://github.com/lucron9090/cruis-api/blob/main/README.md)
- [index.js – Authentication Logic](https://github.com/lucron9090/cruis-api/blob/main/index.js)
- [EBSCO API Documentation](https://developer.ebsco.com/)

---

## The TL;DR

1.  **POST** your card number to `/api/auth/ebsco`.
2.  **Grab** the `authToken` from the response.
3.  **Add** it as an `X-Auth-Token` header to all requests you send to `/api/ebsco-proxy/*`.
4.  **Remember:** Don't use `Authorization: Bearer`. Stick to the proxy's `X-Auth-Token` flow.
