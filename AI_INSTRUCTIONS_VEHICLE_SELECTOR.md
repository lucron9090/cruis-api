# AI Task: Implement Vehicle Selector backend for Firebase

Goal

Create a small, secure, and fast backend service (Firebase Functions) that provides three simple endpoints to populate a cascading vehicle selector used by the app UI:

- GET /vehicle/years -> returns a list of years (most recent first)
- GET /vehicle/makes?year=YYYY -> returns a list of makes for the selected year
- GET /vehicle/models?year=YYYY&make=MAKE -> returns a list of models for the selected year/make

The backend should obtain vehicle data from Motor (via the existing proxy / session system in this repo) and return minimal JSON shapes the frontend expects.

## Authentication & Session Management

This API proxy uses a two-stage authentication architecture:

1. **EBSCO OAuth (Puppeteer)** — obtain Motor credentials
   - Endpoint: `POST /api/auth`
   - Request body: `{ "cardNumber": "1001600244772" }`
   - Response: `{ "success": true, "sessionId": "uuid", "correlationId": "uuid", "credentials": {...} }`
   - Process: The server uses Puppeteer to automate EBSCO login, extract Motor cookies (`AuthUserInfo`), and store them server-side.
   - Session lifetime: credentials expire based on `ApiTokenExpiration` returned from Motor.

2. **Motor API Proxy (Direct HTTP)** — all subsequent calls use the session
   - The vehicle selector endpoints should accept a session ID (from the auth step) via:
     - Header: `X-Session-Id: <sessionId>`
     - Query param: `?session=<sessionId>`
   - Forward the session ID to the local proxy endpoints (e.g., `/api/motor/m1/api/years`)
   - The proxy will attach the stored Motor cookies and credentials to upstream requests.

Example auth flow:
```bash
# Step 1: Authenticate and get a session
curl -X POST http://localhost:3001/api/auth \
  -H 'Content-Type: application/json' \
  -d '{"cardNumber":"1001600244772"}'

# Response:
# {
#   "success": true,
#   "sessionId": "abc-123-uuid",
#   "correlationId": "xyz-456-uuid",
#   "credentials": {
#     "PublicKey": "...",
#     "ApiTokenKey": "...",
#     "ApiTokenExpiration": "2025-10-18T11:42:46Z",
#     ...
#   }
# }

# Step 2: Use the sessionId to call vehicle endpoints
curl http://localhost:3001/vehicle/years \
  -H 'X-Session-Id: abc-123-uuid'
```

Frontend apps should:
- Perform the auth call once (or when session expires).
- Store the `sessionId` (e.g., in memory or localStorage).
- Include the `sessionId` in every vehicle API request (as a header or query param).

Your vehicle selector backend functions should accept and forward this session ID to the underlying Motor proxy.

Requirements / contract

- Inputs
  - Each request must accept an optional session id (one of):
    - Header: `X-Session-Id`
    - Query: `?session=SESSION_ID`
    - Or the server may read a server-side session store if integrated
  - Queries:
    - GET /vehicle/makes requires `year` query param
    - GET /vehicle/models requires `year` and `make` query params

- Outputs
  - Success: HTTP 200 with JSON { items: [ { id: string, name: string } ] }
  - Not found / no data: HTTP 200 with { items: [] }
  - Error: appropriate 4xx/5xx with { error: string, message?: string }

- Behavior
  - Use the existing Motor M1 endpoints exposed by the proxy in this repo (examples):
    - Years: GET /api/motor/m1/api/years
    - Makes: GET /api/motor/m1/api/year/{year}/makes
    - Models: GET /api/motor/m1/api/year/{year}/make/{make}/models
  - All requests are proxied to `https://sites.motor.com` (Motor M1 API)
  - Forward correlation id if present (accept X-Correlation-Id and forward it to upstream)
  - Minimal caching is acceptable (in-memory cache with short TTL) to reduce repeated Motor calls
  - Normalize Motor response to the simplified { items: [...] } shape
  - Handle HTML upstream responses (forwarded by the proxy) and return a descriptive error

Security & robustness

- Validate inputs (year is numeric-ish, make is non-empty string)
- Return 400 for missing required query params
- Rate-limit or add basic in-memory request de-duplication if desired (optional)
- Log errors and correlation id for traceability

Examples (frontend expectations)

- GET /vehicle/years
  Response: 200
  {
    "items": [ { "id": "2025", "name": "2025" }, { "id": "2024", "name": "2024" } ]
  }

- GET /vehicle/makes?year=2024
  Response: 200
  {
    "items": [ { "id": "acura", "name": "Acura" }, { "id": "ford", "name": "Ford" } ]
  }

- GET /vehicle/models?year=2024&make=acura
  Response: 200
  {
    "items": [ { "id": "ilx", "name": "ILX" }, { "id": "mdx", "name": "MDX" } ]
  }

Deliverables

1. A Firebase Function file implementing the three endpoints (Node 16+). Keep it self-contained and well-documented.
2. A tiny frontend widget (HTML + JS) that calls those three endpoints to fill cascading selects.
3. Unit-test friendly examples or sample curl commands to exercise the endpoints.

Notes for the AI agent implementing the function

- Prefer using axios for HTTP calls to the local proxy endpoints.
- Reuse the repo's session handling: accept X-Session-Id or ?session= and forward that to /api/motor/* upstream calls.
- Preserve X-Correlation-Id if the caller provides one (set the header on the outgoing axios call).
- Ensure response JSON is deterministic and minimal.
- Add comments explaining how to wire the function into the project's `functions/index.js` if necessary.

If you need further constraints (e.g., prefer Firestore-based sessions instead of in-memory), ask the repo owner and implement accordingly.