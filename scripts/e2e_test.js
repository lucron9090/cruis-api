#!/usr/bin/env node
/*
Simple end-to-end test script for cruis-api

Usage:
  NODE_ENV=development node scripts/e2e_test.js

Environment variables:
  BASE_URL - base URL of the proxy server (default: http://localhost:3001)
  CARD_NUMBER - library card number to use for auth (default: 1001600244772)
*/

const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const CARD_NUMBER = process.env.CARD_NUMBER || '1001600244772';

async function auth() {
  console.log('1) Authenticating...');
  const res = await fetch(`${BASE_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cardNumber: CARD_NUMBER })
  });

  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (data.success && data.sessionId) {
      console.log('  ✓ Auth success, sessionId:', data.sessionId);
      return data.sessionId;
    }
    throw new Error('Auth did not return success');
  } catch (e) {
    console.error('  ✗ Auth failed, response:', text.substring(0, 1000));
    throw e;
  }
}

async function callUpstream(sessionId, upstream, path, method = 'GET') {
  const url = `${BASE_URL}/api/motor/${path}`;
  console.log(`\nCalling upstream='${upstream}' -> ${method} ${url}`);

  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': sessionId,
      'X-Upstream': upstream
    }
  });

  const ct = res.headers.get('content-type') || '';
  const bodyText = await res.text();

  if (ct.includes('application/json')) {
    try {
      const json = JSON.parse(bodyText);
      console.log('  ✓ JSON response, status:', res.status);
      return { ok: true, json };
    } catch (e) {
      console.log('  ⚠️ content-type json but parse failed');
      return { ok: false, text: bodyText };
    }
  }

  // detect HTML
  if (bodyText.trim().startsWith('<') || ct.includes('text/html')) {
    console.log('  ⚠️ HTML response detected (likely wrong endpoint or session issue). Status:', res.status);
    return { ok: false, html: bodyText.slice(0, 1000) };
  }

  // fallback
  console.log('  ℹ️ Unknown content-type:', ct);
  return { ok: true, text: bodyText };
}

async function cleanup(sessionId) {
  console.log('\n3) Deleting session...');
  const res = await fetch(`${BASE_URL}/api/session/${sessionId}`, { method: 'DELETE' });
  const data = await res.text();
  console.log('  Response:', data.substring(0, 500));
}

(async () => {
  try {
    const sessionId = await auth();

    // Call sites upstream with an m1 path
    await callUpstream(sessionId, 'sites', 'm1/api/years');

    // Call api upstream with a swagger path
    await callUpstream(sessionId, 'api', 'Information/YMME/Years');

    await cleanup(sessionId);
    console.log('\nDone');
  } catch (err) {
    console.error('E2E test failed:', err.message || err);
    process.exit(1);
  }
})();
