# Motor API Proxy - Test Interface Guide

## Access the Test Interface

Open your browser to: **http://localhost:3001/test.html**

## Features

### 1. **Real-time Status Bar**
- **Server Status**: Shows if the backend is connected
- **Session Status**: Shows your authentication state
- **Active Sessions**: Total number of active sessions on the server

### 2. **Authentication Section**
- Pre-filled with test card number: `1001600244772`
- Click "🔐 Authenticate" to start Puppeteer-based EBSCO login
- Wait ~6-8 seconds for browser automation to complete
- Session ID is automatically saved to localStorage
- View full response including credentials in the response box

### 3. **API Call Section**
- **Example Endpoints**: Click any example to auto-fill
  - `m1/vehicles` - Motor vehicles page
  - `m1/api/vehicles` - Motor API vehicles endpoint
  - `m1/api/ui/css/bootstrap` - Bootstrap CSS endpoint
  
- **HTTP Methods**: GET, POST, PUT, DELETE
- **Custom Endpoints**: Enter any path after `/api/motor/`
- **Request Body**: Automatically shown for POST/PUT requests
- Disabled until you authenticate
- View formatted JSON responses

### 4. **Session Management**
- **🏥 Check Server Health**: Query `/health` endpoint
- **🗑️ Clear Session**: Remove from localStorage (keeps server session)
- **❌ Delete Session from Server**: Delete from server and localStorage
- **📋 Copy Session ID**: Copy session UUID to clipboard

## Quick Start

1. **Start the server** (if not running):
   ```bash
   cd /Users/phobosair/Documents/GitHub/cruis-api
   node server.js
   ```

2. **Open the test interface**:
   ```
   http://localhost:3001/test.html
   ```

3. **Authenticate**:
   - The card number is pre-filled
   - Click "🔐 Authenticate"
   - Wait for green success message

4. **Make API calls**:
   - Click an example endpoint or enter your own
   - Click "🚀 Send Request"
   - View the JSON response

## Features

### Visual Feedback
- ✅ **Success messages**: Green with checkmark
- ❌ **Error messages**: Red with cross
- 🔄 **Loading states**: Animated spinners on buttons
- 🎨 **Modern UI**: Gradient backgrounds, smooth animations

### Session Persistence
- Sessions are saved to **localStorage**
- Survive page refreshes
- Automatically restored on page load

### Response Display
- **Formatted JSON**: Pretty-printed with 2-space indentation
- **Scrollable**: Max height with scroll for long responses
- **Monospace font**: Easy to read code/JSON

### Error Handling
- Network errors caught and displayed
- HTTP error codes shown in messages
- Full error details in response box

## Example Workflow

```
1. Open http://localhost:3001/test.html
2. Status shows "Server: Connected"
3. Click "🔐 Authenticate" (wait ~6-8 sec)
4. Status shows "Session: Active (25250659...)"
5. Click "m1/vehicles" example endpoint
6. Click "🚀 Send Request"
7. View Motor vehicles page HTML wrapped in JSON
```

## Troubleshooting

### Server shows "Disconnected"
- Check if `node server.js` is running
- Verify port 3001 is not in use

### Authentication fails
- Check card number is correct
- Look at auth response for error details
- EBSCO service must be accessible

### API calls return 401
- Session may have expired
- Click "Clear Session" then re-authenticate
- Check sessionId is in localStorage

### Proxy returns HTML instead of JSON
- This is expected for web UI endpoints
- HTML is wrapped in `{"html": "..."}`
- Try different endpoints like `/m1/api/*`

## Advanced Usage

### Custom Endpoints
Try these paths after `/api/motor/`:
- `m1/vehicles`
- `m1/api/vehicles`
- `m1/api/ui/css/bootstrap`
- `m1/api/makes`
- `m1/api/models`

### POST Requests
1. Select "POST" method
2. Request body field appears
3. Enter JSON:
   ```json
   {
     "year": 2024,
     "make": "Toyota"
   }
   ```
4. Send request

### Session Management
- Sessions expire based on Motor's `ApiTokenExpiration`
- Default: 24 hours
- Delete and re-authenticate when expired

## Browser Compatibility

Tested on:
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

Requires:
- JavaScript enabled
- localStorage support
- Fetch API support

## Tips

1. **Keep the interface open** while testing - session persists
2. **Use browser DevTools** to see network requests
3. **Check server logs** for detailed Puppeteer output
4. **Copy session ID** to use in curl/Postman
5. **Use example endpoints** for quick testing

## Keyboard Shortcuts

- **Enter** in card number field → Submit auth
- **Enter** in endpoint field → Send request
- **Cmd/Ctrl + R** → Refresh (preserves session)

## Color Coding

- 🟢 **Green**: Success, connected, active
- 🔴 **Red**: Error, disconnected, failed
- 🔵 **Blue**: Info, neutral, pending
- 🟡 **Yellow**: Warning, examples, help

Enjoy testing! 🚗
