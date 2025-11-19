# YourCar API Documentation

Complete API documentation for the YourCar Vehicle Information System proxy service.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Vehicle Selection](#vehicle-selection)
  - [Search](#search)
  - [Articles & Assets](#articles--assets)
  - [Parts](#parts)
  - [Labor Operations](#labor-operations)
  - [Maintenance Schedules](#maintenance-schedules)
  - [Bookmarks](#bookmarks)
  - [Track Change](#track-change)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Examples](#examples)
- [OpenAPI Schema](#openapi-schema)

## Overview

The YourCar API is a proxy service that provides authenticated access to Motor.com M1 endpoints through a Firebase Cloud Function. The proxy handles authentication automatically using Playwright with a library card, eliminating the need for client-side authentication.

**Key Features:**
- Automatic server-side authentication
- Single shared session for all clients
- CORS-enabled for web applications
- Binary image support
- Comprehensive error handling

## Base URL

**Production:**
```
https://motorproxy-erohrfg7qa-uc.a.run.app
```

**Local Development:**
```
http://localhost:5001
```

All API endpoints are prefixed with `/api/motor-proxy` when accessed through the proxy, but the proxy automatically routes requests to the correct Motor.com M1 endpoints.

## Authentication

Authentication is handled **automatically** by the server. No authentication headers or tokens are required from clients.

**How it works:**
1. The server maintains a single authentication session using Playwright
2. Authentication is performed automatically when needed
3. Sessions are cached and reused until expiration
4. All requests are automatically authenticated

**Session Management:**
- Sessions expire based on Motor.com token expiration (typically 24 hours)
- Expired sessions are automatically renewed
- Multiple concurrent requests share the same session

## Response Structure

**Important:** Most API endpoints return responses in the following structure:

```json
{
  "header": {
    "messages": [],
    "date": "Wed, 19 Nov 2025 06:22:13 GMT",
    "status": "OK",
    "statusCode": 200
  },
  "body": { /* actual response data */ }
}
```

- **`header`**: Contains metadata about the response including status, date, and any messages
- **`body`**: Contains the actual response data (array, object, or primitive value)
- **Exception**: The `/health` endpoint returns a different structure without the `header`/`body` wrapper

When accessing response data, use `response.body` (or `response.data` for the health endpoint).

## Endpoints

### Health Check

#### `GET /health`

Check the health status of the API proxy and authentication session.

**Response:**
```json
{
  "status": "ok",
  "authenticated": true,
  "sessionId": "31018b43-ed6b-42f4-b7c3-8628cfede94c",
  "expiresAt": "2025-11-19T16:11:51.000Z",
  "timestamp": "2025-11-19T06:22:12.447Z"
}
```

**Real Example Response (tested 2025-11-19):**
```json
{
  "status": "ok",
  "authenticated": true,
  "sessionId": "31018b43-ed6b-42f4-b7c3-8628cfede94c",
  "expiresAt": "2025-11-19T16:11:51.000Z",
  "timestamp": "2025-11-19T06:22:12.447Z"
}
```

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/health
```

---

### Vehicle Selection

#### `GET /api/years`

Get all available vehicle model years.

**Response:**
```json
{
  "header": {
    "messages": [],
    "date": "Wed, 19 Nov 2025 06:22:13 GMT",
    "status": "OK",
    "statusCode": 200
  },
  "body": [1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
}
```

**Note:** The actual response includes a `header` object with metadata and a `body` array containing the years. Access the years via `response.body`.

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/years
```

---

#### `GET /api/year/{year}/makes`

Get all vehicle makes for a specific year.

**Path Parameters:**
- `year` (integer, required): Vehicle model year (e.g., 2024)

**Response:**
```json
{
  "header": {
    "messages": [],
    "date": "Wed, 19 Nov 2025 06:22:19 GMT",
    "status": "OK",
    "statusCode": 200
  },
  "body": [
    {
      "makeId": 2,
      "makeName": "Porsche"
    },
    {
      "makeId": 3,
      "makeName": "Hyundai"
    },
    {
      "makeId": 7,
      "makeName": "Fiat"
    },
    {
      "makeId": 11,
      "makeName": "Land Rover"
    },
    {
      "makeId": 13,
      "makeName": "Subaru"
    },
    {
      "makeId": 20,
      "makeName": "Jaguar"
    },
    {
      "makeId": 21,
      "makeName": "Kia"
    },
    {
      "makeId": 26,
      "makeName": "Volvo"
    },
    {
      "makeId": 30,
      "makeName": "BMW"
    },
    {
      "makeId": 31,
      "makeName": "Toyota"
    }
  ]
}
```

**Note:** The response includes a `header` object and a `body` array containing make objects with `makeId` and `makeName` properties. Access makes via `response.body`.

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/year/2024/makes
```

---

#### `GET /api/year/{year}/make/{make}/models`

Get all vehicle models for a specific make and year.

**Path Parameters:**
- `year` (integer, required): Vehicle model year
- `make` (string, required): Vehicle make (e.g., "Toyota")

**Response:**
```json
{
  "header": {
    "messages": [],
    "date": "Wed, 19 Nov 2025 06:22:20 GMT",
    "status": "OK",
    "statusCode": 200
  },
  "body": {
    "contentSource": "Toyota",
    "models": [
      {
        "model": "4Runner",
        "id": "2024:Toyota:4Runner:"
      },
      {
        "model": "86",
        "id": "2024:Toyota:86:"
      },
      {
        "model": "Avanza",
        "id": "2024:Toyota:Avanza:"
      },
      {
        "model": "Camry",
        "id": "2024:Toyota:Camry:"
      },
      {
        "model": "Camry HV",
        "id": "2024:Toyota:Camry HV:"
      },
      {
        "model": "Corolla",
        "id": "2024:Toyota:Corolla:"
      }
    ]
  }
}
```

**Note:** The response includes a `header` object and a `body` object containing `contentSource` and a `models` array. Each model has a `model` name and an `id` (vehicle identifier). Access models via `response.body.models`. The `id` field is the vehicle identifier used in subsequent API calls.

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/year/2024/make/Toyota/models
```

---

#### `POST /api/source/{contentSource}/vehicles`

Get detailed information for multiple vehicles.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier (`Motor`, `AllData`, `Mitchell`, `Identifix`)

**Request Body:**
```json
{
  "vehicleIds": ["12345", "67890"]
}
```

**Response:**
```json
[
  {
    "id": "12345",
    "name": "2024 Toyota Camry",
    "year": 2024,
    "make": "Toyota",
    "model": "Camry"
  }
]
```

**Example:**
```bash
curl -X POST https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/vehicles \
  -H "Content-Type: application/json" \
  -d '{"vehicleIds": ["12345"]}'
```

---

#### `GET /api/source/{contentSource}/{vehicleId}/motorvehicles`

Get motor vehicle details including engine and submodel information.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier
- `vehicleId` (string, required): Vehicle identifier

**Response:**
```json
{
  "data": [
    {
      "id": "67890",
      "model": "Camry LE",
      "engines": [
        {
          "id": "engine-123",
          "name": "2.5L 4-Cylinder"
        }
      ]
    }
  ]
}
```

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/12345/motorvehicles
```

---

#### `GET /api/source/{contentSource}/{vehicleId}/name`

Get the display name for a vehicle.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier
- `vehicleId` (string, required): Vehicle identifier

**Response:**
```json
{
  "data": "2024 Toyota Camry"
}
```

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/12345/name
```

---

### Search

#### `GET /api/source/{contentSource}/vehicle/{vehicleId}/articles/v2`

Search for articles matching a vehicle and optional search term.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier
- `vehicleId` (string, required): Vehicle identifier

**Query Parameters:**
- `searchTerm` (string, optional): Search term to filter articles
- `motorVehicleId` (string, optional): Motor vehicle ID for engine/submodel filtering

**Response:**
```json
{
  "articleDetails": [
    {
      "id": "article-123",
      "title": "Brake Pad Replacement",
      "description": "Step-by-step guide for replacing brake pads",
      "category": "Brakes"
    }
  ],
  "filterTabs": [
    {
      "id": "tab-1",
      "name": "All",
      "type": "All",
      "count": 150
    }
  ],
  "vehicleGeoBlockingDetails": {
    "isBlocked": false,
    "reason": null
  }
}
```

**Example:**
```bash
curl "https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/vehicle/12345/articles/v2?searchTerm=brake%20pad&motorVehicleId=67890"
```

---

### Articles & Assets

#### `GET /api/source/{contentSource}/vehicle/{vehicleId}/article/{articleId}`

Get the full HTML content of an article.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier
- `vehicleId` (string, required): Vehicle identifier
- `articleId` (string, required): Article identifier

**Response:**
HTML content (text/html)

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/vehicle/12345/article/article-123
```

---

#### `GET /api/source/{contentSource}/vehicle/{vehicleId}/article/{articleId}/title`

Get the title of an article.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier
- `vehicleId` (string, required): Vehicle identifier
- `articleId` (string, required): Article identifier

**Response:**
```json
{
  "data": "Brake Pad Replacement"
}
```

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/vehicle/12345/article/article-123/title
```

---

#### `GET /api/source/{contentSource}/xml/{articleId}`

Get the raw XML content of an article.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier
- `articleId` (string, required): Article identifier

**Response:**
XML content (application/xml)

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/xml/article-123
```

---

#### `GET /api/source/{contentSource}/graphic/{id}`

Get a graphic or image asset.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier
- `id` (string, required): Graphic/image identifier

**Response:**
Binary image data (image/jpeg, image/png, image/svg+xml, etc.)

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/graphic/graphic-123 \
  --output image.jpg
```

**Note:** The proxy automatically detects image requests and handles binary data correctly.

---

### Parts

#### `GET /api/source/{contentSource}/vehicle/{vehicleId}/parts`

Get all parts associated with a vehicle.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier
- `vehicleId` (string, required): Vehicle identifier

**Query Parameters:**
- `motorVehicleId` (string, optional): Motor vehicle ID for engine/submodel filtering

**Response:**
```json
[
  {
    "id": "part-123",
    "partNumber": "12345-67890",
    "description": "Brake Pad Set",
    "quantity": 2
  }
]
```

**Example:**
```bash
curl "https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/vehicle/12345/parts?motorVehicleId=67890"
```

---

### Labor Operations

#### `GET /api/source/{contentSource}/vehicle/{vehicleId}/labor/{articleId}`

Get detailed labor operation information for an article.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier
- `vehicleId` (string, required): Vehicle identifier
- `articleId` (string, required): Article identifier

**Response:**
```json
{
  "mainOperation": {
    "id": "labor-123",
    "description": "Replace Brake Pads",
    "laborTime": 1.5
  }
}
```

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/vehicle/12345/labor/article-123
```

---

### Maintenance Schedules

#### `GET /api/source/{contentSource}/vehicle/{vehicleId}/maintenanceSchedules/frequency`

Get maintenance schedules organized by frequency.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier
- `vehicleId` (string, required): Vehicle identifier

**Response:**
```json
{
  "data": [
    {
      "frequency": "Every 5,000 miles",
      "schedules": [...]
    }
  ]
}
```

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/vehicle/12345/maintenanceSchedules/frequency
```

---

#### `GET /api/source/{contentSource}/vehicle/{vehicleId}/maintenanceSchedules/intervals`

Get maintenance schedules organized by interval type.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier
- `vehicleId` (string, required): Vehicle identifier

**Response:**
```json
{
  "data": {
    "time": [...],
    "mileage": [...]
  }
}
```

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/vehicle/12345/maintenanceSchedules/intervals
```

---

#### `GET /api/source/{contentSource}/vehicle/{vehicleId}/maintenanceSchedules/indicators`

Get maintenance indicators and their associated schedules.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier
- `vehicleId` (string, required): Vehicle identifier

**Response:**
```json
{
  "data": [
    {
      "indicator": "Oil Change",
      "schedules": [...]
    }
  ]
}
```

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/vehicle/12345/maintenanceSchedules/indicators
```

---

### Bookmarks

#### `POST /api/source/{contentSource}/vehicle/{vehicleId}/article/{articleId}/bookmark`

Save a bookmark for an article.

**Path Parameters:**
- `contentSource` (string, required): Content source identifier
- `vehicleId` (string, required): Vehicle identifier
- `articleId` (string, required): Article identifier

**Response:**
```json
{
  "success": true
}
```

**Example:**
```bash
curl -X POST https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/vehicle/12345/article/article-123/bookmark
```

---

### Track Change

#### `GET /api/source/track-change/processingquarters`

Get available processing quarters for track change reports.

**Response:**
```json
["2024-Q1", "2024-Q2", "2023-Q4", ...]
```

**Example:**
```bash
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/track-change/processingquarters
```

---

#### `GET /api/source/track-change/deltareport`

Get a delta report showing changes for a vehicle.

**Query Parameters:**
- `vehicleId` (string, required): Vehicle identifier
- `processingQuarter` (string, required): Processing quarter (e.g., "2024-Q1")

**Response:**
```json
{
  "vehicleId": "12345",
  "processingQuarter": "2024-Q1",
  "changes": [...]
}
```

**Example:**
```bash
curl "https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/track-change/deltareport?vehicleId=12345&processingQuarter=2024-Q1"
```

---

## Error Handling

The API uses standard HTTP status codes:

- **200 OK**: Request successful
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication failed (should not occur with automatic auth)
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

**Error Response Format:**
```json
{
  "header": {
    "messages": [
      {
        "code": "500.0000001",
        "shortDescription": "Unhandled Exception",
        "longDescription": "An unhandled exception has occurred",
        "type": "Error"
      }
    ],
    "date": "Wed, 19 Nov 2025 06:22:29 GMT",
    "status": "Internal Server Error",
    "statusCode": 500
  }
}
```

**Real Example Error Response (tested 2025-11-19):**
```json
{
  "header": {
    "messages": [
      {
        "code": "500.0000001",
        "shortDescription": "Unhandled Exception",
        "longDescription": "An unhandled exception has occurred",
        "type": "Error"
      }
    ],
    "date": "Wed, 19 Nov 2025 06:22:29 GMT",
    "status": "Internal Server Error",
    "statusCode": 500
  }
}
```

**Note:** Error responses follow the same structure as successful responses, with a `header` object containing error information. Check `header.statusCode` and `header.messages` for error details.

---

## Rate Limiting

Currently, there are no explicit rate limits enforced. However, the following considerations apply:

- **Session Management**: All requests share a single authentication session
- **Concurrent Requests**: Multiple requests can be processed simultaneously
- **Timeout**: Requests timeout after 30 seconds
- **Best Practice**: Implement client-side rate limiting to avoid overwhelming the service

---

## Examples

### Complete Vehicle Selection Flow

```bash
# 1. Get available years
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/years

# 2. Get makes for 2024
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/year/2024/makes

# 3. Get models for 2024 Toyota
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/year/2024/make/Toyota/models

# 4. Get vehicle details
curl -X POST https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/vehicles \
  -H "Content-Type: application/json" \
  -d '{"vehicleIds": ["12345"]}'
```

### Search and Retrieve Article

```bash
# 1. Search for articles
curl "https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/vehicle/12345/articles/v2?searchTerm=brake"

# 2. Get article content
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/vehicle/12345/article/article-123

# 3. Get article image
curl https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy/api/source/Motor/graphic/graphic-123 \
  --output diagram.jpg
```

### JavaScript/TypeScript Example

```typescript
const BASE_URL = 'https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy';

// Get years
async function getYears() {
  const response = await fetch(`${BASE_URL}/api/years`);
  const data = await response.json();
  return data.data;
}

// Search articles
async function searchArticles(vehicleId: string, searchTerm: string) {
  const url = `${BASE_URL}/api/source/Motor/vehicle/${vehicleId}/articles/v2?searchTerm=${encodeURIComponent(searchTerm)}`;
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

// Get article content
async function getArticle(vehicleId: string, articleId: string) {
  const response = await fetch(`${BASE_URL}/api/source/Motor/vehicle/${vehicleId}/article/${articleId}`);
  const html = await response.text();
  return html;
}
```

### Python Example

```python
import requests

BASE_URL = 'https://motorproxy-erohrfg7qa-uc.a.run.app/api/motor-proxy'

# Get years
def get_years():
    response = requests.get(f'{BASE_URL}/api/years')
    return response.json()['data']

# Search articles
def search_articles(vehicle_id, search_term):
    url = f'{BASE_URL}/api/source/Motor/vehicle/{vehicle_id}/articles/v2'
    params = {'searchTerm': search_term}
    response = requests.get(url, params=params)
    return response.json()

# Get article content
def get_article(vehicle_id, article_id):
    url = f'{BASE_URL}/api/source/Motor/vehicle/{vehicle_id}/article/{article_id}'
    response = requests.get(url)
    return response.text
```

---

## OpenAPI Schema

A complete OpenAPI 3.0 schema is available in `API_SCHEMA.yaml`. You can use this schema with tools like:

- **Swagger UI**: Visual API documentation
- **Postman**: Import for API testing
- **OpenAPI Generator**: Generate client SDKs
- **API Gateway**: Configure API routing

**View the schema:**
```bash
cat API_SCHEMA.yaml
```

**Use with Swagger UI:**
1. Visit https://editor.swagger.io/
2. File → Import File → Select `API_SCHEMA.yaml`
3. View interactive API documentation

---

## Additional Resources

- **Frontend Application**: https://studio-534897447-7a1e7.web.app
- **GitHub Repository**: https://github.com/lucronn/cruis-api
- **Firebase Console**: https://console.firebase.google.com/

---

## Support

For issues or questions:
1. Check the health endpoint: `GET /health`
2. Review server logs in Firebase Console
3. Open an issue on GitHub

---

**Last Updated:** January 2024  
**API Version:** 1.0.0

