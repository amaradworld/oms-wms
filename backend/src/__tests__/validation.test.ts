import { createOrderSchema, createSkuSchema, createLeadSchema, loginSchema, createWarehouseSchema, createGrnSchema, createPutawaySchema, createTenantSchema } from '../middlewares/validation';

describe('Validation Schemas', () => {
  describe('createOrderSchema', () => {
    it('should accept valid order', () => {
      const result = createOrderSchema.safeParse({
        orderNumber: 'ORD-001',
        customerName: 'Test User',
        shippingAddress: '123 Main St',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty order number', () => {
      const result = createOrderSchema.safeParse({
        orderNumber: '',
        customerName: 'Test User',
        shippingAddress: '123 Main St',
      });
      expect(result.success).toBe(false);
    });

    it('should accept order with items', () => {
      const result = createOrderSchema.safeParse({
        orderNumber: 'ORD-002',
        customerName: 'Test User',
        shippingAddress: '123 Main St',
        items: [{ skuId: '550e8400-e29b-41d4-a716-446655440000', quantity: 2, unitPrice: 100 }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createSkuSchema', () => {
    it('should accept valid SKU', () => {
      const result = createSkuSchema.safeParse({ skuCode: 'SKU001', name: 'Test Product' });
      expect(result.success).toBe(true);
    });

    it('should reject empty skuCode', () => {
      const result = createSkuSchema.safeParse({ skuCode: '', name: 'Test' });
      expect(result.success).toBe(false);
    });
  });

  describe('createLeadSchema', () => {
    it('should accept valid lead', () => {
      const result = createLeadSchema.safeParse({ name: 'John', email: 'john@example.com' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = createLeadSchema.safeParse({ name: 'John', email: 'not-an-email' });
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: 'pass123' });
      expect(result.success).toBe(true);
    });

    it('should reject short password', () => {
      const result = loginSchema.safeParse({ email: 'test@example.com', password: 'ab' });
      expect(result.success).toBe(false);
    });
  });

  describe('createWarehouseSchema', () => {
    it('should accept valid warehouse', () => {
      const result = createWarehouseSchema.safeParse({ name: 'Main Warehouse', code: 'WH01' });
      expect(result.success).toBe(true);
    });
  });

  describe('createGrnSchema', () => {
    it('should accept valid GRN', () => {
      const result = createGrnSchema.safeParse({
        warehouseId: '550e8400-e29b-41d4-a716-446655440000',
        supplierName: 'Test Supplier',
        items: [{
          skuId: '550e8400-e29b-41d4-a716-446655440000',
          orderedQuantity: 100,
          receivedQuantity: 100,
          unitPrice: 50,
        }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('createTenantSchema', () => {
    it('should accept valid tenant', () => {
      const result = createTenantSchema.safeParse({ name: 'Test Company', slug: 'test-company' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid slug', () => {
      const result = createTenantSchema.safeParse({ name: 'Test', slug: 'Invalid Slug!' });
      expect(result.success).toBe(false);
    });
  });
});
