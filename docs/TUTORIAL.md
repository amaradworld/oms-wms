# OMS-WMS Complete Process Tutorial

## Order Lifecycle Overview

```
 ORDER ──► WAVE ──► PICK ──► PACK ──► SHIP ──► MANIFEST ──► DISPATCH ──► DELIVER
  │         │         │         │         │          │            │            │
 PENDING  PROCESSING PICKING  PACKING  SHIPPED     OPEN       DISPATCHED  DELIVERED
                                                        │
                                                      CLOSED
```

---

## 1. Dashboard — Where You Start

```
┌─────────────────────────────────────────────────────────────────────┐
│  Enterprise Overview                                                │
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───┐ │
│  │Total    │ │Pending  │ │Revenue  │ │Active   │ │SLA      │ │At │ │
│  │Orders   │ │Shipment │ │         │ │SKUs     │ │Breached │ │Risk│ │
│  │  1,284  │ │  432    │ │₹4,52,800│ │   10    │ │   12    │ │  5│ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───┘ │
│                                                                     │
│  ┌─────────────────────────────┐ ┌──────────────────────────────┐   │
│  │ Orders by Status (Bar Chart)│ │ SLA Overview                │   │
│  │                             │ │ ████░░░░░░░░ 12 Breached    │   │
│  │  ██                         │ │ ██░░░░░░░░░░  5 At Risk     │   │
│  │  ██  ██                     │ │ ████████████ 50 On Track    │   │
│  │  ██  ██  ██                 │ │ 📋 Order #OMS-001 ...       │   │
│  │ PND PRC PCK SHP DLV         │ │ 📋 Order #OMS-002 ...       │   │
│  └─────────────────────────────┘ └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**What to do:** Check the SLA Breached count. Red numbers mean orders past their deadline — prioritize those.

---

## 2. Orders — Incoming Orders

```
┌──────────────────────────────────────────────────────────────────────┐
│  Order Management                              [Import CSV] [Refresh]│
│                                                                      │
│  🔍 [ Search by Order ID or Customer...       ]  [All Sources ▾]    │
│                                                                      │
│  ┌────────┬──────────┬────────┬───────┬────────┬──────────┬────────┐│
│  │Order ID│ Customer │ Source │ Items │ Status │   Date   │        ││
│  ├────────┼──────────┼────────┼───────┼────────┼──────────┼────────┤│
│  │OMS-001 │ Alice    │ Nykaa  │ 3 it. │PENDING │22-May   │ ⋮      ││
│  │OMS-002 │ Bob      │ Myntra │ 1 it. │SHIPPED │22-May   │ ⋮      ││
│  │OMS-003 │ Charlie  │ Flipkrt│ 2 it. │PENDING │22-May   │ ⋮      ││
│  │OMS-004 │ Diana    │ Nykaa  │ 4 it. │SHIPPED │21-May   │ ⋮      ││
│  └────────┴──────────┴────────┴───────┴────────┴──────────┴────────┘│
│                                                                      │
│  [Details Modal]                                                     │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ Order OMS-001                                        │            │
│  │ Customer: Alice    Status: PENDING                   │            │
│  │ Address: 123 Main St, Mumbai 400001                  │            │
│  │ Source: Nykaa     Date: 22-May-2026                  │            │
│  │ SLA Deadline: 23-May-2026 2:00 PM  ⚠️ At Risk       │            │
│  │                                                      │            │
│  │ Items:                                               │            │
│  │  SKU-001 - Cotton T-Shirt  x2  ₹499                 │            │
│  │  SKU-002 - Skinny Jeans    x1  ₹1,299               │            │
│  │                                                      │            │
│  │ [Set E-way Bill] [Set IRN] [Generate Invoice]        │            │
│  └──────────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

**What to do:**
- Click `⋮` → **View Details** to see order info
- Click **Cancel Order** only if needed
- For SHIPPED orders: click **Mark Delivered** if courier shows delivered
- **Set E-way Bill** button: enter e-way bill number for GST compliance
- **Set IRN**: enter Invoice Reference Number for e-invoice

---

## 3. Wave Picking — Group Orders for Batch Processing

```
┌──────────────────────────────────────────────────────────────────────┐
│  Wave Picking                               [+ New Wave]            │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ ▶ Wave-1712345678    PROCESSING    📦 5 orders    22-May     │    │
│  │                                          [▶ Start Picking]    │    │
│  ├──────────────────────────────────────────────────────────────┤    │
│  │ ▼ Wave-1712345600    IN_PROGRESS   📦 3 orders    22-May     │    │
│  │  ┌─────────────────────────────────────────────────────────┐  │    │
│  │  │ OMS-005  Alice      PICKING                             │  │    │
│  │  │ OMS-006  Bob        PICKING                             │  │    │
│  │  │ OMS-007  Charlie    PICKING                             │  │    │
│  │  └─────────────────────────────────────────────────────────┘  │    │
│  │                                                [✓ Complete]    │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  [Create Wave Modal]                                                 │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ Wave Name: [Morning Wave 1                  ]        │            │
│  │ Select Orders (3 selected):                            │            │
│  │ ☑ OMS-001 - Alice (Nykaa)                             │            │
│  │ ☑ OMS-003 - Charlie (Flipkart)                        │            │
│  │ ☑ OMS-008 - Eve (Myntra)                              │            │
│  │ [Create Wave (3 orders)]                               │            │
│  └──────────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

**Process flow:**

```
 PENDING orders ──► Create Wave ──► PROCESSING
                                         │
                                    [Start Picking]
                                         │
                                     PICKING ──► Picklist printed
                                         │
                                    [Complete Wave]
                                         │
                                     PACKING ──► Move to Packing
```

**What to do:**
1. Click **+ New Wave** → Select pending orders → Create
2. Click **▶ Start Picking** → Status changes to PICKING
3. Pickers collect items using the Picklist
4. Click **✓ Complete** → Status changes to PACKING → now ready for Packing Screen

---

## 4. Packing Screen — Verify & Generate AWB

```
┌──────────────────────────────────────────────────────────────────────┐
│  Packing Screen                                                     │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ Order: OMS-001  |  Alice  |  Nykaa  |  PACKING               │    │
│  │                                                               │    │
│  │ Items to Pack:                                                │    │
│  │  ☑ SKU-001  Cotton T-Shirt   Qty: 2   ✓ Packed               │    │
│  │  ☐ SKU-002  Skinny Jeans     Qty: 1   [Scan SKU]             │    │
│  │                                                               │    │
│  │ Courier: [SHIPROCKET ▾]   AWB: SR-A7X3K2M9                   │    │
│  │                                        [Generate AWB]         │    │
│  │                                                               │    │
│  │ [✓ Mark Shipped]                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Suggested Courier (if routing configured):                          │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ 🤖 Suggested: SHIPROCKET (priority 1, standard)      │            │
│  │    Pincode: 400001 → prefix "40" → matches rule      │            │
│  └──────────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

**Process flow:**

```
 PACKING ──► Scan items ──► Select courier ──► Generate AWB ──► SHIPPED
                                                                     │
                                                            pushTracking()
                                                                     │
                                                    Nykaa/Myntra/TataCliq
                                                           API call
```

**What to do:**
1. Scan each SKU barcode to verify
2. Select courier from dropdown (or use **Suggest** button for auto-routing)
3. Click **Generate AWB** → Tracking number created → Order → SHIPPED
4. AWB is pushed to marketplace (Nykaa/Myntra/TataCliq) automatically

---

## 5. Labels — Print Bin Labels

```
┌──────────────────────────────────────────────────────────────────────┐
│  Generate Label                                                      │
│                                                                      │
│  SKU Code: [SKU-001                        ]                         │
│  Name:     [Cotton T-Shirt                 ]                         │
│  Bin:      [A-12-03                        ]                         │
│  Brand:    [Nike                           ]                         │
│  MRP:      [999                            ]                         │
│                                                                      │
│  [Generate PDF Label]                                                │
│                                                                      │
│  ┌──────────────────────────────────────────────────────┐            │
│  │  ┌─────┐                                             │            │
│  │  │Logo │  SKU-001                                    │            │
│  │  └─────┘  Cotton T-Shirt                             │            │
│  │           Brand: Nike                                │            │
│  │           MRP: ₹999                                  │            │
│  │           BIN: A-12-03                               │            │
│  │           globalsupply.in                            │            │
│  └──────────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

**What to do:** Used in warehouse for bin labeling. Enter SKU details → Download PDF → Print & stick on bin shelves.

---

## 6. Manifests — Group Shipped Orders for Courier Handover

```
┌──────────────────────────────────────────────────────────────────────┐
│  Manifests                                    [+ New Manifest]      │
│                                                                      │
│  [All Couriers ▾] [All Statuses ▾]                                  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ ▼ MAN-1712345600    OPEN   SHIPROCKET   5 shipments           │    │
│  │  ┌─────────────────────────────────────────────────────────┐  │    │
│  │  │ Order #    │ Customer │ AWB              │ Status       │  │    │
│  │  │ OMS-002    │ Bob      │ SR-A7X3K2M9     │ SHIPPED      │  │    │
│  │  │ OMS-004    │ Diana    │ SR-B9Y4L1P8     │ SHIPPED      │  │    │
│  │  └─────────────────────────────────────────────────────────┘  │    │
│  │                                    [✓ Close]  [📄 PDF]         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  [Create Manifest Modal]                                             │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ Courier: [SHIPROCKET ▾]                              │            │
│  │ 5 shipped orders available                           │            │
│  │ ☑ OMS-002  Bob       SR-A7X3K2M9                    │            │
│  │ ☑ OMS-004  Diana     SR-B9Y4L1P8                    │            │
│  │ ☐ OMS-009  Frank     SR-C2D5E7F0                    │            │
│  │ [Create Manifest (3 shipments)]                      │            │
│  └──────────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

**Process flow:**

```
 SHIPPED orders ──► Create Manifest ──► OPEN
                                           │
                                      [✓ Close]
                                           │
                                      CLOSED ──► Orders → DISPATCHED
                                           │
                                      [📄 PDF] ──► Handover summary
```

**What to do:**
1. Click **+ New Manifest** → Select courier → Select shipped orders → Create
2. Click **📄 PDF** → Download handover summary for courier pickup
3. After courier picks up → Click **✓ Close** → Orders → DISPATCHED

---

## 7. NDR Dashboard — Handle Delivery Failures

```
┌──────────────────────────────────────────────────────────────────────┐
│  NDR Dashboard                              [+ New NDR]  [Refresh]  │
│                                                                      │
│  ┌──────┐ ┌──────┐ ┌──────────────────┐ ┌────────┐                  │
│  │Total │ │Open  │ │Reattempt Scheduled│ │Resolved│                  │
│  │  15  │ │  8   │ │       3          │ │   4    │                  │
│  └──────┘ └──────┘ └──────────────────┘ └────────┘                  │
│                                                                      │
│  ┌────────┬──────────┬────────────┬──────────┬──────────┬──────────┐ │
│  │Order   │Customer  │Courier/AWB │Reason    │Status    │Reattempt │ │
│  ├────────┼──────────┼────────────┼──────────┼──────────┼──────────┤ │
│  │OMS-002 │Bob       │SHIPROCKET  │Addr not  │OPEN      │─         │ │
│  │        │          │SR-A7X3K2M9 │found     │          │📅 ✓      │ │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  [Schedule Reattempt Modal]                                          │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ 📅 Reattempt Date: [27-May-2026 ▾]                  │            │
│  │ [Schedule]                                           │            │
│  └──────────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

**What to do:**
1. Click **+ New NDR** → Select a shipped order → Add failure reason
2. Click **📅** to schedule a reattempt date
3. Click **✓** to resolve when delivery succeeds

---

## 8. Courier Routing — Auto-Assign Couriers

```
┌──────────────────────────────────────────────────────────────────────┐
│  Courier Routing                            [+ Add Rule]  [Suggest] │
│                                                                      │
│  ┌─────────┬──────────┬──────────┬───────────┬──────────┬──────────┐ │
│  │Courier  │Priority  │Pincode   │Weight     │Order Value│Speed    │ │
│  ├─────────┼──────────┼──────────┼───────────┼──────────┼──────────┤ │
│  │SHIPROCK │1         │10,11,12  │0-5 kg     │₹0-5000   │Standard │ │
│  │BLUEDART │2         │20,21,22  │0-10 kg    │₹5000+    │Express  │ │
│  │DELHIVERY│3         │*         │0-20 kg    │Any       │Economy  │ │
│  └─────────┴──────────┴──────────┴───────────┴──────────┴──────────┘ │
│                                                                      │
│  [Suggest Courier Tool]                                              │
│  ┌──────────────────────────────────────────────────────┐            │
│  │ Pincode: [400001]  Weight: [1.5]  Value: [₹1,800]   │            │
│  │ [Suggest]                                             │            │
│  │ ✓ SHIPROCKET (priority 1, standard)                  │            │
│  │   Matched: pincode prefix "40" → no rule → fallback  │            │
│  └──────────────────────────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

**How routing works:**

```
                   ┌─ Pincode 10xxxx → SHIPROCKET
                   │
 Order ──► Rules ──┼─ Pincode 20xxxx → BLUEDART
    ▲              │
    │              └─ Other pincodes → DELHIVERY
    │
  Check: pincode prefix, weight range, order value range
         speed tier, priority order
```

**What to do:**
1. Click **+ Add Rule** → Set courier, priority, pincode prefixes, weight/value ranges
2. Lower priority number = higher preference
3. Use the **Suggest** tool to test routing before going live

---

## 9. Inventory & Alerts

```
┌──────────────────────────────────────────────────────────────────────┐
│  Inventory Alerts                       Threshold: [5 ▾]  [Refresh] │
│                                                                      │
│  ┌───────────┐ ┌─────────────┐ ┌───────────┐                       │
│  │Total      │ │Out of Stock │ │Low Stock  │                        │
│  │Alerts     │ │             │ │           │                        │
│  │   12      │ │     3       │ │    9      │                        │
│  └───────────┘ └─────────────┘ └───────────┘                       │
│                                                                      │
│  ┌────────┬──────────────┬───────────┬─────┬─────────┬─────────────┐│
│  │SKU     │Item          │Warehouse  │Bin  │Avail    │Status       ││
│  ├────────┼──────────────┼───────────┼─────┼─────────┼─────────────┤│
│  │SKU-001 │Cotton T-Shirt│Mumbai WH  │A-12 │   0     │Out of Stock ││
│  │SKU-005 │Leather Shoes │Delhi WH   │B-03 │   2     │Low Stock    ││
│  └────────┴──────────────┴───────────┴─────┴─────────┴─────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

**What to do:** Adjust threshold number to see more/fewer alerts. Create Purchase Orders for out-of-stock items.

---

## 10. End-to-End Walkthrough (Sample Scenario)

### Scenario: Alice orders 2 T-shirts via Nykaa

```
Step 1: Nykaa pushes order to OMS
        └── Order created with status PENDING
        └── SLA deadline set: 24 hours (Nykaa rule)
        └── Appears on Dashboard as new pending order

Step 2: Warehouse Manager creates a Wave
        └── Selects Alice's + other pending orders
        └── Click "Create Wave" → Orders → PROCESSING

Step 3: Picker starts the Wave
        └── Click "▶ Start Picking"
        └── Orders → PICKING
        └── Picker walks warehouse, scans bin locations

Step 4: Picker completes the Wave
        └── Click "✓ Complete" 
        └── Orders → PACKING

Step 5: Packer processes at Packing Screen
        └── Scans each item to verify
        └── Selects courier: SHIPROCKET
        └── Clicks "Generate AWB" → Tracking created
        └── Order → SHIPPED
        └── Nykaa is notified via API

Step 6: End of day — Create Manifest
        └── Groups all SHIPROCKET orders
        └── Downloads PDF handover summary
        └── Courier picks up → Click "✓ Close"
        └── Orders → DISPATCHED

Step 7: Delivery
        └── Courier delivers → Mark as DELIVERED
        └── (Or if failed → NDR Case → Reattempt)

Step 8: Invoice & Compliance
        └── Download PDF invoice from order details
        └── Set E-way Bill number for GST
        └── Set IRN for e-invoice
```

### Visual Process Map

```
                        ┌──────────────────┐
                        │   Nykaa Order    │
                        │   (Marketplace)  │
                        └────────┬─────────┘
                                 │ PENDING
                                 ▼
                        ┌──────────────────┐
                        │  Create Wave     │──── SLA Timer Starts
                        └────────┬─────────┘
                                 │ PROCESSING
                                 ▼
                        ┌──────────────────┐
                        │  Start Picking   │
                        └────────┬─────────┘
                                 │ PICKING
                                 ▼
                        ┌──────────────────┐
                        │  Complete Wave   │
                        └────────┬─────────┘
                                 │ PACKING
                                 ▼
            ┌──────────────────────────────┐
            │     Packing Screen           │
            │  ┌────────────────────────┐  │
            │  │ Scan Items             │  │
            │  │ Select Courier         │  │
            │  │ Generate AWB           │  │
            │  └────────┬───────────────┘  │
            └───────────┼──────────────────┘
                        │ SHIPPED
                        ▼
            ┌──────────────────────────────┐
            │     Create Manifest          │
            │     Close → DISPATCHED       │
            └───────────┬──────────────────┘
                        │
                        ▼
            ┌──────────────────────────────┐
            │  Delivery Tracking           │
            │  ┌────────────────────────┐  │
            │  │ Auto-poll courier API  │  │
            │  │ 5-day fallback         │  │
            │  │ Mark Delivered         │  │
            │  └────────────────────────┘  │
            └──────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
   ┌──────────────┐          ┌──────────────┐
   │  DELIVERED   │          │  Failed      │
   │  ✓ Done      │          │  → NDR Case  │
   └──────────────┘          │  → Reattempt  │
                             └──────────────┘
```

---

## Login Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@oms.com` | `admin123` | Super Admin (full access) |

---

## Quick Reference: Status Flow

```
PENDING  ──►  PROCESSING  ──►  PICKING  ──►  PACKING  ──►  SHIPPED  ──►  DISPATCHED  ──►  DELIVERED
                      │              │              │              │
                 Create Wave    Start Wave    Complete Wave   AWB Generated
                                                                      │
                                                              Manifest Closed
```

## Keyboard Shortcuts & Tips

- **Duplicate order check**: Orders with same `orderNumber` are rejected (unique constraint)
- **SLA auto-set**: 24h for Nykaa/Myntra, 48h for others
- **AWB fallback**: If courier API fails, a mock AWB is generated automatically
- **Delivery auto-check**: Cron endpoint `/api/delivery/check?secret=...` polls courier APIs
- **PDFs available**: Invoice (`/api/invoice/:orderId/pdf`), Label (`/api/labels/generate`), Manifest (`/api/manifests/:id/pdf`)
