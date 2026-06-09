// GlobalSupply Techno — Process Flow + UAT Test Deck
// Reuses the visual style of SupplyHub-Redesigned.pptx
// Run: node generate-process-uat-pptx.js
const PptxGenJS = require('pptxgenjs');
const path = require('path');
const fs = require('fs');

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5
pptx.title = 'GlobalSupply Techno — Process Flow & UAT';
pptx.author = 'GlobalSupply Techno';
pptx.company = 'GlobalSupply Techno';
pptx.subject = 'User Training & UAT Test Cases';

// === Brand colors (matching SupplyHub-Redesigned.pptx) ===
const C = {
  navy:   '1A2B4A',  // dark blue background
  navy2:  '243860',  // slightly lighter navy for cards
  navy3:  '2C4068',  // navy variant
  teal:   '3DBDA7',  // primary accent
  amber:  'F5A623',  // warm accent
  purple: '7B6CE0',  // cool accent
  green:  '2DBE85',  // success
  red:    'FF5470',  // danger
  pink:   'EC4899',
  light:  'F5F7FB',  // off-white for cards
  text:   '1F2937',  // body text
  muted:  '8A95AD',  // muted text
  border: 'D7DEEA',
  white:  'FFFFFF',
};

const F = {
  h1:    { fontSize: 28, fontFace: 'Calibri', bold: true, color: C.white },
  h2:    { fontSize: 22, fontFace: 'Calibri', bold: true, color: C.white },
  h3:    { fontSize: 16, fontFace: 'Calibri', bold: true, color: C.teal },
  h4:    { fontSize: 14, fontFace: 'Calibri', bold: true, color: C.white },
  body:  { fontSize: 12, fontFace: 'Calibri', color: C.white },
  bodyD: { fontSize: 12, fontFace: 'Calibri', color: C.text },
  small: { fontSize: 10, fontFace: 'Calibri', color: C.muted, italic: true },
  smallW:{ fontSize: 10, fontFace: 'Calibri', color: C.white, italic: true },
  mono:  { fontFace: 'Consolas', fontSize: 8, color: C.text },
};

function addFooter(slide, pageNum, total) {
  slide.addText('GlobalSupply Techno  |  User Training & UAT  |  globalsupply.in', {
    x: 0.4, y: 7.15, w: 10, h: 0.3, ...F.smallW,
  });
  slide.addText(`${pageNum} / ${total}`, {
    x: 12.3, y: 7.15, w: 0.6, h: 0.3, fontSize: 10, fontFace: 'Calibri', color: C.muted, align: 'right',
  });
}

function addAccentBar(slide) {
  slide.addShape('rect', { x: 0, y: 0, w: 13.333, h: 0.15, fill: { color: C.teal }, line: { type: 'none' } });
}

function darkSlide() {
  const s = pptx.addSlide();
  s.background = { color: C.navy };
  return s;
}

function addHeader(slide, title, subtitle) {
  addAccentBar(slide);
  slide.addText(title, { x: 0.5, y: 0.35, w: 12.3, h: 0.7, ...F.h1 });
  if (subtitle) {
    slide.addText(subtitle, { x: 0.5, y: 1.0, w: 12.3, h: 0.4, fontSize: 14, fontFace: 'Calibri', color: C.teal, italic: true });
  }
  slide.addShape('line', { x: 0.5, y: 1.45, w: 12.3, h: 0, line: { color: C.navy3, width: 1 } });
}

// Box with top color accent (matches Redesigned deck cards)
function coloredCard(slide, x, y, w, h, accentColor, title, body) {
  slide.addShape('rect', { x, y, w, h: 0.18, fill: { color: accentColor }, line: { type: 'none' } });
  slide.addShape('rect', { x, y: y + 0.18, w, h: h - 0.18, fill: { color: C.navy2 }, line: { type: 'none' } });
  slide.addText(title, { x: x + 0.2, y: y + 0.3, w: w - 0.4, h: 0.5, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.white });
  slide.addText(body, { x: x + 0.2, y: y + 0.85, w: w - 0.4, h: h - 1.0, fontSize: 10, fontFace: 'Calibri', color: 'C9D1E0' });
}

// Light card (for the data/flow side)
function lightCard(slide, x, y, w, h, title, body, accent) {
  slide.addShape('rect', { x, y, w, h, fill: { color: C.light }, line: { color: C.border, width: 1 } });
  if (accent) {
    slide.addShape('rect', { x, y, w: 0.15, h, fill: { color: accent }, line: { type: 'none' } });
  }
  slide.addText(title, { x: x + 0.3, y: y + 0.15, w: w - 0.4, h: 0.4, fontSize: 13, fontFace: 'Calibri', bold: true, color: C.navy });
  if (body) slide.addText(body, { x: x + 0.3, y: y + 0.55, w: w - 0.4, h: h - 0.7, fontSize: 10, fontFace: 'Calibri', color: C.text, ...(typeof body === 'string' ? {} : {}) });
}

// ====================================================================
// SECTION A: COVER & INTRODUCTION
// ====================================================================

// Slide 1 — Cover
function slide1() {
  const s = darkSlide();
  s.addShape('rect', { x: 0, y: 0, w: 0.4, h: 7.5, fill: { color: C.teal }, line: { type: 'none' } });

  s.addText('GlobalSupply Techno', { x: 1, y: 1.6, w: 11, h: 1.0, fontSize: 52, fontFace: 'Calibri', bold: true, color: C.white });
  s.addText('Process Flow & UAT Test Guide', { x: 1, y: 2.7, w: 11, h: 0.6, fontSize: 28, fontFace: 'Calibri', color: C.teal, italic: true });
  s.addText('For User Training and User-Acceptance Testing', { x: 1, y: 3.4, w: 11, h: 0.5, fontSize: 16, fontFace: 'Calibri', color: 'C9D1E0' });

  s.addShape('line', { x: 1, y: 4.3, w: 4, h: 0, line: { color: C.amber, width: 3 } });

  s.addText('Prepared by GlobalSupply Techno  •  v2.0  •  June 2026', { x: 1, y: 4.6, w: 11, h: 0.4, fontSize: 12, fontFace: 'Calibri', color: C.amber });
  s.addText('For internal training, customer onboarding, and UAT sign-off', { x: 1, y: 5.0, w: 11, h: 0.4, fontSize: 11, fontFace: 'Calibri', color: 'A8B3CC' });

  s.addText('globalsupply.in', { x: 1, y: 6.6, w: 11, h: 0.3, fontSize: 10, fontFace: 'Calibri', color: C.muted });
}

// Slide 2 — Document Overview (table of contents)
function slide2() {
  const s = darkSlide();
  addHeader(s, 'What This Document Covers', 'A training and UAT reference for warehouse teams, supervisors, and admins');

  const sections = [
    { num: '01', title: 'End-to-End Lifecycle',       desc: 'PO → Stock → Order → Ship → Dispatch — the full journey in 8 steps.', color: C.teal },
    { num: '02', title: 'Inbound Process',             desc: 'PO → ASN → GRN → QC → Putaway → Bin. How stock enters your warehouse. Supports supplier overshipment.', color: C.amber },
    { num: '03', title: 'Outbound Process',            desc: 'Order → Wave Picking → Packing → AWB → Manifest → Dispatch. FEFO soft reservation.', color: C.purple },
    { num: '04', title: 'Inventory Controls',          desc: 'Cycle count, FEFO expiry, replenishment, SKU history, ABC classification, directed putaway.', color: C.green },
    { num: '05', title: 'Returns & RTO',               desc: 'Customer return intake, QC, restock, and reverse pickup. Auto-RTO after 3 failed attempts.', color: C.red },
    { num: '06', title: 'Allocation Engine',            desc: 'FEFO batch allocation, soft reservation, partial allocation, manifest close = hard deduction.', color: C.pink },
    { num: '07', title: 'Marketplace & Webhooks',       desc: 'Flipkart/Nykaa/Myntra/TataCliq connectors, webhook processing, auto-NDR, channel-aware ATS.', color: C.teal },
    { num: '08', title: 'Warehouse Intelligence',       desc: 'Directed putaway, auto-wave by carrier, QC quarantine, blind cycle count.', color: C.amber },
    { num: '09', title: 'Compliance & Settlement',      desc: 'Sequential invoicing, e-invoicing IRN, credit notes, COD reconciliation.', color: C.purple },
    { num: '10', title: 'Safety & Access Control',      desc: '8 critical security fixes, idempotency guards, owner-controlled menu access per company.', color: C.green },
    { num: '11', title: 'UAT Test Cases',              desc: '40+ manual test cases across all modules. Each with pre-conditions, steps, and expected results.', color: C.red },
  ];

  sections.forEach((sec, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.25;
    const y = 1.8 + row * 1.7;
    coloredCard(s, x, y, 4.0, 1.5, sec.color,
      `${sec.num}. ${sec.title}`,
      sec.desc
    );
  });

  addFooter(s, 2, 35);
}

// Slide 3 — Roles & Responsibilities
function slide3() {
  const s = darkSlide();
  addHeader(s, 'User Roles & Responsibilities', 'Six roles, each with a specific scope in the warehouse operation');

  const roles = [
    { name: 'Platform Owner',        scope: 'Cross-tenant, no warehouse', color: C.teal,   perms: 'Manages tenants, sees all data, configures global settings.' },
    { name: 'Tenant Admin',          scope: 'Single tenant, all warehouses', color: C.amber,  perms: 'Full access to their org. Users, settings, integrations, billing.' },
    { name: 'Warehouse Manager',     scope: 'Single or multi-warehouse', color: C.purple, perms: 'POs, GRNs, manifests, reports, staff management.' },
    { name: 'Inventory Staff',       scope: 'Bin-level operations', color: C.green, perms: 'Putaway, cycle count, bin transfers, stock adjustments.' },
    { name: 'Picker / Packer',       scope: 'Floor operations', color: C.red, perms: 'Wave picking, scan-to-pack, label print, AWB generation.' },
    { name: 'Gatepass / Returns',    scope: 'Outbound & reverse', color: C.pink, perms: 'Gatepass creation, RTO intake, return QC, restock.' },
  ];

  roles.forEach((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.25;
    const y = 1.8 + row * 2.6;
    coloredCard(s, x, y, 4.0, 2.4, r.color, r.name, `${r.scope}\n\n${r.perms}`);
  });

  addFooter(s, 3, 35);
}

// ====================================================================
// SECTION B: END-TO-END LIFECYCLE
// ====================================================================

// Slide 4 — Lifecycle overview
function slide4() {
  const s = darkSlide();
  addHeader(s, 'End-to-End Order Lifecycle', 'From purchase order to delivery — 8 stages, 3 areas, 1 platform');

  // Horizontal pipeline of stages
  const stages = [
    { code: 'PO',  name: 'Purchase Order',  color: C.teal },
    { code: 'GRN', name: 'Goods Receipt',   color: C.amber },
    { code: 'PUT', name: 'Putaway',         color: C.purple },
    { code: 'ORD', name: 'Order',           color: C.green },
    { code: 'WAV', name: 'Wave Picking',    color: C.pink },
    { code: 'PCK', name: 'Packing',         color: C.teal },
    { code: 'SHI', name: 'Ship (AWB)',      color: C.amber },
    { code: 'DSP', name: 'Dispatch',        color: C.purple },
  ];

  stages.forEach((stage, i) => {
    const x = 0.5 + i * 1.6;
    s.addShape('roundRect', { x, y: 1.9, w: 1.4, h: 1.0, fill: { color: C.navy2 }, line: { color: stage.color, width: 2 }, rectRadius: 0.05 });
    s.addShape('rect', { x, y: 1.9, w: 1.4, h: 0.15, fill: { color: stage.color }, line: { type: 'none' } });
    s.addText(stage.code, { x, y: 2.15, w: 1.4, h: 0.4, fontSize: 18, fontFace: 'Calibri', bold: true, color: stage.color, align: 'center' });
    s.addText(stage.name, { x, y: 2.55, w: 1.4, h: 0.4, fontSize: 9, fontFace: 'Calibri', color: C.white, align: 'center' });

    if (i < stages.length - 1) {
      s.addShape('rightTriangle', { x: x + 1.42, y: 2.3, w: 0.18, h: 0.2, fill: { color: stage.color }, line: { type: 'none' }, rotate: 90 });
    }
  });

  // 3 phases
  s.addShape('roundRect', { x: 0.5, y: 3.5, w: 4.0, h: 1.0, fill: { color: C.navy2 }, line: { color: C.teal, width: 2 }, rectRadius: 0.05 });
  s.addText('INBOUND', { x: 0.5, y: 3.6, w: 4.0, h: 0.3, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.teal, align: 'center' });
  s.addText('PO → GRN → Putaway\nReceiving stock from suppliers', { x: 0.5, y: 3.85, w: 4.0, h: 0.6, fontSize: 10, fontFace: 'Calibri', color: C.white, align: 'center' });

  s.addShape('roundRect', { x: 4.65, y: 3.5, w: 4.0, h: 1.0, fill: { color: C.navy2 }, line: { color: C.amber, width: 2 }, rectRadius: 0.05 });
  s.addText('OUTBOUND', { x: 4.65, y: 3.6, w: 4.0, h: 0.3, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.amber, align: 'center' });
  s.addText('Order → Wave → Pack → Ship\nFulfilling customer orders', { x: 4.65, y: 3.85, w: 4.0, h: 0.6, fontSize: 10, fontFace: 'Calibri', color: C.white, align: 'center' });

  s.addShape('roundRect', { x: 8.8, y: 3.5, w: 4.0, h: 1.0, fill: { color: C.navy2 }, line: { color: C.purple, width: 2 }, rectRadius: 0.05 });
  s.addText('DISPATCH', { x: 8.8, y: 3.6, w: 4.0, h: 0.3, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.purple, align: 'center' });
  s.addText('Manifest → Dispatch → Deliver\nHand-off to courier + tracking', { x: 8.8, y: 3.85, w: 4.0, h: 0.6, fontSize: 10, fontFace: 'Calibri', color: C.white, align: 'center' });

  // Key metrics
  s.addText('What success looks like:', { x: 0.5, y: 4.9, w: 12.3, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.teal });
  const kpis = [
    { num: '40%', label: 'fewer fulfillment errors', color: C.amber },
    { num: '3×',  label: 'faster picklist processing', color: C.purple },
    { num: '99%', label: 'inventory accuracy', color: C.green },
    { num: '24h', label: 'average go-live time', color: C.teal },
  ];
  kpis.forEach((k, i) => {
    const x = 0.5 + i * 3.1;
    s.addShape('rect', { x, y: 5.4, w: 2.95, h: 0.05, fill: { color: k.color }, line: { type: 'none' } });
    s.addText(k.num, { x, y: 5.5, w: 2.95, h: 0.7, fontSize: 32, fontFace: 'Calibri', bold: true, color: k.color, align: 'center' });
    s.addText(k.label, { x, y: 6.2, w: 2.95, h: 0.4, fontSize: 10, fontFace: 'Calibri', color: C.white, align: 'center' });
  });

  addFooter(s, 4, 35);
}

// ====================================================================
// SECTION C: INBOUND PROCESS (PO → STOCK)
// ====================================================================

// Slide 5 — Inbound overview
function slide5() {
  const s = darkSlide();
  addHeader(s, 'Inbound Process — PO to Stock', '5 stages from supplier purchase order to bin location');

  // Steps
  const steps = ['Purchase Order', 'ASN (Advance Ship Notice)', 'Goods Receipt Note (GRN)', 'Quality Check (QC)', 'Putaway to Bin'];
  steps.forEach((step, i) => {
    const x = 0.5 + i * 2.55;
    s.addShape('roundRect', { x, y: 1.9, w: 2.4, h: 0.8, fill: { color: C.navy2 }, line: { color: C.teal, width: 2 }, rectRadius: 0.05 });
    s.addShape('rect', { x, y: 1.9, w: 2.4, h: 0.15, fill: { color: C.teal }, line: { type: 'none' } });
    s.addText(`Step ${i + 1}`, { x, y: 2.1, w: 2.4, h: 0.25, fontSize: 9, fontFace: 'Calibri', bold: true, color: C.teal, align: 'center' });
    s.addText(step, { x: x + 0.1, y: 2.35, w: 2.2, h: 0.4, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.white, align: 'center' });
    if (i < steps.length - 1) {
      s.addShape('rightTriangle', { x: x + 2.42, y: 2.2, w: 0.13, h: 0.2, fill: { color: C.teal }, line: { type: 'none' }, rotate: 90 });
    }
  });

  // Detail cards
  const details = [
    { title: 'Purchase Order',  body: '• Create PO in Purchase Orders tab\n• Add supplier, SKU, qty, expected date\n• Status: DRAFT → APPROVED → ISSUED\n• Triggers ASN from supplier', color: C.teal },
    { title: 'ASN',              body: '• Supplier ships & uploads ASN\n• ASN shows expected arrival date, items, qty\n• Visible in Inbound → ASN tab\n• Helps pre-plan receiving capacity', color: C.amber },
    { title: 'GRN + Scan',       body: '• Truck arrives → create GRN from PO\n• Scan each SKU, capture batch, MRP, expiry\n• Vendor invoice no. for GST\n• Supports overshipment (receive > PO qty)\n• Status: DRAFT → RECEIVING → RECEIVED', color: C.purple },
    { title: 'Quality Check',    body: '• Per-item QC: PASS or FAIL\n• Accept/reject quantities separately\n• Rejected qty tracked, not moved to stock\n• Status → QC_PASSED or QC_FAILED', color: C.green },
    { title: 'Putaway',          body: '• Approved qty flows to GRN-RECEIVED bin\n• Auto-creates putaway task\n• Directed putaway suggests optimal bin\n• Atomic transaction prevents stock loss\n• Inventory reflects in real-time', color: C.red },
  ];

  details.forEach((d, i) => {
    const x = 0.5 + i * 2.55;
    s.addShape('rect', { x, y: 3.0, w: 0.15, h: 3.4, fill: { color: d.color }, line: { type: 'none' } });
    s.addShape('rect', { x: x + 0.15, y: 3.0, w: 2.25, h: 3.4, fill: { color: C.navy2 }, line: { type: 'none' } });
    s.addText(d.title, { x: x + 0.3, y: 3.1, w: 2.0, h: 0.4, fontSize: 12, fontFace: 'Calibri', bold: true, color: d.color });
    s.addText(d.body, { x: x + 0.3, y: 3.55, w: 2.0, h: 2.7, fontSize: 9, fontFace: 'Calibri', color: 'C9D1E0' });
  });

  // Status flow footer
  s.addText('Status flow:  PO[DRAFT] → PO[APPROVED] → ASN[RECEIVING] → GRN[RECEIVING] → GRN[QC_PASSED] → Putaway[IN_PROGRESS] → Putaway[COMPLETED]', {
    x: 0.5, y: 6.6, w: 12.3, h: 0.4, fontSize: 10, fontFace: 'Consolas', color: C.amber, align: 'center', italic: true,
  });

  addFooter(s, 5, 35);
}

// Slide 6 — Inbound — GRN Screen Mockup
function slide6() {
  const s = darkSlide();
  addHeader(s, 'Inbound — GRN Detail Screen', 'How to receive goods: scan items, capture batch, mark QC, approve');

  // Mock UI - left side: actual screen, right side: annotations
  // Screen frame
  s.addShape('rect', { x: 0.5, y: 1.8, w: 8.5, h: 5.0, fill: { color: C.white }, line: { color: C.border, width: 1 } });
  // Title bar
  s.addShape('rect', { x: 0.5, y: 1.8, w: 8.5, h: 0.5, fill: { color: C.navy }, line: { type: 'none' } });
  s.addText('GRN Detail — GRN-2024-0042  •  PO-2024-001  •  Status: RECEIVING', { x: 0.7, y: 1.85, w: 8.0, h: 0.4, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.white });

  // Items table
  const rows = [
    ['SKU',          'Product',          'Ordered', 'Received', 'Batch',     'MRP',   'QC'],
    ['SHK-BLK-9',    'Black Shoes (9)',  '10',      '8',        'B-2024-A',  '2999',  '✓ Pass'],
    ['SHK-WHT-8',    'White Shoes (8)',  '5',       '5',        'B-2024-B',  '2999',  '✓ Pass'],
    ['TEE-RED-M',    'Red Tee (M)',      '20',      '18',       'B-2024-C',  '599',   '✗ Fail'],
  ];
  rows.forEach((r, i) => {
    const y = 2.5 + i * 0.4;
    if (i === 0) {
      s.addShape('rect', { x: 0.6, y, w: 8.3, h: 0.4, fill: { color: C.light }, line: { color: C.border, width: 1 } });
    }
    r.forEach((cell, j) => {
      const x = 0.6 + j * 1.2;
      s.addText(cell, { x, y: y + 0.05, w: 1.2, h: 0.3, fontSize: 9, fontFace: j === 0 ? 'Consolas' : 'Calibri', bold: i === 0, color: i === 0 ? C.navy : C.text });
    });
  });

  // Buttons
  s.addShape('roundRect', { x: 0.7, y: 4.4, w: 1.4, h: 0.5, fill: { color: C.green }, line: { type: 'none' }, rectRadius: 0.05 });
  s.addText('Approve GRN', { x: 0.7, y: 4.4, w: 1.4, h: 0.5, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.white, align: 'center', valign: 'middle' });

  s.addShape('roundRect', { x: 2.2, y: 4.4, w: 1.4, h: 0.5, fill: { color: C.red }, line: { type: 'none' }, rectRadius: 0.05 });
  s.addText('Reject GRN', { x: 2.2, y: 4.4, w: 1.4, h: 0.5, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.white, align: 'center', valign: 'middle' });

  s.addShape('roundRect', { x: 3.7, y: 4.4, w: 1.6, h: 0.5, fill: { color: C.teal }, line: { type: 'none' }, rectRadius: 0.05 });
  s.addText('Scan to Receive', { x: 3.7, y: 4.4, w: 1.6, h: 0.5, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.white, align: 'center', valign: 'middle' });

  // Notes
  s.addText('Notes:', { x: 0.7, y: 5.1, w: 8.0, h: 0.3, fontSize: 10, fontFace: 'Calibri', bold: true, color: C.navy });
  s.addText('Vendor invoice: INV-2024-118  •  Truck arrived 09:30  •  2 boxes damaged in transit', { x: 0.7, y: 5.4, w: 8.0, h: 0.3, fontSize: 9, fontFace: 'Calibri', color: C.text });
  s.addText('QC failed for TEE-RED-M: 2 units have stains. Returned to supplier.', { x: 0.7, y: 5.7, w: 8.0, h: 0.3, fontSize: 9, fontFace: 'Calibri', color: C.text });

  // Audit log preview
  s.addText('Audit Trail:', { x: 0.7, y: 6.1, w: 8.0, h: 0.3, fontSize: 10, fontFace: 'Calibri', bold: true, color: C.navy });
  s.addText('09:30  GRN created by Ravi  •  09:35  First scan: SHK-BLK-9  •  09:42  QC marked  •  09:50  Approved by Manager', { x: 0.7, y: 6.4, w: 8.0, h: 0.3, fontSize: 8, fontFace: 'Consolas', color: C.muted });

  // Right side: annotation panel
  s.addShape('rect', { x: 9.2, y: 1.8, w: 3.6, h: 5.0, fill: { color: C.navy2 }, line: { type: 'none' } });
  s.addShape('rect', { x: 9.2, y: 1.8, w: 3.6, h: 0.15, fill: { color: C.amber }, line: { type: 'none' } });
  s.addText('Key Actions', { x: 9.4, y: 2.0, w: 3.2, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.amber });

  s.addText('1.  Scan each SKU into Received qty\n\n2.  Enter batch no. and MRP\n\n3.  Mark QC Pass or Fail per item\n\n4.  Add note if any damage\n\n5.  Click Approve GRN\n\n6.  Putaway tasks auto-created\n\n7.  Inventory updates in real time', {
    x: 9.4, y: 2.5, w: 3.2, h: 4.2, fontSize: 10, fontFace: 'Calibri', color: C.white,
  });

  addFooter(s, 6, 35);
}

// ====================================================================
// SECTION D: OUTBOUND PROCESS (ORDER → DISPATCH)
// ====================================================================

// Slide 7 — Outbound overview
function slide7() {
  const s = darkSlide();
  addHeader(s, 'Outbound Process — Order to Dispatch', '6 stages from customer order to courier handover');

  const steps = [
    { code: '01', title: 'Order',          desc: 'From marketplace or manual. FEFO soft reservation.',         color: C.teal },
    { code: '02', title: 'Wave',            desc: 'Group 20-30 orders for batch pick',        color: C.amber },
    { code: '03', title: 'Picking',         desc: 'Picker walks path, scans each SKU',         color: C.purple },
    { code: '04', title: 'Packing',         desc: 'Verify items, pack, generate label',        color: C.green },
    { code: '05', title: 'AWB',             desc: 'Generate tracking with courier',            color: C.red },
    { code: '06', title: 'Dispatch',        desc: 'Manifest close, hand to courier',           color: C.pink },
  ];

  steps.forEach((step, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.25;
    const y = 1.8 + row * 2.6;
    coloredCard(s, x, y, 4.0, 2.4, step.color, `${step.code}  ${step.title}`, step.desc);
  });

  addFooter(s, 7, 35);
}

// Slide 8 — Outbound — Wave Picking screen
function slide8() {
  const s = darkSlide();
  addHeader(s, 'Outbound — Wave Picking Screen', 'Group orders, scan to pick, track progress per SKU');

  // Mock UI left
  s.addShape('rect', { x: 0.5, y: 1.8, w: 8.5, h: 5.0, fill: { color: C.white }, line: { color: C.border, width: 1 } });
  s.addShape('rect', { x: 0.5, y: 1.8, w: 8.5, h: 0.5, fill: { color: C.navy }, line: { type: 'none' } });
  s.addText('Wave 1  •  IN_PROGRESS  •  3 orders  •  Mumbai Central Hub', { x: 0.7, y: 1.85, w: 8.0, h: 0.4, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.white });

  // Order tabs
  s.addShape('rect', { x: 0.6, y: 2.4, w: 2.0, h: 0.4, fill: { color: C.teal }, line: { type: 'none' } });
  s.addText('MAN-MQ2K1GDE', { x: 0.6, y: 2.4, w: 2.0, h: 0.4, fontSize: 9, fontFace: 'Consolas', bold: true, color: C.white, align: 'center', valign: 'middle' });

  s.addShape('rect', { x: 2.7, y: 2.4, w: 2.0, h: 0.4, fill: { color: C.light }, line: { color: C.border, width: 1 } });
  s.addText('MAN-MQ3K5GDE', { x: 2.7, y: 2.4, w: 2.0, h: 0.4, fontSize: 9, fontFace: 'Consolas', color: C.text, align: 'center', valign: 'middle' });

  s.addShape('rect', { x: 4.8, y: 2.4, w: 2.0, h: 0.4, fill: { color: C.light }, line: { color: C.border, width: 1 } });
  s.addText('MAN-MQ4K7GDE', { x: 4.8, y: 2.4, w: 2.0, h: 0.4, fontSize: 9, fontFace: 'Consolas', color: C.text, align: 'center', valign: 'middle' });

  // Scan input
  s.addShape('rect', { x: 0.6, y: 3.0, w: 6.0, h: 0.5, fill: { color: C.light }, line: { color: C.border, width: 1 } });
  s.addText('📷 Scan SKU barcode to verify...', { x: 0.7, y: 3.05, w: 5.8, h: 0.4, fontSize: 10, fontFace: 'Calibri', color: C.muted, italic: true });

  s.addShape('rect', { x: 6.7, y: 3.0, w: 1.5, h: 0.5, fill: { color: C.navy }, line: { type: 'none' } });
  s.addText('Verify', { x: 6.7, y: 3.0, w: 1.5, h: 0.5, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.white, align: 'center', valign: 'middle' });

  // Items table
  s.addShape('rect', { x: 0.6, y: 3.7, w: 8.3, h: 0.3, fill: { color: C.navy }, line: { type: 'none' } });
  ['SKU', 'Product', 'Order Qty', 'Scanned', 'Status'].forEach((h, i) => {
    s.addText(h, { x: 0.7 + i * 1.7, y: 3.7, w: 1.6, h: 0.3, fontSize: 9, fontFace: 'Calibri', bold: true, color: C.white, valign: 'middle' });
  });

  const items = [
    ['SHK-BLK-9', 'Black Running Shoes (9)', '2', '1', 'Partial 1/2'],
    ['TEE-RED-M', 'Red Tee (M)', '1', '0', 'Pending'],
  ];
  items.forEach((r, i) => {
    const y = 4.05 + i * 0.35;
    r.forEach((c, j) => {
      s.addText(c, { x: 0.7 + j * 1.7, y, w: 1.6, h: 0.3, fontSize: 9, fontFace: j === 0 ? 'Consolas' : 'Calibri', color: j === 4 && c.startsWith('Partial') ? C.amber : C.text });
    });
  });

  // Short-pick button
  s.addShape('roundRect', { x: 0.6, y: 5.0, w: 3.5, h: 0.5, fill: { color: C.amber }, line: { type: 'none' }, rectRadius: 0.05 });
  s.addText('Process with Short Pick (1 remaining)', { x: 0.6, y: 5.0, w: 3.5, h: 0.5, fontSize: 10, fontFace: 'Calibri', bold: true, color: C.white, align: 'center', valign: 'middle' });

  // Right: annotation
  s.addShape('rect', { x: 9.2, y: 1.8, w: 3.6, h: 5.0, fill: { color: C.navy2 }, line: { type: 'none' } });
  s.addShape('rect', { x: 9.2, y: 1.8, w: 3.6, h: 0.15, fill: { color: C.purple }, line: { type: 'none' } });
  s.addText('How Wave Picking Works', { x: 9.4, y: 2.0, w: 3.2, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.purple });

  s.addText('1.  Create wave from 20-30 orders\n\n2.  Start wave → status IN_PROGRESS\n\n3.  Picker scans each SKU in turn\n\n4.  System tracks scanned vs ordered\n\n5.  Partial scans flagged in amber\n\n6.  Option to process with short pick\n\n7.  All items picked → move to PACKING\n\n8.  Order status auto-updates', {
    x: 9.4, y: 2.5, w: 3.2, h: 4.2, fontSize: 10, fontFace: 'Calibri', color: C.white,
  });

  addFooter(s, 8, 35);
}

// Slide 9 — Outbound — Packing screen
function slide9() {
  const s = darkSlide();
  addHeader(s, 'Outbound — Packing Station', 'Verify items, pack, generate invoice + label, generate AWB');

  // Mock UI
  s.addShape('rect', { x: 0.5, y: 1.8, w: 8.5, h: 5.0, fill: { color: C.white }, line: { color: C.border, width: 1 } });
  s.addShape('rect', { x: 0.5, y: 1.8, w: 8.5, h: 0.5, fill: { color: C.navy }, line: { type: 'none' } });
  s.addText('Packing Station  •  Order #MAN-MQ2K1GDE  •  Guest Billing', { x: 0.7, y: 1.85, w: 8.0, h: 0.4, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.white });

  // Order items
  s.addText('Order Items:', { x: 0.7, y: 2.45, w: 4.0, h: 0.3, fontSize: 10, fontFace: 'Calibri', bold: true, color: C.navy });
  s.addText('📦  SHK-BLK-9  Black Running Shoes (9)         Qty: 2        [✓ 2/2 Packed]', { x: 0.7, y: 2.75, w: 8.0, h: 0.3, fontSize: 9, fontFace: 'Calibri', color: C.green });

  // Scan
  s.addShape('rect', { x: 0.7, y: 3.15, w: 6.5, h: 0.5, fill: { color: C.light }, line: { color: C.border, width: 1 } });
  s.addText('Scan SKU to pack...', { x: 0.8, y: 3.2, w: 6.3, h: 0.4, fontSize: 10, fontFace: 'Calibri', color: C.muted, italic: true });
  s.addShape('rect', { x: 7.3, y: 3.15, w: 1.5, h: 0.5, fill: { color: C.teal }, line: { type: 'none' } });
  s.addText('Scan', { x: 7.3, y: 3.15, w: 1.5, h: 0.5, fontSize: 10, fontFace: 'Calibri', bold: true, color: C.white, align: 'center', valign: 'middle' });

  // Packing log
  s.addText('Packing Log:', { x: 0.7, y: 3.85, w: 4.0, h: 0.3, fontSize: 10, fontFace: 'Calibri', bold: true, color: C.navy });
  s.addText('21:52:30   SHK-BLK-9   ✓\n21:52:34   SHK-BLK-9   ✓', { x: 0.7, y: 4.15, w: 5.0, h: 0.6, fontSize: 9, fontFace: 'Consolas', color: C.text });

  // Right side: pre-shipment actions
  s.addShape('rect', { x: 6.0, y: 3.85, w: 2.8, h: 2.5, fill: { color: C.light }, line: { color: C.border, width: 1 } });
  s.addText('Pre-Shipment', { x: 6.1, y: 3.95, w: 2.6, h: 0.3, fontSize: 10, fontFace: 'Calibri', bold: true, color: C.navy });

  s.addShape('rect', { x: 6.1, y: 4.3, w: 2.6, h: 0.4, fill: { color: C.teal }, line: { type: 'none' } });
  s.addText('📄 Download Invoice', { x: 6.1, y: 4.3, w: 2.6, h: 0.4, fontSize: 9, fontFace: 'Calibri', bold: true, color: C.white, align: 'center', valign: 'middle' });

  s.addShape('rect', { x: 6.1, y: 4.8, w: 2.6, h: 0.4, fill: { color: C.purple }, line: { type: 'none' } });
  s.addText('🚚 Generate AWB', { x: 6.1, y: 4.8, w: 2.6, h: 0.4, fontSize: 9, fontFace: 'Calibri', bold: true, color: C.white, align: 'center', valign: 'middle' });

  s.addShape('rect', { x: 6.1, y: 5.3, w: 2.6, h: 0.4, fill: { color: C.green }, line: { type: 'none' } });
  s.addText('🖨  Print Label', { x: 6.1, y: 5.3, w: 2.6, h: 0.4, fontSize: 9, fontFace: 'Calibri', bold: true, color: C.white, align: 'center', valign: 'middle' });

  s.addShape('rect', { x: 6.1, y: 5.8, w: 2.6, h: 0.4, fill: { color: C.amber }, line: { type: 'none' } });
  s.addText('📋 Add to Manifest', { x: 6.1, y: 5.8, w: 2.6, h: 0.4, fontSize: 9, fontFace: 'Calibri', bold: true, color: C.white, align: 'center', valign: 'middle' });

  // Summary
  s.addText('Packing Summary:', { x: 0.7, y: 4.95, w: 4.0, h: 0.3, fontSize: 10, fontFace: 'Calibri', bold: true, color: C.navy });
  s.addText('Total Items: 2   |   Packed: 2   |   Pending: 0', { x: 0.7, y: 5.25, w: 5.0, h: 0.3, fontSize: 9, fontFace: 'Calibri', color: C.text });

  // Annotation
  s.addShape('rect', { x: 9.2, y: 1.8, w: 3.6, h: 5.0, fill: { color: C.navy2 }, line: { type: 'none' } });
  s.addShape('rect', { x: 9.2, y: 1.8, w: 3.6, h: 0.15, fill: { color: C.green }, line: { type: 'none' } });
  s.addText('Pack-Ship Workflow', { x: 9.4, y: 2.0, w: 3.2, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.green });

  s.addText('1.  Scan each SKU to verify\n\n2.  System tracks qty per SKU\n\n3.  When all packed: enable AWB\n\n4.  Download GST invoice\n\n5.  Select courier + generate AWB\n\n6.  Print shipping label (Uniware format)\n\n7.  Add to manifest for batch dispatch\n\n8.  Order moves to SHIPPED', {
    x: 9.4, y: 2.5, w: 3.2, h: 4.2, fontSize: 10, fontFace: 'Calibri', color: C.white,
  });

  addFooter(s, 9, 35);
}

// ====================================================================
// SECTION E: INVENTORY CONTROLS
// ====================================================================

// Slide 10 — Inventory module
function slide10() {
  const s = darkSlide();
  addHeader(s, 'Inventory Controls', 'Bin-level accuracy, batch/expiry tracking, automated replenishment');

  const features = [
    { title: 'Multi-Warehouse',   desc: 'Track stock across 1 to 100+ warehouses. Transfer between facilities with full audit trail.', color: C.teal },
    { title: 'Bin-Level Tracking', desc: 'Every item tracked by SKU + EPC code. Real-time qty per bin, per batch, per expiry.', color: C.amber },
    { title: 'Cycle Count',       desc: 'Blind count: staff counts, system reconciles, variance report auto-generated.', color: C.purple },
    { title: 'FEFO Expiry',       desc: 'First-Expiry-First-Out picking logic. Critical for F&B, pharma, cosmetics.', color: C.green },
    { title: 'Replenishment',     desc: 'Auto-alerts when bin stock drops below reorder point. Generates putaway task. Atomic decrement+increment.', color: C.red },
    { title: 'ABC Classification', desc: 'Value-based classification: A=top 80%, B=next 15%, C=last 5%. Drives cycle count and prioritization.', color: C.pink },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.25;
    const y = 1.8 + row * 2.6;
    coloredCard(s, x, y, 4.0, 2.4, f.color, f.title, f.desc);
  });

  addFooter(s, 10, 35);
}

// Slide 11 — Returns & RTO
function slide11() {
  const s = darkSlide();
  addHeader(s, 'Returns & RTO Process', 'Customer returns and reverse pickup — closed loop');

  const steps = [
    { code: 'RET', title: 'Return Created',  desc: 'From courier NDR or customer request', color: C.red },
    { code: 'RPU', title: 'Reverse Pickup',   desc: 'Courier picks up from customer',      color: C.amber },
    { code: 'RIN', title: 'Return Intake',    desc: 'Scan items at warehouse',              color: C.purple },
    { code: 'RQC', title: 'Return QC',        desc: 'Pass / Fail per item',                 color: C.green },
    { code: 'RST', title: 'Restock / Refund', desc: 'Restock to bin OR mark for refund',    color: C.teal },
  ];

  steps.forEach((step, i) => {
    const x = 0.5 + i * 2.55;
    s.addShape('roundRect', { x, y: 1.9, w: 2.4, h: 1.0, fill: { color: C.navy2 }, line: { color: step.color, width: 2 }, rectRadius: 0.05 });
    s.addShape('rect', { x, y: 1.9, w: 2.4, h: 0.15, fill: { color: step.color }, line: { type: 'none' } });
    s.addText(step.code, { x, y: 2.1, w: 2.4, h: 0.4, fontSize: 16, fontFace: 'Calibri', bold: true, color: step.color, align: 'center' });
    s.addText(step.title, { x, y: 2.5, w: 2.4, h: 0.4, fontSize: 10, fontFace: 'Calibri', bold: true, color: C.white, align: 'center' });
    if (i < steps.length - 1) {
      s.addShape('rightTriangle', { x: x + 2.42, y: 2.3, w: 0.13, h: 0.2, fill: { color: step.color }, line: { type: 'none' }, rotate: 90 });
    }
  });

  // Details
  s.addShape('rect', { x: 0.5, y: 3.3, w: 12.3, h: 3.4, fill: { color: C.navy2 }, line: { type: 'none' } });
  s.addShape('rect', { x: 0.5, y: 3.3, w: 0.15, h: 3.4, fill: { color: C.amber }, line: { type: 'none' } });

  s.addText('Three Return Outcomes', { x: 0.8, y: 3.5, w: 12.0, h: 0.4, fontSize: 16, fontFace: 'Calibri', bold: true, color: C.amber });

  const outcomes = [
    { title: 'A. Restock',         desc: 'Item is in original condition → scan to bin, inventory restored, refund issued', color: C.green },
    { title: 'B. Refund Only',     desc: 'Item damaged or used → mark as bad inventory, refund issued, no restock', color: C.red },
    { title: 'C. Vendor Return',   desc: 'Defective batch → create gatepass to send back to supplier, no refund to customer', color: C.purple },
  ];

  outcomes.forEach((o, i) => {
    const x = 0.8 + i * 4.05;
    s.addShape('rect', { x, y: 4.1, w: 0.15, h: 2.4, fill: { color: o.color }, line: { type: 'none' } });
    s.addText(o.title, { x: x + 0.3, y: 4.2, w: 3.6, h: 0.4, fontSize: 13, fontFace: 'Calibri', bold: true, color: o.color });
    s.addText(o.desc,  { x: x + 0.3, y: 4.6, w: 3.6, h: 1.8, fontSize: 10, fontFace: 'Calibri', color: C.white });
  });

  addFooter(s, 11, 35);
}

// ====================================================================
// SECTION F: ADMIN & ROLES
// ====================================================================

// Slide 20 — Allocation Engine
function slide20() {
  const s = darkSlide();
  addHeader(s, 'Allocation Engine — FEFO & Soft Reservation', 'Intelligent inventory allocation with batch-level tracking');

  const features = [
    { title: 'Soft Reservation', desc: 'Order creation reserves inventory (quantityReserved++) without hard deduction. Prevents overselling across channels.', color: C.teal },
    { title: 'FEFO Batching', desc: 'Allocates from earliest-expiring batches first. Tracks batchNo and expiryDate on each OrderItem.', color: C.amber },
    { title: 'Partial Allocation', desc: 'Items marked ALLOCATED / PARTIAL / UNALLOCATED based on available stock. Supports split fulfillment.', color: C.purple },
    { title: 'Hard Deduction', desc: 'Manifest close does hard deduction: quantityOnHand--, quantityReserved--. Single point of stock commitment.', color: C.green },
    { title: 'Cancel Release', desc: 'Order cancellation releases reservation: quantityReserved--, quantityAvailable++. No phantom stock.', color: C.red },
    { title: 'Channel-Aware ATS', desc: 'Each marketplace gets stock - own buffer - other channels buffers. Prevents cross-channel overselling.', color: C.pink },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.25;
    const y = 1.8 + row * 2.6;
    coloredCard(s, x, y, 4.0, 2.4, f.color, f.title, f.desc);
  });

  addFooter(s, 20, 35);
}

// Slide 21 — Marketplace Webhooks
function slide21() {
  const s = darkSlide();
  addHeader(s, 'Marketplace Webhooks & NDR Automation', 'Real-time order status sync with auto-NDR and auto-RTO');

  const steps = [
    { code: 'WH', title: 'Webhook Received', desc: 'POST /api/webhooks/:marketplace — public endpoint, no auth required', color: C.teal },
    { code: 'MAP', title: 'Status Mapping', desc: 'Flipkart/Nykaa/Myntra/TataCliq status codes mapped to internal statuses', color: C.amber },
    { code: 'NDR', title: 'Auto-NDR', desc: 'Delivery failure creates NDR case automatically', color: C.purple },
    { code: 'RTO', title: 'Auto-RTO', desc: 'After 3 failed attempts → RTO, order → RETURNED', color: C.red },
    { code: 'INV', title: 'Inventory Sync', desc: 'Marketplace events emit inventory changes to all connectors', color: C.green },
  ];

  steps.forEach((step, i) => {
    const x = 0.5 + i * 2.55;
    s.addShape('roundRect', { x, y: 1.9, w: 2.4, h: 1.0, fill: { color: C.navy2 }, line: { color: step.color, width: 2 }, rectRadius: 0.05 });
    s.addShape('rect', { x, y: 1.9, w: 2.4, h: 0.15, fill: { color: step.color }, line: { type: 'none' } });
    s.addText(step.code, { x, y: 2.1, w: 2.4, h: 0.4, fontSize: 16, fontFace: 'Calibri', bold: true, color: step.color, align: 'center' });
    s.addText(step.title, { x, y: 2.5, w: 2.4, h: 0.4, fontSize: 10, fontFace: 'Calibri', bold: true, color: C.white, align: 'center' });
    if (i < steps.length - 1) {
      s.addShape('rightTriangle', { x: x + 2.42, y: 2.3, w: 0.13, h: 0.2, fill: { color: step.color }, line: { type: 'none' }, rotate: 90 });
    }
  });

  // Status mapping table
  const headerStyle = { fill: { color: C.navy2 }, color: C.white, bold: true, align: 'left', fontSize: 10, fontFace: 'Calibri', valign: 'middle' };
  const cellStyle = { color: C.text, align: 'left', fontSize: 9, fontFace: 'Calibri', valign: 'middle' };

  const rows = [
    [
      { text: 'Marketplace', options: headerStyle },
      { text: 'Delivered', options: headerStyle },
      { text: 'Cancelled', options: headerStyle },
      { text: 'Returned', options: headerStyle },
      { text: 'Delivery Failed', options: headerStyle },
    ],
    [{ text: 'Flipkart', options: { ...cellStyle, bold: true } }, { text: 'DELIVERED', options: cellStyle }, { text: 'CANCELLED', options: cellStyle }, { text: 'RETURNED', options: cellStyle }, { text: 'RTO_INITIATED', options: cellStyle }],
    [{ text: 'Nykaa', options: { ...cellStyle, bold: true } }, { text: 'delivered', options: cellStyle }, { text: 'cancelled', options: cellStyle }, { text: 'returned', options: cellStyle }, { text: 'delivery_failed', options: cellStyle }],
    [{ text: 'Myntra', options: { ...cellStyle, bold: true } }, { text: 'Delivered', options: cellStyle }, { text: 'Cancelled', options: cellStyle }, { text: 'Returned', options: cellStyle }, { text: 'Failed', options: cellStyle }],
    [{ text: 'TataCliq', options: { ...cellStyle, bold: true } }, { text: 'delivered', options: cellStyle }, { text: 'cancelled', options: cellStyle }, { text: 'returned', options: cellStyle }, { text: 'delivery_failed', options: cellStyle }],
  ];

  s.addTable(rows, {
    x: 0.5, y: 3.3, w: 12.3,
    colW: [2.0, 2.5, 2.5, 2.5, 2.8],
    rowH: 0.45,
    border: { type: 'solid', color: C.border, pt: 1 },
  });

  addFooter(s, 21, 35);
}

// Slide 22 — Warehouse Intelligence
function slide22() {
  const s = darkSlide();
  addHeader(s, 'Warehouse Intelligence', 'Directed putaway, auto-wave, QC quarantine, blind cycle count');

  const features = [
    { title: 'Directed Putaway', desc: 'GET /api/putaway/suggest-bin scores bins by zone match (+100), capacity (+50), fill level (-30×pct). Returns top 5 suggestions.', color: C.teal },
    { title: 'Auto-Wave', desc: 'POST /api/waves/auto groups pending orders by carrier. Creates waves automatically. maxOrders defaults to 20.', color: C.amber },
    { title: 'QC Quarantine', desc: 'Failed GRN items auto-moved to QUARANTINE bin with quantityAvailable=0. Not allocatable for orders.', color: C.purple },
    { title: 'Blind Cycle Count', desc: 'blindMode hides expected qty — staff counts without bias. abcFilter selects A/B/C class items only.', color: C.green },
    { title: 'Bin Capacity', desc: 'BinLocation.maxCapacity tracks physical limits. Directed putaway respects capacity. Fill % shown in bin dashboard.', color: C.red },
    { title: 'ABC Classification', desc: 'POST /api/inventory/abc-class — value-based: A=top 80%, B=next 15%, C=last 5%. Drives cycle count frequency.', color: C.pink },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.25;
    const y = 1.8 + row * 2.6;
    coloredCard(s, x, y, 4.0, 2.4, f.color, f.title, f.desc);
  });

  addFooter(s, 22, 35);
}

// Slide 23 — Compliance & Settlement
function slide23() {
  const s = darkSlide();
  addHeader(s, 'Compliance & Settlement', 'Invoicing, e-invoicing, credit notes, COD reconciliation');

  const features = [
    { title: 'Sequential Invoices', desc: 'Auto-numbered per warehouse: WH-INV-000001. Linked to orders. Tracks IRN for e-invoicing.', color: C.teal },
    { title: 'E-Invoicing IRN', desc: 'POST /api/invoices/:id/einvoice — generates IRN via IRP API. Demo mode when EINVOICE_API_URL not set.', color: C.amber },
    { title: 'Credit Notes', desc: 'POST /api/invoices/:id/credit-note — sequential WH-CN-000001. Adjusts invoice totals.', color: C.purple },
    { title: 'COD Reconciliation', desc: 'Import settlement CSVs from marketplaces. Match by AWB/order. ₹1 tolerance for discrepancy detection.', color: C.green },
    { title: 'COD Summary', desc: 'GET /api/cod/summary — per-marketplace breakdown, reconciled vs pending amounts, discrepancy alerts.', color: C.red },
    { title: 'E-Way Bill', desc: 'setEwayBill updates both order and linked invoice. Tracks transport document numbers.', color: C.pink },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.25;
    const y = 1.8 + row * 2.6;
    coloredCard(s, x, y, 4.0, 2.4, f.color, f.title, f.desc);
  });

  addFooter(s, 23, 35);
}

// Slide 24 — Safety & Access Control
function slide24() {
  const s = darkSlide();
  addHeader(s, 'Safety Features & Access Control', '8 critical fixes + owner-controlled menu access per company');

  const fixes = [
    { title: 'Double-Cancel Guard', desc: 'Order cancellation checks status before releasing inventory. Prevents phantom stock.', color: C.red },
    { title: 'Double-RESTOCK Guard', desc: 'Returns restock checks existing status. Prevents duplicate inventory additions.', color: C.red },
    { title: 'Atomic Putaway', desc: 'Source decrement + dest increment wrapped in transaction. Prevents stock vanishing.', color: C.red },
    { title: 'Cycle Count Transaction', desc: 'Status update + inventory adjustment in single transaction. Prevents partial updates.', color: C.red },
    { title: 'Double-Approve Guard', desc: 'GRN approval checks status. Prevents duplicate inventory + putaway tasks.', color: C.amber },
    { title: 'Menu Access Control', desc: 'Owner assigns specific menus to each company. Sidebar filters by tenant menuAccess.', color: C.teal },
  ];

  fixes.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.5 + col * 4.25;
    const y = 1.8 + row * 2.6;
    coloredCard(s, x, y, 4.0, 2.4, f.color, f.title, f.desc);
  });

  addFooter(s, 24, 35);
}

// Slide 25 — Admin Tasks (updated)
function slide25() {
  const s = darkSlide();
  addHeader(s, 'Admin Tasks — Setup & Configuration', 'One-time setup tasks for tenant admins and warehouse managers');

  const tasks = [
    { task: 'Create Warehouses',     step: 'Administration → Warehouse → Add. Set code, GSTIN, address, contact.', color: C.teal },
    { task: 'Create Bin Locations',  step: 'Administration → Bin Locations → Bulk Create. Format: AISLE-RACK-SHELF (e.g. A-01-B).', color: C.amber },
    { task: 'Add Suppliers',         step: 'Inbound → Suppliers → Add. Code, name, GSTIN, contact, payment terms.', color: C.purple },
    { task: 'Import SKUs',           step: 'Inventory → Import → SKU. CSV with code, name, brand, HSN, MRP, weight, dimensions.', color: C.green },
    { task: 'Add Users & Roles',     step: 'Administration → Users → Invite. Assign role: Warehouse Mgr, Picker, Packer, etc.', color: C.red },
    { task: 'Configure Couriers',    step: 'Administration → Integrations → Couriers. Enter API token for Delhivery, BlueDart, etc.', color: C.pink },
    { task: 'Set Reorder Points',    step: 'Inventory → Reorder Config. Per-warehouse per-SKU min/max levels.', color: C.teal },
    { task: 'Channel Integrations',  step: 'Administration → Integrations → Channels. Shopify, Amazon, Nykaa, Myntra, Flipkart, TataCliq.', color: C.amber },
    { task: 'Menu Access Control',   step: 'Administration → Companies → Edit. Owner selects which menus each company can access. Controls feature visibility.', color: C.teal },
  ];

  tasks.forEach((t, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 6.25;
    const y = 1.8 + row * 1.3;
    s.addShape('rect', { x, y, w: 6.0, h: 1.2, fill: { color: C.navy2 }, line: { type: 'none' } });
    s.addShape('rect', { x, y, w: 0.15, h: 1.2, fill: { color: t.color }, line: { type: 'none' } });
    s.addText(t.task, { x: x + 0.3, y: y + 0.1, w: 5.6, h: 0.4, fontSize: 12, fontFace: 'Calibri', bold: true, color: C.white });
    s.addText(t.step, { x: x + 0.3, y: y + 0.5, w: 5.6, h: 0.7, fontSize: 10, fontFace: 'Calibri', color: 'C9D1E0' });
  });

  addFooter(s, 25, 35);
}

// ====================================================================
// SECTION G: UAT TEST CASES — HEADER
// ====================================================================

// Slide 26 — UAT Overview
function slide26() {
  const s = darkSlide();
  addHeader(s, 'UAT — Test Plan Overview', '32 manual test cases across 6 modules. Each with pre-conditions, steps, and expected results.');

  const modules = [
    { name: 'Inbound',     count: 6, color: C.teal,   cases: 'PO-001 to PO-006' },
    { name: 'GRN + QC',    count: 5, color: C.amber,  cases: 'GRN-001 to GRN-005' },
    { name: 'Inventory',   count: 5, color: C.purple, cases: 'INV-001 to INV-005' },
    { name: 'Outbound',    count: 6, color: C.green,  cases: 'ORD-001 to ORD-006' },
    { name: 'Packing',     count: 4, color: C.red,    cases: 'PCK-001 to PCK-004' },
    { name: 'Returns',     count: 3, color: C.pink,   cases: 'RET-001 to RET-003' },
    { name: 'Admin',       count: 3, color: C.teal,   cases: 'ADM-001 to ADM-003' },
  ];

  modules.forEach((m, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = 0.5 + col * 3.15;
    const y = 1.8 + row * 2.4;
    coloredCard(s, x, y, 3.0, 2.2, m.color, `${m.name} (${m.count} tests)`, m.cases);
  });

  // Test execution note
  s.addShape('rect', { x: 0.5, y: 6.3, w: 12.3, h: 0.7, fill: { color: C.amber }, line: { type: 'none' } });
  s.addText('How to use this deck:  1. Read pre-conditions  •  2. Execute test steps in order  •  3. Verify expected result  •  4. Mark Pass/Fail in the last column  •  5. Sign-off on completion', {
    x: 0.5, y: 6.3, w: 12.3, h: 0.7, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.navy, align: 'center', valign: 'middle',
  });

  addFooter(s, 26, 35);
}

// ====================================================================
// SECTION H: UAT TEST CASE TABLES
// ====================================================================

function makeTestCaseSlide(slideNum, module, color, cases) {
  const s = darkSlide();
  addHeader(s, `UAT Test Cases — ${module}`, `${cases.length} test cases for the ${module} module`);

  const headerStyle = { fill: { color: C.navy2 }, color: C.white, bold: true, align: 'left', fontSize: 9, fontFace: 'Calibri', valign: 'middle' };
  const cellStyle    = { color: C.text, align: 'left', fontSize: 8, fontFace: 'Calibri', valign: 'middle' };
  const passCol      = { color: C.muted, align: 'center', fontSize: 8, fontFace: 'Calibri', valign: 'middle', bold: true };

  const rows = [
    [
      { text: 'Test ID',         options: headerStyle },
      { text: 'Description',     options: headerStyle },
      { text: 'Pre-Conditions',  options: headerStyle },
      { text: 'Test Steps',      options: headerStyle },
      { text: 'Expected Result', options: headerStyle },
      { text: 'Pass/Fail',       options: headerStyle },
    ],
    ...cases.map(c => [
      { text: c.id,         options: { ...cellStyle, bold: true, color: color } },
      { text: c.desc,       options: cellStyle },
      { text: c.pre,        options: cellStyle },
      { text: c.steps,      options: cellStyle },
      { text: c.expected,   options: { ...cellStyle, color: C.green } },
      { text: '☐  ☐',       options: passCol },
    ]),
  ];

  s.addTable(rows, {
    x: 0.5, y: 1.7, w: 12.3,
    colW: [1.0, 2.4, 2.2, 3.4, 2.5, 0.8],
    rowH: 0.55,
    border: { type: 'solid', color: C.border, pt: 1 },
    fontSize: 8,
  });

  addFooter(s, slideNum, 25);
}

// Slide 27 — UAT Inbound test cases
function slide27() {
  makeTestCaseSlide(27, 'Inbound (PO + ASN)', C.teal, [
    { id: 'PO-001', desc: 'Create a new Purchase Order', pre: 'Logged in as Warehouse Manager. Supplier exists in system.', steps: '1. Go to Inbound → Purchase Orders → New PO\n2. Select supplier\n3. Add 2 SKUs with qty 10 and 5\n4. Click Create PO', expected: 'PO created with status DRAFT. PO number auto-generated.' },
    { id: 'PO-002', desc: 'Approve a DRAFT PO', pre: 'PO exists in DRAFT status.', steps: '1. Open the DRAFT PO\n2. Click Approve\n3. Confirm approval', expected: 'Status changes to APPROVED. ASN can now be linked.' },
    { id: 'PO-003', desc: 'Add ASN to an APPROVED PO', pre: 'PO is APPROVED.', steps: '1. Open PO\n2. Click Add ASN\n3. Enter expected date, qty, vehicle no.\n4. Save ASN', expected: 'ASN visible in Inbound → ASN tab with status EXPECTED.' },
    { id: 'PO-004', desc: 'Receive a partial shipment', pre: 'ASN exists with qty 10. Supplier delivers 8.', steps: '1. Open ASN\n2. Click Receive\n3. Enter received qty = 8\n4. Save', expected: 'ASN marked PARTIALLY_RECEIVED. PO status remains APPROVED.' },
    { id: 'PO-005', desc: 'Reject a Purchase Order', pre: 'PO in DRAFT status.', steps: '1. Open PO\n2. Click Reject\n3. Provide rejection reason', expected: 'PO status changes to REJECTED. ASN cannot be created.' },
    { id: 'PO-006', desc: 'Import POs via CSV', pre: 'CSV file in correct format.', steps: '1. Go to Inbound → Import\n2. Upload CSV\n3. Click Import', expected: 'POs created in bulk. Import summary shows count of created/failed.' },
  ]);
}

// Slide 28 — UAT GRN test cases
function slide28() {
  makeTestCaseSlide(28, 'GRN + Quality Check', C.amber, [
    { id: 'GRN-001', desc: 'Create GRN from a PO', pre: 'PO is APPROVED. ASN is RECEIVING.', steps: '1. Open the PO\n2. Click GRN\n3. Select received qty per item\n4. Save GRN', expected: 'GRN created in DRAFT status. GRN number auto-generated.' },
    { id: 'GRN-002', desc: 'Scan items into a GRN', pre: 'GRN exists in DRAFT.', steps: '1. Open GRN\n2. Click Scan to Receive\n3. Scan each item barcode\n4. System increments received qty', expected: 'Received qty increases per scan. Audit log shows each scan.' },
    { id: 'GRN-003', desc: 'Mark items as QC Pass / Fail', pre: 'GRN has all items received.', steps: '1. Open GRN\n2. For each item, mark QC Pass or Fail\n3. Enter accepted qty', expected: 'QC status set per item. Rejected qty tracked separately.' },
    { id: 'GRN-004', desc: 'Approve a QC-passed GRN', pre: 'All items have QC status.', steps: '1. Open GRN\n2. Click Approve\n3. Confirm approval', expected: 'GRN status → QC_PASSED. Putaway tasks auto-created. Inventory reflected.' },
    { id: 'GRN-005', desc: 'Reject an entire GRN', pre: 'GRN has critical defects.', steps: '1. Open GRN\n2. Click Reject GRN\n3. Provide reason', expected: 'GRN status → REJECTED. No putaway tasks created. Supplier notified.' },
  ]);
}

// Slide 29 — UAT Inventory test cases
function slide29() {
  makeTestCaseSlide(29, 'Inventory', C.purple, [
    { id: 'INV-001', desc: 'Import SKUs via CSV', pre: 'CSV file with SKU details.', steps: '1. Go to Inventory → Import\n2. Upload SKU CSV\n3. Click Import', expected: 'SKUs created. EPC codes auto-generated. Import summary shown.' },
    { id: 'INV-002', desc: 'Run a blind cycle count', pre: 'Bin has known quantity.', steps: '1. Go to Inventory → Cycle Count\n2. Select bin\n3. Enter counted qty (different from actual)\n4. Save count', expected: 'Variance report generated. Adjustment posted after manager approval.' },
    { id: 'INV-003', desc: 'Set reorder point for an SKU', pre: 'SKU and bin exist.', steps: '1. Open SKU detail\n2. Set reorder point = 10\n3. Save', expected: 'When stock < 10, replenishment alert raised automatically.' },
    { id: 'INV-004', desc: 'View SKU history', pre: 'SKU has movements.', steps: '1. Go to SKU History\n2. Search for SKU code\n3. View event timeline', expected: 'All events shown with running balance. Source/target facility tracked.' },
    { id: 'INV-005', desc: 'Transfer stock between bins', pre: 'Two bins exist, stock in source.', steps: '1. Open Inventory\n2. Select item\n3. Click Transfer Bin\n4. Select destination bin\n5. Confirm', expected: 'Inventory moved. Transfer logged in SKU history.' },
  ]);
}

// Slide 30 — UAT Outbound test cases
function slide30() {
  makeTestCaseSlide(30, 'Outbound (Orders + Wave)', C.green, [
    { id: 'ORD-001', desc: 'Receive order from marketplace', pre: 'Channel integration active.', steps: '1. Go to Orders\n2. Wait for sync OR click Sync Now\n3. Find the new order', expected: 'Order appears with status PENDING. Source = marketplace name.' },
    { id: 'ORD-002', desc: 'Manually create an order', pre: 'Customer and SKU exist.', steps: '1. Go to Orders → New Order\n2. Enter customer, address, items\n3. Save', expected: 'Order created with status PENDING. Order number generated.' },
    { id: 'ORD-003', desc: 'Create a wave from pending orders', pre: '5+ orders in PENDING.', steps: '1. Go to Wave Picking → New Wave\n2. Name the wave\n3. Select 5 orders\n4. Create wave', expected: 'Wave created with status PENDING. Order statuses → PROCESSING.' },
    { id: 'ORD-004', desc: 'Start a wave', pre: 'Wave in PENDING status.', steps: '1. Open wave\n2. Click Start Picking', expected: 'Wave → IN_PROGRESS. Order statuses → PICKING.' },
    { id: 'ORD-005', desc: 'Scan items while wave picking', pre: 'Wave IN_PROGRESS.', steps: '1. Open wave\n2. Click an order tab\n3. Scan each SKU\n4. Verify qty increments', expected: 'Scanned qty increases per scan. Partial status shown in amber.' },
    { id: 'ORD-006', desc: 'Process with short pick', pre: 'Order has partial scan (e.g., 1/2).', steps: '1. Open wave\n2. Click Process with Short Pick\n3. Confirm', expected: 'Order → PACKING. Item marked PICKED despite short count.' },
  ]);
}

// Slide 31 — UAT Packing test cases
function slide31() {
  makeTestCaseSlide(31, 'Packing Station', C.red, [
    { id: 'PCK-001', desc: 'Pack an order (full qty)', pre: 'Order in PACKING status.', steps: '1. Go to Packing → Ready to Pack\n2. Select order\n3. Scan each SKU to full qty\n4. Verify all packed', expected: 'Download Invoice + Generate AWB buttons enabled.' },
    { id: 'PCK-002', desc: 'Block over-scanning per SKU', pre: 'Order has 1 unit of SKU X.', steps: '1. Open order in packing\n2. Scan SKU X\n3. Try scanning SKU X again', expected: 'Second scan rejected. Error: "already packed 1/1".' },
    { id: 'PCK-003', desc: 'Generate invoice and AWB', pre: 'All items packed.', steps: '1. Click Download Invoice\n2. Select courier\n3. Click Generate AWB', expected: 'PDF invoice downloaded. AWB number shown. Order → SHIPPED.' },
    { id: 'PCK-004', desc: 'Reprint invoice from Recently Packed', pre: 'Order in SHIPPED status.', steps: '1. Go to Packing → Recently Packed\n2. Find order\n3. Click Invoice button', expected: 'Invoice PDF re-downloaded. Same format as original.' },
  ]);
}

// Slide 32 — UAT Returns test cases
function slide32() {
  makeTestCaseSlide(32, 'Returns & RTO', C.pink, [
    { id: 'RET-001', desc: 'Create a customer return', pre: 'Order is SHIPPED or DELIVERED.', steps: '1. Go to Returns → New Return\n2. Select order\n3. Mark items as return\n4. Save', expected: 'Return created in INITIATED status. Reverse pickup scheduled.' },
    { id: 'RET-002', desc: 'Intake returned items at warehouse', pre: 'Return in TRANSIT status, items arrived.', steps: '1. Open return\n2. Scan each returned item\n3. Mark condition: Good / Damaged\n4. Save', expected: 'Return status → RECEIVED. QC step enabled.' },
    { id: 'RET-003', desc: 'Restock a returned item to bin', pre: 'Return in QC_PASSED status.', steps: '1. Open return\n2. For each item, choose Restock or Refund Only\n3. For restock, select bin\n4. Confirm', expected: 'If Restock: inventory +1 in chosen bin. If Refund: bad inventory. Return → CLOSED.' },
  ]);
}

// Slide 33 — UAT Admin test cases
function slide33() {
  makeTestCaseSlide(33, 'Administration & Setup', C.teal, [
    { id: 'ADM-001', desc: 'Create a new user', pre: 'Logged in as Tenant Admin.', steps: '1. Go to Admin → Users → Invite\n2. Enter email, name, role\n3. Click Send Invite', expected: 'User created in INVITED status. Email sent (if SMTP configured).' },
    { id: 'ADM-002', desc: 'Configure a courier integration', pre: 'Courier API token available.', steps: '1. Go to Admin → Integrations → Couriers\n2. Select Delhivery\n3. Paste API token\n4. Save', expected: 'Courier marked as CONFIGURED. AWB generation uses real API.' },
    { id: 'ADM-003', desc: 'Bulk-create bin locations', pre: 'Warehouse exists.', steps: '1. Go to Admin → Bins → Bulk Create\n2. Enter pattern (e.g. A-01-A to A-05-D)\n3. Click Generate', expected: 'All matching bin locations created. Visible in bin picker.' },
  ]);
}

// ====================================================================
// SECTION I: UAT EXECUTION & SIGN-OFF
// ====================================================================

// Slide 34 — Test execution tracker (overall)
function slide34() {
  const s = darkSlide();
  addHeader(s, 'UAT — Overall Execution Tracker', 'Mark module progress as testers complete each suite');

  const modules = [
    { name: 'Inbound',     total: 6, color: C.teal },
    { name: 'GRN + QC',    total: 5, color: C.amber },
    { name: 'Inventory',   total: 5, color: C.purple },
    { name: 'Outbound',    total: 6, color: C.green },
    { name: 'Packing',     total: 4, color: C.red },
    { name: 'Returns',     total: 3, color: C.pink },
    { name: 'Admin',       total: 3, color: C.teal },
  ];

  // Header row
  s.addShape('rect', { x: 0.5, y: 1.7, w: 12.3, h: 0.5, fill: { color: C.navy2 }, line: { type: 'none' } });
  ['Module', 'Total', 'Passed', 'Failed', 'Blocked', 'Not Run', 'Progress'].forEach((h, i) => {
    const x = 0.5 + (i === 0 ? 0.2 : (i === 1 ? 2.5 : (i === 2 ? 3.5 : (i === 3 ? 4.5 : (i === 4 ? 5.5 : (i === 5 ? 6.7 : 8.0))))));
    s.addText(h, { x, y: 1.75, w: 1.0, h: 0.4, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.white, valign: 'middle' });
  });

  // Rows
  modules.forEach((m, i) => {
    const y = 2.3 + i * 0.55;
    s.addShape('rect', { x: 0.5, y, w: 12.3, h: 0.5, fill: { color: i % 2 === 0 ? C.navy2 : C.navy3 }, line: { type: 'none' } });
    s.addShape('rect', { x: 0.5, y, w: 0.15, h: 0.5, fill: { color: m.color }, line: { type: 'none' } });

    s.addText(m.name, { x: 0.8, y, w: 1.6, h: 0.5, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.white, valign: 'middle' });
    s.addText(String(m.total), { x: 2.5, y, w: 0.8, h: 0.5, fontSize: 11, fontFace: 'Calibri', color: C.white, valign: 'middle' });
    s.addText('☐', { x: 3.5, y, w: 0.8, h: 0.5, fontSize: 14, fontFace: 'Calibri', color: C.green, valign: 'middle' });
    s.addText('☐', { x: 4.5, y, w: 0.8, h: 0.5, fontSize: 14, fontFace: 'Calibri', color: C.red, valign: 'middle' });
    s.addText('☐', { x: 5.5, y, w: 1.0, h: 0.5, fontSize: 14, fontFace: 'Calibri', color: C.amber, valign: 'middle' });
    s.addText(String(m.total), { x: 6.7, y, w: 1.0, h: 0.5, fontSize: 11, fontFace: 'Calibri', color: C.muted, valign: 'middle' });
    // Progress bar
    s.addShape('rect', { x: 8.0, y: y + 0.18, w: 4.5, h: 0.15, fill: { color: C.navy }, line: { type: 'none' } });
    s.addText('0%', { x: 8.0, y, w: 4.5, h: 0.5, fontSize: 10, fontFace: 'Calibri', color: C.muted, align: 'center', valign: 'middle' });
  });

  // Totals
  const totalTests = modules.reduce((s, m) => s + m.total, 0);
  s.addShape('rect', { x: 0.5, y: 6.2, w: 12.3, h: 0.7, fill: { color: C.amber }, line: { type: 'none' } });
  s.addText(`Total: ${totalTests} tests across ${modules.length} modules  •  Target: 100% Pass  •  Acceptance: < 2 Critical, < 5 High defects`, {
    x: 0.5, y: 6.2, w: 12.3, h: 0.7, fontSize: 12, fontFace: 'Calibri', bold: true, color: C.navy, align: 'center', valign: 'middle',
  });

  addFooter(s, 34, 35);
}

// Slide 35 — Defect log template
function slide35() {
  const s = darkSlide();
  addHeader(s, 'UAT — Defect Log Template', 'Log any failures found during testing. Use this format for triage.');

  const headerStyle = { fill: { color: C.navy2 }, color: C.white, bold: true, align: 'left', fontSize: 10, fontFace: 'Calibri', valign: 'middle' };
  const cellStyle    = { color: C.text, align: 'left', fontSize: 9, fontFace: 'Calibri', valign: 'middle' };

  const rows = [
    [
      { text: 'Defect ID', options: headerStyle },
      { text: 'Test ID',   options: headerStyle },
      { text: 'Description', options: headerStyle },
      { text: 'Severity', options: headerStyle },
      { text: 'Steps to Reproduce', options: headerStyle },
      { text: 'Status', options: headerStyle },
      { text: 'Owner', options: headerStyle },
    ],
    [
      { text: 'BUG-001', options: { ...cellStyle, bold: true, color: C.red } },
      { text: 'PCK-002', options: cellStyle },
      { text: 'Over-scan allowed when order has 0 qty', options: cellStyle },
      { text: 'High', options: { ...cellStyle, color: C.red, bold: true } },
      { text: '1. Create order with 0 qty\n2. Open in Packing\n3. Scan SKU 3 times', options: { ...cellStyle, fontSize: 8 } },
      { text: '☐ Open', options: { ...cellStyle, color: C.amber } },
      { text: '', options: cellStyle },
    ],
    [
      { text: 'BUG-002', options: { ...cellStyle, bold: true, color: C.red } },
      { text: 'INV-002', options: cellStyle },
      { text: 'Cycle count variance not shown in dashboard', options: cellStyle },
      { text: 'Medium', options: { ...cellStyle, color: C.amber, bold: true } },
      { text: '1. Run cycle count\n2. Enter wrong qty\n3. Check dashboard', options: { ...cellStyle, fontSize: 8 } },
      { text: '☐ Open', options: { ...cellStyle, color: C.amber } },
      { text: '', options: cellStyle },
    ],
    [
      { text: '', options: cellStyle },
      { text: '', options: cellStyle },
      { text: '', options: cellStyle },
      { text: '', options: cellStyle },
      { text: '', options: cellStyle },
      { text: '', options: cellStyle },
      { text: '', options: cellStyle },
    ],
    [
      { text: '', options: cellStyle },
      { text: '', options: cellStyle },
      { text: '', options: cellStyle },
      { text: '', options: cellStyle },
      { text: '', options: cellStyle },
      { text: '', options: cellStyle },
      { text: '', options: cellStyle },
    ],
  ];

  s.addTable(rows, {
    x: 0.5, y: 1.7, w: 12.3,
    colW: [1.0, 1.0, 3.0, 1.2, 3.5, 1.2, 1.4],
    rowH: 0.7,
    border: { type: 'solid', color: C.border, pt: 1 },
  });

  // Severity legend
  const sev = [
    { label: 'Critical: blocks testing', color: C.red },
    { label: 'High: major feature broken', color: C.amber },
    { label: 'Medium: minor feature issue', color: C.amber },
    { label: 'Low: cosmetic / typo', color: C.green },
  ];
  sev.forEach((s, i) => {
    s; // unused
  });

  s.addText('Severity legend:', { x: 0.5, y: 5.6, w: 2.0, h: 0.3, fontSize: 11, fontFace: 'Calibri', bold: true, color: C.teal });

  const sevList = [
    { label: 'Critical — blocks testing',  color: C.red },
    { label: 'High — major feature broken', color: C.amber },
    { label: 'Medium — minor feature issue', color: C.amber },
    { label: 'Low — cosmetic / typo',       color: C.green },
  ];
  sevList.forEach((item, i) => {
    const x = 0.5 + i * 3.1;
    s.addShape('rect', { x, y: 6.0, w: 0.15, h: 0.4, fill: { color: item.color }, line: { type: 'none' } });
    s.addText(item.label, { x: x + 0.3, y: 6.0, w: 2.7, h: 0.4, fontSize: 10, fontFace: 'Calibri', color: C.white, valign: 'middle' });
  });

  addFooter(s, 35, 35);
}

// Slide 36 — Test environment
function slide36() {
  const s = darkSlide();
  addHeader(s, 'Test Environment & Setup Checklist', 'Ensure the test environment is ready before starting UAT');

  const sections = [
    {
      title: 'Environment',  color: C.teal,
      items: [
        'Production-like staging environment at oms-wms-staging.onrender.com',
        'Test database seeded with 50+ SKUs, 8+ bins, 5+ orders',
        'Couriers in TEST mode (no real AWBs generated)',
        'Cloudflare / CDN disabled for direct API access',
      ],
    },
    {
      title: 'Test Users',  color: C.amber,
      items: [
        'admin@supplyhub-test.com  •  Tenant Admin',
        'mgr.mumbai@supplyhub-test.com  •  Warehouse Manager',
        'picker1@supplyhub-test.com  •  Picker role',
        'packer1@supplyhub-test.com  •  Packer role',
        'All passwords: Test@1234 (change after first login)',
      ],
    },
    {
      title: 'Test Data',  color: C.purple,
      items: [
        '10 POs (mix of DRAFT, APPROVED, ASN linked)',
        '8 GRNs (mix of RECEIVING, QC_PASSED, QC_FAILED)',
        '30 orders (mix of PENDING, PROCESSING, PICKING, PACKING, SHIPPED)',
        '1 closed manifest for re-print testing',
        'Sample customer returns (3 items)',
      ],
    },
    {
      title: 'Tools & Access',  color: C.green,
      items: [
        'Browser: Chrome latest, Firefox latest',
        'Test devices: 1 desktop, 1 mobile (Android), 1 scanner',
        'PDF reader for invoice/label validation',
        'Bug tracker: Linear / Jira / GitHub Issues',
        'Slack/Teams channel for live questions',
      ],
    },
  ];

  sections.forEach((sec, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.5 + col * 6.25;
    const y = 1.8 + row * 2.6;
    coloredCard(s, x, y, 6.0, 2.4, sec.color, sec.title, sec.items.map(it => '• ' + it).join('\n'));
  });

  addFooter(s, 36, 35);
}

// Slide 37 — Sign-off
function slide37() {
  const s = darkSlide();
  addHeader(s, 'UAT Sign-Off', 'Acceptance criteria: 100% pass on Critical & High tests. < 5 Medium defects.');

  // Sign-off table
  const headerStyle = { fill: { color: C.navy2 }, color: C.white, bold: true, align: 'left', fontSize: 11, fontFace: 'Calibri', valign: 'middle' };
  const cellStyle    = { color: C.text, align: 'left', fontSize: 11, fontFace: 'Calibri', valign: 'middle' };
  const lineStyle    = { color: C.text, align: 'left', fontSize: 10, fontFace: 'Calibri', valign: 'middle', fill: { color: C.white } };

  const rows = [
    [
      { text: 'Role',          options: headerStyle },
      { text: 'Name',          options: headerStyle },
      { text: 'Signature',     options: headerStyle },
      { text: 'Date',          options: headerStyle },
      { text: 'Decision',      options: headerStyle },
    ],
    [
      { text: 'UAT Lead (Client)',   options: cellStyle },
      { text: '________________',     options: lineStyle },
      { text: '________________',     options: lineStyle },
      { text: '______________',      options: lineStyle },
      { text: '☐ Accept  ☐ Reject',   options: { ...cellStyle, color: C.teal, bold: true } },
    ],
    [
      { text: 'Warehouse Manager',    options: cellStyle },
      { text: '________________',     options: lineStyle },
      { text: '________________',     options: lineStyle },
      { text: '______________',      options: lineStyle },
      { text: '☐ Accept  ☐ Reject',   options: { ...cellStyle, color: C.teal, bold: true } },
    ],
    [
      { text: 'Tenant Admin',         options: cellStyle },
      { text: '________________',     options: lineStyle },
      { text: '________________',     options: lineStyle },
      { text: '______________',      options: lineStyle },
      { text: '☐ Accept  ☐ Reject',   options: { ...cellStyle, color: C.teal, bold: true } },
    ],
    [
      { text: 'Project Manager (SupplyHub)', options: cellStyle },
      { text: '________________',     options: lineStyle },
      { text: '________________',     options: lineStyle },
      { text: '______________',      options: lineStyle },
      { text: '☐ Accept  ☐ Reject',   options: { ...cellStyle, color: C.teal, bold: true } },
    ],
  ];

  s.addTable(rows, {
    x: 0.5, y: 1.7, w: 12.3,
    colW: [3.0, 2.5, 3.0, 2.0, 1.8],
    rowH: 0.6,
    border: { type: 'solid', color: C.border, pt: 1 },
  });

  // Acceptance criteria
  s.addShape('rect', { x: 0.5, y: 5.0, w: 12.3, h: 1.8, fill: { color: C.navy2 }, line: { type: 'none' } });
  s.addShape('rect', { x: 0.5, y: 5.0, w: 0.15, h: 1.8, fill: { color: C.green }, line: { type: 'none' } });

  s.addText('Acceptance Criteria', { x: 0.8, y: 5.1, w: 12.0, h: 0.4, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.green });
  s.addText('✓  All 32 UAT test cases executed and signed off\n✓  Zero open Critical or High severity defects\n✓  < 5 open Medium severity defects (with workaround)\n✓  All key workflows demonstrated: Inbound, Outbound, Returns\n✓  PDFs (Invoice, Label, Manifest) match Uniware format\n✓  Performance: any page loads in < 3 seconds\n✓  Go-live date and training schedule confirmed', {
    x: 0.8, y: 5.45, w: 12.0, h: 1.4, fontSize: 10, fontFace: 'Calibri', color: C.white,
  });

  addFooter(s, 37, 35);
}

// Slide 38 — Closing
function slide38() {
  const s = darkSlide();
  s.addShape('rect', { x: 0, y: 0, w: 0.4, h: 7.5, fill: { color: C.teal }, line: { type: 'none' } });

  s.addText('🎉', { x: 0, y: 1.2, w: 13.333, h: 1.5, fontSize: 80, align: 'center' });

  s.addText('You\'re Ready to Go Live!', { x: 1, y: 3.0, w: 11.5, h: 0.8, fontSize: 40, fontFace: 'Calibri', bold: true, color: C.white, align: 'center' });

  s.addText('Train your team. Run UAT. Sign off. Ship.', { x: 1, y: 3.9, w: 11.5, h: 0.5, fontSize: 18, fontFace: 'Calibri', color: C.teal, italic: true, align: 'center' });

  // 3 CTAs
  const ctas = [
    { label: 'Schedule a Walkthrough', color: C.teal,   icon: '📅' },
    { label: 'Download This Deck',     color: C.amber,  icon: '📥' },
    { label: 'Start a Free Pilot',      color: C.green,  icon: '🚀' },
  ];
  ctas.forEach((c, i) => {
    const x = 1.5 + i * 3.7;
    s.addShape('roundRect', { x, y: 5.0, w: 3.3, h: 1.0, fill: { color: c.color }, line: { type: 'none' }, rectRadius: 0.05 });
    s.addText(`${c.icon}  ${c.label}`, { x, y: 5.0, w: 3.3, h: 1.0, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.white, align: 'center', valign: 'middle' });
  });

  s.addText('globalsupply.in  •  hello@globalsupply.in  •  India', {
    x: 1, y: 6.6, w: 11.5, h: 0.4, fontSize: 12, fontFace: 'Calibri', color: C.muted, align: 'center',
  });
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
slide20();
slide21();
slide22();
slide23();
slide24();
slide25();
slide26();
slide27();
slide28();
slide29();
slide30();
slide31();
slide32();
slide33();
slide34();
slide35();
slide36();
slide37();
slide38();

// Write file
const outFile = path.join('C:\\Users\\alokg\\oms-wms-app\\docs', 'GlobalSupply-Process-Flow-UAT.pptx');
pptx.writeFile({ fileName: outFile }).then(() => {
  const stat = fs.statSync(outFile);
  console.log(`✅ Generated: ${outFile}`);
  console.log(`   Size: ${(stat.size / 1024).toFixed(1)} KB`);
  console.log(`   Slides: 38 (process flow + 5-phase improvements + UAT test cases + sign-off)`);
}).catch(err => {
  console.error('Error generating PPTX:', err);
  process.exit(1);
});
