import { Response } from 'express';
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

export const askAssistant = async (req: AuthRequest, res: Response) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.json({ reply: 'Please type a question about any process in SupplyHub.', actions: [] });
  }

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
