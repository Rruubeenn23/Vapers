# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A vape shop management app ("Vapers de Rubén") with inventory tracking, sales/purchases registration, finances, a dashboard, and an AI chat assistant backed by Groq (llama-3.3-70b). The old n8n-based workflows in `/n8n` are superseded by native API endpoints.

## Repository structure

- `vapers-api/` — Express 5 REST API (Node ≥18), single file `index.js`
- `vapers-frontend/` — React 19 + Vite SPA, deployed to Vercel
- `n8n/` — Legacy automation workflow JSONs (no longer active)
- `add_order_column.sql` — One-off migration already applied to Supabase

## Commands

### API (`vapers-api/`)
```bash
npm run dev    # node --watch index.js (hot reload)
npm start      # node index.js
```

### Frontend (`vapers-frontend/`)
```bash
npm run dev    # Vite dev server at http://localhost:5173
npm run build  # Production build
npm run lint   # ESLint
npm run preview # Preview production build
```

## Environment variables

### API (`vapers-api/.env`)
```
SUPABASE_URL=
SUPABASE_KEY=
EMAIL_USER=       # Gmail address
EMAIL_PASS=       # Gmail app password
EMAIL_TO=         # Recipient (defaults to EMAIL_USER)
GROQ_API_KEY=     # For /api/ventas-chat
LOW_STOCK_THRESHOLD=3
PORT=3000
```

### Frontend (`vapers-frontend/.env`)
```
VITE_API_BASE=http://localhost:3000   # defaults to https://api-vapers.onrender.com in prod
```

## Architecture

### API
All logic lives in `vapers-api/index.js`. There are no route files — endpoints are registered directly on the Express app. `vapers-api/lib/supabase.js` exports a single Supabase client used throughout.

Stock changes go through Supabase RPC functions (`reducir_stock`, `aumentar_stock`) — do not update stock directly via `.update()`.

Two cron jobs run server-side (Europe/Madrid timezone):
- Monday 09:00 → weekly email digest
- Daily 20:00 → low stock alert email

### API route overview
| Path | Method | Purpose |
|------|--------|---------|
| `/api/vapers` | GET | List products |
| `/api/vapers/:id` | GET/PUT/DELETE | Single product |
| `/vapers` | POST | Create product (note: no `/api` prefix) |
| `/api/ventas` | GET | List sales (joins product names) |
| `/ventas` | POST | Register sale + decrement stock via RPC |
| `/api/compras` | GET | List purchases |
| `/compras` | POST | Register purchase + increment stock via RPC |
| `/api/finanzas` | GET/POST/DELETE | Finance entries |
| `/api/dashboard` | GET | Aggregated dashboard metrics |
| `/api/next-order-id` | GET | Auto-increment order ID |
| `/api/low-stock` | GET | Products below threshold |
| `/api/restock-suggestions` | GET | Ranked by sales velocity |
| `/api/weekly-summary` | GET | Aggregated summary |
| `/api/ventas-chat` | POST | AI chat via Groq |
| `/api/resumen-7dias-email` | POST | Trigger email digest manually |
| `/api/export/ventas.csv` | GET | CSV export |
| `/api/export/compras.csv` | GET | CSV export |
| `/api/export/finanzas.csv` | GET | CSV export |

Note: some endpoints use `/api/` prefix and some don't (historical inconsistency). Match existing patterns when adding new routes.

### Frontend
All API calls go through `src/lib/api.js` which wraps `fetch` with `BASE` from `VITE_API_BASE`. Pages map directly to routes in `App.jsx`. There is no state management library — each page fetches its own data.

Pages: `Dashboard`, `Vender` (register sale), `Estadisticas`, `Productos`, `SalesChat`.

`Finanzas.jsx` exists in pages but is redirected to `/` in the router (legacy).

### Database (Supabase/PostgreSQL)
Tables: `vapers`, `ventas`, `compras`, `finanzas`.
- `ventas` has a `total` computed column and an `order_id` integer column.
- Stock mutations must go through the `reducir_stock` / `aumentar_stock` RPC functions.

### Deployment
- Frontend → Vercel (`vapers-frontend/vercel.json` rewrites all routes to `index.html`)
- API → Render (`https://api-vapers.onrender.com`)
