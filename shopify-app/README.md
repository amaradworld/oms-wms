# GlobalSupply Marketplace Sync — Shopify App

Sync orders and inventory from Indian marketplaces (Flipkart, Amazon, Nykaa, Myntra, TataCliq) directly into your Shopify store.

## Features

- **Auto-sync orders** from Flipkart, Amazon, Nykaa, Myntra, TataCliq into Shopify as Draft Orders
- **Push inventory** from Shopify back to all connected marketplaces
- **Unified dashboard** inside Shopify admin to manage all channels
- **Real-time sync** via webhooks
- **Multi-marketplace** support — connect all channels at once

## Setup

### Prerequisites

1. Node.js >= 18
2. PostgreSQL database
3. Shopify Partners account (partners.shopify.com)
4. Marketplace API credentials

### 1. Create Shopify App

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Click **Apps > Create App**
3. Choose **Custom App**
4. Set App URL to your deployed URL (e.g., `https://your-app.vercel.app`)
5. Set Allowed Redirection URL(s) to: `https://your-app.vercel.app/auth/callback`
6. Note down the **API Key** and **API Secret**

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Install & Run

```bash
# Backend
npm install
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### 4. Install App on Shopify

1. Visit: `https://your-app-url.com/auth?shop=your-store.myshopify.com`
2. Click **Install App**
3. You'll be redirected to the app dashboard inside Shopify admin

### 5. Configure Marketplaces

1. In the app dashboard, click **Configure** next to each marketplace
2. Enter your API credentials
3. Click **Sync Orders** to import orders

## Deploy to Production

### Backend (Render/Vercel)

```bash
# Set environment variables in Render dashboard
# Deploy
git push origin main
```

### Frontend (Vercel)

```bash
cd frontend
vercel --prod
```

## Architecture

```
Shopify Admin (Embedded App)
    ↓ App Bridge
Frontend (React + Polaris)
    ↓ API calls
Backend (Express)
    ↓ Marketplace APIs
Flipkart / Amazon / Nykaa / Myntra / TataCliq
    ↓ Webhooks
PostgreSQL (shopify_shops, configs, mappings)
```

## Database Schema

- `shopify_shops` — Installed shops with access tokens
- `shopify_marketplace_configs` — Per-shop marketplace API credentials
- `shopify_order_mappings` — Marketplace-to-Shopify order mapping

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/auth` | GET | Start OAuth install flow |
| `/auth/callback` | GET | OAuth callback |
| `/api/shop` | GET | Get shop status and configs |
| `/api/marketplace/config` | POST | Configure marketplace credentials |
| `/api/sync/orders` | POST | Sync orders from marketplace |
| `/api/sync/inventory` | POST | Push inventory to marketplace |
| `/api/mappings` | GET | Get order mappings |
| `/webhooks/orders/create` | POST | Shopify order webhook |
| `/webhooks/orders/updated` | POST | Shopify order update webhook |
| `/webhooks/inventory/update` | POST | Shopify inventory webhook |
| `/health` | GET | Health check |

## Marketplace Credentials

| Marketplace | Where to Get |
|---|---|
| Flipkart | [seller.flipkart.com](https://seller.flipkart.com) > API Settings |
| Amazon | [sellercentral.amazon.com](https://sellercentral.amazon.com) > SP-API |
| Nykaa | [seller.nykaa.com](https://seller.nykaa.com) > API Access |
| Myntra | [partners.myntra.com](https://partners.myntra.com) > API Keys |
| TataCliq | [seller.tatacliq.com](https://seller.tatacliq.com) > API Settings |

## License

Proprietary — GlobalSupply Techno
