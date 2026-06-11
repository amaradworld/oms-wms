import { getConnector, getAllConnectors } from '../connectors/index';

describe('Connector Registry', () => {
  it('should return all registered connectors', () => {
    const connectors = getAllConnectors();
    expect(Array.isArray(connectors)).toBe(true);
    expect(connectors.length).toBeGreaterThanOrEqual(6);
  });

  it('should have connector for each marketplace', () => {
    expect(getConnector('FLIPKART')).not.toBeNull();
    expect(getConnector('AMAZON')).not.toBeNull();
    expect(getConnector('SHOPIFY')).not.toBeNull();
    expect(getConnector('NYKAA')).not.toBeNull();
    expect(getConnector('MYNTRA')).not.toBeNull();
    expect(getConnector('TATACLIQ')).not.toBeNull();
  });

  it('should return null for unknown marketplace', () => {
    expect(getConnector('UNKNOWN')).toBeNull();
  });
});

describe('Flipkart Connector', () => {
  it('should have correct name', () => {
    expect(getConnector('FLIPKART')!.name).toBe('Flipkart');
  });

  it('should return demo orders when no API key', async () => {
    const orders = await getConnector('FLIPKART')!.fetchOrders({});
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0].id).toBeDefined();
    expect(orders[0].customerName).toBeDefined();
  });

  it('should have required methods', () => {
    const conn = getConnector('FLIPKART')!;
    expect(typeof conn.updateInventory).toBe('function');
    expect(typeof conn.pushTracking).toBe('function');
    expect(typeof conn.pushStatus).toBe('function');
  });
});

describe('Amazon Connector', () => {
  it('should have correct name', () => {
    expect(getConnector('AMAZON')!.name).toBe('Amazon');
  });

  it('should return demo orders when no API key', async () => {
    const orders = await getConnector('AMAZON')!.fetchOrders({});
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0].id).toMatch(/^AMZ-/);
  });

  it('should have required methods', () => {
    const conn = getConnector('AMAZON')!;
    expect(typeof conn.updateInventory).toBe('function');
    expect(typeof conn.pushTracking).toBe('function');
    expect(typeof conn.pushStatus).toBe('function');
  });
});

describe('Shopify Connector', () => {
  it('should have correct name', () => {
    expect(getConnector('SHOPIFY')!.name).toBe('Shopify');
  });

  it('should return demo orders when no API key', async () => {
    const orders = await getConnector('SHOPIFY')!.fetchOrders({});
    expect(Array.isArray(orders)).toBe(true);
    expect(orders.length).toBeGreaterThan(0);
    expect(orders[0].id).toMatch(/^shopify-/);
  });

  it('should have required methods', () => {
    const conn = getConnector('SHOPIFY')!;
    expect(typeof conn.updateInventory).toBe('function');
    expect(typeof conn.pushTracking).toBe('function');
    expect(typeof conn.pushStatus).toBe('function');
  });
});
