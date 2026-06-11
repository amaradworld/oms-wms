import { mapMarketplaceStatus, isDeliveryFailure } from '../controllers/webhook.controller';

describe('Webhook Controller', () => {
  describe('mapMarketplaceStatus', () => {
    it('should map Flipkart statuses correctly', () => {
      expect(mapMarketplaceStatus('FLIPKART', 'SHIPPED')).toBe('SHIPPED');
      expect(mapMarketplaceStatus('FLIPKART', 'DELIVERED')).toBe('DELIVERED');
      expect(mapMarketplaceStatus('FLIPKART', 'CANCELLED')).toBe('CANCELLED');
      expect(mapMarketplaceStatus('FLIPKART', 'RETURNED')).toBe('RETURNED');
      expect(mapMarketplaceStatus('FLIPKART', 'RTO')).toBe('RETURNED');
      expect(mapMarketplaceStatus('FLIPKART', 'OUTFORDELIVERY')).toBe('DISPATCHED');
    });

    it('should map Nykaa statuses correctly', () => {
      expect(mapMarketplaceStatus('NYKAA', 'SHIPPED')).toBe('SHIPPED');
      expect(mapMarketplaceStatus('NYKAA', 'DELIVERED')).toBe('DELIVERED');
      expect(mapMarketplaceStatus('NYKAA', 'CANCELLED')).toBe('CANCELLED');
      expect(mapMarketplaceStatus('NYKAA', 'RETURNED')).toBe('RETURNED');
    });

    it('should map Myntra statuses correctly', () => {
      expect(mapMarketplaceStatus('MYNTRA', 'SHIPPED')).toBe('SHIPPED');
      expect(mapMarketplaceStatus('MYNTRA', 'DELIVERED')).toBe('DELIVERED');
      expect(mapMarketplaceStatus('MYNTRA', 'DISPATCHED')).toBe('DISPATCHED');
    });

    it('should map TataCliq statuses correctly', () => {
      expect(mapMarketplaceStatus('TATACLIQ', 'SHIPPED')).toBe('SHIPPED');
      expect(mapMarketplaceStatus('TATACLIQ', 'DELIVERED')).toBe('DELIVERED');
      expect(mapMarketplaceStatus('TATACLIQ', 'CANCELLED')).toBe('CANCELLED');
    });

    it('should return raw status for unknown marketplace', () => {
      expect(mapMarketplaceStatus('UNKNOWN', 'SHIPPED')).toBe('SHIPPED');
      expect(mapMarketplaceStatus('UNKNOWN', 'CUSTOM_STATUS')).toBe('CUSTOM_STATUS');
    });
  });

  describe('isDeliveryFailure', () => {
    it('should detect failure statuses', () => {
      expect(isDeliveryFailure('CANCELLED')).toBe(true);
      expect(isDeliveryFailure('RETURNED')).toBe(true);
      expect(isDeliveryFailure('RTO')).toBe(true);
    });

    it('should not detect non-failure statuses', () => {
      expect(isDeliveryFailure('SHIPPED')).toBe(false);
      expect(isDeliveryFailure('DELIVERED')).toBe(false);
      expect(isDeliveryFailure('PENDING')).toBe(false);
    });

    it('should detect failure reasons', () => {
      expect(isDeliveryFailure('SHIPPED', 'delivery failed')).toBe(true);
      expect(isDeliveryFailure('SHIPPED', 'customer refused')).toBe(true);
      expect(isDeliveryFailure('SHIPPED', 'address unavailable')).toBe(true);
      expect(isDeliveryFailure('SHIPPED', 'undeliverable')).toBe(true);
    });

    it('should not detect non-failure reasons', () => {
      expect(isDeliveryFailure('SHIPPED', 'in transit')).toBe(false);
      expect(isDeliveryFailure('SHIPPED', 'out for delivery')).toBe(false);
    });
  });
});
