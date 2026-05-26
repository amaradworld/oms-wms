export interface MarketplaceOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  shippingAddress: string;
  items: { skuCode: string; name: string; quantity: number; unitPrice: number; totalAmount: number }[];
  orderDate: Date;
  paymentStatus: string;
}

export interface MarketplaceConnector {
  name: string;
  fetchOrders(config: { apiKey?: string; apiSecret?: string; sellerId?: string; lastSyncAt?: Date }): Promise<MarketplaceOrder[]>;
  updateInventory?(config: { apiKey?: string; apiSecret?: string; sellerId?: string }, items: { skuCode: string; quantity: number }[]): Promise<boolean>;
  pushTracking?(config: { apiKey?: string; apiSecret?: string; sellerId?: string }, orderId: string, awb: string, courier: string): Promise<boolean>;
}
