# Cruis-API Proxy Server

Express.js proxy server that handles authentication and proxying for EBSCO and Motor.com M1 API.

## Features

- **EBSCO Authentication**: Authenticates with EBSCO using card number and password
- **EBSCO Proxy**: Proxies requests to EBSCO resources with authentication
- **Motor.com M1 API Proxy**: Proxies requests to Motor.com M1 API using EBSCO credentials
- **CORS Enabled**: Allows cross-origin requests from Angular frontend

## Installation

```bash
npm install
```

## Usage

### Start the Server

```bash
npm start
```

Server will start on **http://localhost:3001**

## API Endpoints

### 1. EBSCO Authentication

Authenticate with EBSCO to get credentials for Motor.com M1 API.

**Endpoint:** `POST /api/auth/ebsco`

**Request:**
```json
{
  "cardNumber": "your-card-number",
  "password": "your-password"
}
```

**Response:**
```json
{
  "authToken": "cookie1=value1; cookie2=value2; ..."
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/auth/ebsco \
  -H "Content-Type: application/json" \
  -d '{
    "cardNumber": "12345678",
    "password": "mypassword"
  }'
```

### 2. EBSCO Proxy

Proxy requests to EBSCO resources with authentication.

**Endpoint:** `* /api/ebsco-proxy/*`

**Headers Required:**
- `X-Auth-Token`: The auth token from EBSCO authentication

**Example:**
```bash
curl http://localhost:3001/api/ebsco-proxy/search.ebsco.com/api/search \
  -H "X-Auth-Token: your-auth-token"
```

### 3. Motor.com M1 API Proxy

Proxy requests to Motor.com M1 API using EBSCO credentials.

**Endpoint:** `* /api/motor-proxy/*`

**Headers Required:**
- `X-Auth-Token`: The auth token from EBSCO authentication

**Example:**
```bash
curl http://localhost:3001/api/motor-proxy/api/years \
  -H "X-Auth-Token: your-auth-token"
```

**Available Motor.com endpoints:**
- `GET /api/years` - Get available years
- `GET /api/year/{year}/makes` - Get makes for a year
- `GET /api/year/{year}/make/{make}/models` - Get models
- `GET /api/source/{source}/vehicle/{id}/articles/v2` - Search articles
- And more...

### 4. Health Check

Check if the server is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok"
}
```

## How It Works

### Authentication Flow

1. **Client** sends card number and password to `/api/auth/ebsco`
2. **Proxy Server** performs multi-step authentication with EBSCO:
   - Gets login page and initial cookies
   - Submits card number
   - Submits password
   - Follows redirects to get final auth cookies
3. **EBSCO** returns authentication cookies/token
4. **Proxy Server** returns the auth token to client
5. **Client** stores the auth token for subsequent requests

### Proxying Flow

1. **Client** makes request to proxy endpoint with `X-Auth-Token` header
2. **Proxy Server** extracts the target URL from the request path
3. **Proxy Server** forwards the request with auth token as cookies
4. **Target API** (EBSCO or Motor.com) processes the authenticated request
5. **Proxy Server** returns the response to the client

## Integration with Angular Frontend

The Angular app at `/Users/phobosair/unwebpack-sourcemap/output` includes:

- **HTTP Interceptor**: Automatically routes API requests through this proxy
- **Auth Token Management**: Stores and sends auth tokens with requests

See `PROXY_INTEGRATION.md` in the Angular app for detailed setup instructions.

## Configuration

### Port

Default port is `3001`. To change it, modify the `PORT` constant in `index.js`:

```javascript
const PORT = 3001;
```

### EBSCO Configuration

The EBSCO authentication URL is configured in `index.js`:

```javascript
const loginUrl = `https://login.ebsco.com/?custId=s5672256&groupId=main&profId=autorepso&requestIdentifier=${requestIdentifier}`;
```

## Dependencies

- **express** - Web framework
- **cors** - CORS middleware
- **axios** - HTTP client
- **uuid** - UUID generation

## Development

### Project Structure

```
cruis-api/
├── index.js           # Main server file
├── package.json       # Dependencies and scripts
└── README.md          # This file
```

### Adding New Endpoints

Add new routes in `index.js`:

```javascript
app.post('/api/my-endpoint', async (req, res) => {
  // Your logic here
});
```

## Error Handling

The proxy includes comprehensive error handling:

- **400**: Missing required parameters
- **401**: Authentication failed or missing auth token
- **500**: Server errors with detailed messages
- **Proxy errors**: Includes original error status and data

## Logging

The server logs all important operations:

- Authentication attempts
- Cookie extraction
- Proxy requests
- Errors with details

Check the console output for debugging information.

## Security Considerations

⚠️ **Important:**

1. **Local Development Only**: This server is for local development
2. **No Production Use**: Never deploy this to production
3. **Credentials**: Keep your EBSCO credentials secure
4. **CORS**: Configured for local development (any origin)
5. **HTTPS**: Consider adding SSL for production-like testing

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Authentication Fails

- Verify card number and password are correct
- Check EBSCO service status
- Review server logs for detailed error messages

### Proxy Requests Fail

- Ensure auth token is valid and not expired
- Check that `X-Auth-Token` header is being sent
- Verify target URL is correct

## Testing

### Test Authentication

```bash
curl -X POST http://localhost:3001/api/auth/ebsco \
  -H "Content-Type: application/json" \
  -d '{"cardNumber":"YOUR_CARD","password":"YOUR_PASSWORD"}'
```

### Test Health

```bash
curl http://localhost:3001/health
```

### Test Motor.com Proxy

```bash
curl http://localhost:3001/api/motor-proxy/api/years \
  -H "X-Auth-Token: YOUR_TOKEN"
```

## License

ISC

## Author

Created for the Motor.com M1 Angular application integration.

---

**Note**: EBSCO authentication returns the credentials needed for Motor.com M1 API access.
