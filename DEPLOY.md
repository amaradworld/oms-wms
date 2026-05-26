# Deployment Guide: globalsupply.in

## Architecture Overview

```
User → https://globalsupply.in (Vercel) → https://api.globalsupply.in (Render) → Supabase (Database)
                              ↓
                    subdomain: infi.globalsupply.in (multi-tenant)
                    subdomain: aria.globalsupply.in
```

## Step 1: Push Code to GitHub

1. Go to https://github.com/new → Create a repository named `oms-wms`
2. Open **Terminal** on your computer and run:
```powershell
cd oms-wms-app
git init
git add .
git commit -m "Initial OMS-WMS production build"
git remote add origin https://github.com/YOUR_USERNAME/oms-wms.git
git branch -M main
git push -u origin main
```

## Step 2: Set Up Free Database (Supabase)

1. Go to https://supabase.com → Sign up free
2. Click **New Project** → Name: `oms-wms-db`
3. Set a **Database Password** (save this somewhere)
4. Wait 2 minutes for the database to create
5. Go to **Project Settings** → **Database** → Copy **Connection string**
6. Your connection string looks like: `postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres`

## Step 3: Deploy Backend to Render.com

1. Go to https://render.com → Sign up (use GitHub login)
2. Click **New +** → **Web Service**
3. Connect your GitHub repo → Select `oms-wms`
4. **Settings:**
   - **Name:** `oms-wms-api`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** **Free** (starts at $0)
5. **Environment Variables** (click "Advanced" then "Add Environment Variable"):
   - `DATABASE_URL` → Paste the Supabase connection string
   - `JWT_SECRET` → Type `any_random_long_string_like_this`
   - `FRONTEND_URL` → `https://globalsupply.in`
   - `PORT` → `5000`
6. **Click "Create Web Service"**
7. Wait 5 minutes for the build to finish
8. **Copy your Render URL** (looks like: `https://oms-wms-api.onrender.com`)

## Step 4: Apply Database Schema

1. In Render dashboard → Go to your web service → **Shell** tab
2. Type: `npx prisma db push`
3. You will see: "Your database is now in sync"
4. Type: `node src/seed.js`
5. You will see: "Seeding completed successfully!"

## Step 5: Deploy Frontend to Vercel

1. Go to https://vercel.com → Sign up (use GitHub login)
2. Click **Add New...** → **Project**
3. Import your GitHub repo `oms-wms`
4. **Settings:**
   - **Root Directory:** `frontend`
   - **Framework Preset:** `Create React App`
   - **Environment Variables:**
     - `REACT_APP_API_URL` → `https://oms-wms-api.onrender.com` (your Render URL)
5. Click **Deploy**
6. Wait 2 minutes → Your site is live at `https://oms-wms.vercel.app`

## Step 6: Connect Your Domain (GoDaddy)

1. In **Vercel Dashboard** → Your project → **Domains**
2. Type: `globalsupply.in` → Click **Add**
3. Vercel will show you **DNS records** to add (you'll see something like `CNAME @ cname.vercel-dns.com`)
4. **Open GoDaddy** in a new tab:
   - Go to **My Products** → **Domains** → Click **DNS** for `globalsupply.in`
   - **Delete** the existing A record (the one with @)
   - **Add** a new CNAME record:
     - **Type:** CNAME
     - **Name:** @
     - **Value:** `cname.vercel-dns.com`
   - **Add** another CNAME for the API:
     - **Type:** CNAME
     - **Name:** `api`
     - **Value:** `oms-wms-api.onrender.com`
5. Wait 5-30 minutes for DNS to update

## Step 7: Multi-Tenant Subdomains

For each client company (infi, aria, zencart, etc.):
1. In **GoDaddy DNS** → Add a CNAME record:
   - **Type:** CNAME
   - **Name:** `infi` (or any client name)
   - **Value:** `globalsupply.in`
2. In **Vercel Dashboard** → **Domains** → Add `infi.globalsupply.in`

## Step 8: Verify Everything

- **Website:** https://globalsupply.in
- **Login:** Select "InfiStyles" → Email: `admin@oms.com` → Password: any
- **API Health:** https://api.globalsupply.in/health

---

## Cost Summary (Free Tier)

| Service | Cost | What it does |
|:--------|:-----|:-------------|
| Supabase | **$0** | Database (500MB, enough for 10,000 orders) |
| Render | **$0** | Backend API (sleeps after 15min idle, wakes on first request) |
| Vercel | **$0** | Frontend hosting (100GB bandwidth) |
| GoDaddy | Already paid | Domain DNS |
| **Total** | **$0/mo** | Until you need to scale |

---

## Important Notes

- **Free tier limitation:** Render's free backend goes to sleep after 15 minutes of inactivity. The first person to visit after idle time will wait ~30 seconds for it to wake up. Upgrade to $7/month to fix this.
- **Database backup:** Supabase free tier includes automatic backups.
- **SSL/HTTPS:** Handled automatically by Vercel and Render. Your domain gets free SSL.
