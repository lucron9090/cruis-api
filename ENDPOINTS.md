# Endpoint Inventory for cruis-api

This document consolidates all user-facing endpoints found in the repository (server routes, frontend references, and documented API paths).

## Server (Express / Firebase functions)

- GET  /health
  - Source: `server.js`, `functions/index.js`
  - Description: Basic health check, returns status and timestamp

- POST /api/auth
  - Source: `server.js`, `README.md`, `FIREBASE_CONVERSION_GUIDE.md`
  - Description: Start authentication using library card number. Server performs EBSCO OAuth internally (Puppeteer) and returns a `sessionId`.
  - Body: { cardNumber: string }

- ALL  /api/motor/*
  - Source: `server.js`, `README.md`, `MOTOR_API_FIX.md`, `TEST_RESULTS.md`
  - Description: Proxy endpoint for Motor API. Client sends requests to `/api/motor/{path}` and includes `X-Session-Id` header. Server forwards the request to `https://sites.motor.com/{path}` using session cookies obtained during `/api/auth`.

- DELETE /api/session/:sessionId
  - Source: `server.js`, `README.md`
  - Description: Delete a stored session

- (Firebase function variations)
  - POST /auth
    - Source: `functions/index.js` (exported as `api` function, path will be `/api/auth` when hosted behind /api)
  - ALL /motor/*
    - Source: `functions/index.js` (exported as `api` function, path will be `/api/motor/*` when hosted behind /api)
  - DELETE /session/:sessionId
    - Source: `functions/index.js` (exported as `api` function)


## Frontend references / Examples

- `public/index.html` and `public/test.html` and `public/swagger-test.html` reference these endpoints:
  - POST /api/auth
  - ALL  /api/motor/{path}
  - DELETE /api/session/:id


## Motor API (Swagger) paths (subset)
The repository includes `public/swagger.json` which is the full Motor Web Services OpenAPI/Swagger specification. The full file contains hundreds of paths. Below is a representative (non-exhaustive) subset of paths included in that spec.

Note: those are upstream Motor API paths (e.g. `/v1/Information/...`), and clients should call them through the proxy by using the path after `/api/motor/` (for example: `/api/motor/Information/Chek-Chart/Years`).

- GET /HelloWorld
- GET /Information/Chek-Chart/Years
- GET /Information/Chek-Chart/Years/{Year}/Makes
- GET /Information/Chek-Chart/Years/{Year}/Makes/{MakeCode}/Models
- GET /Information/Chek-Chart/Years/{Year}/Makes/{MakeCode}/Models/{ModelCode}/Engines
- GET /Information/Chek-Chart/Years/{Year}/Makes/{MakeCode}/Models/{ModelCode}/Engines/{EngineCode}/Vehicles
- GET /Information/Content/CommercialPartsInterchange/CrossReferences
- GET /Information/Content/CommercialPartsInterchange/PartSearch
- GET /Information/Content/CommercialPartsInterchange/Providers
- GET /Information/Content/Details/Of/CommercialParts/{CommercialPartsID}
- GET /Information/Vehicles/Attributes/{AttributeType}/{AttributeID}/BaseVehicle

(See `public/swagger.json` for the full list of paths — the file is comprehensive and contains many more endpoints.)


## Notes & Next Steps
- The canonical, user-facing endpoints for this project are:
  - POST /api/auth  (body: { cardNumber })
  - ALL  /api/motor/*  (with `X-Session-Id` header)
  - DELETE /api/session/:id
  - GET /health

- Upstream Motor API endpoints are all available under `/api/motor/{upstream_path}`; consult `public/swagger.json` for the full path list.

- To generate a complete list of swagger paths extracted into a file, run a small script to walk `public/swagger.json` and output all keys under `paths`.

## Usage examples

Below are runnable examples that show the common usage flow: 1) authenticate to get a `sessionId`, 2) call a Motor API endpoint via the proxy, 3) delete the session.

All examples assume the server is running locally at http://localhost:3001 and that you received a valid library card number.

1) Authenticate (get sessionId)

curl example:

```bash
curl -s -X POST http://localhost:3001/api/auth \
  -H 'Content-Type: application/json' \
  -d '{"cardNumber":"1001600244772"}' | jq
```

Node (fetch) example:

```js
// node 18+ or npm i node-fetch
import fetch from 'node-fetch';

const res = await fetch('http://localhost:3001/api/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cardNumber: '1001600244772' })
});
const data = await res.json();
console.log(data);
// { success: true, sessionId: '...', credentials: { ... } }
```

2) Call a Motor API endpoint via the proxy

Example: get years (upstream path `/m1/api/years`)

curl example (replace YOUR_SESSION_ID):

```bash
curl -s "http://localhost:3001/api/motor/m1/api/years" \
  -H "X-Session-Id: YOUR_SESSION_ID" | jq
```

Node (fetch) example:

```js
import fetch from 'node-fetch';

const sessionId = 'YOUR_SESSION_ID';
const res = await fetch('http://localhost:3001/api/motor/m1/api/years', {
  method: 'GET',
  headers: { 'X-Session-Id': sessionId }
});
const years = await res.json();
console.log(years);
```

3) Delete the session

curl example:

```bash
curl -s -X DELETE "http://localhost:3001/api/session/YOUR_SESSION_ID" | jq
```

Node (fetch) example:

```js
import fetch from 'node-fetch';

await fetch(`http://localhost:3001/api/session/${sessionId}`, { method: 'DELETE' });
console.log('session deleted');
```

Notes:
- Use `jq` to pretty-print JSON responses in the curl examples (install via Homebrew: `brew install jq`).
- If your server is deployed behind Firebase Hosting/Functions, replace `http://localhost:3001` with your deployment URL (for example: `https://us-central1-YOUR_PROJECT.cloudfunctions.net/api`).

