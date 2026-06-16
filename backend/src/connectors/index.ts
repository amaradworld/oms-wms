import { MarketplaceConnector } from './base';
import { NykaaConnector } from './nykaa';
import { MyntraConnector } from './myntra';
import { TataCliqConnector } from './tatacliq';
import { FlipkartConnector } from './flipkart';
import { AmazonConnector } from './amazon';
import { ShopifyConnector } from './shopify';

const registry: Record<string, MarketplaceConnector> = {
  FLIPKART: new FlipkartConnector(),
  AMAZON: new AmazonConnector(),
  SHOPIFY: new ShopifyConnector(),
  NYKAA: new NykaaConnector(),
  MYNTRA: new MyntraConnector(),
  TATACLIQ: new TataCliqConnector(),
};

export function getConnector(marketplace: string): MarketplaceConnector | null {
  return registry[marketplace.toUpperCase()] || null;
}

export function getAllConnectors(): { id: string; name: string }[] {
  return Object.entries(registry).map(([id, conn]) => ({ id, name: conn.name }));
}

export type { MarketplaceConnector, MarketplaceOrder } from './base';
