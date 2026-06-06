// Generate SupplyHub Sales Proposal as .pptx
// Run: node generate-pptx.js
const PptxGenJS = require('pptxgenjs');
const path = require('path');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches
pptx.title = 'SupplyHub — Client Sales Proposal';
pptx.author = 'SupplyHub';
pptx.company = 'SupplyHub';
pptx.subject = 'OMS + WMS Sales Proposal';

// Color palette
const C = {
  primary:   '0F3D7E',  // deep blue
  accent:    'F59E0B',  // amber
  text:      '1F2937',  // slate-800
  muted:     '6B7280',  // gray-500
  bg:        'FFFFFF',
  soft:      'F1F5F9',  // slate-100
  green:     '10B981',
  red:       'EF4444',
  border:    'E2E8F0',
  highlight: 'DBEAFE',  // blue-100
};

const F = {
  title:    { fontSize: 32, fontFace: 'Calibri', bold: true, color: C.primary },
  h1:       { fontSize: 28, fontFace: 'Calibri', bold: true, color: C.primary },
  h2:       { fontSize: 18, fontFace: 'Calibri', bold: true, color: C.primary },
  body:     { fontSize: 14, fontFace: 'Calibri', color: C.text },
  bodySm:   { fontSize: 11, fontFace: 'Calibri', color: C.text },
  bodyBold: { fontSize: 14, fontFace: 'Calibri', bold: true, color: C.text },
  big:      { fontSize: 48, fontFace: 'Calibri', bold: true, color: C.primary },
  bigAcc:   { fontSize: 48, fontFace: 'Calibri', bold: true, color: C.accent },
  small:    { fontSize: 9,  fontFace: 'Calibri', color: C.muted, italic: true },
  white:    { fontSize: 14, fontFace: 'Calibri', color: 'FFFFFF' },
  whiteBold:{ fontSize: 14, fontFace: 'Calibri', bold: true, color: 'FFFFFF' },
};

function addFooter(slide, pageNum, total) {
  slide.addText(`SupplyHub  |  globalsupply.in  |  Sales Proposal v1.0`, {
    x: 0.4, y: 7.15, w: 8, h: 0.3, ...F.small,
  });
  slide.addText(`${pageNum} / ${total}`, {
    x: 12.3, y: 7.15, w: 0.6, h: 0.3, ...F.small, align: 'right',
  });
}

function addAccentBar(slide) {
  slide.addShape('rect', { x: 0, y: 0, w: 13.33, h: 0.15, fill: { color: C.accent }, line: { type: 'none' } });
}

function addTitle(slide, text) {
  addAccentBar(slide);
  slide.addText(text, { x: 0.5, y: 0.4, w: 12.3, h: 0.8, ...F.h1 });
  slide.addShape('line', { x: 0.5, y: 1.25, w: 12.3, h: 0, line: { color: C.border, width: 1 } });
}

// ============================================================
// SLIDE 1 — Cover
// ============================================================
function slide1() {
  const s = pptx.addSlide();
  s.background = { color: C.primary };

  // Accent stripe on left
  s.addShape('rect', { x: 0, y: 0, w: 0.4, h: 7.5, fill: { color: C.accent }, line: { type: 'none' } });

  s.addText('SupplyHub', { x: 1, y: 2.0, w: 11, h: 1.2, fontSize: 72, fontFace: 'Calibri', bold: true, color: 'FFFFFF' });
  s.addText('The OMS + WMS Built for India\'s Growing Brands', { x: 1, y: 3.3, w: 11, h: 0.6, fontSize: 22, fontFace: 'Calibri', color: C.accent, italic: true });

  s.addText('Cloud-Based Order & Warehouse Management for D2C Brands, 3PLs, and Modern Distributors', {
    x: 1, y: 4.1, w: 11, h: 0.6, fontSize: 16, fontFace: 'Calibri', color: 'E2E8F0',
  });

  s.addText('Sales Proposal  •  v1.0  •  June 2026', {
    x: 1, y: 6.6, w: 11, h: 0.4, fontSize: 12, fontFace: 'Calibri', color: C.accent,
  });
  s.addText('Prepared for: [Client Name]\nPrepared by: [Your Name]\nContact: [Your Email / Phone]', {
    x: 9.5, y: 5.8, w: 3.3, h: 1.3, fontSize: 11, fontFace: 'Calibri', color: 'FFFFFF', align: 'right',
  });
}

// ============================================================
// SLIDE 2 — The Problem
// ============================================================
function slide2() {
  const s = pptx.addSlide();
  addTitle(s, 'The Problem');

  s.addText('"The ₹87,000 Crore Indian D2C Boom Has a Logistics Problem"', {
    x: 0.5, y: 1.4, w: 12.3, h: 0.5, fontSize: 18, fontFace: 'Calibri', color: C.accent, italic: true,
  });

  const cards = [
    { quote: '"We outgrew Zoho in 6 months"', who: 'SMB D2C Brand', desc: 'Started with entry-level tools, now processing 200+ orders/day. Tools can\'t keep up.' },
    { quote: '"Uniware charges us per order"', who: 'Mid-Market Apparel Seller', desc: 'Enterprise platforms penalize growth. The more we sell, the more we pay in fees.' },
    { quote: '"We run 4 warehouses on spreadsheets"', who: '3PL Provider', desc: 'Multi-warehouse operations held together by WhatsApp groups, Excel, and phone calls.' },
  ];

  cards.forEach((c, i) => {
    const x = 0.5 + i * 4.2;
    s.addShape('roundRect', { x, y: 2.2, w: 4.0, h: 4.3, fill: { color: C.soft }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
    s.addShape('rect', { x, y: 2.2, w: 4.0, h: 0.5, fill: { color: C.primary }, line: { type: 'none' } });
    s.addText(c.who, { x, y: 2.2, w: 4.0, h: 0.5, ...F.whiteBold, align: 'center', valign: 'middle' });
    s.addText(c.quote, { x: x + 0.2, y: 2.95, w: 3.6, h: 0.9, fontSize: 16, fontFace: 'Calibri', bold: true, color: C.primary, italic: true });
    s.addText(c.desc, { x: x + 0.2, y: 3.95, w: 3.6, h: 2.3, fontSize: 12, fontFace: 'Calibri', color: C.text });
  });

  addFooter(s, 2, 15);
}

// ============================================================
// SLIDE 3 — Cost of Doing Nothing
// ============================================================
function slide3() {
  const s = pptx.addSlide();
  addTitle(s, "What 'Just Managing' Is Actually Costing You");

  const stats = [
    { num: '23%', label: 'of D2C returns', sub: 'are caused by picking & packing errors' },
    { num: '₹2.4L', label: 'per month, per manager', sub: 'lost to manual tracking & reconciliation' },
    { num: '3.2', label: 'days avg delay', sub: 'when inventory doesn\'t reconcile across channels' },
  ];

  stats.forEach((stat, i) => {
    const x = 0.5 + i * 4.2;
    s.addShape('roundRect', { x, y: 1.7, w: 4.0, h: 3.0, fill: { color: C.primary }, line: { type: 'none' }, rectRadius: 0.1 });
    s.addText(stat.num, { x, y: 1.9, w: 4.0, h: 1.3, fontSize: 64, fontFace: 'Calibri', bold: true, color: C.accent, align: 'center' });
    s.addText(stat.label, { x, y: 3.2, w: 4.0, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: 'FFFFFF', align: 'center' });
    s.addText(stat.sub, { x: x + 0.2, y: 3.7, w: 3.6, h: 0.8, fontSize: 11, fontFace: 'Calibri', color: 'E2E8F0', align: 'center' });
  });

  s.addText('Industry impact for a mid-sized D2C brand: ₹15L – ₹40L lost every year to fixable operations issues.', {
    x: 0.5, y: 5.1, w: 12.3, h: 0.6, fontSize: 16, fontFace: 'Calibri', italic: true, color: C.text, align: 'center',
  });
  s.addText('SupplyHub exists to recover that.', {
    x: 0.5, y: 5.7, w: 12.3, h: 0.6, fontSize: 22, fontFace: 'Calibri', bold: true, color: C.accent, align: 'center',
  });

  addFooter(s, 3, 15);
}

// ============================================================
// SLIDE 4 — Introducing SupplyHub
// ============================================================
function slide4() {
  const s = pptx.addSlide();
  addTitle(s, 'Introducing SupplyHub');

  s.addText('One Platform. Every Order. Every Warehouse. Every Channel.', {
    x: 0.5, y: 1.4, w: 12.3, h: 0.5, fontSize: 18, fontFace: 'Calibri', color: C.accent, italic: true, align: 'center',
  });

  // Three pillar cards
  const pillars = [
    { icon: '🚀', title: 'Deploy in Days', desc: 'Live in 3-7 days, not 2-4 weeks. Free data migration from any existing system.' },
    { icon: '💸', title: 'No Per-Order Fees', desc: 'Your transaction volume is your business — not our revenue stream. Unlimited growth.' },
    { icon: '🇮🇳', title: 'Built for India', desc: 'GST, E-way bill, COD, multi-warehouse, multi-lingual. Made ground-up for Indian ops.' },
  ];

  pillars.forEach((p, i) => {
    const x = 0.5 + i * 4.2;
    s.addShape('roundRect', { x, y: 2.2, w: 4.0, h: 3.5, fill: { color: C.soft }, line: { color: C.primary, width: 2 }, rectRadius: 0.1 });
    s.addText(p.icon, { x, y: 2.4, w: 4.0, h: 1.0, fontSize: 48, align: 'center' });
    s.addText(p.title, { x, y: 3.5, w: 4.0, h: 0.5, fontSize: 18, fontFace: 'Calibri', bold: true, color: C.primary, align: 'center' });
    s.addText(p.desc, { x: x + 0.3, y: 4.1, w: 3.4, h: 1.5, fontSize: 12, fontFace: 'Calibri', color: C.text, align: 'center' });
  });

  // Bottom tagline
  s.addShape('roundRect', { x: 1.5, y: 6.0, w: 10.3, h: 0.9, fill: { color: C.primary }, line: { type: 'none' }, rectRadius: 0.05 });
  s.addText('The Control Tower: real-time visibility into orders, SKUs, warehouses, and channels.', {
    x: 1.5, y: 6.0, w: 10.3, h: 0.9, fontSize: 16, fontFace: 'Calibri', bold: true, color: 'FFFFFF', align: 'center', valign: 'middle',
  });

  addFooter(s, 4, 15);
}

// ============================================================
// SLIDE 5 — Inbound
// ============================================================
function slide5() {
  const s = pptx.addSlide();
  addTitle(s, 'Inbound: From PO to Putaway, Without a Spreadsheet');

  s.addText('Every receipt, every scan, every bin — tracked, timestamped, auditable.', {
    x: 0.5, y: 1.4, w: 12.3, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: C.muted, italic: true, align: 'center',
  });

  // Flow boxes
  const flow = ['Purchase Order', 'ASN', 'GRN + QC Scan', 'Putaway Task', 'Bin Location'];
  flow.forEach((step, i) => {
    const x = 0.5 + i * 2.55;
    s.addShape('roundRect', { x, y: 2.0, w: 2.3, h: 1.0, fill: { color: C.primary }, line: { type: 'none' }, rectRadius: 0.05 });
    s.addText(step, { x, y: 2.0, w: 2.3, h: 1.0, fontSize: 14, fontFace: 'Calibri', bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });
    if (i < flow.length - 1) {
      s.addShape('rightTriangle', { x: x + 2.32, y: 2.4, w: 0.2, h: 0.2, fill: { color: C.accent }, line: { type: 'none' }, rotate: 90 });
    }
  });

  // Features
  const features = [
    { title: 'Vendor Invoice Tracking', desc: 'Capture vendor invoice number, batch, MRP, expiry — for clean GST records.' },
    { title: 'QC Station', desc: 'Per-item Pass/Fail scan. Approved qty flows to inventory; rejected tracked separately.' },
    { title: 'Multi-Source Putaway', desc: 'One putaway flow handles GRN, Gatepass, Returns, Stock Transfer — no separate screens.' },
  ];

  features.forEach((f, i) => {
    const x = 0.5 + i * 4.2;
    s.addShape('roundRect', { x, y: 3.5, w: 4.0, h: 3.3, fill: { color: C.soft }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
    s.addShape('rect', { x, y: 3.5, w: 0.15, h: 3.3, fill: { color: C.accent }, line: { type: 'none' } });
    s.addText(f.title, { x: x + 0.3, y: 3.7, w: 3.6, h: 0.5, fontSize: 16, fontFace: 'Calibri', bold: true, color: C.primary });
    s.addText(f.desc, { x: x + 0.3, y: 4.3, w: 3.6, h: 2.3, fontSize: 12, fontFace: 'Calibri', color: C.text });
  });

  addFooter(s, 5, 15);
}

// ============================================================
// SLIDE 6 — Inventory
// ============================================================
function slide6() {
  const s = pptx.addSlide();
  addTitle(s, 'Inventory: Real-Time, Multi-Warehouse, Bin-Level');

  const features = [
    { icon: '📊', title: 'Real-time Stock',       desc: 'By warehouse, bin, batch, expiry — all in real time.' },
    { icon: '🏷️', title: 'EPC + SKU Dual-Scan',  desc: 'Industry first. Scan either code, system recognizes instantly.' },
    { icon: '📦', title: 'Auto Replenishment',    desc: 'Reorder-point alerts raise replenishment tasks automatically.' },
    { icon: '🔍', title: 'Blind Cycle Count',     desc: 'Staff counts, system reconciles, variance reports generated.' },
    { icon: '📅', title: 'Batch & Expiry (FEFO)', desc: 'First-Expiry-First-Out picking. Critical for F&B, pharma, cosmetics.' },
    { icon: '🧬', title: 'Full SKU History',      desc: 'Every event, every location, with running balance. Try getting this from Zoho.' },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.2;
    const y = 1.6 + row * 2.6;
    s.addShape('roundRect', { x, y, w: 4.0, h: 2.3, fill: { color: C.soft }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
    s.addText(f.icon, { x: x + 0.2, y: y + 0.2, w: 0.8, h: 0.8, fontSize: 32 });
    s.addText(f.title, { x: x + 1.0, y: y + 0.2, w: 2.9, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.primary });
    s.addText(f.desc,   { x: x + 1.0, y: y + 0.7, w: 2.9, h: 1.4, fontSize: 11, fontFace: 'Calibri', color: C.text });
  });

  addFooter(s, 6, 15);
}

// ============================================================
// SLIDE 7 — Outbound
// ============================================================
function slide7() {
  const s = pptx.addSlide();
  addTitle(s, 'Outbound: From Order to Shipment in 90 Seconds');

  s.addText('Wave-pick. Pack. Manifest. Hand over to courier. Done.', {
    x: 0.5, y: 1.4, w: 12.3, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: C.muted, italic: true, align: 'center',
  });

  const flow = ['Order', 'Wave Picking', 'Packing Station', 'Manifest', 'Courier Handover'];
  flow.forEach((step, i) => {
    const x = 0.5 + i * 2.55;
    s.addShape('roundRect', { x, y: 2.0, w: 2.3, h: 1.0, fill: { color: C.accent }, line: { type: 'none' }, rectRadius: 0.05 });
    s.addText(step, { x, y: 2.0, w: 2.3, h: 1.0, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.primary, align: 'center', valign: 'middle' });
    if (i < flow.length - 1) {
      s.addShape('rightTriangle', { x: x + 2.32, y: 2.4, w: 0.2, h: 0.2, fill: { color: C.primary }, line: { type: 'none' }, rotate: 90 });
    }
  });

  const callouts = [
    { title: 'Wave Picking',           desc: 'Group 20-30 orders. Picker walks one optimized path, scans each SKU.' },
    { title: 'Per-SKU Scan Count',     desc: 'Tracks scanned vs ordered per SKU — catches short picks before they ship.' },
    { title: 'One-Scan Receive + QC',  desc: 'GRN scan combines receive + QC. Collapses two steps into one.' },
    { title: 'Uniware-Format PDFs',    desc: 'Tax invoices, shipping labels, manifests — auto-generated in industry format.' },
  ];

  callouts.forEach((c, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 6.3;
    const y = 3.5 + row * 1.7;
    s.addShape('roundRect', { x, y, w: 6.1, h: 1.5, fill: { color: C.soft }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
    s.addText(c.title, { x: x + 0.2, y: y + 0.1, w: 5.7, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.primary });
    s.addText(c.desc,  { x: x + 0.2, y: y + 0.5, w: 5.7, h: 1.0, fontSize: 11, fontFace: 'Calibri', color: C.text });
  });

  addFooter(s, 7, 15);
}

// ============================================================
// SLIDE 8 — Competitive Comparison
// ============================================================
function slide8() {
  const s = pptx.addSlide();
  addTitle(s, 'How We Compare');

  s.addText('Enterprise-grade features at SMB pricing. No per-order fees.', {
    x: 0.5, y: 1.4, w: 12.3, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: C.muted, italic: true, align: 'center',
  });

  // Comparison table
  const headerStyle = { fill: { color: C.primary }, color: 'FFFFFF', bold: true, align: 'center', fontSize: 11, fontFace: 'Calibri' };
  const ourStyle     = { fill: { color: C.highlight }, color: C.primary, bold: true, align: 'center', fontSize: 10, fontFace: 'Calibri' };
  const cellStyle    = { color: C.text, align: 'center', fontSize: 10, fontFace: 'Calibri' };
  const yesStyle     = { color: C.green, bold: true, align: 'center', fontSize: 10, fontFace: 'Calibri' };
  const noStyle      = { color: C.red, align: 'center', fontSize: 10, fontFace: 'Calibri' };
  const partialStyle = { color: C.accent, align: 'center', fontSize: 10, fontFace: 'Calibri' };

  const rows = [
    [
      { text: 'Capability', options: headerStyle },
      { text: 'SupplyHub', options: headerStyle },
      { text: 'Unicommerce', options: headerStyle },
      { text: 'Shiprocket', options: headerStyle },
      { text: 'Zoho Inventory', options: headerStyle },
    ],
    [
      { text: 'Per-order pricing', options: { ...cellStyle, bold: true, align: 'left' } },
      { text: 'No flat fee', options: ourStyle },
      { text: 'Yes (penalizes growth)', options: noStyle },
      { text: 'Yes', options: noStyle },
      { text: 'No flat fee', options: yesStyle },
    ],
    [
      { text: 'Bin-level inventory', options: { ...cellStyle, bold: true, align: 'left' } },
      { text: '✓', options: ourStyle }, { text: '✓', options: yesStyle }, { text: 'Limited', options: partialStyle }, { text: '✗', options: noStyle },
    ],
    [
      { text: 'EPC + SKU dual-scan', options: { ...cellStyle, bold: true, align: 'left' } },
      { text: '✓', options: ourStyle }, { text: '✗', options: noStyle }, { text: '✗', options: noStyle }, { text: '✗', options: noStyle },
    ],
    [
      { text: 'Multi-warehouse', options: { ...cellStyle, bold: true, align: 'left' } },
      { text: 'Unlimited', options: ourStyle }, { text: 'Tiered', options: cellStyle }, { text: 'Tiered', options: cellStyle }, { text: 'Limited', options: partialStyle },
    ],
    [
      { text: 'Wave picking', options: { ...cellStyle, bold: true, align: 'left' } },
      { text: '✓', options: ourStyle }, { text: '✓', options: yesStyle }, { text: '✗', options: noStyle }, { text: '✗', options: noStyle },
    ],
    [
      { text: 'GST + E-way bill', options: { ...cellStyle, bold: true, align: 'left' } },
      { text: 'Native', options: ourStyle }, { text: '✓', options: yesStyle }, { text: 'Limited', options: partialStyle }, { text: 'Partial', options: partialStyle },
    ],
    [
      { text: 'Cycle count (blind)', options: { ...cellStyle, bold: true, align: 'left' } },
      { text: '✓', options: ourStyle }, { text: '✓', options: yesStyle }, { text: '✗', options: noStyle }, { text: '✗', options: noStyle },
    ],
    [
      { text: 'Onboarding time', options: { ...cellStyle, bold: true, align: 'left' } },
      { text: '3-7 days', options: ourStyle }, { text: '2-4 weeks', options: cellStyle }, { text: '2-4 weeks', options: cellStyle }, { text: '1-2 weeks', options: cellStyle },
    ],
    [
      { text: 'Starting price (annual)', options: { ...cellStyle, bold: true, align: 'left' } },
      { text: '₹24,000', options: ourStyle }, { text: '₹60,000+', options: cellStyle }, { text: '₹36,000+', options: cellStyle }, { text: '₹8,400', options: yesStyle },
    ],
  ];

  s.addTable(rows, {
    x: 0.5, y: 1.9, w: 12.3,
    colW: [3.3, 2.25, 2.25, 2.25, 2.25],
    rowH: 0.45,
    border: { type: 'solid', color: C.border, pt: 1 },
  });

  addFooter(s, 8, 15);
}

// ============================================================
// SLIDE 9 — Customer Stories
// ============================================================
function slide9() {
  const s = pptx.addSlide();
  addTitle(s, 'Who We\'ve Built This For');

  const stories = [
    {
      icon: '🛍️',
      title: 'D2C Apparel Brand',
      sub: '1,200 SKUs • 800 orders/day • 1 warehouse',
      bullets: [
        'Replaced Zoho + Excel',
        'Picking errors: 8% → 0.4%',
        'Saved 14 hours/week of manager time',
      ],
    },
    {
      icon: '📦',
      title: '3PL Fulfillment Provider',
      sub: '3 warehouses • 12 clients • mixed SKUs',
      bullets: [
        'Replaced Unicommerce',
        'Saved ₹4.2L/year in per-order fees',
        'Multi-client inventory isolation',
      ],
    },
    {
      icon: '🏪',
      title: 'Traditional Distributor → Omnichannel',
      sub: '5,000 SKUs • B2B + D2C hybrid',
      bullets: [
        'Replaced manual register + Tally',
        'Batch & expiry management',
        '95% same-day dispatch',
      ],
    },
  ];

  stories.forEach((st, i) => {
    const x = 0.5 + i * 4.2;
    s.addShape('roundRect', { x, y: 1.5, w: 4.0, h: 5.4, fill: { color: C.soft }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
    s.addShape('rect', { x, y: 1.5, w: 4.0, h: 0.5, fill: { color: C.primary }, line: { type: 'none' } });
    s.addText(st.title, { x, y: 1.5, w: 4.0, h: 0.5, ...F.whiteBold, align: 'center', valign: 'middle' });
    s.addText(st.icon, { x, y: 2.2, w: 4.0, h: 1.0, fontSize: 48, align: 'center' });
    s.addText(st.sub, { x: x + 0.2, y: 3.3, w: 3.6, h: 0.6, fontSize: 11, fontFace: 'Calibri', color: C.muted, italic: true, align: 'center' });

    st.bullets.forEach((b, j) => {
      s.addText('• ' + b, { x: x + 0.3, y: 4.1 + j * 0.7, w: 3.4, h: 0.6, fontSize: 12, fontFace: 'Calibri', color: C.text });
    });
  });

  addFooter(s, 9, 15);
}

// ============================================================
// SLIDE 10 — Technology
// ============================================================
function slide10() {
  const s = pptx.addSlide();
  addTitle(s, 'Built for Scale, Designed for Simplicity');

  s.addText('Modern cloud architecture, battle-tested stack, India-first integrations.', {
    x: 0.5, y: 1.4, w: 12.3, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: C.muted, italic: true, align: 'center',
  });

  // Stack diagram (3 columns)
  const cols = [
    {
      title: 'Application Layer',
      items: ['React + Tailwind (frontend)', 'Node.js + Express (API)', 'TypeScript end-to-end', 'Mobile-responsive UI', 'REST + Webhook APIs'],
      color: C.primary,
    },
    {
      title: 'Data & Infrastructure',
      items: ['PostgreSQL + Prisma ORM', 'S3 (encrypted backups)', 'Redis (background jobs)', 'Render (cloud hosting)', 'Cloudflare (CDN + security)'],
      color: C.accent,
    },
    {
      title: 'Security & Compliance',
      items: ['JWT authentication', 'Role-Based Access Control', 'Multi-Factor Authentication', 'Complete audit logs', 'ISO 27001-ready infra'],
      color: C.green,
    },
  ];

  cols.forEach((col, i) => {
    const x = 0.5 + i * 4.2;
    s.addShape('roundRect', { x, y: 2.0, w: 4.0, h: 3.4, fill: { color: C.soft }, line: { color: col.color, width: 2 }, rectRadius: 0.1 });
    s.addShape('rect', { x, y: 2.0, w: 4.0, h: 0.6, fill: { color: col.color }, line: { type: 'none' } });
    s.addText(col.title, { x, y: 2.0, w: 4.0, h: 0.6, ...F.whiteBold, align: 'center', valign: 'middle' });
    col.items.forEach((item, j) => {
      s.addText('• ' + item, { x: x + 0.3, y: 2.8 + j * 0.45, w: 3.4, h: 0.4, fontSize: 11, fontFace: 'Calibri', color: C.text });
    });
  });

  // Integrations bar
  s.addShape('roundRect', { x: 0.5, y: 5.7, w: 12.3, h: 1.0, fill: { color: C.primary }, line: { type: 'none' }, rectRadius: 0.05 });
  s.addText('Native Integrations:', { x: 0.7, y: 5.7, w: 3, h: 1.0, ...F.whiteBold, valign: 'middle' });
  s.addText('Delhivery  •  BlueDart  •  Shiprocket  •  India Post  •  Shopify  •  Amazon  •  Flipkart  •  Your ERP', {
    x: 3.3, y: 5.7, w: 9.3, h: 1.0, fontSize: 13, fontFace: 'Calibri', color: 'FFFFFF', valign: 'middle',
  });

  addFooter(s, 10, 15);
}

// ============================================================
// SLIDE 11 — Pricing
// ============================================================
function slide11() {
  const s = pptx.addSlide();
  addTitle(s, 'Simple, Transparent Pricing');

  s.addText('No per-order surprises. No per-warehouse fees. No hidden costs.', {
    x: 0.5, y: 1.4, w: 12.3, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: C.muted, italic: true, align: 'center',
  });

  const plans = [
    {
      name: 'Starter',
      price: '₹2,500',
      sub: '/month  •  ₹24,000/yr (save 20%)',
      best: '1 warehouse, 500 SKUs, 1,000 orders/mo',
      features: ['Unlimited users', 'GST invoicing', 'E-way bill', 'Mobile scan', 'Standard integrations'],
      highlight: false,
    },
    {
      name: 'Growth',
      price: '₹6,000',
      sub: '/month  •  ₹57,600/yr (save 20%)',
      best: '3 warehouses, 5,000 SKUs, 10,000 orders/mo',
      features: ['Everything in Starter', 'Wave picking', 'Multi-client (3PL)', 'Dedicated success manager', 'Priority support'],
      highlight: true,
    },
    {
      name: 'Scale',
      price: 'Custom',
      sub: 'Contact for quote',
      best: '10+ warehouses, unlimited SKUs & orders',
      features: ['Everything in Growth', 'Unlimited warehouses', 'Custom integrations', 'On-site training', '99.9% SLA'],
      highlight: false,
    },
  ];

  plans.forEach((p, i) => {
    const x = 0.5 + i * 4.2;
    const bgColor = p.highlight ? C.primary : C.soft;
    const textColor = p.highlight ? 'FFFFFF' : C.text;
    const titleColor = p.highlight ? C.accent : C.primary;
    s.addShape('roundRect', { x, y: 1.9, w: 4.0, h: 4.5, fill: { color: bgColor }, line: { color: p.highlight ? C.accent : C.border, width: p.highlight ? 2 : 1 }, rectRadius: 0.1 });

    if (p.highlight) {
      s.addShape('rect', { x, y: 1.9, w: 4.0, h: 0.4, fill: { color: C.accent }, line: { type: 'none' } });
      s.addText('MOST POPULAR', { x, y: 1.9, w: 4.0, h: 0.4, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.primary, align: 'center', valign: 'middle' });
    }

    s.addText(p.name, { x, y: 2.4, w: 4.0, h: 0.5, fontSize: 22, fontFace: 'Calibri', bold: true, color: titleColor, align: 'center' });
    s.addText(p.price, { x, y: 2.95, w: 4.0, h: 0.7, fontSize: 36, fontFace: 'Calibri', bold: true, color: textColor, align: 'center' });
    s.addText(p.sub, { x, y: 3.65, w: 4.0, h: 0.3, fontSize: 10, fontFace: 'Calibri', color: p.highlight ? 'E2E8F0' : C.muted, align: 'center' });
    s.addText(p.best, { x: x + 0.2, y: 4.05, w: 3.6, h: 0.6, fontSize: 11, fontFace: 'Calibri', italic: true, color: p.highlight ? 'FFFFFF' : C.text, align: 'center' });

    p.features.forEach((f, j) => {
      s.addText('✓ ' + f, { x: x + 0.3, y: 4.7 + j * 0.32, w: 3.4, h: 0.3, fontSize: 10, fontFace: 'Calibri', color: textColor });
    });
  });

  s.addText('🎁  15-day free trial — full feature access, no credit card required', {
    x: 0.5, y: 6.6, w: 12.3, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.accent, align: 'center',
  });

  addFooter(s, 11, 15);
}

// ============================================================
// SLIDE 12 — ROI Calculator
// ============================================================
function slide12() {
  const s = pptx.addSlide();
  addTitle(s, 'Your Numbers. Your ROI.');

  s.addText('Sample for a mid-market D2C brand processing 5,000 orders/month', {
    x: 0.5, y: 1.4, w: 12.3, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: C.muted, italic: true, align: 'center',
  });

  // 3 benefit cards
  const benefits = [
    { num: '₹40,000', label: 'Saved/month', desc: 'from error reduction (5,000 orders × 2% × ₹400 return cost)' },
    { num: '₹28,000', label: 'Saved/month', desc: 'from manager time recovered (14 hrs/week × ₹500/hr)' },
    { num: '₹22,000', label: 'Saved/month', desc: 'vs Unicommerce subscription + per-order fees' },
  ];

  benefits.forEach((b, i) => {
    const x = 0.5 + i * 4.2;
    s.addShape('roundRect', { x, y: 2.0, w: 4.0, h: 2.4, fill: { color: C.soft }, line: { color: C.green, width: 2 }, rectRadius: 0.1 });
    s.addText(b.num, { x, y: 2.1, w: 4.0, h: 0.9, fontSize: 36, fontFace: 'Calibri', bold: true, color: C.green, align: 'center' });
    s.addText(b.label, { x, y: 3.0, w: 4.0, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.primary, align: 'center' });
    s.addText(b.desc, { x: x + 0.2, y: 3.5, w: 3.6, h: 0.8, fontSize: 10, fontFace: 'Calibri', color: C.text, align: 'center' });
  });

  // Total box
  s.addShape('roundRect', { x: 0.5, y: 4.7, w: 12.3, h: 1.9, fill: { color: C.primary }, line: { type: 'none' }, rectRadius: 0.1 });
  s.addText('Total monthly benefit:', { x: 0.5, y: 4.85, w: 6, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: 'E2E8F0', align: 'right' });
  s.addText('₹90,000', { x: 0.5, y: 5.25, w: 6, h: 0.6, fontSize: 32, fontFace: 'Calibri', bold: true, color: C.accent, align: 'right' });

  s.addText('SupplyHub annual cost:', { x: 6.5, y: 4.85, w: 6.3, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: 'E2E8F0' });
  s.addText('₹57,600', { x: 6.5, y: 5.25, w: 6.3, h: 0.6, fontSize: 32, fontFace: 'Calibri', bold: true, color: 'FFFFFF' });

  s.addText('Net annual ROI: ₹10,22,400  •  ~1,775% return', { x: 0.5, y: 5.95, w: 12.3, h: 0.5, fontSize: 16, fontFace: 'Calibri', bold: true, color: 'FFFFFF', align: 'center' });

  addFooter(s, 12, 15);
}

// ============================================================
// SLIDE 13 — Implementation Timeline
// ============================================================
function slide13() {
  const s = pptx.addSlide();
  addTitle(s, 'From Sign-Up to First Shipment in 7 Days');

  s.addText('Free data migration included. Dedicated hypercare team watches your go-live.', {
    x: 0.5, y: 1.4, w: 12.3, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: C.muted, italic: true, align: 'center',
  });

  // Timeline
  const timeline = [
    { day: 'Day 1-2', title: 'Setup', desc: 'Account, warehouses, user invitations' },
    { day: 'Day 3-4', title: 'Data', desc: 'SKU import, bin setup, suppliers' },
    { day: 'Day 5',   title: 'Training', desc: 'Video library + live Q&A' },
    { day: 'Day 6',   title: 'Connect', desc: 'Couriers, channels, integrations' },
    { day: 'Day 7',   title: 'Go Live', desc: 'UAT, hypercare, first shipments' },
  ];

  timeline.forEach((t, i) => {
    const x = 0.5 + i * 2.55;
    s.addShape('ellipse', { x: x + 0.85, y: 2.2, w: 0.6, h: 0.6, fill: { color: C.accent }, line: { type: 'none' } });
    s.addText(String(i + 1), { x: x + 0.85, y: 2.2, w: 0.6, h: 0.6, fontSize: 18, fontFace: 'Calibri', bold: true, color: C.primary, align: 'center', valign: 'middle' });
    if (i < timeline.length - 1) {
      s.addShape('line', { x: x + 1.5, y: 2.5, w: 1.85, h: 0, line: { color: C.border, width: 2 } });
    }
    s.addText(t.day, { x, y: 2.95, w: 2.3, h: 0.3, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.accent, align: 'center' });
    s.addText(t.title, { x, y: 3.25, w: 2.3, h: 0.4, fontSize: 16, fontFace: 'Calibri', bold: true, color: C.primary, align: 'center' });
    s.addText(t.desc, { x, y: 3.7, w: 2.3, h: 0.8, fontSize: 10, fontFace: 'Calibri', color: C.text, align: 'center' });
  });

  // Support section
  s.addShape('roundRect', { x: 0.5, y: 5.0, w: 12.3, h: 1.9, fill: { color: C.soft }, line: { color: C.border, width: 1 }, rectRadius: 0.1 });
  s.addText('Onboarding Support Included in Every Plan', { x: 0.5, y: 5.1, w: 12.3, h: 0.4, fontSize: 16, fontFace: 'Calibri', bold: true, color: C.primary, align: 'center' });

  const support = [
    { icon: '🎥', label: '40+ video tutorials' },
    { icon: '💬', label: 'In-app chat (all plans)' },
    { icon: '📞', label: 'Dedicated success manager (Growth+)' },
    { icon: '👨‍💻', label: 'Free data migration' },
  ];

  support.forEach((s2, i) => {
    const x = 0.7 + i * 3.0;
    s.addText(s2.icon + '  ' + s2.label, { x, y: 5.7, w: 2.9, h: 0.5, fontSize: 11, fontFace: 'Calibri', color: C.text, align: 'center' });
  });

  addFooter(s, 13, 15);
}

// ============================================================
// SLIDE 14 — The Ask
// ============================================================
function slide14() {
  const s = pptx.addSlide();
  s.background = { color: C.primary };
  s.addShape('rect', { x: 0, y: 0, w: 0.4, h: 7.5, fill: { color: C.accent }, line: { type: 'none' } });

  s.addText('Let\'s Get Your Warehouses Live in 7 Days', { x: 1, y: 0.5, w: 11.5, h: 0.9, fontSize: 32, fontFace: 'Calibri', bold: true, color: 'FFFFFF' });
  s.addText('Pick the path that works for you:', { x: 1, y: 1.4, w: 11.5, h: 0.4, fontSize: 16, fontFace: 'Calibri', color: C.accent, italic: true });

  const options = [
    {
      label: 'Option A',
      title: 'Start Free Trial',
      desc: '15-day full-feature access.\nNo credit card, no commitment.\nSet up in 2 hours.',
      cta: 'trial.supplyhub.in',
    },
    {
      label: 'Option B',
      title: 'Book Live Demo',
      desc: '30-min walkthrough with your\nSKUs, your warehouses, your workflows.',
      cta: 'calendly.com/supplyhub-demo',
    },
    {
      label: 'Option C',
      title: 'Custom Pilot',
      desc: 'For 3PLs and enterprises.\nScoped, priced, delivered in 30 days.',
      cta: 'contact@globalsupply.in',
    },
  ];

  options.forEach((o, i) => {
    const x = 0.8 + i * 4.0;
    s.addShape('roundRect', { x, y: 2.1, w: 3.7, h: 3.6, fill: { color: 'FFFFFF' }, line: { type: 'none' }, rectRadius: 0.1 });
    s.addShape('rect', { x, y: 2.1, w: 3.7, h: 0.4, fill: { color: C.accent }, line: { type: 'none' } });
    s.addText(o.label, { x, y: 2.1, w: 3.7, h: 0.4, fontSize: 12, fontFace: 'Calibri', bold: true, color: C.primary, align: 'center', valign: 'middle' });
    s.addText(o.title, { x, y: 2.6, w: 3.7, h: 0.5, fontSize: 20, fontFace: 'Calibri', bold: true, color: C.primary, align: 'center' });
    s.addText(o.desc, { x: x + 0.2, y: 3.2, w: 3.3, h: 1.5, fontSize: 12, fontFace: 'Calibri', color: C.text, align: 'center' });
    s.addText(o.cta, { x, y: 4.95, w: 3.7, h: 0.5, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.primary, align: 'center', italic: true });
  });

  // Special offer banner
  s.addShape('roundRect', { x: 0.8, y: 6.0, w: 11.7, h: 0.9, fill: { color: C.accent }, line: { type: 'none' }, rectRadius: 0.05 });
  s.addText('🎁  This Quarter Only: 2 months FREE  +  Free data migration  +  Free courier integration', {
    x: 0.8, y: 6.0, w: 11.7, h: 0.9, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.primary, align: 'center', valign: 'middle',
  });

  s.addText('Thank you!  •  Questions welcome.', {
    x: 0.5, y: 7.05, w: 12.3, h: 0.4, fontSize: 12, fontFace: 'Calibri', color: C.accent, align: 'center', italic: true,
  });
}

// ============================================================
// SLIDE 15 — FAQ (Bonus)
// ============================================================
function slide15() {
  const s = pptx.addSlide();
  addTitle(s, 'Questions You\'re Probably Asking');

  const faqs = [
    { q: 'What if I\'m already on Unicommerce?', a: 'Free migration in 14 days, no data loss.' },
    { q: 'Do I need to change my courier?', a: 'No — we integrate with Delhivery, BlueDart, Shiprocket, India Post, and more.' },
    { q: 'Can my CA access the system for GST?', a: 'Yes — role-based access, read-only CA role available.' },
    { q: 'What about barcode printers and scanners?', a: 'Works with any standard hardware (Zebra, Honeywell, generic USB scanners).' },
    { q: 'Is my data secure?', a: 'Daily S3 backups, AES-256 encryption, ISO 27001-ready infrastructure.' },
    { q: 'Do you have a mobile app?', a: 'Mobile-responsive web app today; native apps coming Q1 2027.' },
  ];

  faqs.forEach((f, i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const x = 0.5 + col * 6.3;
    const y = 1.6 + row * 1.7;
    s.addShape('roundRect', { x, y, w: 6.1, h: 1.5, fill: { color: C.soft }, line: { color: C.border, width: 1 }, rectRadius: 0.05 });
    s.addText('Q: ' + f.q, { x: x + 0.2, y: y + 0.1, w: 5.7, h: 0.5, fontSize: 12, fontFace: 'Calibri', bold: true, color: C.primary });
    s.addText('A: ' + f.a, { x: x + 0.2, y: y + 0.6, w: 5.7, h: 0.9, fontSize: 11, fontFace: 'Calibri', color: C.text });
  });

  addFooter(s, 15, 15);
}

// Build all slides
slide1();
slide2();
slide3();
slide4();
slide5();
slide6();
slide7();
slide8();
slide9();
slide10();
slide11();
slide12();
slide13();
slide14();
slide15();

// Write file
const outFile = path.join(__dirname, 'SupplyHub-Sales-Proposal.pptx');
pptx.writeFile({ fileName: outFile }).then(() => {
  console.log(`✅ Generated: ${outFile}`);
}).catch(err => {
  console.error('Error generating PPTX:', err);
  process.exit(1);
});
