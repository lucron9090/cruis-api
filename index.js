const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to extract cookies from response headers
function extractCookies(headers) {
  const setCookieHeader = headers['set-cookie'];
  if (!setCookieHeader) return '';
  
  return setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
}

// Helper function to extract specific cookie value by name
function getCookieValue(cookies, name) {
  const cookieArray = cookies.split('; ');
  for (const cookie of cookieArray) {
    const [key, value] = cookie.split('=');
    if (key === name) {
      return value;
    }
  }
  return null;
}

// POST /api/auth/ebsco - EBSCO authentication endpoint
app.post('/api/auth/ebsco', async (req, res) => {
  try {
    const { cardNumber, password } = req.body;
    
    if (!cardNumber || !password) {
      return res.status(400).json({ error: 'cardNumber and password are required' });
    }

    // Step 1: GET login page and save cookies
    const requestIdentifier = uuidv4();
    const loginUrl = `https://login.ebsco.com/?custId=s5672256&groupId=main&profId=autorepso&requestIdentifier=${requestIdentifier}`;
    
    console.log('Step 1: Getting login page...');
    const loginPageResponse = await axios.get(loginUrl, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });
    
    const cookies = extractCookies(loginPageResponse.headers);
    console.log('Cookies received:', cookies);

    // Step 2: POST to login API with card number
    console.log('Step 2: Submitting card number...');
    const nextStepUrl = 'https://login.ebsco.com/api/login/v1/prompted/next-step';
    const nextStepResponse = await axios.post(
      nextStepUrl,
      {
        action: 'signin',
        values: {
          prompt: cardNumber
        }
      },
      {
        headers: {
          'Cookie': cookies,
          'Content-Type': 'application/json'
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      }
    );

    // Update cookies if new ones were set
    let updatedCookies = cookies;
    if (nextStepResponse.headers['set-cookie']) {
      const newCookies = extractCookies(nextStepResponse.headers);
      updatedCookies = newCookies || cookies;
    }

    // Step 3: Submit password (if needed - there might be another step)
    console.log('Step 3: Submitting password...');
    const passwordResponse = await axios.post(
      nextStepUrl,
      {
        action: 'signin',
        values: {
          prompt: password
        }
      },
      {
        headers: {
          'Cookie': updatedCookies,
          'Content-Type': 'application/json'
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      }
    );

    // Extract the ebsco-auth-cookie or similar auth token from the response
    let authToken = null;
    
    // Check for redirect and extract cookies
    if (passwordResponse.headers['set-cookie']) {
      const finalCookies = extractCookies(passwordResponse.headers);
      console.log('Final cookies:', finalCookies);
      
      // Try to extract the auth cookie (common names: ebsco-auth, authToken, etc.)
      authToken = getCookieValue(finalCookies, 'ebsco-auth') || 
                  getCookieValue(finalCookies, 'authToken') ||
                  finalCookies; // If specific cookie not found, return all cookies
    }

    // Check response data for auth token
    if (!authToken && passwordResponse.data) {
      if (passwordResponse.data.authToken) {
        authToken = passwordResponse.data.authToken;
      } else if (passwordResponse.data.token) {
        authToken = passwordResponse.data.token;
      }
    }

    // If we have a redirect location, follow it to get the final auth token
    if (passwordResponse.headers.location) {
      console.log('Following redirect to:', passwordResponse.headers.location);
      const redirectResponse = await axios.get(passwordResponse.headers.location, {
        headers: {
          'Cookie': updatedCookies
        },
        maxRedirects: 5,
        validateStatus: (status) => status >= 200 && status < 400
      });

      if (redirectResponse.headers['set-cookie']) {
        const redirectCookies = extractCookies(redirectResponse.headers);
        authToken = getCookieValue(redirectCookies, 'ebsco-auth') || 
                    getCookieValue(redirectCookies, 'authToken') ||
                    redirectCookies;
      }
    }

    if (!authToken) {
      return res.status(401).json({ error: 'Authentication failed - no auth token received' });
    }

    console.log('Authentication successful!');
    res.json({ authToken });

  } catch (error) {
    console.error('EBSCO authentication error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    res.status(500).json({ 
      error: 'Authentication failed',
      message: error.message 
    });
  }
});

// GET /api/ebsco-proxy/* - Proxy endpoint with auth token
app.all('/api/ebsco-proxy/*', async (req, res) => {
  try {
    const authToken = req.headers['x-auth-token'];
    
    if (!authToken) {
      return res.status(401).json({ error: 'X-Auth-Token header is required' });
    }

    // Extract the path after /api/ebsco-proxy/
    const targetPath = req.path.replace('/api/ebsco-proxy/', '');
    const targetUrl = `https://${targetPath}`;

    console.log(`Proxying ${req.method} request to:`, targetUrl);

    // Forward the request with the auth token as a cookie
    const proxyConfig = {
      method: req.method,
      url: targetUrl,
      headers: {
        ...req.headers,
        'Cookie': authToken,
        'host': undefined, // Remove original host header
        'x-auth-token': undefined // Remove our custom header
      },
      data: req.body,
      params: req.query,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 600 // Accept all statuses
    };

    const proxyResponse = await axios(proxyConfig);

    // Forward response headers (except connection-related ones)
    const headersToForward = { ...proxyResponse.headers };
    delete headersToForward['connection'];
    delete headersToForward['transfer-encoding'];
    
    res.status(proxyResponse.status).set(headersToForward).send(proxyResponse.data);

  } catch (error) {
    console.error('Proxy error:', error.message);
    if (error.response) {
      res.status(error.response.status).json({
        error: 'Proxy request failed',
        message: error.message,
        status: error.response.status
      });
    } else {
      res.status(500).json({
        error: 'Proxy request failed',
        message: error.message
      });
    }
  }
});

// ALL /api/motor-proxy/* - Proxy endpoint for Motor.com M1 API
// Uses authentication token from EBSCO (passed via X-Auth-Token header)
app.all('/api/motor-proxy/*', async (req, res) => {
  try {
    const authToken = req.headers['x-auth-token'];
    
    if (!authToken) {
      return res.status(401).json({ 
        error: 'X-Auth-Token header is required',
        message: 'Authenticate first using POST /api/auth/ebsco to get the auth token'
      });
    }

    // Extract the path after /api/motor-proxy/
    const targetPath = req.path.replace('/api/motor-proxy', '');
    const targetUrl = `https://sites.motor.com/m1${targetPath}`;

    console.log(`Proxying ${req.method} request to:`, targetUrl);

    // Forward the request with the auth token as a cookie
    // The EBSCO auth token contains the Motor.com M1 API credentials
    const proxyConfig = {
      method: req.method,
      url: targetUrl,
      headers: {
        ...req.headers,
        'Cookie': authToken,
        'host': undefined, // Remove original host header
        'x-auth-token': undefined // Remove our custom header
      },
      data: req.body,
      params: req.query,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 600 // Accept all statuses
    };

    const proxyResponse = await axios(proxyConfig);

    // Forward response headers (except connection-related ones)
    const headersToForward = { ...proxyResponse.headers };
    delete headersToForward['connection'];
    delete headersToForward['transfer-encoding'];
    
    res.status(proxyResponse.status).set(headersToForward).send(proxyResponse.data);

  } catch (error) {
    console.error('Motor proxy error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      res.status(error.response.status).json({
        error: 'Proxy request failed',
        message: error.message,
        status: error.response.status,
        data: error.response.data
      });
    } else {
      res.status(500).json({
        error: 'Proxy request failed',
        message: error.message
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Proxy Server is running on http://localhost:${PORT}\n`);
  console.log(`📡 Available endpoints:`);
  console.log(`   EBSCO Auth:      POST http://localhost:${PORT}/api/auth/ebsco`);
  console.log(`   EBSCO Proxy:     *    http://localhost:${PORT}/api/ebsco-proxy/*`);
  console.log(`   Motor.com Proxy: *    http://localhost:${PORT}/api/motor-proxy/*`);
  console.log(`   Health Check:    GET  http://localhost:${PORT}/health\n`);
  console.log(`ℹ️  Note: EBSCO authentication returns credentials for Motor.com M1 API`);
});
