# AI Task: Implement Vehicle Selector backend for Firebase

Goal

Create a small, secure, and fast backend service (Firebase Functions) that provides three simple endpoints to populate a cascading vehicle selector used by the app UI:

- GET /vehicle/years -> returns a list of years (most recent first)
- GET /vehicle/makes?year=YYYY -> returns a list of makes for the selected year
- GET /vehicle/models?year=YYYY&make=MAKE -> returns a list of models for the selected year/make

The backend should obtain vehicle data from Motor (via the existing proxy / session system in this repo) and return minimal JSON shapes the frontend expects.

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
  - Use the existing Motor endpoints exposed by the proxy in this repo (examples):
    - Years: GET /api/motor/m1/api/years
    - Makes: GET /api/motor/m1/api/year/{year}/makes
    - Models: GET /api/motor/m1/api/year/{year}/make/{make}/models
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