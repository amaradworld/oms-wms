# Deployment Guide — SupplyHub

## Architecture

```
User → https://app.globalsupply.in (Vercel) → https://oms-wms.onrender.com (Render) → Supabase (DB)
        https://infi.app.globalsupply.in (multi-tenant subdomain)
```

## 1. Push to GitHub

```powershell
git init
git add .
git commit -m "initial"
git remote add origin https://github.com/YOU/oms-wms.git
git branch -M main
git push -u origin main
```

## 2. Deploy Backend (Render)

Render auto-detects `render.yaml` (Infrastructure-as-Code) on repo connect:

1. Go to https://render.com → **Dashboard** → **New +** → **Blueprint**
2. Connect your GitHub repo
3. Render reads `render.yaml` and creates the web service + all env vars automatically
4. **Set the sync:false env vars** (`DATABASE_URL`, `JWT_SECRET`, `SMTP_USER`, `SMTP_PASS`) in Render dashboard after creation
5. Click **Apply**

### Manual (no Blueprint):
- **Root Directory:** `backend`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Health Check:** `/health`

### Required env vars (set in Render dashboard):
| Key | Value |
|:----|:------|
| `DATABASE_URL` | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres` |
| `JWT_SECRET` | long random string |
| `FRONTEND_URL` | `https://app.globalsupply.in` |
| `SMTP_USER` | Gmail address (for password reset emails) |
| `SMTP_PASS` | Gmail App Password |
| `CRON_SECRET` | random string (for cron endpoint auth) |

## 3. Deploy Frontend (Vercel)

1. Go to https://vercel.com → **Add New** → **Project**
2. Import repo → **Root Directory:** `frontend`
3. **Framework Preset:** Create React App
4. **Env var:** `REACT_APP_API_URL` = `https://oms-wms.onrender.com/api`
5. Deploy

## 4. Custom Domain

| DNS Record | Name | Value |
|:-----------|:-----|:------|
| CNAME | `app` | `oms-wms-phi.vercel.app` |
| CNAME | `api` | `oms-wms.onrender.com` |
| CNAME | `infi` | `app.globalsupply.in` |

Add each subdomain in Vercel: **Project → Domains → Add**.

## 5. First Login

- Platform Owner: `owner@supplyhub.com` / `owner123`
- Default tenant admins: `admin@{slug}.com` / `admin123`

## Cost Breakdown

| Service | Cost | Limit |
|:--------|:-----|:------|
| Supabase | $0 | 500MB DB |
| Render | $0 | Sleeps after 15min idle |
| Vercel | $0 | 100GB bandwidth |
| **Total** | **$0/mo** | |

## Tips

- Render free tier sleeps after 15min idle. First request after sleep takes ~30s. Upgrade to $7/mo for always-on.
- SMTP uses Gmail App Passwords. Without it, password reset emails fail silently (logged to console).
- To re-run DB schema: `npm run migrate` in Render Shell or `npx prisma db push --accept-data-loss`.
- `render.yaml` in root = Blueprint IaC. Edit it → push → Render auto-redeploys.
