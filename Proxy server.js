// Tiny proxy for the Market Structure Inspector tool.
// Relays requests to Binance's public API so the browser never talks to
// Binance directly — this sidesteps CORS entirely, and sidesteps Binance's
// geo-blocking if you host this somewhere Binance doesn't restrict.
//
// Setup:
//   npm init -y
//   npm install express cors
//   node proxy-server.js
//
// Requires Node 18+ (for the built-in global fetch).
//
// Deploy anywhere that runs Node (Render, Railway, Fly.io, a VPS, etc).
// Pick a region outside any jurisdiction Binance restricts if you're
// working around a geo-block, not just a CORS issue.

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors()); // allow the browser tool to call this proxy from any origin

const ALLOWED_HOSTS = new Set(['api.binance.com', 'fapi.binance.com']);

app.get('/proxy', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).json({ error: 'missing "url" query param' });

  let parsed;
  try {
    parsed = new URL(target);
  } catch {
    return res.status(400).json({ error: 'invalid url' });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return res.status(403).json({ error: `host not allowed: ${parsed.hostname}` });
  }

  try {
    const upstream = await fetch(target);
    const body = await upstream.text();
    res.status(upstream.status).type('application/json').send(body);
  } catch (err) {
    res.status(502).json({ error: 'upstream fetch failed', detail: String(err) });
  }
});

app.get('/', (req, res) => {
  res.type('text/plain').send('Binance proxy is running. Use GET /proxy?url=<encoded binance api url>');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`proxy listening on port ${port}`));
