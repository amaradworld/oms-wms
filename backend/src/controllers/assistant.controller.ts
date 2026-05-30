import { Response } from 'express';
import prisma from '../services/prisma';
import knowledgeBase, { KnowledgeEntry, findMatches } from '../services/knowledge';
import { AuthRequest } from '../middlewares/auth.middleware';

const fallbackReply = {
  reply: `I can help you with these processes:

• **Orders** — Create manual orders, order status flow
• **GRN / Goods Receipt** — Receive PO, QC, approve
• **Putaway** — Move items to bins from various sources
• **Gatepass** — Create and manage gatepasses
• **Stock Transfer** — Inter-warehouse stock movement
• **Purchase Orders** — Create and receive POs
• **Inventory** — Check stock, bin locations, alerts
• **Integrations** — Connect marketplaces
• **Courier Routing** — Configure shipping partners
• **Barcode Scanning** — Scan items for quick ops

Try asking something like:
• "How do I create a putaway?"
• "Walk me through GRN process"
• "What is a gatepass?"
• "How to create a purchase order"`,
  actions: [
    { label: 'Dashboard', description: 'Go to dashboard' },
  ],
};

interface ActionItem {
  label: string;
  description: string;
  link?: string;
}

const SKU_PATTERN = /\b[A-Za-z0-9][A-Za-z0-9\-_./]{1,30}\b/;

const detectSkuQuery = (message: string): string | null => {
  const lower = message.toLowerCase();
  const skuIndicators = ['sku', 'item', 'product', 'track', 'history of', 'search', 'find', 'where is', 'stock of', 'status of', 'transactions for'];
  const hasIndicator = skuIndicators.some(ind => lower.includes(ind));
  if (!hasIndicator) return null;

  // Extract potential SKU code — alphanumeric with dashes/underscores/dots, 2-30 chars
  const words = message.split(/\s+/);
  for (const word of words) {
    const cleaned = word.replace(/[,;.!?'"]/g, '');
    if (SKU_PATTERN.test(cleaned) && cleaned.length >= 2 && !skuIndicators.includes(cleaned.toLowerCase())) {
      return cleaned.toUpperCase();
    }
  }
  return null;
};

export const askAssistant = async (req: AuthRequest, res: Response) => {
  const { message } = req.body;
  const tenantId = req.user!.tenant_id;
  if (!message || typeof message !== 'string') {
    return res.json({ reply: 'Please type a question about any process in SupplyHub.', actions: [] });
  }

  // Check if this is a SKU/transaction history query
  const skuCode = detectSkuQuery(message);
  if (skuCode) {
    try {
      const sku = await prisma.skuMaster.findFirst({ where: { skuCode, tenantId } });
      if (!sku) {
        return res.json({
          reply: `I couldn't find a SKU matching **${skuCode}** in your catalog.`,
          actions: [{ label: 'Go to Inventory', description: 'Browse your SKUs' }],
        });
      }

      const lines: string[] = [];
      lines.push(`**SKU: ${sku.skuCode}** — ${sku.name}${sku.size ? ` (${sku.size})` : ''}`);

      // Current inventory
      const inventory = await prisma.inventory.findMany({
        where: { skuId: sku.id, warehouse: { tenantId } },
        include: { warehouse: { select: { name: true } } },
        orderBy: { quantityAvailable: 'desc' },
      });
      if (inventory.length > 0) {
        lines.push(`\n**Stock Levels:**`);
        for (const inv of inventory) {
          lines.push(`• ${inv.warehouse.name} / ${inv.binLocation}: ${inv.quantityOnHand} on hand, ${inv.quantityAvailable} available, ${inv.quantityReserved} reserved`);
        }
      } else {
        lines.push(`\n**Stock Levels:** No inventory records found.`);
      }

      // GRN history
      const grnItems = await prisma.grnItem.findMany({
        where: { skuId: sku.id, grn: { tenantId } },
        include: { grn: { select: { grnNumber: true, status: true, createdAt: true } } },
        orderBy: { grn: { createdAt: 'desc' } },
        take: 10,
      });
      if (grnItems.length > 0) {
        lines.push(`\n**GRN / Receiving History:**`);
        for (const gi of grnItems) {
          lines.push(`• ${gi.grn.grnNumber} — Qty: ${gi.receivedQty} (Accepted: ${gi.acceptedQty}) — ${gi.grn.status} — ${gi.grn.createdAt.toLocaleDateString()}`);
        }
      }

      // Order/sales history
      const orderItems = await prisma.orderItem.findMany({
        where: { skuId: sku.id, order: { tenantId } },
        include: { order: { select: { orderNumber: true, orderStatus: true, createdAt: true } } },
        orderBy: { order: { createdAt: 'desc' } },
        take: 10,
      });
      if (orderItems.length > 0) {
        lines.push(`\n**Order History:**`);
        for (const oi of orderItems) {
          lines.push(`• ${oi.order.orderNumber} — ${oi.quantity} × ₹${oi.unitPrice} = ₹${oi.totalAmount} — Status: ${oi.order.orderStatus} — ${oi.order.createdAt.toLocaleDateString()}`);
        }
      }

      // Putaway history
      const putawayTasks = await prisma.putawayTask.findMany({
        where: { skuId: sku.id, tenantId },
        include: { bin: { select: { code: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      if (putawayTasks.length > 0) {
        lines.push(`\n**Putaway History:**`);
        for (const pt of putawayTasks) {
          lines.push(`• ${pt.source} → Bin ${pt.bin?.code || 'unassigned'} — ${pt.expectedQty} qty — ${pt.status} — ${pt.createdAt.toLocaleDateString()}`);
        }
      }

      // Purchase Orders
      const poItems = await prisma.purchaseOrderItem.findMany({
        where: { skuId: sku.id, po: { tenantId } },
        include: { po: { select: { poNumber: true, status: true } } },
        orderBy: { po: { createdAt: 'desc' } },
        take: 5,
      });
      if (poItems.length > 0) {
        lines.push(`\n**Purchase Orders:**`);
        for (const pi of poItems) {
          lines.push(`• ${pi.po.poNumber} — Ordered ${pi.quantity} — Received ${pi.receivedQty} — ${pi.po.status}`);
        }
      }

      // Gatepass history
      const gpItems = await prisma.gatepassItem.findMany({
        where: { skuId: sku.id, gatepass: { tenantId } },
        include: { gatepass: { select: { code: true, type: true, status: true } } },
        orderBy: { gatepass: { createdAt: 'desc' } },
        take: 5,
      });
      if (gpItems.length > 0) {
        lines.push(`\n**Gatepass History:**`);
        for (const gi of gpItems) {
          lines.push(`• ${gi.gatepass.code} (${gi.gatepass.type}) — ${gi.quantity} qty — ${gi.gatepass.status}`);
        }
      }

      // Stock transfers
      const stItems = await prisma.stockTransferItem.findMany({
        where: { skuId: sku.id, transfer: { tenantId } },
        include: { transfer: { select: { id: true, status: true, fromWarehouse: { select: { name: true } }, toWarehouse: { select: { name: true } } } } },
        orderBy: { transfer: { createdAt: 'desc' } },
        take: 5,
      });
      if (stItems.length > 0) {
        lines.push(`\n**Stock Transfer History:**`);
        for (const si of stItems) {
          lines.push(`• ${si.transfer.fromWarehouse.name} → ${si.transfer.toWarehouse.name} — ${si.quantity} qty — ${si.transfer.status}`);
        }
      }

      const reply = lines.join('\n');

      res.json({
        reply,
        actions: [
          { label: 'Go to Inventory', description: 'View current stock levels' },
          { label: 'Go to Orders', description: 'Browse sales orders' },
        ],
      });
    } catch (e: any) {
      console.error('SKU query error:', e);
      res.json({ reply: 'Error looking up SKU history.', actions: [] });
    }
    return;
  }

  // Fall back to knowledge base process help
  const matches = findMatches(message);
  if (matches.length === 0) {
    return res.json(fallbackReply);
  }

  const top = matches.slice(0, 2);

  const seenTitles = new Set<string>();
  const combinedSteps: string[] = [];
  const combinedTips: string[] = [];
  const allActions: ActionItem[] = [];
  let summary = '';
  let contextNote = '';

  for (const entry of top) {
    if (seenTitles.has(entry.title)) continue;
    seenTitles.add(entry.title);

    if (!summary) summary = entry.summary;
    else contextNote = `I also found info about **${entry.title}**.`;

    if (entry.steps) combinedSteps.push(...entry.steps);
    if (entry.tips) combinedTips.push(...entry.tips);
    if (entry.actions) allActions.push(...entry.actions);
  }

  const stepsText = combinedSteps.length > 0
    ? `\n\n**Steps:**\n${combinedSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
    : '';

  const tipsText = combinedTips.length > 0
    ? `\n\n**Tips:**\n${combinedTips.map(t => `• ${t}`).join('\n')}`
    : '';

  const contextText = contextNote ? `\n\n${contextNote}` : '';
  const actionText = allActions.length > 0
    ? `\n\n**Quick actions:** use the buttons below to navigate.`
    : '';

  const reply = `${summary}${stepsText}${tipsText}${contextText}${actionText}`;

  res.json({
    reply,
    actions: allActions.slice(0, 4),
  });
};
