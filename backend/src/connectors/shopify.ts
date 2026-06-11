import { MarketplaceConnector, MarketplaceOrder } from './base';

export class ShopifyConnector implements MarketplaceConnector {
  name = 'Shopify';

  private getApiBase(shopDomain: string): string {
    return `https://${shopDomain}/admin/api/2024-10`;
  }

  async fetchOrders(config: { apiKey?: string; apiSecret?: string; sellerId?: string; lastSyncAt?: Date }): Promise<MarketplaceOrder[]> {
    if (config.apiKey && config.apiKey !== 'demo' && config.sellerId) {
      const apiBase = this.getApiBase(config.sellerId);

      const params = new URLSearchParams({
        status: 'open,unfulfilled,partial',
        limit: '50',
      });
      if (config.lastSyncAt) {
        params.set('created_at_min', config.lastSyncAt.toISOString());
      }

      const response = await fetch(`${apiBase}/orders.json?${params}`, {
        headers: {
          'X-Shopify-Access-Token': config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      console.log(`[Shopify] Response status: ${response.status}`);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        console.error(`[Shopify] API error ${response.status}: ${errorBody}`);
        throw new Error(`Shopify API ${response.status}: ${errorBody.slice(0, 200)}`);
      }

      const data = await response.json();
      console.log(`[Shopify] Got ${data.orders?.length || 0} orders`);

      return this.transformResponse(data);
    }
    return this.getDemoOrders();
  }

  private transformResponse(data: any): MarketplaceOrder[] {
    const orders = data.orders || [];
    return orders.map((order: any) => {
      const items = (order.line_items || []).map((item: any) => ({
        skuCode: item.sku || item.title?.slice(0, 20) || 'SHOP-SKU',
        name: item.title || '',
        quantity: item.quantity,
        unitPrice: parseFloat(item.price || '0'),
        totalAmount: parseFloat(item.price || '0') * item.quantity,
      }));

      const addr = order.shipping_address || order.billing_address || {};
      const addrParts = [addr.name, addr.address1, addr.address2, addr.city, addr.province, addr.zip, addr.country].filter(Boolean);

      return {
        id: `shopify-${order.id}`,
        orderNumber: order.name || `#${order.order_number}`,
        customerName: order.customer?.first_name
          ? `${order.customer.first_name} ${order.customer.last_name || ''}`.trim()
          : order.email || 'Shopify Customer',
        shippingAddress: addrParts.join(', ') || 'Shopify fulfillment',
        items,
        orderDate: new Date(order.created_at || Date.now()),
        paymentStatus: order.financial_status === 'paid' ? 'PAID' : 'PENDING',
      };
    });
  }

  private getDemoOrders(): MarketplaceOrder[] {
    return [
      {
        id: 'shopify-1001', orderNumber: '#1001', customerName: 'Amit Singh',
        shippingAddress: '23, DLF Phase 3, Gurgaon, HR - 122002',
        items: [{ skuCode: 'SH-WATCH-01', name: 'Smart Watch Pro', quantity: 1, unitPrice: 3499, totalAmount: 3499 }],
        orderDate: new Date(), paymentStatus: 'PAID',
      },
      {
        id: 'shopify-1002', orderNumber: '#1002', customerName: 'Priyanka Desai',
        shippingAddress: '8, FC Road, Pune, MH - 411004',
        items: [
          { skuCode: 'SH-BAG-02', name: 'Leather Laptop Bag', quantity: 1, unitPrice: 2999, totalAmount: 2999 },
          { skuCode: 'SH-WLET-03', name: 'Slim Wallet', quantity: 2, unitPrice: 799, totalAmount: 1598 },
        ],
        orderDate: new Date(), paymentStatus: 'PAID',
      },
      {
        id: 'shopify-1003', orderNumber: '#1003', customerName: 'Karan Malhotra',
        shippingAddress: '56, MG Road, Chennai, TN - 600002',
        items: [{ skuCode: 'SH-PERF-04', name: 'Premium Perfume 100ml', quantity: 3, unitPrice: 1299, totalAmount: 3897 }],
        orderDate: new Date(), paymentStatus: 'PENDING',
      },
    ];
  }

  async updateInventory(config: { apiKey?: string; sellerId?: string }, items: { skuCode: string; quantity: number }[]): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo' || !config.sellerId) return true;
    try {
      const apiBase = this.getApiBase(config.sellerId);

      // Fetch the first location ID from the shop
      const locRes = await fetch(`${apiBase}/locations.json`, {
        headers: { 'X-Shopify-Access-Token': config.apiKey, 'Content-Type': 'application/json' },
      });
      if (!locRes.ok) return false;
      const locData = await locRes.json();
      const locationId = locData.locations?.[0]?.id;
      if (!locationId) return false;

      for (const item of items) {
        const res = await fetch(`${apiBase}/inventory_levels/set.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': config.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location_id: locationId,
            inventory_item_id: item.skuCode,
            available: item.quantity,
          }),
        });
        if (!res.ok) return false;
      }
      return true;
    } catch (err) {
      console.error('[Shopify updateInventory]', err);
      return false;
    }
  }

  async pushTracking(config: { apiKey?: string; sellerId?: string }, orderId: string, awb: string, courier: string): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo' || !config.sellerId) return true;
    try {
      const apiBase = this.getApiBase(config.sellerId);
      // Create fulfillment
      const numericId = orderId.replace('shopify-', '');
      const res = await fetch(`${apiBase}/orders/${numericId}/fulfillments.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fulfillment: {
            tracking_number: awb,
            tracking_company: courier,
            notify_customer: true,
          },
        }),
      });
      console.log(`[Shopify pushTracking] ${orderId}: ${res.status}`);
      return res.ok;
    } catch (err) {
      console.error(`[Shopify pushTracking] ${orderId}:`, err);
      return false;
    }
  }

  async pushStatus(config: { apiKey?: string; sellerId?: string }, orderId: string, status: string, reason?: string): Promise<boolean> {
    if (!config.apiKey || config.apiKey === 'demo' || !config.sellerId) return true;
    try {
      const apiBase = this.getApiBase(config.sellerId);
      const numericId = orderId.replace('shopify-', '');
      const statusMap: Record<string, string> = {
        CANCELLED: 'cancelled',
        RETURNED: 'cancelled',
      };
      const shopifyStatus = statusMap[status];
      if (!shopifyStatus) return true;

      const res = await fetch(`${apiBase}/orders/${numericId}.json`, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: { id: numericId, note: reason || `Status changed to ${status}` },
        }),
      });
      console.log(`[Shopify pushStatus] ${orderId} → ${status}: ${res.status}`);
      return res.ok;
    } catch (err) {
      console.error(`[Shopify pushStatus] ${orderId}:`, err);
      return false;
    }
  }
}
