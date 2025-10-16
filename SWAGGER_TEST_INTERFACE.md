# 🚗 Motor API Swagger Test Interface

## Overview

The Swagger Test Interface is an interactive, user-friendly web application that automatically generates test forms for all API endpoints defined in `swagger.json`. It provides a seamless way to test Motor API endpoints with visual feedback and easy-to-use controls.

## Features

### 🎯 **Auto-Generated Endpoint List**
- Automatically reads `swagger.json` and displays all endpoints
- Organized by categories: Authentication, Motor API, Proxy, Health
- Color-coded HTTP methods (GET, POST, PUT, DELETE)
- Click any endpoint to load its test form

### 🔧 **Smart Parameter Handling**
- Auto-detects path parameters, headers, and request body
- Pre-fills example values from Swagger documentation
- Validates required fields before submission
- Session management with automatic X-Session-Id header injection

### ⚡ **Quick Fill Examples**
For Motor API endpoints, one-click buttons to test common scenarios:
- 📅 **Get Years** - Loads `m1/api/years`
- 🏭 **Get Makes** - Loads `m1/api/year/2024/makes`
- 🚗 **Get Models** - Loads `m1/api/year/2024/make/Cadillac/models`
- 📋 **Get Vehicle Info** - Loads `m1/api/source/GeneralMotors/100347105/motorvehicles`

### 📊 **Response Visualization**
- Displays HTTP status code with color coding
- Shows response time in milliseconds
- Displays Content-Type header
- Pretty-printed JSON responses
- Dark theme code viewer for better readability

### 🔐 **Automatic Session Management**
- Stores session ID in localStorage after authentication
- Automatically includes session ID in Motor API requests
- Visual session status indicator in header
- Persists across page reloads

## Usage

### Access the Interface

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open in browser:**
   ```
   http://localhost:3001/swagger-test.html
   ```

   Or from the main page, click the **"🚗 Motor API Swagger Interface"** button.

### Quick Start Guide

#### Step 1: Authenticate
1. Click **"POST /api/auth"** in the sidebar (under Authentication)
2. Enter your library card number (e.g., `1001600244772`)
3. Click **"🚀 Send Request"**
4. Session ID is automatically saved

#### Step 2: Test Motor API Endpoints
1. Select any endpoint from **"Motor API"** group in sidebar
2. Use **Quick Fill** buttons to load example values
3. Click **"🚀 Send Request"** to test
4. View formatted response below

### Example: Get Vehicle Makes for 2024

1. Click **"GET /api/motor/{endpoint}"** in sidebar
2. Click the **"🏭 Get Makes (2024)"** quick fill button
3. The endpoint field will populate with: `m1/api/year/2024/makes`
4. Click **"🚀 Send Request"**
5. View the list of makes in the response

### Example: Get Vehicle Details

1. Click **"GET /api/motor/{endpoint}"** in sidebar
2. Click the **"📋 Get Vehicle Info"** quick fill button
3. The endpoint will populate with: `m1/api/source/GeneralMotors/100347105/motorvehicles`
4. Click **"🚀 Send Request"**
5. View detailed vehicle information

## Interface Sections

### 📈 Status Bar
- **Server Status**: Shows if connected to backend (green = connected)
- **Session Status**: Shows authentication status and session ID
- **Active Sessions**: Number of active sessions on server

### 📚 Endpoint Sidebar
Left sidebar showing all available endpoints grouped by:
- **Authentication** - Login and auth endpoints
- **Motor API** - Vehicle data endpoints  
- **Proxy** - Generic proxy endpoints
- **Health** - Server health check

### 🎨 Content Panel
Main area showing:
- Endpoint details (method, path, description)
- Quick fill buttons for common examples
- Parameter input forms
- Request/response viewer

## API Endpoints Available

### Authentication
- **POST /api/auth** - Authenticate with library card

### Motor API (All require authentication)
- **GET /api/motor/{endpoint}** - Dynamic Motor API proxy
  - Example endpoints you can test:
    - `m1/api/years`
    - `m1/api/year/2024/makes`
    - `m1/api/year/2024/make/Cadillac/models`
    - `m1/api/source/GeneralMotors/100347105/motorvehicles`

### Health
- **GET /health** - Check server status

## Tips & Tricks

### 💡 Using Quick Fill Buttons
The quick fill buttons automatically populate the endpoint field with working examples. After clicking, just hit "Send Request" to test immediately.

### 💡 Session Persistence
Your session is saved in localStorage and automatically included in all Motor API requests. The session persists even if you reload the page.

### 💡 Response Format
All responses are automatically formatted for readability:
- JSON is pretty-printed with indentation
- Status codes are color-coded (green=success, red=error)
- Response time helps identify performance issues

### 💡 Error Handling
If you see an HTML response error, it means you've hit a web page endpoint instead of an API endpoint. Use endpoints starting with `/m1/api/` for JSON responses.

## Comparison with Other Interfaces

### Swagger Test Interface (This)
✅ Auto-generated from swagger.json  
✅ One-click example tests  
✅ Clean, modern UI  
✅ Automatic session management  
✅ Quick fill buttons  
✅ Best for: Quick testing of documented endpoints

### Advanced Test Interface (`/test.html`)
✅ Manual endpoint input  
✅ Full control over requests  
✅ Session management tools  
✅ Best for: Custom requests and debugging

### Main API Interface (`/index.html`)
✅ Documentation and examples  
✅ Traditional form-based testing  
✅ Best for: Understanding API structure

## Troubleshooting

### Server Status Shows "Disconnected"
- Ensure the server is running: `npm start`
- Check if port 3001 is available
- Verify no firewall blocking localhost

### "Not Authenticated" Status
- Click on "POST /api/auth" in sidebar
- Enter valid library card number
- Session will auto-save on successful auth

### Endpoint Returns HTML Instead of JSON
- Use endpoints starting with `/m1/api/` for JSON responses
- Web page routes like `/m1/vehicles` return HTML
- Check the Quick Fill examples for correct endpoints

### Response Not Showing
- Check browser console for errors (F12)
- Verify Content-Type is `application/json`
- Ensure endpoint path is correct

## File Location

**Interface:** `/public/swagger-test.html`  
**Swagger Spec:** `/public/swagger.json`  
**Main Server:** `/server.js`

## Updates and Customization

### Adding New Endpoints
1. Update `swagger.json` with new endpoint definition
2. Reload the page - endpoint appears automatically!
3. No code changes needed in the test interface

### Customizing Quick Fill Examples
Edit the `quickFillExample()` function in `swagger-test.html`:
```javascript
const examples = {
    years: { endpoint: 'm1/api/years' },
    makes: { endpoint: 'm1/api/year/2024/makes' },
    // Add your custom examples here
};
```

## Benefits

1. **No Manual Configuration** - Reads swagger.json automatically
2. **Always Up-to-Date** - Reflects changes in swagger.json instantly
3. **User-Friendly** - Clean UI with helpful tooltips and examples
4. **Fast Testing** - One-click examples for common scenarios
5. **Session Management** - Automatic auth header injection
6. **Visual Feedback** - Color-coded status and formatted responses

## Links

- Main Interface: http://localhost:3001/
- Swagger Test: http://localhost:3001/swagger-test.html
- Advanced Test: http://localhost:3001/test.html
- Swagger JSON: http://localhost:3001/swagger.json

---

**Built with ❤️ for easy Motor API testing**
