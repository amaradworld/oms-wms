import { MarketplaceConnector, MarketplaceOrder } from './base';

const FLIPKART_API_BASE = 'https://api.flipkart.com/api/v2';

export class FlipkartConnector implements MarketplaceConnector {
  name = 'Flipkart';

  async fetchOrders(config: { apiKey?: string; apiSecret?: string; sellerId?: string; lastSyncAt?: Date }): Promise<MarketplaceOrder[]> {
    if (config.apiKey && config.apiKey !== 'demo') {
      const params = new URLSearchParams();
      if (config.sellerId) params.set('seller_id', config.sellerId);
      if (config.lastSyncAt) params.set('from_date', config.lastSyncAt.toISOString());
      params.set('order_type', 'ALL');

      const response = await fetch(`${FLIPKART_API_BASE}/orders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Flipkart API error ${response.status}: ${body}`);
      }
      return this.transformResponse(await response.json());
    }
    return this.getDemoOrders();
  }

  private transformResponse(data: any): MarketplaceOrder[] {
    return (data.orderDetails || data.orders || []).map((o: any) => ({
      id: o.orderId || o.order_id,
      orderNumber: o.orderId || o.order_id,
      customerName: o.buyerDetails?.fullName || o.buyer_name || 'Flipkart Customer',
      shippingAddress: this.extractAddress(o.shippingAddress || o.buyerAddress),
      items: (o.orderedItems || o.items || []).map((i: any) => ({
        skuCode: i.sellerSku || i.sku || i.skuId || '',
        name: i.title || i.productName || '',
        quantity: i.quantity || 1,
        unitPrice: (i.price?.amount || i.price || 0) / (i.quantity || 1),
        totalAmount: i.price?.amount || i.price || 0,
      })),
      orderDate: new Date(o.orderDate || o.orderedOn || o.createdAt),
      paymentStatus: o.paymentType === 'COD' ? 'PENDING' : 'PAID',
    }));
  }

  private extractAddress(addr: any): string {
    if (!addr) return 'Flipkart fulfillment';
    if (typeof addr === 'string') return addr;
    const parts = [addr.fullName, addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pincode].filter(Boolean);
    return parts.join(', ') || 'Flipkart fulfillment';
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
      const res = await fetch(`${FLIPKART_API_BASE}/inventory`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
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

  async pushTracking(config: { apiKey?: string; sellerId?: string }, orderId: string, awb: string, courier: string): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo') return true;
    try {
      const res = await fetch(`${FLIPKART_API_BASE}/orders/${orderId}/tracking`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          awb: awb,
          courier_partners: courier,
          shipped_date: new Date().toISOString(),
        }),
      });
      console.log(`[Flipkart pushTracking] ${orderId}: ${res.status}`);
      return res.ok;
    } catch (err) {
      console.error(`[Flipkart pushTracking] ${orderId}:`, err);
      return false;
    }
  }
}
