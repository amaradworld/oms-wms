/**
 * SupplyHub Security + Data API Worker
 * - Proxies requests to origin with security headers
 * - Serves read-only data API via Hyperdrive (bypasses backend for cached DB queries)
 *
 * Prerequisites:
 *   1. Create Hyperdrive in Cloudflare Dashboard:
 *      - Database: PostgreSQL (Render connection string)
 *      - Name: "supplyhub-db"
 *   2. Copy the Hyperdrive ID and set it below or as a secret
 *
 * Deploy:
 *   cd workers && npm install
 *   npx wrangler deploy security.js --name supplyhub-worker
 *   Route: api.globalsupply.in/*
 */

import { Client } from 'pg';

const BLOCKED_COUNTRIES = [];
const BLOCKED_IPS = [];
const rateLimitMap = new Map();

// ── Data API handlers (served via Hyperdrive) ──────────────────────────

function apiError(msg, status = 400) {
  return Response.json({ error: msg }, { status });
}

async function queryHyperdrive(env, sql, params = []) {
  if (!env.HYPERDRIVE) {
    throw new Error('HYPERDRIVE binding not configured');
  }
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    await client.end();
  }
}

/** GET /api/v1/data/orders */
async function handleOrders(env, url) {
  const limit = Math.min(100, parseInt(url.searchParams.get('limit')) || 20);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset')) || 0);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const warehouseId = url.searchParams.get('warehouseId');

  let where = 'WHERE 1=1';
  const params = [];
  if (from) { params.push(from); where += ` AND o."createdAt" >= $${params.length}`; }
  if (to) { params.push(to); where += ` AND o."createdAt" <= $${params.length}`; }
  if (warehouseId) { params.push(warehouseId); where += ` AND o."warehouseId" = $${params.length}`; }

  params.push(limit);
  params.push(offset);

  const rows = await queryHyperdrive(env, `
    SELECT o.id, o."orderNumber", o."customerName", o."orderStatus", o.source,
           o."createdAt", o."updatedAt", o."warehouseId", o."tenantId"
    FROM "orders" o ${where}
    ORDER BY o."createdAt" DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return Response.json({ orders: rows, limit, offset });
}

/** GET /api/v1/data/inventory */
async function handleInventory(env, url) {
  const limit = Math.min(100, parseInt(url.searchParams.get('limit')) || 20);
  const offset = Math.max(0, parseInt(url.searchParams.get('offset')) || 0);
  const warehouseId = url.searchParams.get('warehouseId');

  let where = 'WHERE 1=1';
  const params = [];
  if (warehouseId) { params.push(warehouseId); where += ` AND i."warehouseId" = $${params.length}`; }

  params.push(limit);
  params.push(offset);

  const rows = await queryHyperdrive(env, `
    SELECT i.id, i."skuId", s."skuCode", s.name, i."quantityOnHand", i."quantityAvailable",
           i."binLocation", i."warehouseId"
    FROM "inventory" i
    LEFT JOIN "sku_masters" s ON s.id = i."skuId"
    ${where}
    ORDER BY s."skuCode" ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  return Response.json({ inventory: rows, limit, offset });
}

// ── Main request handler ───────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    // ── Security Layer ──────────────────────────────────────────────────
    const country = request.cf?.country;
    if (BLOCKED_COUNTRIES.includes(country)) {
      return new Response('Access denied', { status: 403 });
    }
    if (BLOCKED_IPS.includes(clientIP)) {
      return new Response('Access denied', { status: 403 });
    }

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

    // ── Data API via Hyperdrive ────────────────────────────────────────
    if (url.pathname.startsWith('/api/v1/data/')) {
      try {
        const resource = url.pathname.replace('/api/v1/data/', '');
        switch (resource) {
          case 'orders':
            return await handleOrders(env, url);
          case 'inventory':
            return await handleInventory(env, url);
          default:
            return apiError(`Unknown resource: ${resource}`, 404);
        }
      } catch (e) {
        return apiError(e instanceof Error ? e.message : 'Internal error', 500);
      }
    }

    // ── Proxy + Security Headers for everything else ────────────────────
    const response = await fetch(request);
    const newHeaders = new Headers(response.headers);

    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('X-Frame-Options', 'DENY');
    newHeaders.set('X-XSS-Protection', '1; mode=block');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    newHeaders.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

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
