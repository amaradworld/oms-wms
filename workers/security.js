/**
 * SupplyHub Security Worker
 * Deploy to Cloudflare Workers to add WAF-like rules, rate limiting, and security headers.
 *
 * Deploy:
 *   1. Install Wrangler: npm install -g wrangler
 *   2. Run: wrangler deploy workers/security.js --name supplyhub-security
 *   3. In Cloudflare dashboard > Workers & Pages > Add route: api.globalsupply.in/*
 */

const BLOCKED_COUNTRIES = []; // e.g. ['XX', 'YY']
const BLOCKED_IPS = [];        // e.g. ['1.2.3.4']

// Per-IP rate limit: 200 req / 60s per IP
const rateLimitMap = new Map();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Block by country
    const country = request.cf?.country;
    if (BLOCKED_COUNTRIES.includes(country)) {
      return new Response('Access denied', { status: 403 });
    }

    // Block by IP
    if (BLOCKED_IPS.includes(clientIP)) {
      return new Response('Access denied', { status: 403 });
    }

    // Rate limit per IP
    const now = Date.now();
    const windowMs = 60_000;
    const maxReq = 200;
    let entry = rateLimitMap.get(clientIP);
    if (!entry || now - entry.windowStart > windowMs) {
      entry = { windowStart: now, count: 0 };
      rateLimitMap.set(clientIP, entry);
    }
    entry.count++;
    if (entry.count > maxReq) {
      return new Response('Too many requests', {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    }

    // Security headers
    const response = await fetch(request);
    const newHeaders = new Headers(response.headers);

    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('X-Frame-Options', 'DENY');
    newHeaders.set('X-XSS-Protection', '1; mode=block');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    newHeaders.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Only set HSTS on HTTPS
    if (url.protocol === 'https:') {
      newHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  },
};
