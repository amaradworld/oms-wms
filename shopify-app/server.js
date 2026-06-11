import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Shopify } from '@shopify/shopify-api';
import crypto from 'crypto';
import { Pool } from 'pg';

// ─── Shopify API Initialization ───────────────────────────────────────────────
Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: (process.env.SHOPIFY_SCOPES || '').split(','),
  HOST_NAME: process.env.SHOPIFY_APP_URL?.replace(/https?:\/\//, ''),
  API_VERSION: '2024-10',
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

// ─── Database ─────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS shopify_shops (
      id SERIAL PRIMARY KEY,
      shop_domain VARCHAR(255) UNIQUE NOT NULL,
      access_token TEXT NOT NULL,
      scope TEXT,
      installed_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS shopify_marketplace_configs (
      id SERIAL PRIMARY KEY,
      shop_domain VARCHAR(255) NOT NULL,
      marketplace VARCHAR(50) NOT NULL,
      api_key TEXT,
      api_secret TEXT,
      seller_id TEXT,
      sync_enabled BOOLEAN DEFAULT true,
      last_sync_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(shop_domain, marketplace)
    );
    CREATE TABLE IF NOT EXISTS shopify_order_mappings (
      id SERIAL PRIMARY KEY,
      shop_domain VARCHAR(255) NOT NULL,
      marketplace VARCHAR(50) NOT NULL,
      marketplace_order_id VARCHAR(255) NOT NULL,
      shopify_order_id VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      synced_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(shop_domain, marketplace, marketplace_order_id)
    );
  `);
  console.log('[DB] Tables initialized');
}

// ─── Express Setup ────────────────────────────────────────────────────────────
const app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { secure: true, sameSite: 'none' },
}));

// ─── Helper: Verify Shopify HMAC ──────────────────────────────────────────────
function verifyShopifyHmac(query) {
  const hmac = query.hmac;
  const params = { ...query };
  delete params.hmac;
  delete params.signature;
  const message = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const expected = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET).update(message).digest('hex');
  return hmac === expected;
}

// ─── OAuth: Install Flow ──────────────────────────────────────────────────────
app.get('/auth', async (req, res) => {
  const shop = req.query.shop;
  if (!shop) return res.status(400).json({ error: 'Missing shop parameter' });

  const authRoute = await Shopify.Auth.beginAuth({
    shop,
    callbackPath: '/auth/callback',
    isOnline: false,
  });
  res.redirect(authRoute);
});

app.get('/auth/callback', async (req, res) => {
  try {
    const { shop, session } = await Shopify.Auth.validateAuthCallback(req, res, req.query);
    const accessToken = session.accessToken;

    // Store shop token in database
    await pool.query(
      `INSERT INTO shopify_shops (shop_domain, access_token, scope, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (shop_domain) DO UPDATE SET access_token = $2, scope = $3, updated_at = NOW()`,
      [shop, accessToken, session.scope]
    );

    console.log(`[Auth] Shop installed: ${shop}`);

    // Register webhooks
    await registerWebhooks(shop, accessToken);

    // Redirect to app dashboard
    res.redirect(`https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`);
  } catch (error) {
    console.error('[Auth] Callback error:', error);
    res.redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
});

// ─── Webhook Registration ─────────────────────────────────────────────────────
async function registerWebhooks(shop, accessToken) {
  const client = new Shopify.Clients.Rest(shop, accessToken);
  const webhooks = [
    { topic: 'orders/create', address: `${process.env.SHOPIFY_APP_URL}/webhooks/orders/create` },
    { topic: 'orders/updated', address: `${process.env.SHOPIFY_APP_URL}/webhooks/orders/updated` },
    { topic: 'inventory_levels/update', address: `${process.env.SHOPIFY_APP_URL}/webhooks/inventory/update` },
  ];

  for (const webhook of webhooks) {
    try {
      await client.post({
        path: 'webhooks.json',
        data: { webhook: { topic: webhook.topic, address: webhook.address, format: 'json' } },
      });
      console.log(`[Webhook] Registered: ${webhook.topic}`);
    } catch (err) {
      console.error(`[Webhook] Failed to register ${webhook.topic}:`, err.message);
    }
  }
}

// ─── Webhook: Orders from Marketplace ─────────────────────────────────────────
app.post('/webhooks/orders/create', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const shop = req.headers['x-shopify-shop-domain'];
    const hmac = req.headers['x-shopify-hmac-sha256'];
    const rawBody = req.body.toString();

    // Verify webhook
    const expectedHmac = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET).update(rawBody).digest('base64');
    if (hmac !== expectedHmac) {
      console.error('[Webhook] Invalid HMAC from', shop);
      return res.status(401).send('Unauthorized');
    }

    const order = JSON.parse(rawBody);
    console.log(`[Webhook] New Shopify order ${order.order_number} from ${shop}`);

    // Log to order_mappings for tracking
    await pool.query(
      `INSERT INTO shopify_order_mappings (shop_domain, marketplace, marketplace_order_id, shopify_order_id, status)
       VALUES ($1, 'SHOPIFY', $2, $3, 'synced')
       ON CONFLICT (shop_domain, marketplace, marketplace_order_id) DO UPDATE SET status = 'synced', shopify_order_id = $3`,
      [shop, String(order.id), String(order.id)]
    );

    res.status(200).send('OK');
  } catch (err) {
    console.error('[Webhook] Order create error:', err);
    res.status(200).send('OK'); // Always 200 to avoid retries
  }
});

app.post('/webhooks/orders/updated', express.raw({ type: 'application/json' }), async (req, res) => {
  res.status(200).send('OK');
});

app.post('/webhooks/inventory/update', express.raw({ type: 'application/json' }), async (req, res) => {
  res.status(200).send('OK');
});

// ─── API: Shop Status ─────────────────────────────────────────────────────────
app.get('/api/shop', async (req, res) => {
  try {
    const session = await Shopify.Auth.validateAuthCallback(req, res, req.query);
    const shop = session.shop;

    const result = await pool.query('SELECT * FROM shopify_shops WHERE shop_domain = $1', [shop]);
    const marketplaceConfigs = await pool.query(
      'SELECT * FROM shopify_marketplace_configs WHERE shop_domain = $1', [shop]
    );

    res.json({
      shop,
      installed: result.rows.length > 0,
      marketplaces: marketplaceConfigs.rows,
    });
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// ─── API: Marketplace Config ──────────────────────────────────────────────────
app.post('/api/marketplace/config', async (req, res) => {
  try {
    const { shop, marketplace, apiKey, apiSecret, sellerId } = req.body;
    if (!shop || !marketplace) return res.status(400).json({ error: 'shop and marketplace required' });

    await pool.query(
      `INSERT INTO shopify_marketplace_configs (shop_domain, marketplace, api_key, api_secret, seller_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (shop_domain, marketplace) DO UPDATE SET api_key = $3, api_secret = $4, seller_id = $5`,
      [shop, marketplace, apiKey, apiSecret, sellerId]
    );

    res.json({ success: true, message: `${marketplace} configured for ${shop}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Sync Orders from Marketplace ────────────────────────────────────────
app.post('/api/sync/orders', async (req, res) => {
  try {
    const { shop, marketplace } = req.body;
    if (!shop || !marketplace) return res.status(400).json({ error: 'shop and marketplace required' });

    // Get marketplace config
    const config = await pool.query(
      'SELECT * FROM shopify_marketplace_configs WHERE shop_domain = $1 AND marketplace = $2',
      [shop, marketplace]
    );
    if (config.rows.length === 0) return res.status(404).json({ error: 'Marketplace not configured' });

    // Get shop access token
    const shopData = await pool.query('SELECT * FROM shopify_shops WHERE shop_domain = $1', [shop]);
    if (shopData.rows.length === 0) return res.status(404).json({ error: 'Shop not found' });

    const cfg = config.rows[0];
    const accessToken = shopData.rows[0].access_token;

    // Fetch orders from marketplace
    const orders = await fetchMarketplaceOrders(marketplace, cfg);
    console.log(`[Sync] Fetched ${orders.length} orders from ${marketplace} for ${shop}`);

    // Push orders to Shopify
    const client = new Shopify.Clients.Rest(shop, accessToken);
    let synced = 0;
    for (const order of orders) {
      try {
        const existing = await pool.query(
          'SELECT id FROM shopify_order_mappings WHERE shop_domain = $1 AND marketplace = $2 AND marketplace_order_id = $3',
          [shop, marketplace, order.id]
        );
        if (existing.rows.length > 0) continue; // Skip duplicates

        // Create draft order in Shopify
        const response = await client.post({
          path: 'draft_orders.json',
          data: {
            draft_order: {
              line_items: order.items.map(item => ({
                title: item.name,
                sku: item.skuCode,
                quantity: item.quantity,
                price: String(item.unitPrice),
              })),
              shipping_address: parseAddress(order.shippingAddress, order.customerName),
              note: `[${marketplace}] Order ${order.orderNumber}`,
            },
          },
        });

        const shopifyOrderId = response.body.draft_order.id;
        await pool.query(
          `INSERT INTO shopify_order_mappings (shop_domain, marketplace, marketplace_order_id, shopify_order_id, status)
           VALUES ($1, $2, $3, $4, 'synced')`,
          [shop, marketplace, order.id, String(shopifyOrderId)]
        );
        synced++;
      } catch (err) {
        console.error(`[Sync] Failed to sync order ${order.id}:`, err.message);
      }
    }

    // Update last sync time
    await pool.query(
      'UPDATE shopify_marketplace_configs SET last_sync_at = NOW() WHERE shop_domain = $1 AND marketplace = $2',
      [shop, marketplace]
    );

    res.json({ success: true, total: orders.length, synced, marketplace });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Sync Inventory to Marketplace ───────────────────────────────────────
app.post('/api/sync/inventory', async (req, res) => {
  try {
    const { shop, marketplace } = req.body;
    if (!shop || !marketplace) return res.status(400).json({ error: 'shop and marketplace required' });

    const config = await pool.query(
      'SELECT * FROM shopify_marketplace_configs WHERE shop_domain = $1 AND marketplace = $2',
      [shop, marketplace]
    );
    if (config.rows.length === 0) return res.status(404).json({ error: 'Marketplace not configured' });

    const cfg = config.rows[0];
    const shopData = await pool.query('SELECT * FROM shopify_shops WHERE shop_domain = $1', [shop]);
    const accessToken = shopData.rows[0].access_token;

    // Fetch current inventory from Shopify
    const client = new Shopify.Clients.Rest(shop, accessToken);
    const inventoryRes = await client.get({ path: 'inventory_levels.json', query: { limit: '250' } });
    const levels = inventoryRes.body.inventory_levels || [];

    const items = levels.map(level => ({
      skuCode: level.sku || level.inventory_item_id,
      quantity: level.available,
    }));

    // Push to marketplace
    const success = await pushInventoryToMarketplace(marketplace, cfg, items);
    res.json({ success, marketplace, itemsUpdated: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── API: Order Mappings ──────────────────────────────────────────────────────
app.get('/api/mappings', async (req, res) => {
  try {
    const { shop } = req.query;
    if (!shop) return res.status(400).json({ error: 'shop required' });

    const result = await pool.query(
      'SELECT * FROM shopify_order_mappings WHERE shop_domain = $1 ORDER BY synced_at DESC LIMIT 100',
      [shop]
    );
    res.json({ mappings: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Marketplace Connector Functions ──────────────────────────────────────────
async function fetchMarketplaceOrders(marketplace, config) {
  // This calls your existing OMS/WMS backend marketplace connectors
  // For now, returns demo data — replace with real API calls
  switch (marketplace) {
    case 'FLIPKART':
      return fetchFlipkartOrders(config);
    case 'AMAZON':
      return fetchAmazonOrders(config);
    case 'NYKAA':
      return fetchNykaaOrders(config);
    case 'MYNTRA':
      return fetchMyntraOrders(config);
    case 'TATACLIQ':
      return fetchTataCliqOrders(config);
    default:
      return [];
  }
}

async function fetchFlipkartOrders(config) {
  // Flipkart OAuth2 client_credentials
  try {
    const tokenRes = await fetch('https://api.flipkart.net/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.api_key,
        client_secret: config.api_secret,
      }),
    });
    const { access_token } = await tokenRes.json();

    const ordersRes = await fetch('https://api.flipkart.net/v2/orders/items', {
      headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    });
    const data = await ordersRes.json();
    return (data.orders || []).map(o => ({
      id: o.orderId,
      orderNumber: o.orderId,
      customerName: o.shippingAddress?.fullName || 'Customer',
      shippingAddress: `${o.shippingAddress?.address1 || ''}, ${o.shippingAddress?.city || ''} - ${o.shippingAddress?.pincode || ''}`,
      items: (o.items || []).map(i => ({
        skuCode: i.skuId,
        name: i.title,
        quantity: i.quantity,
        unitPrice: i.flipkartSellingPrice / 100,
      })),
    }));
  } catch (err) {
    console.error('[Flipkart] fetchOrders error:', err.message);
    return [];
  }
}

async function fetchAmazonOrders(config) {
  // Amazon SP-API
  try {
    const tokenRes = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: config.api_key,
        client_id: config.api_secret,
        client_secret: config.api_secret,
      }),
    });
    const { access_token } = await tokenRes.json();

    const ordersRes = await fetch(`https://sellingpartnerapi-na.amazon.com/orders/v0/orders?MarketplaceIds=${config.seller_id || ''}`, {
      headers: { 'x-amz-access-token': access_token },
    });
    const data = await ordersRes.json();
    return (data.payload?.Orders || []).map(o => ({
      id: o.AmazonOrderId,
      orderNumber: o.AmazonOrderId,
      customerName: o.ShippingAddress?.Name || 'Amazon Customer',
      shippingAddress: `${o.ShippingAddress?.AddressLine1 || ''}, ${o.ShippingAddress?.City || ''} - ${o.ShippingAddress?.PostalCode || ''}`,
      items: [{ skuCode: 'AMZ-SKU', name: 'Amazon Item', quantity: o.NumberOfItemsShipped || 1, unitPrice: parseFloat(o.OrderTotal?.Amount || '0') }],
    }));
  } catch (err) {
    console.error('[Amazon] fetchOrders error:', err.message);
    return [];
  }
}

async function fetchNykaaOrders(config) {
  try {
    const res = await fetch('https://api.nykaa.com/seller/v1/orders', {
      headers: { 'Authorization': `Bearer ${config.api_key}` },
    });
    const data = await res.json();
    return (data.orders || []).map(o => ({
      id: o.order_id,
      orderNumber: o.order_id,
      customerName: o.customer?.name || 'Customer',
      shippingAddress: `${o.shipping?.address || ''}, ${o.shipping?.city || ''} - ${o.shipping?.pincode || ''}`,
      items: (o.items || []).map(i => ({
        skuCode: i.sku,
        name: i.product_name,
        quantity: i.quantity,
        unitPrice: i.sale_price,
      })),
    }));
  } catch (err) {
    console.error('[Nykaa] fetchOrders error:', err.message);
    return [];
  }
}

async function fetchMyntraOrders(config) {
  try {
    const res = await fetch('https://partners.myntra.com/api/v1/orders', {
      headers: { 'Authorization': `Bearer ${config.api_key}`, 'X-Secret': config.api_secret || '' },
    });
    const data = await res.json();
    return (data.orders || []).map(o => ({
      id: o.order_id,
      orderNumber: o.order_id,
      customerName: o.customer_name || 'Customer',
      shippingAddress: `${o.shipping_address?.line1 || ''}, ${o.shipping_address?.city || ''}`,
      items: (o.items || []).map(i => ({
        skuCode: i.sku,
        name: i.product_name,
        quantity: i.quantity,
        unitPrice: i.selling_price,
      })),
    }));
  } catch (err) {
    console.error('[Myntra] fetchOrders error:', err.message);
    return [];
  }
}

async function fetchTataCliqOrders(config) {
  try {
    const res = await fetch('https://seller.tatacliq.com/api/v2/orders', {
      headers: { 'Authorization': `Bearer ${config.api_key}`, 'X-Seller-Id': config.seller_id || '' },
    });
    const data = await res.json();
    return (data.orders || []).map(o => ({
      id: o.order_ref,
      orderNumber: o.order_ref,
      customerName: o.customer?.name || 'Customer',
      shippingAddress: `${o.shipping?.line1 || ''}, ${o.shipping?.city || ''} - ${o.shipping?.pincode || ''}`,
      items: (o.items || []).map(i => ({
        skuCode: i.article_code,
        name: i.title,
        quantity: i.qty,
        unitPrice: i.sale_price,
      })),
    }));
  } catch (err) {
    console.error('[TataCliq] fetchOrders error:', err.message);
    return [];
  }
}

async function pushInventoryToMarketplace(marketplace, config, items) {
  // Push inventory updates to the marketplace
  console.log(`[Inventory] Pushing ${items.length} items to ${marketplace}`);
  // Real implementation would call each marketplace's inventory API
  return true;
}

function parseAddress(addressStr, name) {
  const parts = (addressStr || '').split(',').map(s => s.trim());
  return {
    name: name || 'Customer',
    address1: parts[0] || '',
    city: parts[1] || '',
    province: '',
    zip: parts[parts.length - 1]?.match(/\d{6}/)?.[0] || '',
    country: 'IN',
  };
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'DOWN', db: 'disconnected' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Shopify App] Running on port ${PORT}`);
    console.log(`[Shopify App] API Key: ${process.env.SHOPIFY_API_KEY}`);
    console.log(`[Shopify App] App URL: ${process.env.SHOPIFY_APP_URL}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
