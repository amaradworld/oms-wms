import { z } from 'zod';

export const createOrderSchema = z.object({
  orderNumber: z.string().min(1).max(100),
  customerName: z.string().min(1).max(200),
  shippingAddress: z.string().min(1).max(500),
  warehouseId: z.string().uuid().optional(),
  paymentMode: z.enum(['PREPAID', 'COD', 'NET_BANKING', 'WALLET', 'UPI']).optional(),
  paymentStatus: z.enum(['PAID', 'PENDING', 'FAILED', 'REFUNDED']).optional(),
  items: z.array(z.object({
    skuId: z.string().uuid(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
  })).min(1).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PICKING', 'PACKING', 'SHIPPED', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'RETURNED']),
  reason: z.string().max(500).optional(),
});

export const createSkuSchema = z.object({
  skuCode: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  hsnCode: z.string().max(20).optional(),
  category: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  weight: z.number().positive().optional(),
  mrp: z.number().positive().optional(),
  salePrice: z.number().positive().optional(),
});

export const createWarehouseSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(20),
  address: z.string().min(1).max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pinCode: z.string().max(10).optional(),
  gstin: z.string().max(20).optional(),
});

export const createGrnSchema = z.object({
  poId: z.string().uuid().optional(),
  warehouseId: z.string().uuid(),
  supplierName: z.string().min(1).max(200),
  items: z.array(z.object({
    skuId: z.string().uuid(),
    orderedQuantity: z.number().int().positive(),
    receivedQuantity: z.number().int().min(0),
    unitPrice: z.number().positive(),
    batchNumber: z.string().max(50).optional(),
    expiryDate: z.string().datetime().optional(),
  })).min(1),
});

export const createPutawaySchema = z.object({
  grnId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  assignments: z.array(z.object({
    grnItemId: z.string().uuid(),
    binLocation: z.string().min(1).max(50),
    quantity: z.number().int().positive(),
  })).min(1),
});

export const createLeadSchema = z.object({
  name: z.string().min(2).max(200),
  email: z.string().email().max(200),
  company: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  monthlyOrders: z.string().optional(),
  plan: z.enum(['starter', 'pro', 'enterprise']).optional(),
  message: z.string().max(2000).optional(),
  source: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  tenantId: z.string().uuid().optional(),
});

export const createTenantSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['starter', 'pro', 'enterprise']).optional(),
  menuAccess: z.array(z.string()).optional(),
});

export function validateBody(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({ message: 'Validation error', errors: result.error.issues });
    }
    req.body = result.data;
    next();
  };
}
