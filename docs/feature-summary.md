# TrustCare - Functional Summary

One-page map of what the system does, where to see it, and what is real vs simulated.

---

## Architecture in one line

Browser -> Next.js (App Router + `/api/proxy` rewrite) -> Express API -> MongoDB Atlas,
with side calls to the ML ranking service, OpenStreetMap/Wikidata (scraping), and Groq (chat).

---

## Core functionality

| # | Module | What it does | Where to see it | Key tech |
|---|---|---|---|---|
| 1 | **Authentication & RBAC** | Email/password + Google sign-in, 7-day JWT, three roles (Admin/Customer/Caregiver), protected routes | `/login`, `/register` | bcrypt, JWT, Express middleware |
| 2 | **Caregiver discovery** | Browse 50 caregivers, filter by skill, rating, rate, city, availability; profile pages | `/caregivers`, `/caregivers/[id]` | Mongoose, React filters |
| 3 | **Hybrid search** | Local DB results + live web results from OSM and Wikidata in one response | `/caregivers` (AI Scrape toggle) | `/api/search/realtime` |
| 4 | **Bookings** | Create, accept/reject, status transitions, complete, cancel; role-scoped views | Customer/caregiver dashboards | State machine in `bookings.ts` |
| 5 | **Escrow payments** | Customer pays into escrow, admin releases to caregiver on completion, refunds on cancel | `/dashboard/admin` (escrow) | Mock gateway, real ledger |
| 6 | **Reviews & ratings** | Customers review completed bookings; ratings aggregate to caregiver profiles | `/dashboard/customer/reviews` | Mongoose aggregation |
| 7 | **AI chat assistant** | Multilingual (EN/HI/FR/RU) assistant with voice input/output | Chat widget | Groq + mock fallback |
| 8 | **Healthcare aggregator** | 17 facility types scraped from OSM (Nominatim) + Wikidata (SPARQL); 1 req/sec, SHA-256 dedupe, auto descriptions | `/facilities`, `/facilities/[id]` | BullMQ, rate limiter, retries |
| 9 | **Admin console** | Stats, users, caregivers, bookings, revenue, escrow, disputes, audit logs, data sources, scraping jobs, providers | `/dashboard/admin/*` | Express + React |
| 10 | **Audit logging** | Activity, auth and chat events with pagination and stats | `/dashboard/admin/logs` | Log model + middleware |
| 11 | **ML recommendations** | Ranks eligible caregivers and facilities; deterministic fallback if ML is down | `/caregivers` -> "Recommended for you" | FastAPI + Random Forest |
| 12 | **Seeding** | One-command demo dataset (users, profiles, bookings, payments, reviews, facilities) | `npm run seed`, `npm run seed-aggregator` | Seed scripts |

---

## ML recommendation flow (two stages)

```
Request
  -> Stage A: hard constraints in Express
       verified + available + care-type compatible + budget + within 50 km
  -> Stage B: FastAPI /predict/rank
       Random Forest (care-ranker-v1) scores each eligible candidate
  -> Express validates IDs + scores, sorts, returns reasons
  -> If ML is unset/slow/invalid: deterministic rule ranking (same response shape)
```

Measured on the held-out test split:

| Metric | Rule baseline | Random Forest |
|---|---|---|
| Precision@5 | 0.1420 | **0.1447** |
| Recall@5 | 0.4791 | **0.4949** |
| NDCG@5 | 0.3599 | **0.3956** |
| ROC-AUC | 0.6501 | **0.6895** |
| Latency | - | **~0.03 ms/row** |

Accuracy at 0.5 is 0.8775, **below** the 0.883 majority baseline; NDCG@5 and
ROC-AUC are the meaningful metrics because only 11.5% of pairs are relevant.

---

## Data sources (what is real vs simulated)

| Layer | What it is | Real or simulated |
|---|---|---|
| Users, caregivers, bookings, payments, reviews | Seeded MongoDB records | Simulated content, real database and logic |
| Facilities | 50 seeded records + live scraping | 50 seeded (23 geocoded); live OSM/Wikidata on demand |
| ML training data | 12,000 synthetic (request, candidate) pairs | **Synthetic** (documented rule + 8% noise) |
| Payments | Escrow ledger without a gateway | Logic real, money movement simulated |
| Chat | Groq API with mock fallback | Real API when key is set |

---

## Efficiency choices

- Hard constraints run before ML, so the model scores a small eligible set.
- Batch scoring: one request per search, one score per candidate.
- Model loaded once at service start; ~0.03 ms per row.
- 800 ms timeout and deterministic fallback - the app never blocks.
- Scraping is rate-limited (1 req/sec), deduplicated, and degrades gracefully without Redis.
- ML is an additive module: existing auth, booking, payment, search and scraping flows are unchanged.
- CI rebuilds the dataset, retrains, evaluates, and runs unit + integration tests.

---

## Known limitations (state these if asked)

- Synthetic ML labels, not real user feedback.
- Modest ranking metrics; accuracy is below the majority-class baseline.
- 27 of 50 facilities lack coordinates, so distance filtering excludes them.
- Scheduled scraping needs Redis; without it, trigger jobs manually from admin.
- Payments are mocked; no email/SMS notifications.
- Token stored in localStorage; no rate limiting or CSRF protection yet.
- Free-tier cold starts on Render can delay the first request.

---

## Demo path (5 minutes)

1. Home page -> shows the product.
2. Log in as customer -> role-based dashboard.
3. `/caregivers` -> "Recommended for you" with the `care-ranker-v1` badge.
4. Search + AI Scrape ON -> local + live OSM/Wikidata results.
5. `/facilities` -> scraped facility catalogue.
6. Admin -> stats, data sources, scraping jobs, logs.
7. `python ml-service/demo.py` -> dataset, model, metrics, live ranking.
8. Stop ML -> reload `/caregivers` -> "Fallback ranking" badge, results still work.
