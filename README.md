# CareSphere — TrustCare Management System

> **Your Health, Our Universe** — A full-stack healthcare management platform connecting patients, caregivers, and administrators.

## Tech Stack

**Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript, Framer Motion, Zustand, Radix UI, Lucide Icons

**Backend:** Node.js, Express 5, TypeScript, Mongoose 9 (MongoDB Atlas), JWT auth, BullMQ (Redis), Groq AI (LLaMA 3.3 70B), Zod validation

**Deployment:** Render (backend) / Vercel (frontend)

## Quick Start

```bash
# backend
cd backend && cp .env.example .env  # edit MONGODB_URI, JWT_SECRET, GROQ_API_KEY
npm install && npm run dev

# frontend (separate terminal)
cd frontend && cp .env.example .env.local
npm install && npm run dev
```

## Seed Data

```bash
cd backend && npm run seed
npm run seed-aggregator  # 50+ real facilities via OSM/Wikidata
```

**Credentials:** `admin@caresphere.in` / `caregiver123` (admin)

## Web Scraping Architecture

```
OpenStreetMap (Nominatim) ──┐
                             ├──► httpScraper ──► Zod Validation ──► SHA-256 Dedup ──► MongoDB bulkWrite
Wikidata (SPARQL)       ────┘         │
                                      ├── 17 facility types (hospital, clinic, pharmacy, etc.)
                                      ├── Auto-generated descriptions per type
                                      ├── Rate-limited to 1 req/sec (promise queue)
                                      ├── 15s timeouts per source
                                      └── Scheduled jobs: discovery (6h), update (1h), cleanup (7d)
```

The aggregator runs via BullMQ (Redis required) or manually via admin dashboard. Without Redis, trigger scraping on-demand through the admin UI or seed script.

## Key Features

- **Auth:** Email/password + Google OAuth, JWT (7-day), role-based (Admin/Customer/Caregiver)
- **Caregivers:** Browse, filter (skills/rating/rate), profile management, availability
- **Bookings:** Create, accept/reject, complete, escrow payments
- **Payments:** Escrow system — admin releases to caregiver on completion
- **AI Chat:** Groq-powered assistant with multilingual support (EN/HI/FR/RU), voice I/O
- **Healthcare Aggregator:** Real-time OSM + Wikidata scraping for hospitals, clinics, pharmacies, etc.
- **Web Scraping Engine:** Scrapes 17 facility types across Indian cities using OpenStreetMap (Nominatim) and Wikidata (SPARQL) with 1 req/sec rate limiting, deduplication via SHA-256 hashing, auto-generated descriptions, and scheduled BullMQ jobs (discovery/update/cleanup)
- **Admin Dashboard:** Users, bookings, escrow, logs, aggregator management, disputes
- **Audit Logs:** Activity, auth, and chat logging with pagination & stats

## Environment Variables

| Backend | Frontend |
|---|---|
| `MONGODB_URI` | `NEXT_PUBLIC_API_URL` |
| `JWT_SECRET` | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| `GROQ_API_KEY` | |
| `ALLOWED_ORIGINS` | |

Redis is optional — queues degrade gracefully when unavailable.

## Deployment

Backend on Render, frontend on Vercel. See `render.yaml` for backend config.

Proxy: `/api/proxy/:path*` → `NEXT_PUBLIC_API_URL/api/:path*` (Next.js rewrite).

## License

MIT — Built by Bermuda Triangle, 2026.
