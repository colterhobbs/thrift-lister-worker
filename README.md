# ThriftLister — Cloudflare Workers + D1 Deployment Guide

## Architecture

```
app.salvaginghistory.com/         → Cloudflare Pages (React SPA)
app.salvaginghistory.com/api/*    → Cloudflare Worker (tRPC + OAuth)
                                         ↕
                                    Cloudflare D1 (SQLite database)
```

The frontend (Pages) and backend (Worker) are deployed separately.
The Worker handles all `/api/*` routes; everything else is served by Pages.

---

## First-Time Setup

### 1. Install Wrangler CLI

```bash
pnpm install
npx wrangler login
```

### 2. Create the D1 Database

```bash
npx wrangler d1 create thrift-lister
```

This outputs a `database_id`. Copy it and paste it into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "thrift-lister"
database_id = "PASTE_YOUR_DATABASE_ID_HERE"   # ← replace this
```

### 3. Run the Database Migration

```bash
# Apply to remote (production) D1:
npx wrangler d1 migrations apply thrift-lister

# Apply to local D1 (for testing):
npx wrangler d1 migrations apply thrift-lister --local
```

### 4. Set Worker Secrets

Run each command and paste in the secret value when prompted:

```bash
npx wrangler secret put JWT_SECRET
# → generate a strong random string, e.g.: openssl rand -hex 32

npx wrangler secret put GOOGLE_CLIENT_ID
# → 88172246817-afja0pcjgo8uhgi7a04tj7ekqk53cdab.apps.googleusercontent.com

npx wrangler secret put GOOGLE_CLIENT_SECRET
# → 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

npx wrangler secret put OWNER_OPEN_ID
# → Set AFTER your first login. It will be: google:<your_google_sub>
# → Find it by checking the D1 users table after you first sign in:
#     npx wrangler d1 execute thrift-lister --command="SELECT openId FROM users LIMIT 5"

npx wrangler secret put BUILT_IN_FORGE_API_URL
npx wrangler secret put BUILT_IN_FORGE_API_KEY

# Optional (eBay integration):
npx wrangler secret put EBAY_CLIENT_ID
npx wrangler secret put EBAY_CLIENT_SECRET
npx wrangler secret put EBAY_DEV_ID
npx wrangler secret put EBAY_REDIRECT_URI
# EBAY_REDIRECT_URI should be: https://app.salvaginghistory.com/api/ebay/callback

# Optional (Etsy integration):
npx wrangler secret put ETSY_API_KEY
npx wrangler secret put ETSY_SHARED_SECRET
```

### 5. Add Google OAuth Redirect URI

In [Google Cloud Console](https://console.cloud.google.com/) → OAuth credentials:
- Add authorized redirect URI: `https://thrift-lister-api.YOUR_SUBDOMAIN.workers.dev/api/oauth/callback`
- Also add: `https://app.salvaginghistory.com/api/oauth/callback` (once the Worker route is set up)

### 6. Deploy the Worker

```bash
pnpm build         # builds the frontend (dist/public/)
npx wrangler deploy
```

### 7. Set Up Worker Route on app.salvaginghistory.com

In Cloudflare Dashboard:
1. Go to Workers & Pages → your Worker → Settings → Triggers
2. Add route: `app.salvaginghistory.com/api/*`
3. This makes API calls go to the Worker while the rest goes to Pages

---

## Local Development

```bash
# Run Worker locally (with local D1):
npx wrangler dev

# The Worker will be at http://localhost:8787
# Update VITE_API_URL in the frontend to point there for local dev
```

---

## Finding Your OWNER_OPEN_ID

After deploying and signing in for the first time:

```bash
npx wrangler d1 execute thrift-lister --command="SELECT openId FROM users LIMIT 5" --remote
```

Copy your `openId` (it looks like `google:123456789`) and set it:

```bash
npx wrangler secret put OWNER_OPEN_ID
# paste: google:YOUR_GOOGLE_SUB
```

Then redeploy: `npx wrangler deploy`

---

## Environment Variables Reference

| Secret | Where to get it |
|--------|----------------|
| `JWT_SECRET` | Generate: `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth |
| `OWNER_OPEN_ID` | From D1 users table after first login |
| `BUILT_IN_FORGE_API_URL` | Viktor → Your account settings |
| `BUILT_IN_FORGE_API_KEY` | Viktor → Your account settings |
| `EBAY_CLIENT_ID` | eBay Developer Program |
| `EBAY_CLIENT_SECRET` | eBay Developer Program |
| `EBAY_DEV_ID` | eBay Developer Program |
| `EBAY_REDIRECT_URI` | `https://app.salvaginghistory.com/api/ebay/callback` |
| `ETSY_API_KEY` | Etsy Developer Portal |
| `ETSY_SHARED_SECRET` | Etsy Developer Portal |

---

## Cloudflare Pages Settings (unchanged)

| Setting | Value |
|---------|-------|
| Root directory | `thrift-lister-main` |
| Build command | `pnpm install && pnpm build` |
| Build output | `dist/public` |
| Environment variable | `VITE_GOOGLE_CLIENT_ID` = your Google client ID |
