const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Helper function to extract cookies from response headers
function extractCookies(headers) {
  const setCookieHeader = headers['set-cookie'];
  if (!setCookieHeader) return '';
  
  return setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
}

// Merge existing cookie string with new set-cookie header array
function mergeCookies(existing, setCookieHeader) {
  const map = {};
  if (existing) {
    existing.split('; ').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k) map[k] = v;
    });
  }
  if (setCookieHeader) {
    setCookieHeader.forEach(cookie => {
      const pair = cookie.split(';')[0];
      const [k, v] = pair.split('=');
      if (k) map[k] = v;
    });
  }
  return Object.entries(map).map(([k, v]) => `${k}=${v}`).join('; ');
}

// Follow redirects manually while collecting cookies. Returns final response and aggregated cookies.
async function followRedirectsCollectCookies(startUrl, maxRedirects = 10, initialCookies = '', headers = {}) {
  let currentUrl = startUrl;
  let cookies = initialCookies || '';
  let lastUrl = startUrl;
  const chain = [startUrl];

  for (let i = 0; i < maxRedirects; i++) {
    const resp = await axios.get(currentUrl, {
      headers: {
        ...(headers || {}),
        ...(initialCookies ? { Cookie: initialCookies } : {})
      },
      maxRedirects: 0,
      // Accept all statuses so we can capture 5xx bodies instead of throwing
      validateStatus: (status) => status >= 200 && status < 600
    });

    if (resp.headers['set-cookie']) {
      cookies = mergeCookies(cookies, resp.headers['set-cookie']);
    }

    // If there's a redirect location, resolve and continue
    const loc = resp.headers.location;
    // If upstream returned a 5xx, stop and return current response for inspection
    if (resp.status >= 500) {
      const finalUrl = (resp.request && resp.request.res && resp.request.res.responseUrl) ? resp.request.res.responseUrl : lastUrl;
      return { response: resp, cookies, finalUrl, chain };
    }
    if (loc) {
      currentUrl = loc.startsWith('http') ? loc : new URL(loc, currentUrl).toString();
      lastUrl = currentUrl;
      chain.push(currentUrl);
      // ensure subsequent requests send the collected cookies
      initialCookies = cookies;
      continue;
    }

    // No redirect -> return final
    // Try to discover final request URL from axios internals if available
    const finalUrl = (resp.request && resp.request.res && resp.request.res.responseUrl) ? resp.request.res.responseUrl : lastUrl;
    return { response: resp, cookies, finalUrl, chain };
  }

  throw new Error('Too many redirects');
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

// Extract Motor API credentials from AuthUserInfo cookie
function extractMotorCredentials(cookies) {
  if (!cookies) return null;
  
  const authUserInfo = getCookieValue(cookies, 'AuthUserInfo');
  if (!authUserInfo) return null;
  
  try {
    // Decode base64-encoded JSON
    const decoded = Buffer.from(authUserInfo, 'base64').toString('utf8');
    const creds = JSON.parse(decoded);
    
    // Return relevant Motor API authentication fields
    return {
      PublicKey: creds.PublicKey,
      ApiTokenKey: creds.ApiTokenKey,
      ApiTokenValue: creds.ApiTokenValue,
      ApiTokenExpiration: creds.ApiTokenExpiration,
      UserName: creds.UserName,
      Subscriptions: creds.Subscriptions
    };
  } catch (e) {
    console.warn('Failed to decode AuthUserInfo cookie:', e.message);
    return null;
  }
}

// Build Motor API authentication cookie from credentials
function buildMotorAuthCookie(credentials) {
  const authInfo = {
    PublicKey: credentials.PublicKey,
    ApiTokenKey: credentials.ApiTokenKey,
    ApiTokenValue: credentials.ApiTokenValue,
    ApiTokenExpiration: credentials.ApiTokenExpiration,
    UserName: credentials.UserName || 'TruSpeedTrialEBSCO',
    FirstName: credentials.FirstName || 'TruSpeed Trial',
    LastName: credentials.LastName || 'EBSCO',
    LogoutUrl: credentials.LogoutUrl || '/',
    Subscriptions: credentials.Subscriptions || ['TruSpeed'],
    BypassIdentityServer: true
  };
  
  const base64 = Buffer.from(JSON.stringify(authInfo)).toString('base64');
  return `AuthUserInfo=${base64}`;
}

// Simple in-memory session storage
const sessions = new Map();

function createSession(motorCredentials) {
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    credentials: motorCredentials,
    createdAt: new Date(),
    expiresAt: motorCredentials.ApiTokenExpiration ? new Date(motorCredentials.ApiTokenExpiration) : new Date(Date.now() + 24 * 60 * 60 * 1000)
  });
  return sessionId;
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  // Check if expired
  if (session.expiresAt && new Date() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  
  return session.credentials;
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

// POST /api/auth/ebsco-browser - EBSCO authentication using Puppeteer (headless browser)
app.post('/api/auth/ebsco-browser', async (req, res) => {
  let browser;
  try {
    const { cardNumber } = req.body;

    if (!cardNumber) {
      return res.status(400).json({ error: 'cardNumber is required' });
    }

    console.log('Starting Puppeteer browser authentication...');
    
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set user agent to look like a real browser
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36');
    
    console.log('Navigating to EBSCO login page...');
    // Start from the search.ebscohost URL that triggers OAuth flow
    await page.goto('https://search.ebscohost.com/login.aspx?authtype=ip,cpid&custid=s5672256&groupid=main&profile=autorepso', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Waiting for login form...');
    // Wait for the card number input field
    await page.waitForSelector('input[data-auto="prompt-input"], input#prompt-input', { timeout: 15000 });
    
    console.log('Entering card number:', cardNumber);
    // Fill in the card number
    await page.type('input[data-auto="prompt-input"], input#prompt-input', cardNumber);
    
    // Click submit button
    await page.click('button[data-auto="login-submit-btn"]');
    console.log('Submitted card number, waiting for redirect to Motor...');
    
    // Wait for navigation to Motor or completion
    // We're looking for either sites.motor.com domain or AuthUserInfo cookie
    let motorCredentials = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max
    
    while (attempts < maxAttempts && !motorCredentials) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      attempts++;
      
      const currentUrl = page.url();
      console.log(`Attempt ${attempts}: Current URL: ${currentUrl.substring(0, 80)}...`);
      
      // Check if we've reached Motor domain
      if (currentUrl.includes('motor.com')) {
        console.log('✓ Reached Motor domain!');
        
        // Get all cookies
        const cookies = await page.cookies();
        
        // Look for AuthUserInfo cookie
        const authUserInfoCookie = cookies.find(c => c.name === 'AuthUserInfo');
        
        if (authUserInfoCookie) {
          try {
            // Decode the base64-encoded cookie value
            const decoded = Buffer.from(authUserInfoCookie.value, 'base64').toString('utf-8');
            const credentials = JSON.parse(decoded);
            
            console.log('✓ Motor API credentials extracted!');
            console.log('  PublicKey:', credentials.PublicKey);
            console.log('  ApiTokenExpiration:', credentials.ApiTokenExpiration);
            
            // Store ALL Motor cookies for the session (not just AuthUserInfo)
            const motorCookies = cookies
              .filter(c => c.domain.includes('motor.com'))
              .map(c => `${c.name}=${c.value}`)
              .join('; ');
            
            credentials._allCookies = motorCookies;
            console.log('  Captured', cookies.filter(c => c.domain.includes('motor.com')).length, 'Motor cookies');
            
            motorCredentials = credentials;
            break;
          } catch (e) {
            console.warn('Failed to decode AuthUserInfo cookie:', e.message);
          }
        }
      }
      
      // Check if we're stuck at an error page or login page
      if (currentUrl.includes('login.ebsco.com') && attempts > 10) {
        // Still at login page after 10 seconds, might be an error
        const pageContent = await page.content();
        if (pageContent.includes('error') || pageContent.includes('invalid')) {
          throw new Error('Authentication failed - invalid card number or error page');
        }
      }
    }
    
    await browser.close();
    browser = null;
    
    if (motorCredentials) {
      // Create session with Motor credentials
      const sessionId = createSession(motorCredentials);
      
      return res.json({
        success: true,
        sessionId,
        credentials: motorCredentials,
        message: 'Authentication successful. Use sessionId or credentials for Motor API requests.'
      });
    } else {
      return res.status(500).json({
        error: 'Timeout waiting for Motor credentials',
        message: 'The authentication flow did not reach Motor within 30 seconds'
      });
    }
    
  } catch (error) {
    console.error('Puppeteer authentication error:', error.message);
    if (browser) {
      await browser.close();
    }
    return res.status(500).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
});

// POST /api/auth/ebsco - EBSCO authentication endpoint (axios-based, for legacy)
app.post('/api/auth/ebsco', async (req, res) => {
  try {
    const { cardNumber, password } = req.body;

    // Password is optional for the auth flow; only cardNumber is required
    if (!cardNumber) {
      return res.status(400).json({ error: 'cardNumber is required' });
    }

    // Step 1: GET login page and follow redirects while collecting cookies
  // Start from the search.ebscohost URL that triggers the IP/cpid flow and redirects to EBSCO login
  const requestIdentifier = uuidv4();
  const loginUrl = `https://search.ebscohost.com/login.aspx?authtype=ip,cpid&custid=s5672256&groupid=main&profile=autorepso`;
    console.log('Step 1: Getting login page and following redirects...');

  const { response: loginPageResponse, cookies: cookiesFromLogin, finalUrl, chain } = await followRedirectsCollectCookies(loginUrl);
  const cookies = cookiesFromLogin || extractCookies(loginPageResponse.headers);
  console.log('Cookies received after redirects:', cookies);
  if (finalUrl) console.log('Final URL after initial redirects:', finalUrl);

    // Try to extract any embedded auth context (authRequest / requestIdentifier) from HTML/JS
    let extractedAuthRequest = null;
    // Try to extract authRequest / requestIdentifier and redirect_uri from the final redirect URL query params (seen in HAR)
    try {
      if (finalUrl) {
        const parsed = new URL(finalUrl);
        const authRequestQ = parsed.searchParams.get('authRequest') || parsed.searchParams.get('authrequest');
        const reqIdQ = parsed.searchParams.get('requestIdentifier') || parsed.searchParams.get('requestidentifier');
        const redirectUriQ = parsed.searchParams.get('redirect_uri') || parsed.searchParams.get('redirect_uri');
        if (authRequestQ) {
          extractedAuthRequest = authRequestQ;
          console.log('Extracted authRequest from redirect URL');
        }
        if (reqIdQ) {
          console.log('Found requestIdentifier in redirect URL:', reqIdQ);
        }
        if (redirectUriQ) {
          try {
            // decode redirectUri which may itself contain query params (like state)
            const decoded = decodeURIComponent(redirectUriQ);
            console.log('Found redirect_uri in initial redirect:', decoded);
            // store for later continuation step
            var continuationRedirectUri = decoded;
          } catch (e) {
            console.warn('Failed to decode redirect_uri from finalUrl');
          }
        }
      }
    } catch (e) {
      // ignore parse errors
    }

    // If the redirect chain includes a logon.ebsco.zone oauth authorize URL, call it once to create any state needed
    try {
      const authUrl = (chain || []).find(u => u.includes('logon.ebsco.zone') && u.includes('/api/dispatcher/oauth/authorize'));
      if (authUrl) {
        console.log('Found authorize URL in redirect chain; requesting it to establish oauth state:', authUrl);
        const authResp = await axios.get(authUrl, {
          headers: {
            'Cookie': cookies,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          maxRedirects: 5,
          validateStatus: (s) => s >= 200 && s < 400
        });

        if (authResp.headers['set-cookie']) {
          const merged = mergeCookies(cookies, authResp.headers['set-cookie']);
          console.log('Cookies after authorize call:', merged);
          // update cookie used for next steps
          cookies = merged;
          updatedCookies = merged;
        }
      }
    } catch (e) {
      console.warn('Error requesting authorize URL from chain (continuing anyway):', e.message);
    }

    // Step 2: POST to login API with card number
    console.log('Step 2: Submitting card number...');
    const nextStepUrl = 'https://login.ebsco.com/api/login/v1/prompted/next-step';

    // Build payload; include any extracted auth context when available (helps emulate browser flow seen in HAR)
    const payload = {
      action: 'signin',
      values: {
        prompt: cardNumber,
        passwordPrompt: ''
      }
    };

    // Build a context.original that mirrors the HAR payload structure as closely as possible.
    payload.context = {
      original: {
        authType: 'cpid',
        customerId: 's5672256',
        groupId: 'main',
        profId: 'autorepso',
        requestIdentifier,
        // include redirectUri if we parsed it from the initial redirect
        redirectUri: typeof continuationRedirectUri === 'string' ? continuationRedirectUri : undefined,
        showonlyspecifiedtypes: false,
        isSimplified: false,
        // include authRequest when we extracted one
        ...(extractedAuthRequest ? { authRequest: extractedAuthRequest } : {})
      }
    };

    const browserLikeHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'application/json, text/plain, */*'
    };

    const nextStepResponse = await axios.post(
      nextStepUrl,
      payload,
      {
        headers: {
          'Cookie': cookies,
          'Content-Type': 'application/json',
          'Origin': 'https://login.ebsco.com',
          'Referer': loginUrl,
          ...browserLikeHeaders
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 600
      }
    );

    // Update cookies if new ones were set
    let updatedCookies = cookies;
    if (nextStepResponse.headers['set-cookie']) {
      updatedCookies = mergeCookies(updatedCookies, nextStepResponse.headers['set-cookie']);
    }

    console.log('Card number submission response status:', nextStepResponse.status);
    console.log('Card number submission response data:', JSON.stringify(nextStepResponse.data).substring(0, 500));
    
    // Check if the response contains a context.redirectUri that will lead us to Motor
    let motorRedirectUri = null;
    if (nextStepResponse.data && nextStepResponse.data.context && nextStepResponse.data.context.redirectUri) {
      motorRedirectUri = nextStepResponse.data.context.redirectUri;
      console.log('Found Motor redirect URI in response context:', motorRedirectUri);
    } else if (nextStepResponse.data && nextStepResponse.data.redirectUri) {
      motorRedirectUri = nextStepResponse.data.redirectUri;
      console.log('Found redirect URI in response data:', motorRedirectUri);
    }
    
    // If we found a Motor redirect URI, follow it directly instead of the continuation URI
    if (motorRedirectUri && (motorRedirectUri.includes('search.ebscohost.com') || motorRedirectUri.includes('motor'))) {
      console.log('Using Motor redirect URI from card submission response');
      continuationRedirectUri = motorRedirectUri;
    }

    // Try to extract auth token from the next-step response (some flows don't require password)
    let authToken = null;

    if (nextStepResponse.headers['set-cookie']) {
      console.log('Cookies after card submit (raw set-cookie present)');
      authToken = getCookieValue(updatedCookies, 'ebsco-auth') ||
                  getCookieValue(updatedCookies, 'authToken') ||
                  updatedCookies;
    }

    // Also check response data for token-like fields
    if (!authToken && nextStepResponse.data) {
      if (nextStepResponse.data.authToken) {
        authToken = nextStepResponse.data.authToken;
      } else if (nextStepResponse.data.token) {
        authToken = nextStepResponse.data.token;
      }
    }

    // If we didn't get an auth token yet and a password was provided, submit it
    // If we didn't get an auth token yet and a password was provided, submit it
    if (!authToken && password) {
      console.log('Password provided; submitting password step...');
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

      // Extract from headers first
      if (passwordResponse.headers['set-cookie']) {
        const finalCookies = extractCookies(passwordResponse.headers);
        console.log('Final cookies after password submit:', finalCookies);
        authToken = getCookieValue(finalCookies, 'ebsco-auth') ||
                    getCookieValue(finalCookies, 'authToken') ||
                    finalCookies;
      }

      // Then check response body
      if (!authToken && passwordResponse.data) {
        if (passwordResponse.data.authToken) {
          authToken = passwordResponse.data.authToken;
        } else if (passwordResponse.data.token) {
          authToken = passwordResponse.data.token;
        }
      }

      // If password step produced a redirect, follow it while preserving cookies and try to extract connector params
      if (!authToken && passwordResponse.headers.location) {
        console.log('Following redirect(s) after password submit to locate connector or cookies...');
        try {
          // Follow redirects starting from the location and carry collected cookies
          const { response: finalResp, cookies: finalCookies } = await followRedirectsCollectCookies(
            passwordResponse.headers.location,
            10,
            updatedCookies,
            browserLikeHeaders
          );

          // If final URL is a Motor connector with query params, extract them
          const finalUrl = finalResp.request && finalResp.request.res && finalResp.request.res.responseUrl
            ? finalResp.request.res.responseUrl
            : null;
          if (finalUrl) {
            try {
              const parsed = new URL(finalUrl);
              if (parsed.pathname.includes('/connector')) {
                const pin = parsed.searchParams.get('pin');
                const ApiKey = parsed.searchParams.get('ApiKey');
                const Sig = parsed.searchParams.get('Sig');
                if (pin || ApiKey || Sig) {
                  console.log('Found connector params in redirect URL');
                  return res.json({ connector: { pin, ApiKey, Sig }, cookies: finalCookies });
                }
              }
            } catch (e) {
              // ignore URL parse errors
            }
          }

          // Otherwise, look for connector params encoded in cookies
          if (finalCookies) {
            const connector = extractConnectorFromCookies(finalCookies);
            if (connector) {
              console.log('Found connector params in cookies after redirect');
              return res.json({ connector, cookies: finalCookies });
            }

            const token = getCookieValue(finalCookies, 'ebsco-auth') || getCookieValue(finalCookies, 'authToken') || finalCookies;
            if (token) {
              authToken = token;
            }
          }
        } catch (e) {
          console.warn('Error following redirects after password submit:', e.message);
        }
      }
    }

    // If we still don't have an authToken but nextStepResponse included a location (redirect), follow it and try to find connector params or cookies
    if (!authToken && nextStepResponse.headers.location) {
      console.log('Following redirect(s) after card submit to locate connector or cookies...');
      try {
        const { response: finalResp, cookies: finalCookies } = await followRedirectsCollectCookies(
          nextStepResponse.headers.location,
          10,
          updatedCookies,
          browserLikeHeaders
        );

        const finalUrl = finalResp.request && finalResp.request.res && finalResp.request.res.responseUrl
          ? finalResp.request.res.responseUrl
          : null;
        if (finalUrl) {
          try {
            const parsed = new URL(finalUrl);
            if (parsed.pathname.includes('/connector')) {
              const pin = parsed.searchParams.get('pin');
              const ApiKey = parsed.searchParams.get('ApiKey');
              const Sig = parsed.searchParams.get('Sig');
              if (pin || ApiKey || Sig) {
                console.log('Found connector params in redirect URL');
                return res.json({ connector: { pin, ApiKey, Sig }, cookies: finalCookies });
              }
            }
          } catch (e) {
            // ignore URL parse errors
          }
        }

        if (finalCookies) {
          const token = getCookieValue(finalCookies, 'ebsco-auth') || getCookieValue(finalCookies, 'authToken') || finalCookies;
          if (token) authToken = token;
        }
      } catch (e) {
        console.warn('Error following redirects after card submit:', e.message);
      }
    }

    // If still no token, try the continuation redirect URI that was present in the initial login flow
    if (!authToken && typeof continuationRedirectUri === 'string') {
      console.log('Step 3: Following continuation redirect to complete OAuth flow:', continuationRedirectUri);
      try{
        // Follow redirects with browser-like behavior
        let currentUrl = continuationRedirectUri;
        let currentCookies = updatedCookies;
        let redirectCount = 0;
        const maxRedirects = 20; // Increase max redirects to ensure we reach Motor

        while (redirectCount < maxRedirects) {
          console.log(`  Redirect ${redirectCount + 1}: ${currentUrl.substring(0, 100)}...`);
          
          const redirectResp = await axios.get(currentUrl, {
            headers: {
              'Cookie': currentCookies,
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9'
            },
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 600
          });

          // Merge cookies from each response
          if (redirectResp.headers['set-cookie']) {
            currentCookies = mergeCookies(currentCookies, redirectResp.headers['set-cookie']);
            console.log('  Merged cookies, now have:', currentCookies.substring(0, 200) + '...');
            
            // Check if any cookie contains Motor credentials
            const cookieArray = currentCookies.split(';').map(c => c.trim());
            for (const cookie of cookieArray) {
              if (cookie.includes('ebsco-auth-cookie=')) {
                // Try to decode the JWT to see if it contains Motor info
                const jwtPart = cookie.split('ebsco-auth-cookie=')[1];
                if (jwtPart) {
                  try {
                    const parts = jwtPart.split('.');
                    if (parts[1]) {
                      const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
                      console.log('  ebsco-auth-cookie payload:', payload.substring(0, 300));
                    }
                  } catch (e) {
                    // ignore decode errors
                  }
                }
              }
            }
          }

          // Check if we've reached Motor and have credentials
          if (currentUrl.includes('sites.motor.com') || currentUrl.includes('motor.com/connector')) {
            console.log('  ✓ Reached Motor domain!');
            const motorCredentials = extractMotorCredentials(currentCookies);
            if (motorCredentials) {
              console.log('  ✓ Motor API credentials extracted from AuthUserInfo cookie');
              const sessionId = createSession(motorCredentials);
              return res.json({
                success: true,
                sessionId,
                credentials: motorCredentials,
                message: 'Authentication successful. Use sessionId or credentials for Motor API requests.'
              });
            }
          }

          // If there's a location header, follow it
          if (redirectResp.headers.location) {
            const nextUrl = redirectResp.headers.location.startsWith('http') 
              ? redirectResp.headers.location 
              : new URL(redirectResp.headers.location, currentUrl).toString();
            currentUrl = nextUrl;
            redirectCount++;
            
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            continue;
          }

          // Check if response is 200 but contains data with a redirectUri
          if (redirectResp.status === 200 && redirectResp.data) {
            let redirectUri = null;
            
            // Check if it's JSON with redirectUri
            if (typeof redirectResp.data === 'object' && redirectResp.data.redirectUri) {
              redirectUri = redirectResp.data.redirectUri;
              console.log('  Found redirectUri in 200 response data');
            }
            // Check if it's HTML with meta refresh or window.location
            else if (typeof redirectResp.data === 'string') {
              const metaRefreshMatch = redirectResp.data.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"]*url=([^"']+)/i);
              const windowLocationMatch = redirectResp.data.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i);
              
              if (metaRefreshMatch && metaRefreshMatch[1]) {
                redirectUri = metaRefreshMatch[1];
                console.log('  Found meta refresh redirect in HTML');
              } else if (windowLocationMatch && windowLocationMatch[1]) {
                redirectUri = windowLocationMatch[1];
                console.log('  Found window.location redirect in HTML');
              }
            }
            
            // Special handling: if we're at login.ebsco.com, actually load the page to get cookies, then follow continuation
            if (!redirectUri && currentUrl.includes('login.ebsco.com')) {
              try {
                console.log('  At login.ebsco.com, loading page HTML to establish cookies...');
                
                // Load the actual HTML page (not the API endpoint) to get cookies set
                const loginPageResp = await axios.get(currentUrl, {
                  headers: {
                    'Cookie': currentCookies,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9'
                  },
                  maxRedirects: 0,
                  validateStatus: (status) => status >= 200 && status < 600
                });
                
                console.log('  Login page response status:', loginPageResp.status);
                
                // Merge cookies from login page
                if (loginPageResp.headers['set-cookie']) {
                  currentCookies = mergeCookies(currentCookies, loginPageResp.headers['set-cookie']);
                  console.log('  Merged cookies from login page');
                }
                
                // If login page returned a redirect, follow it instead of extracting from URL params
                if (loginPageResp.headers.location) {
                  console.log('  Login page returned redirect, following it');
                  redirectUri = loginPageResp.headers.location.startsWith('http')
                    ? loginPageResp.headers.location
                    : new URL(loginPageResp.headers.location, currentUrl).toString();
                  continue;
                }
                
                const parsed = new URL(currentUrl);
                const callbackUri = parsed.searchParams.get('redirect_uri');
                const authRequestParam = parsed.searchParams.get('authRequest');
                
                // Follow the continuation URL (dispatcher/continue/prompted) which will complete OAuth
                if (callbackUri && (callbackUri.includes('continue/prompted') || callbackUri.includes('PromptedCallback'))) {
                  console.log('  Following OAuth continuation/callback URI from URL params');
                  
                  // If the continuation URL doesn't have the required params, add them from the login.ebsco.com URL
                  const callbackUrl = new URL(callbackUri);
                  if (!callbackUrl.searchParams.has('authContextRef')) {
                    const authContextRef = parsed.searchParams.get('authContextRef');
                    const requestIdentifier = parsed.searchParams.get('requestIdentifier');
                    if (authContextRef) callbackUrl.searchParams.set('authContextRef', authContextRef);
                    if (requestIdentifier) callbackUrl.searchParams.set('requestIdentifier', requestIdentifier);
                    console.log('  Added requestIdentifier:', requestIdentifier);
                  }
                  
                  // Add authRequest if present in the login.ebsco.com URL
                  if (authRequestParam && !callbackUrl.searchParams.has('authRequest')) {
                    callbackUrl.searchParams.set('authRequest', authRequestParam);
                    console.log('  Added authRequest parameter to continuation URL');
                  }
                  
                  redirectUri = callbackUrl.toString();
                }
              } catch (e) {
                console.warn('  Error loading login page:', e.message);
              }
            }
            
            if (redirectUri) {
              const nextUrl = redirectUri.startsWith('http') 
                ? redirectUri 
                : new URL(redirectUri, currentUrl).toString();
              currentUrl = nextUrl;
              redirectCount++;
              
              await new Promise(resolve => setTimeout(resolve, 100));
              continue;
            }
          }

          // No more redirects, check for credentials one more time
          const motorCredentials = extractMotorCredentials(currentCookies);
          if (motorCredentials) {
            console.log('  ✓ Motor API credentials found after redirect chain');
            const sessionId = createSession(motorCredentials);
            return res.json({
              success: true,
              sessionId,
              credentials: motorCredentials,
              message: 'Authentication successful. Use sessionId or credentials for Motor API requests.'
            });
          }

          // No more redirects and no credentials
          console.log('  Redirect chain ended with status:', redirectResp.status);
          if (redirectResp.status >= 400) {
            console.log('  Error response body:', typeof redirectResp.data === 'string' ? redirectResp.data.substring(0, 500) : JSON.stringify(redirectResp.data).substring(0, 500));
          }
          console.log('  Final URL:', currentUrl);
          authToken = currentCookies;
          break;
        }

        if (redirectCount >= maxRedirects) {
          console.warn('  Maximum redirects reached without finding Motor credentials');
        }
      } catch (e) {
        console.warn('Error following continuation redirect URI:', e.message);
      }
    }

    // Last resort: check if we have Motor credentials in any collected cookies
    const motorCreds = extractMotorCredentials(updatedCookies);
    if (motorCreds) {
      console.log('✓ Motor API credentials found in cookies');
      const sessionId = createSession(motorCreds);
      return res.json({
        success: true,
        sessionId,
        credentials: motorCreds,
        message: 'Authentication successful. Use sessionId or credentials for Motor API requests.'
      });
    }

    if (!authToken) {
      return res.status(401).json({ error: 'Authentication failed - no auth token or Motor credentials received' });
    }

    console.log('Authentication successful (legacy EBSCO token)');
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

// Helper function to generate HMAC-SHA256 signature for Motor API
// Following Motor DaaS authentication spec (page 7)
function generateMotorSignature(publicKey, privateKey, httpVerb, epoch, uriPath) {
  const crypto = require('crypto');
  // SignatureData = PublicKey\nHTTP_VERB\nEpoch\nURIPath
  const signatureData = `${publicKey}\n${httpVerb}\n${epoch}\n${uriPath}`;
  const hmac = crypto.createHmac('sha256', privateKey);
  hmac.update(signatureData);
  return hmac.digest('base64');
}

// POST /api/motor/token - Create Motor API token
app.post('/api/motor/token', async (req, res) => {
  try {
    // Extract credentials from request body or session
    const { sessionId, PublicKey, ApiTokenKey, ApiTokenValue } = req.body;
    
    let credentials;
    if (sessionId) {
      credentials = getSession(sessionId);
      if (!credentials) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
    } else if (PublicKey && ApiTokenKey && ApiTokenValue) {
      credentials = { PublicKey, ApiTokenKey, ApiTokenValue };
    } else {
      return res.status(400).json({ error: 'Either sessionId or credentials (PublicKey, ApiTokenKey, ApiTokenValue) required' });
    }

    // Generate authentication signature per Motor DaaS spec
    const httpVerb = 'POST';
    const uriPath = '/v1/Token';
    const date = new Date();
    const dateString = date.toUTCString();
    const epoch = Math.floor(date.getTime() / 1000);
    
    // ApiTokenValue is actually the Private Key
    const privateKey = credentials.ApiTokenValue;
    const publicKey = credentials.PublicKey;
    
    const signature = generateMotorSignature(publicKey, privateKey, httpVerb, epoch, uriPath);
    const authHeader = `Shared ${publicKey}:${signature}`;

    console.log('Creating Motor token with signed request:', {
      PublicKey: publicKey,
      Epoch: epoch,
      Date: dateString
    });

    // Call Motor API to create token with proper authentication
    const tokenResponse = await axios.post(
      'https://api.motor.com/v1/Token',
      {},
      {
        headers: {
          'Authorization': authHeader,
          'Date': dateString,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Host': 'api.motor.com'
        }
      }
    );

    console.log('Motor token created successfully');
    res.json(tokenResponse.data);
  } catch (error) {
    console.error('Motor token creation error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
      res.status(error.response.status).json({
        error: 'Motor API request failed',
        message: error.message,
        data: error.response.data
      });
    } else {
      res.status(500).json({
        error: 'Motor API request failed',
        message: error.message
      });
    }
  }
});

// ALL /api/motor/* - Motor API proxy endpoint (uses Puppeteer browser context)
app.all('/api/motor/*', async (req, res) => {
  let browser = null;
  
  try {
    // Extract credentials from headers or query params
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;
    const publicKey = req.headers['x-public-key'] || req.query.PublicKey;
    const apiTokenKey = req.headers['x-api-token-key'] || req.query.ApiTokenKey;
    const apiTokenValue = req.headers['x-api-token-value'] || req.query.ApiTokenValue;

    let credentials;
    if (sessionId) {
      credentials = getSession(sessionId);
      if (!credentials) {
        return res.status(401).json({ error: 'Invalid or expired session' });
      }
    } else if (publicKey && apiTokenKey && apiTokenValue) {
      credentials = {
        PublicKey: publicKey,
        ApiTokenKey: apiTokenKey,
        ApiTokenValue: apiTokenValue
      };
    } else {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Provide X-Session-Id header or X-Public-Key/X-Api-Token-Key/X-Api-Token-Value headers'
      });
    }

    // Extract the Motor API path (everything after /api/motor/)
    const motorPath = req.path.replace('/api/motor/', '');
    
    // Motor swagger specifies api.motor.com/v1 as the base
    const targetUrl = `https://api.motor.com/${motorPath}`;
    
    // Build full URL with query parameters
    const url = new URL(targetUrl);
    Object.keys(req.query).forEach(key => {
      if (key !== 'sessionId' && key !== 'PublicKey' && key !== 'ApiTokenKey' && key !== 'ApiTokenValue') {
        url.searchParams.set(key, req.query[key]);
      }
    });

    console.log(`Proxying ${req.method} via Puppeteer: ${url.toString()}`);

    // Launch browser with cookies from session
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set all captured cookies from Puppeteer session
    if (credentials._allCookies) {
      const cookiePairs = credentials._allCookies.split('; ');
      for (const pair of cookiePairs) {
        const [name, ...valueParts] = pair.split('=');
        const value = valueParts.join('=');
        try {
          await page.setCookie({
            name,
            value,
            domain: '.motor.com',
            path: '/'
          });
        } catch (e) {
          console.warn(`Could not set cookie ${name}:`, e.message);
        }
      }
    } else {
      // Fallback: set AuthUserInfo cookie from credentials
      const authCookie = buildMotorAuthCookie(credentials);
      const authUserInfo = authCookie.replace('AuthUserInfo=', '');
      await page.setCookie({
        name: 'AuthUserInfo',
        value: authUserInfo,
        domain: '.motor.com',
        path: '/'
      });
    }

    // Navigate to Motor to establish session
    await page.goto('https://sites.motor.com/m1/', { 
      waitUntil: 'networkidle0', 
      timeout: 30000 
    });
    
    // Determine base host: if path begins with m1/ it's likely the web UI (sites.motor.com)
    let finalUrl = url.toString();
    try {
      const pathAfterHost = new URL(finalUrl).pathname;
      // no-op, kept for clarity
    } catch (e) {
      // ignore
    }

    // Make API request from browser context using fetch, parsing HTML for embedded JSON when needed
    const result = await page.evaluate(async (url, method, bodyData) => {
      const tryParseJSON = (str) => {
        try {
          return JSON.parse(str);
        } catch (e) {
          return null;
        }
      };

      const extractJsonFromHtml = (html) => {
        // 1) Look for <script type="application/json"> or application/ld+json
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          const scripts = Array.from(doc.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]'));
          for (const s of scripts) {
            const txt = s.textContent && s.textContent.trim();
            if (txt) {
              const parsed = tryParseJSON(txt);
              if (parsed) return parsed;
            }
          }

          // 2) Search inline scripts for common bootstrapped variables e.g. window.__INITIAL_STATE__ = {...}; or window.__DATA__ = {...};
          const inlineScripts = Array.from(doc.scripts).map(s => s.textContent || '').join('\n');
          const patterns = [
            /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*;/m,
            /window\.__DATA__\s*=\s*(\{[\s\S]*?\})\s*;/m,
            /var\s+initialState\s*=\s*(\{[\s\S]*?\})\s*;/m,
            /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\})\s*;/m
          ];

          for (const re of patterns) {
            const m = inlineScripts.match(re);
            if (m && m[1]) {
              const parsed = tryParseJSON(m[1]);
              if (parsed) return parsed;
            }
          }

          // 3) Fallback: look for any <div data-json> or elements with JSON in data-* attributes
          const dataEls = Array.from(doc.querySelectorAll('[data-json], [data-state], [data-props]'));
          for (const el of dataEls) {
            const txt = el.getAttribute('data-json') || el.getAttribute('data-state') || el.getAttribute('data-props');
            if (txt) {
              const parsed = tryParseJSON(txt);
              if (parsed) return parsed;
            }
          }
        } catch (e) {
          // ignore parse errors
        }

        return null;
      };

      try {
        const options = {
          method,
          headers: {
            'Accept': 'application/json, text/javascript, text/html, */*',
            'Content-Type': 'application/json'
          },
          credentials: 'same-origin'
        };

        if (method !== 'GET' && method !== 'HEAD' && bodyData) {
          options.body = JSON.stringify(bodyData);
        }

        const response = await fetch(url, options);
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json') || contentType.includes('text/javascript')) {
          const data = await response.json();
          return { status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers.entries()), data, dataType: 'json' };
        }

        // If HTML returned, attempt to extract embedded JSON
        const text = await response.text();
        const parsed = extractJsonFromHtml(text);
        if (parsed) {
          return { status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers.entries()), data: parsed, dataType: 'embedded-json' };
        }

        // No JSON found — return the HTML wrapped inside JSON so caller always receives JSON
        return { status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers.entries()), data: { html: text }, dataType: 'html' };
      } catch (error) {
        return { error: error.message, stack: error.stack };
      }
    }, finalUrl, req.method, req.method !== 'GET' && req.method !== 'HEAD' ? req.body : null);

    await browser.close();
    browser = null;

    if (result.error) {
      return res.status(500).json({
        error: 'Motor API request failed in browser',
        message: result.error
      });
    }

    // Ensure we always return JSON. If the page returned HTML we wrapped it in { html: '...' }.
    // If embedded JSON was found, return it directly.
    if (result.dataType === 'json' || result.dataType === 'embedded-json') {
      return res.status(result.status).json(result.data);
    }

    // For html or unknown types, return a JSON wrapper containing the HTML string and some metadata
    return res.status(result.status).json({
      _meta: {
        statusText: result.statusText,
        dataType: result.dataType || 'unknown'
      },
      data: result.data
    });

  } catch (error) {
    console.error('Motor API proxy error:', error.message);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({
      error: 'Motor API proxy failed',
      message: error.message
    });
  }
});

// DELETE /api/session/:sessionId - Delete session
app.delete('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  deleteSession(sessionId);
  res.json({ success: true, message: 'Session deleted' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST   /api/auth/ebsco          - Authenticate with EBSCO library card`);
  console.log(`  *      /api/motor/*             - Proxy to Motor API (requires session or credentials)`);
  console.log(`  POST   /api/motor/token         - Create Motor API token`);
  console.log(`  DELETE /api/session/:sessionId  - Delete session`);
  console.log(`  GET    /health                  - Health check`);
  console.log(`\nExample usage:`);
  console.log(`  1. Authenticate: POST /api/auth/ebsco with {"cardNumber":"1001600244772"}`);
  console.log(`  2. Use Motor API: GET /api/motor/year/2024/makes with X-Session-Id header`);
});
