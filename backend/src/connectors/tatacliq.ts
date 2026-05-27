import { MarketplaceConnector, MarketplaceOrder } from './base';

export class TataCliqConnector implements MarketplaceConnector {
  name = 'TataCliq';

  async fetchOrders(config: { apiKey?: string; apiSecret?: string; sellerId?: string; lastSyncAt?: Date }): Promise<MarketplaceOrder[]> {
    if (config.apiKey && config.apiKey !== 'demo') {
      const response = await fetch('https://api.tatacliq.com/seller/v2/orders', {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'X-Seller-Id': config.sellerId || '',
        },
      });
      return this.transformResponse(await response.json());
    }
    return this.getDemoOrders();
  }

  private transformResponse(data: any): MarketplaceOrder[] {
    return (data.orders || []).map((o: any) => ({
      id: o.order_ref,
      orderNumber: o.order_ref,
      customerName: o.customer.name,
      shippingAddress: `${o.shipping.line1}, ${o.shipping.city} - ${o.shipping.pincode}`,
      items: (o.items || []).map((i: any) => ({
        skuCode: i.article_code,
        name: i.title,
        quantity: i.qty,
        unitPrice: i.sale_price,
        totalAmount: i.total,
      })),
      orderDate: new Date(o.created_at),
      paymentStatus: o.payment,
    }));
  }

  private getDemoOrders(): MarketplaceOrder[] {
    return [
      {
        id: 'TCL-3001', orderNumber: 'TCL-3001', customerName: 'Meera Iyer',
        shippingAddress: '55, Race Course Road, Coimbatore - 641018',
        items: [{ skuCode: 'ACC-BELT-BLK', name: 'Black Formal Belt', quantity: 3, unitPrice: 599, totalAmount: 1797 }],
        orderDate: new Date(), paymentStatus: 'PAID',
      },
      {
        id: 'TCL-3002', orderNumber: 'TCL-3002', customerName: 'Vikram Singh',
        shippingAddress: '21, Civil Lines, Jaipur - 302006',
        items: [
          { skuCode: 'SHK-BLK-9', name: 'Black Running Shoes (9)', quantity: 1, unitPrice: 4499, totalAmount: 4499 },
          { skuCode: 'TSH-BLU-S', name: 'Blue Cotton T-Shirt (S)', quantity: 2, unitPrice: 699, totalAmount: 1398 },
        ],
        orderDate: new Date(), paymentStatus: 'PAID',
      },
    ];
  }

  async updateInventory(config: { apiKey?: string; sellerId?: string }, items: { skuCode: string; quantity: number }[]): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo') return true;
    return true;
  }

  async pushTracking(config: { apiKey?: string; sellerId?: string }, orderId: string, awb: string, courier: string): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo') return true;
    return true;
  }
}
