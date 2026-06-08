import { MarketplaceConnector, MarketplaceOrder } from './base';

const FLIPKART_API_BASE = 'https://api.flipkart.net/sellers';
const FLIPKART_OAUTH_URL = 'https://api.flipkart.net/oauth-service/oauth/token';

export class FlipkartConnector implements MarketplaceConnector {
  name = 'Flipkart';

  private async getAccessToken(clientId: string, clientSecret: string): Promise<string> {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(`${FLIPKART_OAUTH_URL}?grant_type=client_credentials&scope=Seller_Api`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Flipkart OAuth failed (${response.status}): ${body.slice(0, 200)}`);
    }
    const data = await response.json();
    if (!data.access_token) {
      throw new Error('Flipkart OAuth: no access_token in response');
    }
    console.log(`[Flipkart] OAuth token obtained, expires in ${data.expires_in || '?'}s`);
    return data.access_token;
  }

  async fetchOrders(config: { apiKey?: string; apiSecret?: string; sellerId?: string; lastSyncAt?: Date }): Promise<MarketplaceOrder[]> {
    if (config.apiKey && config.apiKey !== 'demo') {
      let accessToken: string;

      if (config.apiSecret) {
        // apiSecret is present: treat apiKey as client_id and apiSecret as client_secret
        // Exchange credentials for an access token via OAuth
        accessToken = await this.getAccessToken(config.apiKey, config.apiSecret);
      } else {
        // No apiSecret: assume apiKey is already a valid access token
        accessToken = config.apiKey;
      }

      const filter: any = {};
      if (config.lastSyncAt) {
        filter.orderDate = { fromDate: config.lastSyncAt.toISOString() };
      }

      const body: any = { filter };

      console.log(`[Flipkart] Searching orders from ${FLIPKART_API_BASE}/v2/orders/search`);

      const response = await fetch(`${FLIPKART_API_BASE}/v2/orders/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log(`[Flipkart] Response status: ${response.status}`);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        console.error(`[Flipkart] API error ${response.status}: ${errorBody}`);
        throw new Error(`Flipkart API ${response.status}: ${errorBody.slice(0, 200)}`);
      }

      const data = await response.json();
      console.log(`[Flipkart] Got ${data.orderItemInfos?.length || 0} order items`);

      return this.transformResponse(data);
    }
    return this.getDemoOrders();
  }

  private transformResponse(data: any): MarketplaceOrder[] {
    const items = data.orderItemInfos || [];
    const orderMap = new Map<string, MarketplaceOrder>();

    for (const item of items) {
      const orderId = item.orderId || item.orderIdRef || 'unknown';
      const existing = orderMap.get(orderId);

      const skuCode = item.sellerSkuId || item.skuId || item.sku || '';
      const productName = item.productTitle || item.title || '';
      const qty = item.quantity || 1;
      const price = item.sellingPrice || item.price || 0;
      const qtyDisp = item.quantityOrdered || qty;

      const orderItem = {
        skuCode,
        name: productName,
        quantity: qtyDisp,
        unitPrice: price / qtyDisp || price,
        totalAmount: price,
      };

      if (existing) {
        existing.items.push(orderItem);
      } else {
        const addr = item.shippingAddress || {};
        const addrParts = [addr.name, addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pincode].filter(Boolean);

        orderMap.set(orderId, {
          id: orderId,
          orderNumber: orderId,
          customerName: addr.name || item.buyerName || 'Flipkart Customer',
          shippingAddress: addrParts.join(', ') || 'Flipkart fulfillment',
          items: [orderItem],
          orderDate: new Date(item.orderDate || item.orderedDate || Date.now()),
          paymentStatus: item.paymentType === 'COD' ? 'PENDING' : 'PAID',
        });
      }
    }

    return Array.from(orderMap.values());
  }

  private getDemoOrders(): MarketplaceOrder[] {
    return [
      {
        id: 'FK-OD-100001', orderNumber: 'FK-OD-100001', customerName: 'Rahul Verma',
        shippingAddress: '23, Sector 62, Noida, UP - 201301',
        items: [{ skuCode: 'SKU001', name: 'Wireless Earbuds Pro', quantity: 1, unitPrice: 1299, totalAmount: 1299 }],
        orderDate: new Date(), paymentStatus: 'PAID',
      },
      {
        id: 'FK-OD-100002', orderNumber: 'FK-OD-100002', customerName: 'Sneha Patel',
        shippingAddress: '8, Andheri East, Mumbai, MH - 400069',
        items: [
          { skuCode: 'SKU002', name: 'USB-C Fast Charger 33W', quantity: 2, unitPrice: 799, totalAmount: 1598 },
          { skuCode: 'SKU003', name: 'Type-C Cable 1.5m', quantity: 3, unitPrice: 299, totalAmount: 897 },
        ],
        orderDate: new Date(), paymentStatus: 'PAID',
      },
      {
        id: 'FK-OD-100003', orderNumber: 'FK-OD-100003', customerName: 'Arjun Singh',
        shippingAddress: '45, Koramangala, Bangalore, KA - 560034',
        items: [{ skuCode: 'SKU004', name: 'Bluetooth Speaker Mini', quantity: 1, unitPrice: 1999, totalAmount: 1999 }],
        orderDate: new Date(), paymentStatus: 'PENDING',
      },
    ];
  }

  async updateInventory(config: { apiKey?: string; apiSecret?: string; sellerId?: string }, items: { skuCode: string; quantity: number }[]): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo') return true;
    try {
      let accessToken = config.apiKey;
      if (config.apiSecret) {
        accessToken = await this.getAccessToken(config.apiKey, config.apiSecret);
      }
      const res = await fetch(`${FLIPKART_API_BASE}/v2/inventory`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inventory: items.map(i => ({ seller_sku: i.skuCode, quantity: i.quantity })),
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async pushTracking(config: { apiKey?: string; apiSecret?: string; sellerId?: string }, orderId: string, awb: string, courier: string): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo') return true;
    try {
      let accessToken = config.apiKey;
      if (config.apiSecret) {
        accessToken = await this.getAccessToken(config.apiKey, config.apiSecret);
      }
      const res = await fetch(`${FLIPKART_API_BASE}/v2/orders/shipments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          awb,
          courier,
        }),
      });
      console.log(`[Flipkart pushTracking] ${orderId}: ${res.status}`);
      return res.ok;
    } catch (err) {
      console.error(`[Flipkart pushTracking] ${orderId}:`, err);
      return false;
    }
  }

  async pushStatus(config: { apiKey?: string; apiSecret?: string; sellerId?: string }, orderId: string, status: string, reason?: string): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo') return true;
    try {
      let accessToken = config.apiKey;
      if (config.apiSecret) {
        accessToken = await this.getAccessToken(config.apiKey, config.apiSecret);
      }
      const statusMap: Record<string, string> = {
        DELIVERED: 'DELIVERED',
        CANCELLED: 'CANCELLED',
        RETURNED: 'RETURNED',
        DISPATCHED: 'DISPATCHED',
      };
      const fkStatus = statusMap[status];
      if (!fkStatus) return true;
      const res = await fetch(`${FLIPKART_API_BASE}/v2/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: fkStatus, reason: reason || '' }),
      });
      console.log(`[Flipkart pushStatus] ${orderId} → ${status}: ${res.status}`);
      return res.ok;
    } catch (err) {
      console.error(`[Flipkart pushStatus] ${orderId}:`, err);
      return false;
    }
  }
}
