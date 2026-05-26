import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export const syncMarketplaceOrders = async (req: AuthRequest, res: Response) => {
  const { marketplace, apiKey } = req.body; // e.g., 'Shopify', 'Amazon'
  const { tenant_id } = req.user!;

  try {
    // 1. Fetch orders from marketplace API (Mock logic)
    const externalOrders = await fetchOrdersFromMarketplace(marketplace, apiKey);
    
    let importedCount = 0;
    for (const extOrder of externalOrders) {
      // 2. Check if order already exists (Idempotency)
      const existing = await prisma.order.findUnique({
        where: { orderNumber: extOrder.id }
      });

      if (!existing) {
        await prisma.order.create({
          data: {
            orderNumber: extOrder.id,
            tenantId: tenant_id,
            source: marketplace,
            customerName: extOrder.customer,
            shippingAddress: extOrder.address,
            orderStatus: 'PENDING',
            items: {
              create: extOrder.items
            }
          }
        });
        importedCount++;
      }
    }

    res.json({ message: `Synced ${importedCount} new orders successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Sync failed', error });
  }
};

async function fetchOrdersFromMarketplace(market: string, key: string) {
  // Simulation of external API call
  return [
    { id: `MKT-${Date.now()}`, customer: 'Shopify User', address: '123 Main St', items: [{ skuId: 'sku-1', quantity: 1, unitPrice: 500, totalAmount: 500 }] }
  ];
}
