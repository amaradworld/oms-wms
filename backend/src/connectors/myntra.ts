import { MarketplaceConnector, MarketplaceOrder } from './base';

const MYNTRA_API_BASE = 'https://partners.myntra.com/api/v1';

export class MyntraConnector implements MarketplaceConnector {
  name = 'Myntra';

  async fetchOrders(config: { apiKey?: string; apiSecret?: string; sellerId?: string; lastSyncAt?: Date }): Promise<MarketplaceOrder[]> {
    if (config.apiKey && config.apiKey !== 'demo') {
      const response = await fetch(`${MYNTRA_API_BASE}/orders`, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'X-Secret': config.apiSecret || '',
        },
      });
      return this.transformResponse(await response.json());
    }
    return this.getDemoOrders();
  }

  private transformResponse(data: any): MarketplaceOrder[] {
    return (data.orders || []).map((o: any) => ({
      id: o.order_id,
      orderNumber: o.order_id,
      customerName: o.buyer.name,
      shippingAddress: `${o.buyer.address}, ${o.buyer.city} - ${o.buyer.pincode}`,
      items: (o.items || []).map((i: any) => ({
        skuCode: i.style_code,
        name: i.product_name,
        quantity: i.quantity,
        unitPrice: i.price,
        totalAmount: i.amount,
      })),
      orderDate: new Date(o.order_date),
      paymentStatus: o.payment_status,
    }));
  }

  private getDemoOrders(): MarketplaceOrder[] {
    return [
      {
        id: 'MYN-2001', orderNumber: 'MYN-2001', customerName: 'Rahul Verma',
        shippingAddress: '7, Connaught Place, New Delhi - 110001',
        items: [{ skuCode: 'SHK-WHT-10', name: 'White Sneakers (10)', quantity: 1, unitPrice: 3999, totalAmount: 3999 }],
        orderDate: new Date(), paymentStatus: 'PAID',
      },
      {
        id: 'MYN-2002', orderNumber: 'MYN-2002', customerName: 'Sneha Reddy',
        shippingAddress: '88, Jubilee Hills, Hyderabad - 500033',
        items: [
          { skuCode: 'ACC-WLT-BRW', name: 'Brown Leather Wallet', quantity: 2, unitPrice: 1299, totalAmount: 2598 },
          { skuCode: 'TSH-GRY-M', name: 'Grey V-Neck T-Shirt (M)', quantity: 1, unitPrice: 799, totalAmount: 799 },
        ],
        orderDate: new Date(), paymentStatus: 'PAID',
      },
      {
        id: 'MYN-2003', orderNumber: 'MYN-2003', customerName: 'Arjun Nair',
        shippingAddress: '12, Marine Drive, Kochi - 682031',
        items: [{ skuCode: 'JKT-BRW-L', name: 'Brown Leather Jacket (L)', quantity: 1, unitPrice: 5999, totalAmount: 5999 }],
        orderDate: new Date(), paymentStatus: 'PENDING',
      },
    ];
  }

  async pushTracking(config: { apiKey?: string; apiSecret?: string }, orderId: string, awb: string, courier: string): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo' && process.env.NODE_ENV !== 'production') return true;
    try {
      const res = await fetch(`${MYNTRA_API_BASE}/orders/${orderId}/shipments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'X-Secret': config.apiSecret || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          awb_number: awb,
          courier_name: courier,
          shipped_at: new Date().toISOString(),
        }),
      });
      console.log(`[Myntra pushTracking] ${orderId}: ${res.status}`);
      return res.ok;
    } catch (err) {
      console.error(`[Myntra pushTracking] ${orderId}:`, err);
      return false;
    }
  }

  async pushStatus(config: { apiKey?: string; apiSecret?: string }, orderId: string, status: string, reason?: string): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo' && process.env.NODE_ENV !== 'production') return true;
    try {
      const statusMap: Record<string, string> = {
        DELIVERED: 'delivered', CANCELLED: 'cancelled', RETURNED: 'returned', DISPATCHED: 'shipped',
      };
      const myntraStatus = statusMap[status];
      if (!myntraStatus) return true;
      const res = await fetch(`${MYNTRA_API_BASE}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'X-Secret': config.apiSecret || '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: myntraStatus, reason: reason || '' }),
      });
      console.log(`[Myntra pushStatus] ${orderId} â†’ ${status}: ${res.status}`);
      return res.ok;
    } catch (err) {
      console.error(`[Myntra pushStatus] ${orderId}:`, err);
      return false;
    }
  }
}
