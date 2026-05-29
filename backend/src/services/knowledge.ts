export interface KnowledgeEntry {
  keywords: string[];
  title: string;
  summary: string;
  steps?: string[];
  tips?: string[];
  related?: string[];
  actions?: { label: string; description: string; link?: string }[];
}

const knowledgeBase: KnowledgeEntry[] = [
  {
    keywords: ['putaway', 'put away', 'put', 'create putaway', 'putaway task', 'putaway flow'],
    title: 'Creating and Managing Putaway Tasks',
    summary: 'Putaway moves items from staging bins (GRN-RECEIVED, CANCELLED, etc.) to their final shelf locations.',
    steps: [
      'Go to Warehouse Operations > Putaway Tasks in the sidebar.',
      'Click "Create Putaway" button at the top.',
      'Step 1: Select the source type — GRN Item, Cancelled Item, Gatepass Item, Received Returns, Shelf Transfer, or Picklist Item.',
      'Step 2: Browse available items, check the ones you want to put away, and adjust quantities if needed.',
      'Click "Create Task(s)" to generate putaway tasks.',
      'In the putaway table, click "Assign Bin" for PENDING tasks to select a target shelf/bin location.',
      'Once bin is assigned (status becomes IN_PROGRESS), click "Complete" to move inventory to that bin.',
    ],
    tips: [
      'Bins must be pre-created in Administration > Bin Locations before assigning.',
      'GRN items appear after a GRN is approved in the GRN page.',
      'Each scan or type of item gets its own putaway task for traceability.',
    ],
    related: ['grn', 'bin locations', 'inventory'],
    actions: [
      { label: 'Go to Putaway', description: 'Open the putaway tasks page', link: 'putaway' },
      { label: 'Create Bins', description: 'Set up bin locations first', link: 'bins' },
    ],
  },
  {
    keywords: ['grn', 'goods receipt', 'receive', 'purchase order', 'po receive', 'qc', 'quality check'],
    title: 'Goods Receipt Note (GRN) Process',
    summary: 'GRN is the process of receiving goods from a supplier, performing QC, and approving stock into inventory.',
    steps: [
      'Go to Inbound > Purchase Orders.',
      'Find a DRAFT purchase order and click "GRN" button.',
      'In the modal, enter the received quantity for each item.',
      'Click "Create GRN" — status changes to RECEIVING.',
      'Go to Inbound > GRN, find your GRN and click to open detail.',
      'For each item, mark QC as PASSED or FAILED with accepted/rejected quantities.',
      'Once all items have QC, click "Approve" to accept stock into GRN-RECEIVED bin.',
      'Approval also creates putaway tasks automatically.',
    ],
    tips: [
      'QC failure will mark the entire GRN as QC_FAILED if any item fails.',
      'Accepted quantities move to inventory, rejected quantities do not.',
      'GRN approval auto-creates putaway tasks for further processing.',
      'You can also reject the entire GRN if needed.',
    ],
    related: ['putaway', 'purchase orders', 'inventory'],
    actions: [
      { label: 'Go to GRN', description: 'View GRN list', link: 'grn' },
      { label: 'Go to POs', description: 'View purchase orders', link: 'purchaseorders' },
    ],
  },
  {
    keywords: ['purchase order', 'po', 'create po', 'supplier', 'purchase'],
    title: 'Creating a Purchase Order',
    summary: 'Purchase Orders (POs) are created to replenish stock from suppliers.',
    steps: [
      'Go to Inbound > Purchase Orders.',
      'Click "New PO" button.',
      'Select a supplier from the dropdown (create one in Suppliers tab if needed).',
      'Enter expected delivery date and notes (optional).',
      'Add items by entering SKU Code, Quantity, and Unit Price.',
      'Click "Create PO" — the PO is created with status DRAFT.',
      'When goods arrive, use "GRN" button to start receiving.',
    ],
    tips: [
      'SKU must exist in the system before adding to a PO.',
      'Use the Suppliers tab to manage your vendor list.',
      'Expected date helps prioritize receiving schedules.',
    ],
    related: ['grn', 'suppliers', 'inventory'],
    actions: [
      { label: 'Go to POs', description: 'View purchase orders', link: 'purchaseorders' },
    ],
  },
  {
    keywords: ['gatepass', 'gate pass', 'dispatch', 'outbound', 'create gatepass', 'gatepass order'],
    title: 'Gatepass Management',
    summary: 'Gatepasses control the movement of goods in/out of the warehouse — stock transfers, returns, and other dispatches.',
    steps: [
      'Go to Outbound > Gatepass.',
      'Click "Create Gatepass" button.',
      'Select type: STOCK_TRANSFER, RETURNABLE, NON_RETURNABLE, or RETURN_TO_VENDOR.',
      'Enter expected date and optional notes.',
      'Add items with SKU, quantity, inventory type, shelf code, unit price, batch code, and force-allocate flag.',
      'Submit to create the gatepass with PENDING status.',
      'The gatepass can then be approved, dispatched, and eventually received.',
    ],
    tips: [
      'Gatepass Order (under Outbound) uses a different form for line-item-level detail.',
      'Inventory type lets you specify GOOD_INVENTORY, BAD_INVENTORY, or QC_REJECTED.',
      'Force Allocate ensures stock is reserved even if inventory is low.',
    ],
    related: ['stock transfer', 'inventory'],
    actions: [
      { label: 'Go to Gatepass', description: 'Manage gatepasses', link: 'gatepass' },
      { label: 'Go to Gatepass Order', description: 'Create gatepass with line items', link: 'gatepass-order' },
    ],
  },
  {
    keywords: ['order', 'manual order', 'create order', 'sales order', 'order management'],
    title: 'Creating and Managing Orders',
    summary: 'Orders capture customer purchases and drive the fulfillment process from picking to dispatch.',
    steps: [
      'Go to Order Management > Orders.',
      'Click "Manual Order" to create a new order.',
      'Fill Basic Details: channel, order date, payment mode, currency, facility.',
      'Fill Customer Details: code, name, email, phone, GSTIN.',
      'Fill Billing Address: all address fields with name and contact info.',
      'Fill Shipping Address: use "Same as Billing" toggle to auto-copy, or enter separately.',
      'Add Items: use barcode scanner to scan SKU codes — each scan adds quantity 1.',
      'Review Extra Charges: discount, gift wrap, shipping — total payable auto-calculates.',
      'Submit to create the order.',
      'Orders flow through: PENDING → PROCESSING → PICKING → PACKED → SHIPPED → DELIVERED.',
    ],
    tips: [
      'Barcode scan replaces manual SKU entry — faster and more accurate.',
      'Auto-calculated fields: subtotal, net price per row, total payable.',
      'Currency defaults to INR but can be changed.',
    ],
    related: ['wave picking', 'packing', 'manifests', 'ndr'],
    actions: [
      { label: 'Go to Orders', description: 'View all orders', link: 'orders' },
    ],
  },
  {
    keywords: ['wave picking', 'wave', 'pick wave', 'picking', 'batch pick'],
    title: 'Wave Picking',
    summary: 'Wave picking groups multiple orders into a wave for efficient batch picking.',
    steps: [
      'Go to Order Management > Wave Picking.',
      'Click "Create Wave" to group orders for picking.',
      'Select orders to include in the wave.',
      'The wave status moves from PENDING to IN_PROGRESS when picking starts.',
      'Items are picked and verified against the pick list.',
      'Wave completes when all orders are picked.',
    ],
    tips: [
      'Wave picking reduces travel time by grouping similar items.',
      'Orders in a wave can be assigned to a specific picker.',
    ],
    related: ['orders', 'packing'],
    actions: [
      { label: 'Go to Wave Picking', description: 'Manage pick waves', link: 'waves' },
    ],
  },
  {
    keywords: ['manifest', 'shipping', 'courier', 'dispatch', 'awb'],
    title: 'Manifest & Dispatch',
    summary: 'Manifests group multiple shipments for courier handover.',
    steps: [
      'Go to Order Management > Manifests.',
      'Create a new manifest for a specific courier.',
      'Add shipments (orders with AWB numbers) to the manifest.',
      'Close the manifest when ready for courier pickup.',
      'The manifest number is used for courier handover records.',
    ],
    tips: [
      'Each manifest is courier-specific.',
      'Closed manifests cannot be modified.',
    ],
    related: ['orders', 'courier routing', 'ndr'],
    actions: [
      { label: 'Go to Manifests', description: 'Manage courier manifests', link: 'manifests' },
    ],
  },
  {
    keywords: ['ndr', 'non delivery', 'delivery failure', 'reattempt', 'rto'],
    title: 'NDR (Non-Delivery Report) Management',
    summary: 'NDR cases track delivery failures and manage reattempts or RTO processing.',
    steps: [
      'Go to Order Management > NDR.',
      'View open NDR cases with failure reasons.',
      'Schedule a reattempt date or mark as RTO.',
      'Update the case status as actions are taken.',
      'Resolved/closed cases are archived.',
    ],
    related: ['orders', 'manifests', 'returns'],
    actions: [
      { label: 'Go to NDR', description: 'View NDR cases', link: 'ndr' },
    ],
  },
  {
    keywords: ['returns', 'rto', 'return', 'customer return', 'reverse'],
    title: 'Returns & RTO Management',
    summary: 'Handle customer returns and RTO (Return to Origin) items.',
    steps: [
      'Go to Order Management > Returns/RTO.',
      'View return requests and RTO entries.',
      'Process received returns through QC.',
      'QC-passed returns can be restocked via putaway (PUTAWAY_RECEIVED_RETURNS).',
    ],
    related: ['putaway', 'orders', 'ndr'],
    actions: [
      { label: 'Go to Returns', description: 'View returns/RTO', link: 'returns' },
    ],
  },
  {
    keywords: ['inventory', 'stock', 'stock check', 'bin', 'quantity'],
    title: 'Inventory Management',
    summary: 'Track stock levels across bins and warehouses, with reorder alerts.',
    steps: [
      'Go to Inventory & Stock Control > Inventory.',
      'Search by SKU code or name to find stock.',
      'View quantity on hand, available, and reserved per bin.',
      'Inventory Alerts page shows items below reorder point.',
      'Cycle Count allows physical verification of stock.',
    ],
    tips: [
      'Each bin location tracks separate inventory quantities.',
      'Reorder alerts help prevent stockouts.',
      'Cycle counting corrects inventory discrepancies.',
    ],
    related: ['bin locations', 'cycle count', 'inventory alerts'],
    actions: [
      { label: 'Go to Inventory', description: 'View inventory levels', link: 'inventory' },
      { label: 'Go to Alerts', description: 'View reorder alerts', link: 'inventory-alerts' },
    ],
  },
  {
    keywords: ['bin', 'bin location', 'shelf', 'rack', 'create bin'],
    title: 'Bin Locations',
    summary: 'Bin locations define where items are stored in the warehouse.',
    steps: [
      'Go to Administration > Bin Locations.',
      'Create individual bins with code, zone, aisle, rack, shelf details.',
      'Or use bulk create to generate multiple bins at once.',
      'Bins must exist before they can be assigned in putaway tasks.',
      'Duplicate bin codes within a warehouse are not allowed.',
    ],
    tips: [
      'Plan your bin naming convention before bulk creation (e.g., A-01-01-01).',
      'Zone field helps group bins by area (e.g., "A", "B", "Cold Storage").',
    ],
    related: ['putaway', 'inventory'],
    actions: [
      { label: 'Go to Bin Locations', description: 'Manage bins', link: 'bins' },
    ],
  },
  {
    keywords: ['stock transfer', 'stn', 'transfer', 'inter warehouse', 'warehouse transfer'],
    title: 'Stock Transfer Between Warehouses',
    summary: 'Move stock from one facility/warehouse to another.',
    steps: [
      'Go to Outbound > Stock Transfer.',
      'Click to create a new transfer (from/to warehouse, items).',
      'Use barcode scan to add items — each scan increments qty by 1.',
      'Submit to create the transfer with DRAFT status.',
      'Process (dispatch) the transfer to reduce source warehouse inventory.',
      'Receive at destination to add to inbound inventory.',
      'Print STN PDF via the print button on the detail view.',
    ],
    tips: [
      'Barcode scan replaces manual SKU entry for speed.',
      'STN PDF includes logos, addresses, item table, and signature lines.',
    ],
    related: ['gatepass', 'inventory', 'putaway'],
    actions: [
      { label: 'Go to Stock Transfer', description: 'Manage transfers', link: 'stocktransfer' },
    ],
  },
  {
    keywords: ['integration', 'platform', 'marketplace', 'shopify', 'amazon', 'api', 'sync'],
    title: 'Platform Integrations',
    summary: 'Connect external marketplaces and platforms to sync inventory, orders, and products.',
    steps: [
      'Go to Administration > Integrations.',
      'Click "Add Integration" and select the platform (Shopify, Amazon, Custom, etc.).',
      'Enter API base URL, API key, secret, and other credentials.',
      'Toggle which features to sync: Inventory, Orders, Products.',
      'Click "Sync Now" to manually trigger a data push.',
      'Toggle active/inactive to enable or disable the integration.',
    ],
    tips: [
      'Use the config JSON field for custom platform-specific settings.',
      'Sync sends inventory data as POST to the configured API endpoint.',
      'Webhook URL can be set for receiving real-time updates.',
    ],
    actions: [
      { label: 'Go to Integrations', description: 'Manage integrations', link: 'integrations' },
    ],
  },
  {
    keywords: ['courier', 'shipping', 'rate', 'routing', 'delivery partner'],
    title: 'Courier Routing & Configuration',
    summary: 'Configure courier partners and routing rules for shipping.',
    steps: [
      'Go to Administration > Courier Routing.',
      'Add courier configurations with name, priority, and speed tier.',
      'Set pincode prefixes for regional routing.',
      'Configure weight and order value limits.',
      'Couriers are auto-selected based on matching rules during order processing.',
    ],
    related: ['manifests', 'orders'],
    actions: [
      { label: 'Go to Courier Routing', description: 'Manage couriers', link: 'courier-routing' },
      { label: 'Go to Settings', description: 'General settings', link: 'settings' },
    ],
  },
  {
    keywords: ['barcode', 'scan', 'scanner', 'barcode scan'],
    title: 'Barcode Scanning',
    summary: 'Use barcode scanning for fast, accurate inventory operations.',
    steps: [
      'Go to Warehouse Operations > Barcode Scan.',
      'Scan SKU barcodes using a connected scanner.',
      'Scan results show item details and current inventory.',
      'Barcode scanning is also integrated into Manual Orders and Stock Transfer creation.',
    ],
    tips: [
      'Any USB or Bluetooth barcode scanner works — they emulate keyboard input.',
      'Each scan = +1 quantity in Manual Order and Stock Transfer item lists.',
    ],
    related: ['orders', 'stock transfer', 'inventory'],
    actions: [
      { label: 'Go to Barcode Scan', description: 'Open scanner page', link: 'scanning' },
    ],
  },
  {
    keywords: ['help', 'guide', 'how to', 'what is', 'process', 'workflow', 'tutorial'],
    title: 'SupplyHub Assistant',
    summary: 'I can help you with any process in the system. Ask me about creating orders, GRN, putaway, gatepass, inventory, or any other workflow.',
    steps: [
      'Type a question like "How do I create a putaway?" or "What is GRN?"',
      'I\'ll show you the relevant process steps and helpful tips.',
      'Use the action buttons to navigate directly to the right page.',
    ],
    tips: [
      'Try asking: "How to create a purchase order?"',
      'Try: "What is the gatepass process?"',
      'Try: "Walk me through stock receiving"',
    ],
    actions: [
      { label: 'Dashboard', description: 'Go to dashboard', link: 'dashboard' },
    ],
  },
];

export default knowledgeBase;

export const findMatches = (query: string): KnowledgeEntry[] => {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);

  const scored = knowledgeBase.map(entry => {
    let score = 0;
    for (const word of words) {
      for (const kw of entry.keywords) {
        if (kw.includes(word) || word.includes(kw)) {
          score += 3;
        }
        if (entry.title.toLowerCase().includes(word)) {
          score += 2;
        }
        if (entry.summary.toLowerCase().includes(word)) {
          score += 1;
        }
      }
    }
    return { entry, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.entry);
};
