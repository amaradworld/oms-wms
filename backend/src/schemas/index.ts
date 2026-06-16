import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(4, 'Password must be at least 4 characters'),
  tenantId: z.string().optional(),
});

export const createSkuSchema = z.object({
  skuCode: z.string().min(1, 'SKU code is required'),
  epcCode: z.string().length(11, 'EPC code must be exactly 11 digits').regex(/^\d{11}$/, 'EPC code must be 11 digits').optional(),
  name: z.string().min(1, 'Product name is required'),
  styleName: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().optional(),
  material: z.string().optional(),
  gender: z.string().optional(),
  unitType: z.string().optional(),
  mrp: z.string().or(z.number()).optional(),
  description: z.string().optional(),
  hsnCode: z.string().optional(),
  weight: z.string().or(z.number()).optional(),
  dimensions: z.string().optional(),
  marketplaceSkus: z.record(z.string(), z.string()).optional(),
});

export const updateSkuSchema = z.object({
  skuCode: z.string().optional(),
  epcCode: z.string().optional().nullable(),
  name: z.string().optional(),
  styleName: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  material: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  unitType: z.string().optional().nullable(),
  mrp: z.union([z.string(), z.number()]).optional().nullable(),
  description: z.string().optional().nullable(),
  hsnCode: z.string().optional().nullable(),
  weight: z.union([z.string(), z.number()]).optional().nullable(),
  dimensions: z.string().optional().nullable(),
  marketplaceSkus: z.record(z.string(), z.string()).optional().nullable(),
}).passthrough();

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
});

export const createOrderSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  shippingAddress: z.string().min(1, 'Shipping address is required'),
  tenantId: z.string().optional(),
  warehouseId: z.string().optional(),
  source: z.string().optional(),
  items: z.array(z.object({
    skuId: z.string().min(1),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0).optional(),
  })).min(1, 'At least one item required'),
});

export const updateOrderStatusSchema = z.object({
  status: z.string().min(1, 'Status is required'),
});

export const scanVerifySchema = z.object({
  code: z.string().min(1, 'Scan code is required'),
  type: z.string().optional(),
});

export const createInventorySchema = z.object({
  warehouseId: z.string().min(1, 'Warehouse is required'),
  skuId: z.string().min(1, 'SKU is required'),
  binLocation: z.string().min(1, 'Bin location is required'),
  quantityOnHand: z.number().min(0, 'Quantity must be non-negative'),
  quantityAvailable: z.number().min(0).optional(),
  quantityReserved: z.number().min(0).optional(),
  batch: z.string().optional(),
  expiryDate: z.string().optional(),
  type: z.string().optional(),
  reorderPoint: z.number().min(0).optional(),
});

export const marketplaceConfigSchema = z.object({
  marketplace: z.string().min(1, 'Marketplace is required'),
  apiKey: z.string().min(1, 'API key is required'),
  apiSecret: z.string().optional(),
  sellerId: z.string().optional(),
  safetyStockBuffer: z.number().min(0).optional(),
});

export const createWarehouseFullSchema = z.object({
  name: z.string().min(1, 'Facility name is required'),
  location: z.string().optional(),
  address: z.string().optional(),
  code: z.string().optional(),
  type: z.string().optional(),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  gstin: z.string().optional(),
});

export const createWarehouseSchema = z.object({
  name: z.string().min(1, 'Warehouse name is required'),
  location: z.string().optional(),
  address: z.string().optional(),
});
