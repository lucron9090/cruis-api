const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Lightweight in-memory cache
const cache = new Map();
function setCache(key, value, ttlMs = 30 * 1000) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}
function getCache(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { cache.delete(key); return null; }
  return e.value;
}

// Helper to build headers forwarded to the local proxy
function buildForwardHeaders(req) {
  const headers = {
    'Accept': 'application/json'
  };
  if (req.headers['x-session-id']) headers['X-Session-Id'] = req.headers['x-session-id'];
  if (req.query.session) headers['X-Session-Id'] = req.query.session;
  if (req.headers['x-correlation-id']) headers['X-Correlation-Id'] = req.headers['x-correlation-id'];
  return headers;
}

async function proxyGet(url, headers) {
  const resp = await axios.get(url, { headers, validateStatus: () => true, timeout: 8000 });
  return resp;
}

// Normalize motor lists to { items: [ {id,name}, ... ] }
function normalizeList(records, idFn = r => String(r), nameFn = r => String(r)) {
  if (!Array.isArray(records)) return { items: [] };
  return { items: records.map(r => ({ id: idFn(r), name: nameFn(r) })) };
}

// Exported handlers (for use in functions/index.js or as standalone express routes)
module.exports = {
  async getYears(req, res) {
    try {
      const cacheKey = 'vehicle:years';
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);

      const headers = buildForwardHeaders(req);
      const url = `${process.env.PROXY_BASE || ''}/api/motor/m1/api/years`;
      const r = await proxyGet(url, headers);

      if (String(r.headers['content-type'] || '').includes('text/html')) {
        return res.status(502).json({ error: 'UPSTREAM_HTML', message: 'Upstream returned HTML. Check session or endpoint.' });
      }

      if (r.status !== 200) {
        return res.status(502).json({ error: 'UPSTREAM_ERROR', message: `Upstream returned ${r.status}` });
      }

      // Motor API likely returns an array of years (e.g., [2025,2024,...])
      const payload = normalizeList(r.data, y => String(y), y => String(y));
      setCache(cacheKey, payload, 30 * 1000);
      return res.json(payload);

    } catch (err) {
      console.error('[vehicle.getYears] Error', err.message);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  },

  async getMakes(req, res) {
    try {
      const { year } = req.query;
      if (!year) return res.status(400).json({ error: 'missing_param', message: 'year is required' });
      const cacheKey = `vehicle:makes:${year}`;
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);

      const headers = buildForwardHeaders(req);
      const url = `${process.env.PROXY_BASE || ''}/api/motor/m1/api/year/${encodeURIComponent(year)}/makes`;
      const r = await proxyGet(url, headers);

      if (String(r.headers['content-type'] || '').includes('text/html')) {
        return res.status(502).json({ error: 'UPSTREAM_HTML', message: 'Upstream returned HTML. Check session or endpoint.' });
      }

      if (r.status !== 200) {
        return res.status(502).json({ error: 'UPSTREAM_ERROR', message: `Upstream returned ${r.status}` });
      }

      // Motor may return an array of make strings or objects
      const items = Array.isArray(r.data) ? r.data : [];
      const payload = normalizeList(items, m => (m && m.id) ? String(m.id) : String(m).toLowerCase(), m => (m && m.name) ? String(m.name) : String(m));
      setCache(cacheKey, payload, 30 * 1000);
      return res.json(payload);

    } catch (err) {
      console.error('[vehicle.getMakes] Error', err.message);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  },

  async getModels(req, res) {
    try {
      const { year, make } = req.query;
      if (!year || !make) return res.status(400).json({ error: 'missing_param', message: 'year and make are required' });
      const cacheKey = `vehicle:models:${year}:${make}`;
      const cached = getCache(cacheKey);
      if (cached) return res.json(cached);

      const headers = buildForwardHeaders(req);
      const url = `${process.env.PROXY_BASE || ''}/api/motor/m1/api/year/${encodeURIComponent(year)}/make/${encodeURIComponent(make)}/models`;
      const r = await proxyGet(url, headers);

      if (String(r.headers['content-type'] || '').includes('text/html')) {
        return res.status(502).json({ error: 'UPSTREAM_HTML', message: 'Upstream returned HTML. Check session or endpoint.' });
      }

      if (r.status !== 200) {
        return res.status(502).json({ error: 'UPSTREAM_ERROR', message: `Upstream returned ${r.status}` });
      }

      // Normalize models array
      const items = Array.isArray(r.data) ? r.data : [];
      const payload = normalizeList(items, m => (m && m.id) ? String(m.id) : String(m).toLowerCase(), m => (m && m.name) ? String(m.name) : String(m));
      setCache(cacheKey, payload, 30 * 1000);
      return res.json(payload);

    } catch (err) {
      console.error('[vehicle.getModels] Error', err.message);
      return res.status(500).json({ error: 'server_error', message: err.message });
    }
  }
};
