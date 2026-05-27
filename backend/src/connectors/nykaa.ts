import { MarketplaceConnector, MarketplaceOrder } from './base';

const NYKAA_API_BASE = 'https://api.nykaa.com/seller';

export class NykaaConnector implements MarketplaceConnector {
  name = 'Nykaa';

  async fetchOrders(config: { apiKey?: string; apiSecret?: string; sellerId?: string; lastSyncAt?: Date }): Promise<MarketplaceOrder[]> {
    if (config.apiKey && config.apiKey !== 'demo') {
      const response = await fetch(`${NYKAA_API_BASE}/v1/orders`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      return this.transformResponse(await response.json());
    }
    return this.getDemoOrders();
  }

  private transformResponse(data: any): MarketplaceOrder[] {
    return (data.orders || []).map((o: any) => ({
      id: o.order_id,
      orderNumber: o.order_number,
      customerName: o.customer.name,
      shippingAddress: o.shipping.address,
      items: (o.items || []).map((i: any) => ({
        skuCode: i.sku,
        name: i.product_name,
        quantity: i.quantity,
        unitPrice: i.price,
        totalAmount: i.price * i.quantity,
      })),
      orderDate: new Date(o.order_date),
      paymentStatus: o.payment_status,
    }));
  }

  private getDemoOrders(): MarketplaceOrder[] {
    return [
      {
        id: 'NYK-1001', orderNumber: 'NYK-1001', customerName: 'Priya Sharma',
        shippingAddress: '42, Linking Road, Bandra, Mumbai - 400050',
        items: [{ skuCode: 'TSH-BLU-M', name: 'Blue Cotton T-Shirt (M)', quantity: 2, unitPrice: 899, totalAmount: 1798 }],
        orderDate: new Date(), paymentStatus: 'PAID',
      },
      {
        id: 'NYK-1002', orderNumber: 'NYK-1002', customerName: 'Ananya Gupta',
        shippingAddress: '15, MG Road, Indiranagar, Bangalore - 560038',
        items: [
          { skuCode: 'JNS-BLK-32', name: 'Black Slim Fit Jeans (32)', quantity: 1, unitPrice: 2499, totalAmount: 2499 },
          { skuCode: 'TSH-RED-L', name: 'Red Cotton T-Shirt (L)', quantity: 1, unitPrice: 999, totalAmount: 999 },
        ],
        orderDate: new Date(), paymentStatus: 'PAID',
      },
    ];
  }

  async updateInventory(config: { apiKey?: string }, items: { skuCode: string; quantity: number }[]): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo') return true;
    try {
      const res = await fetch(`${NYKAA_API_BASE}/v1/inventory`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(i => ({ sku: i.skuCode, quantity: i.quantity })) }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async pushTracking(config: { apiKey?: string }, orderId: string, awb: string, courier: string): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo') return true;
    try {
      const res = await fetch(`${NYKAA_API_BASE}/v1/orders/${orderId}/tracking`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          awb_number: awb,
          courier_name: courier,
          shipped_at: new Date().toISOString(),
        }),
      });
      console.log(`[Nykaa pushTracking] ${orderId}: ${res.status}`);
      return res.ok;
    } catch (err) {
      console.error(`[Nykaa pushTracking] ${orderId}:`, err);
      return false;
    }
  }
}
