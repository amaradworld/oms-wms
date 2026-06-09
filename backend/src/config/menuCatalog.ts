export interface MenuItem {
  id: string;
  label: string;
  group?: string;
  children?: MenuItem[];
}

export const MENU_CATALOG: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  {
    id: 'order-management', label: 'Order Management', group: 'Orders',
    children: [
      { id: 'orders', label: 'Orders' },
      { id: 'returns', label: 'Returns/RTO' },
      { id: 'waves', label: 'Wave Picking' },
      { id: 'packing', label: 'Packing' },
      { id: 'manifests', label: 'Manifests' },
      { id: 'ndr', label: 'NDR' },
    ],
  },
  {
    id: 'warehouse-ops', label: 'Warehouse Operations', group: 'Warehouse',
    children: [
      { id: 'warehouse', label: 'Warehouse' },
      { id: 'scanning', label: 'Barcode Scan' },
      { id: 'mobile-scan', label: 'Mobile Scan' },
    ],
  },
  {
    id: 'inventory-stock', label: 'Inventory & Stock Control', group: 'Inventory',
    children: [
      { id: 'inventory', label: 'Inventory' },
      { id: 'cyclecount', label: 'Cycle Count' },
      { id: 'inventory-alerts', label: 'Inventory Alerts' },
      { id: 'sku-history', label: 'SKU History' },
      { id: 'stock-expiry', label: 'Stock Expiry' },
      { id: 'replenishment', label: 'Replenishment' },
      { id: 'batch-trace', label: 'Batch Trace' },
    ],
  },
  {
    id: 'inbound-supply', label: 'Inbound & Supply Chain', group: 'Inbound',
    children: [
      { id: 'purchaseorders', label: 'Purchase Orders' },
      { id: 'asn', label: 'ASN' },
      { id: 'grn', label: 'GRN' },
      { id: 'putaway', label: 'Putaway' },
    ],
  },
  {
    id: 'outbound', label: 'Outbound', group: 'Outbound',
    children: [
      { id: 'gatepass', label: 'Gatepass' },
      { id: 'stocktransfer', label: 'Stock Transfer' },
      { id: 'gatepass-order', label: 'Gatepass Order' },
    ],
  },
  {
    id: 'administration', label: 'Administration', group: 'Admin',
    children: [
      { id: 'sku-master', label: 'SKU Master' },
      { id: 'integrations', label: 'Integrations' },
      { id: 'parties', label: 'Parties' },
      { id: 'companies', label: 'Companies' },
      { id: 'leads', label: 'Leads' },
      { id: 'courier-routing', label: 'Courier Routing' },
      { id: 'marketplace', label: 'Marketplace' },
      { id: 'analytics', label: 'Analytics' },
      { id: 'productivity', label: 'Productivity' },
      { id: 'bins', label: 'Bin Locations' },
      { id: 'audit-logs', label: 'Audit Logs' },
      { id: 'settings', label: 'Settings' },
    ],
  },
];

// Flatten all leaf menu IDs for validation
export function getAllMenuIds(): string[] {
  const ids: string[] = [];
  function walk(items: MenuItem[]) {
    for (const item of items) {
      if (item.children) walk(item.children);
      else ids.push(item.id);
    }
  }
  walk(MENU_CATALOG);
  return ids;
}
