export const pageIndex = [
  { tab: 'dashboard', label: 'Dashboard', group: 'Overview', keywords: 'home overview metrics' },
  { tab: 'orders', label: 'Orders', group: 'Order Management', keywords: 'order so shipment fulfillment' },
  { tab: 'picklist', label: 'Picklist', group: 'Order Management', keywords: 'pick picking picker' },
  { tab: 'waves', label: 'Wave Picking', group: 'Order Management', keywords: 'wave batch pick' },
  { tab: 'packing', label: 'Packing', group: 'Order Management', keywords: 'pack packer' },
  { tab: 'manifests', label: 'Manifests', group: 'Order Management', keywords: 'manifest dispatch' },
  { tab: 'returns', label: 'Returns', group: 'Order Management', keywords: 'rto return reverse' },
  { tab: 'ndr', label: 'NDR Dashboard', group: 'Order Management', keywords: 'ndr non delivery' },
  { tab: 'grn', label: 'GRN', group: 'Inbound & Supply Chain', keywords: 'grn goods receipt receiving' },
  { tab: 'purchaseorders', label: 'Purchase Orders', group: 'Inbound & Supply Chain', keywords: 'po purchase order supplier' },
  { tab: 'asn', label: 'ASN', group: 'Inbound & Supply Chain', keywords: 'advance shipping notice' },
  { tab: 'putaway', label: 'Putaway', group: 'Warehouse Operations', keywords: 'putaway bin' },
  { tab: 'bins', label: 'Bin Locations', group: 'Warehouse Operations', keywords: 'bin location rack' },
  { tab: 'warehouse', label: 'Warehouses', group: 'Warehouse Operations', keywords: 'warehouse facility godown' },
  { tab: 'inventory', label: 'Inventory', group: 'Inventory & Stock Control', keywords: 'inventory stock sku' },
  { tab: 'cyclecount', label: 'Cycle Count', group: 'Inventory & Stock Control', keywords: 'count cycle reconcile' },
  { tab: 'stock-expiry', label: 'Stock Expiry', group: 'Inventory & Stock Control', keywords: 'expiry batch' },
  { tab: 'stocktransfer', label: 'Stock Transfer', group: 'Inventory & Stock Control', keywords: 'transfer move' },
  { tab: 'replenishment', label: 'Replenishment', group: 'Inventory & Stock Control', keywords: 'replenish refill' },
  { tab: 'inventory-alerts', label: 'Inventory Alerts', group: 'Inventory & Stock Control', keywords: 'alert low stock' },
  { tab: 'gatepass', label: 'Gatepass In', group: 'Inbound & Supply Chain', keywords: 'gatepass inbound' },
  { tab: 'gatepass-order', label: 'Gatepass Out', group: 'Outbound', keywords: 'gatepass outbound' },
  { tab: 'courier-routing', label: 'Courier Routing', group: 'Outbound', keywords: 'courier shiprocket delhivery' },
  { tab: 'parties', label: 'Parties', group: 'Administration', keywords: 'supplier customer party contact' },
  { tab: 'companies', label: 'Companies', group: 'Administration', keywords: 'tenant company organization' },
  { tab: 'integrations', label: 'Integrations', group: 'Administration', keywords: 'integration api shopify' },
  { tab: 'marketplace', label: 'Marketplace Configs', group: 'Administration', keywords: 'marketplace nykaa myntra' },
  { tab: 'settings', label: 'Settings', group: 'Administration', keywords: 'settings profile mfa password' },
  { tab: 'analytics', label: 'Analytics', group: 'Overview', keywords: 'analytics reports chart' },
  { tab: 'productivity', label: 'Productivity', group: 'Overview', keywords: 'productivity performance user' },
  { tab: 'batch-trace', label: 'Batch Trace', group: 'Inventory & Stock Control', keywords: 'batch trace lot recall' },
  { tab: 'sku-history', label: 'SKU History', group: 'Inventory & Stock Control', keywords: 'history timeline sku' },
  { tab: 'scanning', label: 'Scanning', group: 'Order Management', keywords: 'scan barcode' },
  { tab: 'mobile-scan', label: 'Mobile Scan', group: 'Order Management', keywords: 'mobile scan camera' },
  { tab: 'audit-logs', label: 'Audit Logs', group: 'Administration', keywords: 'audit log activity' },
];

export const searchPages = (query) => {
  if (!query) return [];
  const q = query.toLowerCase().trim();
  return pageIndex
    .filter((p) => {
      const haystack = `${p.label} ${p.group} ${p.keywords} ${p.tab}`.toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, 8);
};
