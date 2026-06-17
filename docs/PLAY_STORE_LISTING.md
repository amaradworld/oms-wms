# Google Play Store Listing — GlobalSupply Techno

## App Information

| Field | Value |
|-------|-------|
| **App name** | GlobalSupply Techno — OMS & WMS |
| **Short name** | GlobalSupply |
| **Package name** | `in.globalsupply.techno` |
| **Default language** | English (India) — `en-IN` |
| **App category** | Business / Productivity |
| **Content rating** | Everyone (PEGI 3 / ESRB E) |
| **Target audience** | 18+ (business users) |
| **Country of origin** | India |
| **Developer** | GlobalSupply Techno |
| **Developer email** | admin@globalsupply.in |
| **Developer website** | https://globalsupply.in |

---

## Short Description (80 chars max)

```
OMS & WMS for Indian ecommerce. Orders, inventory, scanning, marketplace sync.
```

## Full Description (4000 chars max)

```
GlobalSupply Techno is a complete Order Management System (OMS) and Warehouse Management System (WMS) built for Indian ecommerce sellers. Whether you sell on Nykaa, Myntra, TataCliq, Amazon, Flipkart, or Shopify — manage everything from one app.

🚀 KEY FEATURES

📦 Order Management
• Auto-sync orders from 6+ marketplaces
• Create manual orders with GST-compliant invoicing
• Order status tracking from placement to delivery
• Bulk order actions (assign, pack, dispatch, cancel)

🏭 Warehouse Management
• Multi-warehouse support with zone/bin mapping
• FEFO (First Expiry, First Out) picking logic
• Barcode/QR scanning for putaway, picking, packing
• Real-time inventory with batch & lot tracking

📱 Barcode Scanning
• Built-in camera scanner (no app needed)
• Works with 11-digit EPC codes & standard barcodes
• Picklist, packlist & cycle count workflows
• Offline mode — scan and sync later

🔄 Marketplace Integrations
• Nykaa, Myntra, TataCliq, Amazon, Flipkart, Shopify
• Real-time inventory sync (prevents overselling)
• Auto order import with SKU mapping
• Webhook-based status updates (no polling delays)

📊 Reports & Analytics
• Sales, inventory, and fulfillment KPIs
• Export to CSV / Excel
• Custom date ranges
• SLA breach alerts

👥 Multi-Tenant
• Multiple warehouses under one company
• Role-based access (Owner, Manager, Picker, Packer)
• Owner-controlled menu access per tenant
• Audit logs for compliance

🔒 Security
• JWT authentication with MFA
• API key authentication for integrations
• HMAC-SHA256 webhook verification
• Rate limiting per tenant
• HSTS, CSP, and XSS protection
• SOC2-ready audit logging

💼 Built for India
• GST-compliant invoicing
• Indian marketplace connectors (Nykaa, Myntra, TataCliq)
• Multi-currency support (INR primary)
• UPI / Net Banking ready (Razorpay integration)

🏢 USE CASES
• D2C brands scaling on multiple marketplaces
• 3PL / fulfillment companies managing multiple clients
• Brand aggregators consolidating ops
• Manufacturers selling direct-to-consumer

📞 SUPPORT
• Email: support@globalsupply.in
• Phone: +91-XXXX-XXXXXX
• Docs: https://docs.globalsupply.in
• Status: https://status.globalsupply.in

Built in Gurgaon, India 🇮🇳 by GlobalSupply Techno.
```

---

## What's New (Release Notes for v1.0.0)

```
🎉 Initial release of GlobalSupply Techno

• Order management with 6+ marketplace integrations
• Warehouse management with FEFO picking
• Barcode scanning (camera-based, no hardware needed)
• Multi-tenant support with role-based access
• Real-time inventory sync
• GST-compliant invoicing
• PWA — install directly from browser
```

---

## Required Assets

### App Icon
- **Size**: 512 × 512 px
- **Format**: PNG (32-bit, no alpha)
- **Shape**: Square (Google will apply rounding for adaptive icons)
- **Source**: `frontend/public/logo-512.png`

### Feature Graphic
- **Size**: 1024 × 500 px
- **Format**: PNG or JPEG
- **Content**: Logo + tagline "OMS & WMS for Indian Ecommerce"
- **Source**: Need to create from `frontend/public/og-image.png`

### Screenshots (Phone)
- **Quantity**: Minimum 2, maximum 8
- **Size**: 1080 × 1920 px (or any 16:9 / 9:16 ratio)
- **Format**: PNG or JPEG
- **Recommended screens**:
  1. Dashboard with KPIs
  2. Order list / order detail
  3. Warehouse inventory view
  4. Barcode scanner in action
  5. Marketplace integrations page
  6. Reports / analytics

### Screenshots (Tablet) — Optional
- **Size**: 1920 × 1080 px or larger
- Skip for v1.0 (add in v1.1)

---

## Content Rating Questionnaire

| Question | Answer |
|----------|--------|
| Violence | No |
| Sexual content | No |
| Language | No |
| Controlled substances | No |
| User-generated content | No (admin-only) |
| Personal data collection | Yes (login credentials) |
| Financial transactions | No (handled by external gateways) |
| Health content | No |

→ Expected rating: **Everyone**

## Privacy & Data Safety

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Account info (email, name) | Yes | No | Authentication |
| Usage analytics | Yes (anonymized) | No (Google Analytics only) | Product improvement |
| Crash logs | Yes | No (own infrastructure) | Bug fixing |
| Camera (barcode scanning) | Yes (locally only) | No | Core feature |

→ Data is NOT sold to third parties.
→ Data is NOT transferred off-device for camera (processed locally).

## Target API Level

- **Target SDK**: 34 (Android 14)
- **Min SDK**: 24 (Android 7.0 Nougat) — covers 97%+ of devices in India

---

## App Access

All functionality requires login. For Play Store review:
- **Demo account**: `review@globalsupply.in` / `Review2026!Demo`
- **Demo URL**: https://app.globalsupply.in
- **Demo data**: Pre-populated with 1 warehouse, 5 SKUs, 3 sample orders

---

## Pricing & Distribution

- **Free or paid**: Free (with in-app subscription)
- **In-app purchases**: Yes (subscription tiers: Starter ₹8,999/mo, Pro ₹17,999/mo)
- **Distribution**: All countries (primary: India)
- **Contains ads**: No

---

## Release Process

1. Go to https://play.google.com/console
2. Select "Create app"
3. Fill in app details from this document
4. Upload assets (icon, feature graphic, screenshots)
5. Complete content rating questionnaire
6. Complete data safety form
7. Set up app access (provide demo credentials above)
8. Upload AAB from `android/app/build/outputs/bundle/release/app-release-bundle.aab`
9. Submit for review (typical review time: 3–7 days for new apps)
