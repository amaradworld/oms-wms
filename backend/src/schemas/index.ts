import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  tenantId: z.string().optional(),
});

export const createSkuSchema = z.object({
  skuCode: z.string().min(1, 'SKU code is required'),
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  hsnCode: z.string().optional(),
  weight: z.string().or(z.number()).optional(),
  dimensions: z.string().optional(),
});

export const createWarehouseSchema = z.object({
  name: z.string().min(1, 'Warehouse name is required'),
  location: z.string().optional(),
  address: z.string().optional(),
});

export const createFacilitySchema = z.object({
  name: z.string().min(1, 'Facility name is required'),
  location: z.string().optional(),
  address: z.string().optional(),
});

export const createPicklistSchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse is required'),
  items: z.array(z.any()).min(1, 'At least one item is required'),
});

export const createOrderSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  shippingAddress: z.string().min(1, 'Shipping address is required'),
  tenantId: z.string().min(1, 'Tenant ID is required'),
  warehouseId: z.string().optional(),
  items: z.array(z.object({
    skuId: z.string().min(1),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    totalAmount: z.number().min(0),
  })).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
});

export const scanVerifySchema = z.object({
  code: z.string().min(1, 'Scan code is required'),
  type: z.string().optional(),
});
