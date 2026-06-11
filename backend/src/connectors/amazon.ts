import { MarketplaceConnector, MarketplaceOrder } from './base';

const AMAZON_SP_API_BASE = 'https://sellingpartnerapi-na.amazon.com';

export class AmazonConnector implements MarketplaceConnector {
  name = 'Amazon';

  private async getAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
    const response = await fetch('https://api.amazon.com/auth/o2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Amazon OAuth failed (${response.status}): ${body.slice(0, 200)}`);
    }
    const data = await response.json();
    if (!data.access_token) {
      throw new Error('Amazon OAuth: no access_token in response');
    }
    console.log(`[Amazon] OAuth token obtained, expires in ${data.expires_in || '?'}s`);
    return data.access_token;
  }

  async fetchOrders(config: { apiKey?: string; apiSecret?: string; sellerId?: string; lastSyncAt?: Date }): Promise<MarketplaceOrder[]> {
    if (config.apiKey && config.apiKey !== 'demo' && config.apiSecret) {
      const accessToken = await this.getAccessToken(config.apiKey, config.apiSecret, config.apiSecret);

      const params = new URLSearchParams({
        MarketplaceIds: config.sellerId || '',
        OrderStatuses: 'Unshipped,PartiallyShipped,Shipped',
        CreatedAfter: config.lastSyncAt?.toISOString() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        MaxResultsPerPage: '50',
      });

      const response = await fetch(`${AMAZON_SP_API_BASE}/orders/v0/orders?${params}`, {
        headers: {
          'x-amz-access-token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      console.log(`[Amazon] Response status: ${response.status}`);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        console.error(`[Amazon] API error ${response.status}: ${errorBody}`);
        throw new Error(`Amazon API ${response.status}: ${errorBody.slice(0, 200)}`);
      }

      const data = await response.json();
      console.log(`[Amazon] Got ${data.payload?.Orders?.length || 0} orders`);

      return this.transformResponse(data);
    }
    return this.getDemoOrders();
  }

  private transformResponse(data: any): MarketplaceOrder[] {
    const orders = data.payload?.Orders || [];
    const result: MarketplaceOrder[] = [];

    for (const order of orders) {
      const orderId = order.AmazonOrderId || '';
      const items: MarketplaceOrder['items'] = [];

      // Fetch order items
      if (order.OrderTotal?.CurrencyCode) {
        // Items are fetched separately in real implementation
        // For now, use order total
        items.push({
          skuCode: 'AMZ-SKU',
          name: 'Amazon Order Item',
          quantity: order.NumberOfItemsShipped || 1,
          unitPrice: parseFloat(order.OrderTotal?.Amount || '0'),
          totalAmount: parseFloat(order.OrderTotal?.Amount || '0'),
        });
      }

      const addr = order.ShippingAddress || {};
      const addrParts = [addr.Name, addr.AddressLine1, addr.AddressLine2, addr.City, addr.StateOrRegion, addr.PostalCode].filter(Boolean);

      result.push({
        id: orderId,
        orderNumber: orderId,
        customerName: addr.Name || order.BuyerInfo?.BuyerEmail || 'Amazon Customer',
        shippingAddress: addrParts.join(', ') || 'Amazon fulfillment',
        items,
        orderDate: new Date(order.PurchaseDate || Date.now()),
        paymentStatus: order.OrderStatus === 'Unshipped' ? 'PAID' : 'PENDING',
      });
    }

    return result;
  }

  private getDemoOrders(): MarketplaceOrder[] {
    return [
      {
        id: 'AMZ-1001', orderNumber: 'AMZ-1001', customerName: 'Vikash Kumar',
        shippingAddress: '12, Sector 18, Noida, UP - 201301',
        items: [{ skuCode: 'AMZ-EARBUDS', name: 'Wireless Earbuds Pro', quantity: 1, unitPrice: 1499, totalAmount: 1499 }],
        orderDate: new Date(), paymentStatus: 'PAID',
      },
      {
        id: 'AMZ-1002', orderNumber: 'AMZ-1002', customerName: 'Neha Sharma',
        shippingAddress: '45, Koramangala, Bangalore, KA - 560034',
        items: [
          { skuCode: 'AMZ-CHARGER', name: 'USB-C Fast Charger 33W', quantity: 1, unitPrice: 899, totalAmount: 899 },
          { skuCode: 'AMZ-CABLE', name: 'Type-C Cable 1.5m', quantity: 2, unitPrice: 299, totalAmount: 598 },
        ],
        orderDate: new Date(), paymentStatus: 'PAID',
      },
      {
        id: 'AMZ-1003', orderNumber: 'AMZ-1003', customerName: 'Rahul Patel',
        shippingAddress: '7, Andheri West, Mumbai, MH - 400058',
        items: [{ skuCode: 'AMZ-SPEAKER', name: 'Bluetooth Speaker Mini', quantity: 1, unitPrice: 2199, totalAmount: 2199 }],
        orderDate: new Date(), paymentStatus: 'PENDING',
      },
    ];
  }

  async updateInventory(config: { apiKey?: string; apiSecret?: string; sellerId?: string }, items: { skuCode: string; quantity: number }[]): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo') return true;
    try {
      const accessToken = await this.getAccessToken(config.apiKey, config.apiSecret || '', config.sellerId || '');
      const payload = items.map(i => ({
        sku: i.skuCode,
        quantity: i.quantity,
        marketplace_id: config.sellerId,
      }));

      const res = await fetch(`${AMAZON_SP_API_BASE}/listings/2021-08-01/items/${config.sellerId}`, {
        method: 'PATCH',
        headers: {
          'x-amz-access-token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch (err) {
      console.error('[Amazon updateInventory]', err);
      return false;
    }
  }

  async pushTracking(config: { apiKey?: string; apiSecret?: string; sellerId?: string }, orderId: string, awb: string, courier: string): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo') return true;
    try {
      const accessToken = await this.getAccessToken(config.apiKey, config.apiSecret || '', config.sellerId || '');
      const res = await fetch(`${AMAZON_SP_API_BASE}/orders/v0/orders/${orderId}/shipment`, {
        method: 'POST',
        headers: {
          'x-amz-access-token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          package_detail: {
            package_reference_id: { reference_id: awb },
            carrier_code: courier,
            tracking_number: awb,
          },
        }),
      });
      console.log(`[Amazon pushTracking] ${orderId}: ${res.status}`);
      return res.ok;
    } catch (err) {
      console.error(`[Amazon pushTracking] ${orderId}:`, err);
      return false;
    }
  }

  async pushStatus(config: { apiKey?: string; apiSecret?: string; sellerId?: string }, orderId: string, status: string, reason?: string): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo') return true;
    try {
      const accessToken = await this.getAccessToken(config.apiKey, config.apiSecret || '', config.sellerId || '');
      const statusMap: Record<string, string> = {
        DELIVERED: 'shipped',
        CANCELLED: 'canceled',
        RETURNED: 'canceled',
        DISPATCHED: 'shipped',
      };
      const amzStatus = statusMap[status];
      if (!amzStatus) return true;
      const res = await fetch(`${AMAZON_SP_API_BASE}/orders/v0/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'x-amz-access-token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_status: amzStatus }),
      });
      console.log(`[Amazon pushStatus] ${orderId} → ${status}: ${res.status}`);
      return res.ok;
    } catch (err) {
      console.error(`[Amazon pushStatus] ${orderId}:`, err);
      return false;
    }
  }
}
