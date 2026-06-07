# CareSphere — TrustCare Management System

## Project Report

> **Version:** 1.0.0  
> **Year:** 2026  
> **Team:** Bermuda Triangle  
> **Contact:** caresphere0029@gmail.com  
> **Tagline:** Your Health, Our Universe

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Features & Functionality](#4-features--functionality)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [API Reference](#6-api-reference)
7. [Database Schema](#7-database-schema)
8. [Security](#8-security)
9. [Scalability](#9-scalability)
10. [Performance Optimizations](#10-performance-optimizations)
11. [Deployment](#11-deployment)
12. [Future Scope](#12-future-scope)
13. [Limitations & Known Issues](#13-limitations--known-issues)

---

## 1. Executive Summary

CareSphere is a full-stack healthcare management platform that connects patients (customers) with professional caregivers through a secure, scalable web application. The system facilitates browsing and hiring caregivers, managing bookings, processing escrow payments, writing reviews, and includes an AI-powered assistant with multilingual support. An integrated healthcare aggregator module scrapes real-time facility data from OpenStreetMap and Wikidata, providing a comprehensive directory of hospitals, clinics, pharmacies, and care services across India.

The platform supports three user roles (Admin, Customer, Caregiver) with role-specific dashboards, real-time search, and a complete audit logging system. It is designed for production deployment on Render (backend) and Vercel (frontend) with MongoDB Atlas as the database.

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
Browser
   │
   ▼
Vercel (Next.js 16 — Frontend)
   │
   │  /api/proxy/*  ──rewrite──►  NEXT_PUBLIC_API_URL/api/*
   │
   ▼
Render (Express 5 — Backend API)
   │
   ├──► MongoDB Atlas (Primary Database)
   │
   ├──► Groq API (AI Chat — LLaMA 3.3 70B)
   │
   ├──► Redis (Optional — BullMQ Job Queues)
   │
   └──► OpenStreetMap / Wikidata (External Data Sources)
```

### 2.2 Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                 │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ Pages   │ │Components│ │ Zustand  │ │ fetchAPI()  │ │
│  │ (App    │ │ (Radix,  │ │ Stores   │ │ (Proxy      │ │
│  │ Router) │ │  Shadcn) │ │ (Auth,   │ │  Utility)   │ │
│  └─────────┘ └──────────┘ └──────────┘ └─────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTP (JSON)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend (Express 5)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ Routes   │ │ Middleware│ │Services  │ │ Workers    │ │
│  │ (14)     │ │ (Auth,   │ │(Scraper, │ │ (BullMQ,   │ │
│  │          │ │  CORS)   │ │ Chat,    │ │  Optional) │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │         MongoDB (Mongoose 9) — 7 Core Models       │ │
│  │  + 5 Aggregator Models = 12 Total                  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Request Flow

1. **Browser** makes request to `https://app.vercel.app/api/proxy/caregivers`
2. **Next.js Rewrite** catches `/api/proxy/:path*` → forwards to `https://api.render.com/api/caregivers`
3. **Express Router** matches `/api/caregivers` → executes controller
4. **Controller** queries MongoDB via Mongoose → returns JSON response
5. **Response** flows back through the proxy chain to the browser

---

## 3. Technology Stack

### 3.1 Frontend

| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.1.7 | React framework with App Router, SSR, API rewrites |
| **React** | 19.2.3 | UI component library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | v4 (zero-config) | Utility-first CSS framework |
| **Framer Motion** | 12.38.0 | Declarative animations and gestures |
| **Zustand** | 5.0.12 | Minimal state management (persisted to localStorage) |
| **Radix UI Primitives** | latest | Accessible headless UI components |
| **Lucide React** | 0.577.0 | Consistent icon library |
| **React Hot Toast** | 2.6.0 | Toast notification system |
| **Google Identity Services** | GSI | Google Sign-In button & authentication |

### 3.2 Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | ≥18 | JavaScript runtime |
| **Express** | 5.2.1 | Web framework & routing (router v2.2.0, path-to-regexp v8) |
| **TypeScript** | 5.9.3 | Type-safe JavaScript |
| **Mongoose** | 9.3.1 | MongoDB ODM with schema validation |
| **JSON Web Token** | 9.0.3 | Stateless authentication |
| **bcryptjs** | 3.0.3 | Password hashing (10 salt rounds) |
| **BullMQ** | 5.78.0 | Redis-backed job queue (optional) |
| **ioredis** | 5.11.1 | Redis client (optional, graceful degradation) |
| **Zod** | 4.4.3 | Runtime schema validation |
| **Cheerio** | 1.2.0 | HTML parsing for web scraping |
| **Dotenv** | 17.3.1 | Environment configuration |

### 3.3 Database

| Technology | Version | Purpose |
|---|---|---|
| **MongoDB Atlas** | 7.x (cloud) | Primary document database |
| **Redis** | 7.x (optional) | BullMQ queue backend |

### 3.4 External Services

| Service | Purpose | Integration |
|---|---|---|
| **Groq API** | AI-powered chat (LLaMA 3.3 70B versatile) | REST API to `api.groq.com` |
| **Google OAuth 2.0** | Social login | GIS library, OAuth client credential |
| **OpenStreetMap (Nominatim)** | Geographic facility search & geolocation | REST API with 1 req/sec rate limiter |
| **Wikidata (SPARQL)** | Healthcare facility database | SPARQL query endpoint |
| **Render** | Backend hosting (free tier, Singapore) | Dockerless Node deployment |
| **Vercel** | Frontend hosting | Next.js optimized deployment |

---

## 4. Features & Functionality

### 4.1 Authentication & User Management

**Password-based auth:**
- Registration with name, email, password, phone, role selection
- Login with email/password → JWT (7-day expiry)
- Password hashing via bcryptjs (10 rounds)
- Session persisted via localStorage token (Zustand store)

**Google OAuth:**
- Google Sign-In button via GIS library
- JWT credential decoded client-side → sent to backend
- New users auto-registered with CUSTOMER role
- Existing accounts linked via googleId field

**Account management:**
- Profile update (name, phone, avatar, location)
- Admin can verify users, toggle active status
- Caregivers manage professional profile (skills, rates, availability, bio)

### 4.2 Caregiver Discovery & Search

**Public caregiver listing** (`GET /api/caregivers`):
- Filters: skills (`$in` with case-insensitive regex), experience, min rating, max hourly rate, availability
- Returns paginated results with profile data
- Individual caregiver detail page with bio, skills, reviews, availability calendar

**Real-time caregiver search** (`GET /api/search/realtime`):
- Hybrid search combining local DB + OpenStreetMap + Wikidata
- OSM queries healthcare facilities (hospitals, clinics, nursing homes, etc.) in Indian cities
- Wikidata SPARQL queries for additional healthcare institutions
- Rate-limited to 1 req/sec (Nominatim compliance)
- Fallback to local database results if external sources time out

**Recommendations** (`GET /api/recommend`):
- Scoring algorithm: distance (30%) + skills match (25%) + rating (25%) + experience (20%)
- "Similar caregivers" by skills overlap and location proximity

### 4.3 Booking & Payment System

**Booking lifecycle:**
1. Customer creates booking → status: PENDING
2. Caregiver accepts → status: ACCEPTED (payment: ESCROW)
3. Service delivered → caregiver marks COMPLETED
4. Admin releases escrow → status: PAID_OUT
5. Optional: Customer cancels → refund → status: CANCELLED / REFUNDED

**Payment system:**
- Escrow model: payment held until service completion
- Admin-mediated release to caregiver
- Refund processing available
- Multiple payment methods (Credit Card, Debit Card, UPI, Net Banking — simulated)
- Mock payment gateway (no real money processing)

### 4.4 AI Chat Assistant

**Groq API integration:**
- Model: `llama-3.3-70b-versatile` via OpenAI-compatible API
- Configurable: requires `GROQ_API_KEY` (non-mock, >10 chars)
- Falls back to keyword-based mock responses if Groq unavailable

**Multilingual support (4 languages):**
| Language | Code | Caregiver-Specific Prompt |
|---|---|---|
| English | en | Full capabilities |
| Hindi | hi | Hindi responses, culturally relevant |
| French | fr | French responses |
| Russian | ru | Russian responses |

**Voice features (browser APIs):**
- Speech-to-text via Web Speech API (`SpeechRecognition`)
- Text-to-speech via `SpeechSynthesis` with 20 selectable voices
- Language-specific voice selection

**Session management:**
- Session ID via header or auto-generated UUID
- Full chat history persisted in `ChatLog` collection
- Each message stored with timestamp
- Admin dashboard for viewing/managing chat sessions

### 4.5 Healthcare Aggregator

**Data sources:**
1. **OpenStreetMap (Nominatim):** Searches hospitals, clinics, nursing homes, diagnostic centers, pharmacies, rehabilitation centers, fitness centers, daycares, blood banks, ambulance services, schools, colleges, maid services, housekeeping
2. **Wikidata (SPARQL):** Healthcare institutions in India with structured properties
3. **Fallback static dataset:** 30+ predefined Indian facilities

**Scraped facility types (17):** hospital, clinic, nursing-home, diagnostic-center, pharmacy, rehabilitation-center, fitness-center, daycare, blood-bank, ambulance-service, school, college, university, educational-institute, maid-service, housekeeping, cleaning-service

**Processing pipeline:**
1. Raw data from OSM/Wikidata → normalized address format
2. Services/specialities extracted from tags and text
3. Description auto-generated per facility type
4. Zod schema validation
5. Deduplication via SHA-256 externalId hash (`name|address|source`)
6. MongoDB `bulkWrite` with upsert (batch size: 100)
7. Scraping run logged to `ScrapingLog`

**Scheduled jobs (BullMQ, optional):**
| Job | Interval | Default |
|---|---|---|
| Discovery | Every 6 hours | 21,600,000ms |
| Update | Every 1 hour | 3,600,000ms |
| Cleanup | Every 7 days | 604,800,000ms |

**Public API:**
- List facilities (with filters: city, state, type, services, text search)
- Geo-nearby search (MongoDB 2dsphere index)
- Facility detail with full address, services, operational hours
- Provider directory with specialization search

**Admin controls:**
- Manage scraping sources (create, update, toggle active)
- Trigger ad-hoc jobs (discovery, update, cleanup)
- View scraping logs with pagination, error messages
- Aggregation statistics dashboard

### 4.6 Admin Dashboard

Full administrative interface with:
- **System stats:** total users, caregivers, bookings, revenue, escrow balance
- **User management:** list, search, verify, toggle active, delete users
- **Caregiver management:** verify/unverify, update availability
- **Booking management:** view all, filter by status, force-complete
- **Payment escrow:** view pending escrows, release payments, process refunds
- **Dispute resolution:** view disputes, resolve with admin note
- **Activity logs:** paginated logs with category/action/status filtering
- **Auth logs:** login/register history with IP and user agent
- **Chat logs:** view chat sessions by user, delete sessions
- **Aggregator:** scraping jobs, data sources, provider management, logs & stats

### 4.7 Review System

- Customers can leave reviews on completed bookings
- Ratings 1–5 with text comments
- Reviews displayed on caregiver detail page
- Aggregated rating and review count on caregiver profiles

### 4.8 Audit Logging

Three dedicated log collections:

| Collection | Events Tracked | Admin Features |
|---|---|---|
| **ActivityLog** | API actions (create booking, update profile, etc.) | Paginated viewer, category/action/status filters, stats |
| **AuthLog** | Login success/fail, register, logout, token refresh, password change | Paginated viewer, IP tracking, user agent capture, stats |
| **ChatLog** | Full message history per session | Session viewer, delete, session statistics |

---

## 5. User Roles & Permissions

| Feature | Public | Customer | Caregiver | Admin |
|---|---|---|---|---|
| Browse caregivers | ✅ | ✅ | ✅ | ✅ |
| Caregiver detail | ✅ | ✅ | ✅ | ✅ |
| Facility directory | ✅ | ✅ | ✅ | ✅ |
| Facility detail | ✅ | ✅ | ✅ | ✅ |
| AI Chat | ✅ | ✅ | ✅ | ✅ |
| Register | ✅ | — | — | — |
| Login | ✅ | ✅ | ✅ | ✅ |
| Create booking | — | ✅ | — | ✅ |
| View own bookings | — | ✅ | ✅ | ✅ |
| Accept/reject booking | — | — | ✅ | ✅ |
| Mark booking complete | — | — | ✅ | ✅ |
| Write review | — | ✅ | — | — |
| Manage profile | — | ✅ | ✅ | ✅ |
| Manage caregiver profile | — | — | ✅ | ✅ |
| Dashboard | — | Customer | Caregiver | Admin |
| Create users | — | — | — | ✅ |
| Verify users | — | — | — | ✅ |
| Release escrow | — | — | — | ✅ |
| Process refunds | — | — | — | ✅ |
| View all bookings | — | — | — | ✅ |
| View log systems | — | — | — | ✅ |
| Manage aggregator | — | — | — | ✅ |
| Trigger scraping jobs | — | — | — | ✅ |
| Resolve disputes | — | — | — | ✅ |
| Delete users | — | — | — | ✅ |

**Middleware enforcement:**
- `authenticate` — extracts & verifies JWT from `Authorization: Bearer <token>`
- `authorize('ADMIN')` — checks role, returns 403 if unauthorized
- Role-based UI rendering on frontend via Zustand `useAuthStore`

---

## 6. API Reference

### 6.1 Authentication

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login with email/password |
| POST | `/api/auth/google` | No | Google OAuth login |

### 6.2 Users

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | Yes | Get current user profile |
| PUT | `/api/users/me` | Yes | Update current user profile |
| GET | `/api/users` | Admin | List all users |
| GET | `/api/users/customers` | Admin | List customers |
| GET | `/api/users/caregivers` | Admin | List caregivers |

### 6.3 Caregivers

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/caregivers` | No | List caregivers (with filters) |
| GET | `/api/caregivers/:id` | No | Caregiver detail |
| GET | `/api/caregivers/me` | Caregiver | Own profile |
| POST | `/api/caregivers/profile` | Caregiver | Create/update profile |
| PUT | `/api/caregivers/availability` | Caregiver | Toggle availability |
| GET | `/api/caregivers/pending` | Admin | Unverified caregivers |
| PUT | `/api/caregivers/:id/availability` | Admin | Update caregiver availability |
| PUT | `/api/caregivers/verify/:id` | Admin | Verify caregiver |

### 6.4 Bookings

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/bookings` | Yes | Create booking |
| GET | `/api/bookings/customer` | Customer | Own bookings |
| GET | `/api/bookings/caregiver` | Caregiver | Assigned bookings |
| PUT | `/api/bookings/:id/status` | Caregiver/Admin | Update status |
| DELETE | `/api/bookings/:id` | Yes | Cancel booking |
| GET | `/api/bookings` | Admin | All bookings |
| GET | `/api/bookings/:id` | Yes | Booking detail |

### 6.5 Payments

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/payments/create-order` | Yes | Create mock payment |
| POST | `/api/payments/verify` | Yes | Verify payment |
| POST | `/api/payments/release/:bookingId` | Admin | Release escrow |
| POST | `/api/payments/refund/:bookingId` | Admin | Process refund |
| GET | `/api/payments/methods` | No | List payment methods |

### 6.6 Reviews

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/reviews` | Yes | Create review |
| GET | `/api/reviews/caregiver/:id` | No | Caregiver reviews |
| GET | `/api/reviews/customer` | Customer | Own reviews |

### 6.7 Search & Recommendations

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/search/realtime` | No | Hybrid caregiver search |
| GET | `/api/recommend` | Optional | ML-based recommendations |
| GET | `/api/recommend/similar/:id` | Yes | Similar caregivers |

### 6.8 Admin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/stats` | Admin | Dashboard statistics |
| GET | `/api/admin/revenue` | Admin | Revenue data |
| GET | `/api/admin/disputes` | Admin | List disputes |
| POST | `/api/admin/disputes/:id/resolve` | Admin | Resolve dispute |
| DELETE | `/api/admin/users/:id` | Admin | Delete user |
| POST | `/api/admin/release-payment/:id` | Admin | Release escrow |
| GET | `/api/admin/payments/escrow` | Admin | Escrow payments |
| GET | `/api/admin/users` | Admin | All users |
| PUT | `/api/admin/users/:id/status` | Admin | Toggle active |
| PUT | `/api/admin/users/:id/verify` | Admin | Verify user |
| GET | `/api/admin/users/:id` | Admin | User detail |

### 6.9 Logs

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/logs/activity` | Admin | Activity logs (paginated) |
| GET | `/api/logs/activity/stats` | Admin | Activity statistics |
| GET | `/api/logs/chat` | Admin | Chat sessions |
| GET | `/api/logs/chat/stats` | Admin | Chat statistics |
| GET | `/api/logs/auth` | Admin | Auth logs |
| GET | `/api/logs/auth/stats` | Admin | Auth statistics |
| DELETE | `/api/logs/chat/:sessionId` | Admin | Delete session |
| DELETE | `/api/logs/auth/:id` | Admin | Delete auth log |
| DELETE | `/api/logs/activity/:id` | Admin | Delete activity log |

### 6.10 Healthcare Aggregator

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/aggregator/facilities` | No | List facilities |
| GET | `/api/aggregator/facilities/geo/nearby` | No | Geo-nearby search |
| GET | `/api/aggregator/facilities/:id` | No | Facility detail |
| GET | `/api/aggregator/providers` | No | List providers |
| GET | `/api/aggregator/providers/:id` | No | Provider detail |
| GET | `/api/aggregator/search` | No | Unified search |
| GET | `/api/admin/aggregator/status` | Admin | Aggregator status |
| GET | `/api/admin/aggregator/logs` | Admin | Scraping logs |
| GET | `/api/admin/aggregator/sources` | Admin | List sources |
| POST | `/api/admin/aggregator/sources` | Admin | Create source |
| PUT | `/api/admin/aggregator/sources/:id` | Admin | Update source |
| POST | `/api/admin/aggregator/run/:jobType` | Admin | Trigger job |
| GET | `/api/admin/aggregator/stats` | Admin | Aggregator stats |

### 6.11 Chat

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/chat` | No (preferred) | Send message, get AI response |
| POST | `/api/seed/run` | Header key | Trigger seed scripts |

---

## 7. Database Schema

### 7.1 Core Models (7)

**User** — `users` collection
```
name, email (unique), password (hashed), role [CUSTOMER|CAREGIVER|ADMIN],
location {lat, lng, address}, phone, avatar, isVerified, isActive, googleId,
address, createdAt, updatedAt
Indexes: email (unique)
```

**CaregiverProfile** — `caregiverprofiles` collection
```
caregiverId (ref User), hourlyRate, experienceYears, skills[], bio,
rating, totalReviews, isAvailable, isVerified,
availability {monday..sunday},
availabilitySchedule {Map<String, {start, end, available}>},
createdAt, updatedAt
```

**Booking** — `bookings` collection
```
customerId (ref User), caregiverId (ref User),
date, hours, status [PENDING|ACCEPTED|REJECTED|COMPLETED|CANCELLED],
totalAmount, notes, address, paymentId,
paymentStatus [PENDING|ESCROW|PAID_OUT|REFUNDED],
createdAt, updatedAt
```

**Payment** — `payments` collection
```
bookingId (ref Booking), transactionId (unique), amount,
status [ESCROW|RELEASED|REFUNDED|PENDING], paymentMethod,
customerId (ref User), caregiverId (ref User), createdAt
```

**Review** — `reviews` collection
```
bookingId (ref Booking), reviewerId (ref User), caregiverId (ref User),
rating (1-5), comment, createdAt, updatedAt
```

**ChatLog** — `chatlogs` collection
```
userId, userRole, page, messages [{role, content, timestamp}],
sessionId, createdAt, updatedAt
Indexes: userId+createdAt, sessionId, createdAt
```

**ActivityLog** — `activitylogs` collection
```
userId, userEmail, userRole, action,
category [AUTH|BOOKING|PAYMENT|CAREGIVER|REVIEW|PROFILE|CHAT|SYSTEM],
status [SUCCESS|FAILED|PENDING], ipAddress, userAgent,
metadata, resourceType, resourceId, description, createdAt
Indexes: createdAt, category+action, userId+createdAt, status+category
```

**AuthLog** — `authlogs` collection
```
userId, userEmail,
action [LOGIN_SUCCESS|LOGIN_FAILED|REGISTER_SUCCESS|REGISTER_FAILED|LOGOUT|TOKEN_REFRESH|PASSWORD_CHANGE],
status [SUCCESS|FAILED], ipAddress, userAgent, role, errorMessage, metadata, createdAt
Indexes: userId+createdAt, action+status, createdAt, userEmail+createdAt
```

### 7.2 Aggregator Models (5)

**HealthcareFacility** — `healthcarefacilities` collection
```
name, address {street, city, state, zip, full},
coordinates {lat, lng (2dsphere)}, phone, email, website, facilityType,
description, services[], specialities[], rating, reviewCount,
operationalHours, emergencyServices, externalId (unique), sourceUrl,
sourceName, lastSeen, createdAt, updatedAt
Indexes: text (name, address.full, specialities), 2dsphere (coordinates),
city+state, facilityType, updatedAt
```

**HealthcareProvider** — `healthcareproviders` collection
```
name, title, specialities[], education[], experience, phone, email,
facilityId (ref HealthcareFacility), facilityName,
address {street, city, state, zip, full}, coordinates {lat, lng},
rating, reviewCount, externalId (unique), sourceUrl, sourceName, lastSeen
Indexes: text (name, specialities), 2dsphere (coordinates), facilityId
```

**ScrapingSource** — `scrapingsources` collection
```
name (unique), baseUrl, category, isActive, scrapeInterval,
lastScrapedAt, totalRecords, errorCount, config (Mixed), createdAt, updatedAt
```

**ScrapingLog** — `scrapinglogs` collection
```
jobId, jobType, sourceName,
status [RUNNING|COMPLETED|FAILED|PAUSED],
recordsFound, recordsInserted, duplicatesSkipped, errorCount,
errorMessages[], startedAt, completedAt, duration, metadata, createdAt
Indexes: createdAt, status, jobId, jobType
```

**AggregationMetrics** — `aggregationmetrics` collection
```
totalFacilities, totalProviders, totalSources, activeSources,
totalJobsRun, totalRecordsFound, totalRecordsInserted,
totalDuplicatesSkipped, totalErrors, lastJobRun, lastError,
dailyStats [{date, recordsFound, recordsInserted, duplicatesSkipped, errors}]
```

---

## 8. Security

### 8.1 Authentication & Authorization
- **JWT-based**: HS256 tokens with 7-day expiry
- **Password hashing**: bcryptjs with 10 salt rounds
- **Role middleware**: `authenticate()` extracts token, `authorize(...roles)` checks permissions
- **No plaintext secrets**: JWT_SECRET must be changed from default in production

### 8.2 API Security
- **CORS**: Explicit whitelist via `ALLOWED_ORIGINS` env var
- **Request size limit**: `express.json({ limit: '10kb' })` prevents oversized payloads
- **Input validation**: Zod schemas validate all incoming data in aggregator module
- **Rate limiting**: Nominatim scraper respects 1 req/sec via promise-queue
- **No sensitive data in logs**: Auth fails return generic messages

### 8.3 Infrastructure
- **MongoDB Atlas**: Encrypted at rest, VPC-isolated, IP whitelist
- **HTTPS**: Enforced by Vercel and Render free tiers
- **Environment variables**: Secrets (MONGODB_URI, JWT_SECRET) excluded from Git via `.gitignore`
- **Seed key protection**: `/api/seed/run` requires `x-seed-key` header matching `SEED_KEY` env var

### 8.4 Frontend
- **Token storage**: localStorage (avoided for highly sensitive data — future: HttpOnly cookies)
- **XSS prevention**: React's built-in output encoding
- **Google OAuth**: Standard GIS button, credential sent to backend for processing

---

## 9. Scalability

### 9.1 Horizontal Scaling Strategy

**Backend (Express):**
- Stateless JWT auth — no session affinity required
- Multiple instances can run behind a load balancer
- MongoDB Atlas handles connection pooling across instances
- Redis (if available) provides distributed queue coordination

**Frontend (Next.js):**
- Vercel auto-scales serverless functions per request volume
- Static pages (/, /about, /login) served from CDN edge
- Dynamic pages server-rendered on-demand

### 9.2 Database Scaling

**MongoDB Atlas:**
- **Read replicas**: Add secondary reads for caregiver/facility listing (read-heavy)
- **Sharding**: Shard by `city` or `facilityType` for geo-distributed queries
- **Indexing**: Existing indexes on createdAt, foreign keys, text search, 2dsphere
- **TTL indexes**: Can be added for automatic log cleanup (ActivityLog, ScrapingLog)

### 9.3 Caching Strategy

**Current:**
- MongoDB query caching (WiredTiger internal cache)
- No application-level cache yet

**Future recommendations:**
- **Redis cache**: Cache popular caregiver/facility queries (TTL: 5 min)
- **CDN caching**: Vercel CDN for static assets and pages
- **Response caching**: Cache `/api/caregivers` listing, `/api/search/realtime` results
- **Dedicated search index**: Migrate to Atlas Search for full-text capabilities

### 9.4 Queue & Worker Scaling

**BullMQ (when Redis is available):**
- Jobs distributed across worker instances
- Concurrency per worker: 1 (configurable)
- Repeatable jobs with configurable intervals via env vars
- Retry with exponential backoff for transient failures

### 9.5 Database Projections

Key queries use MongoDB projections to limit fields returned:
- Caregiver listings: excludes password, googleId
- Facility lists: excludes operationalHours, full description
- User lists (Admin): excludes password hash

---

## 10. Performance Optimizations

| Area | Optimization | Impact |
|---|---|---|
| **Database** | Mongoose lean() queries | 3-5x faster read queries |
| **Database** | Bulk writes (batch: 100) | 50x faster inserts |
| **Database** | Compound indexes | Sub-millisecond queries |
| **Network** | Next.js proxy rewrites | Single origin, no CORS overhead |
| **Frontend** | Turbopack bundling | Fast HMR in dev, optimized prod builds |
| **Frontend** | Standalone output mode | Smaller production deployment |
| **Search** | Real-time hybrid (DB + API) | Fresh data without full re-index |
| **Scraper** | Deduplication via SHA-256 hash | Prevents duplicate facility records |
| **Scraper** | Promise-based rate limiter | Ensures exactly 1 req/sec to Nominatim |
| **Scraper** | Timeout handling (15s OSM, 15s Wikidata) | Prevents hung scraping jobs |
| **Auth** | JWT stateless | No DB lookups per request |
| **Logging** | Paginated queries with skip/limit | Handles large log volumes |
| **Build** | TypeScript strict mode | Catch errors at compile time |

---

## 11. Deployment

### 11.1 Current Deployment

| Component | Platform | URL |
|---|---|---|
| Backend API | Render | `https://trustcare-management-system.onrender.com` |
| Frontend | Vercel | `https://trust-care-management-system.vercel.app` |
| Database | MongoDB Atlas | Cloud-hosted M0 free tier |

### 11.2 Environment Variables

**Backend (Render):**
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<random-64-char>
GROQ_API_KEY=gsk_...
ALLOWED_ORIGINS=http://localhost:3000,https://trust-care-management-system.vercel.app
SEED_KEY=<seed-key>
```

**Frontend (Vercel):**
```
NEXT_PUBLIC_API_URL=https://trustcare-management-system.onrender.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=729970257667-...apps.googleusercontent.com
```

### 11.3 CI/CD

- **Render**: Auto-deploys from GitHub `main` branch on push
- **Vercel**: Auto-deploys from GitHub `main` branch on push
- Manual deploys via `git push` or dashboard redeploy

### 11.4 Infrastructure as Code

`render.yaml` defines both backend and frontend services with:
- Build commands, start commands, health check paths
- Environment variable binding (secrets marked `sync: false`)

---

## 12. Future Scope

### 12.1 Short-Term (Next 3 Months)

**Payments:**
- Integrate real payment gateway (Razorpay/Stripe)
- UPI auto-pay and recurring subscriptions
- Digital receipts and GST invoicing

**Notifications:**
- Email notifications (booking confirmations, reminders)
- SMS alerts via Twilio
- In-app notification center with unread badge

**User Experience:**
- Dark mode refinement (currently functional but needs polish)
- Mobile-responsive PWA with offline support
- Accessibility audit (WCAG 2.1 AA compliance)
- Multi-language UI (i18n beyond chat)

**Data Enrichment:**
- Expand healthcare aggregator to 50+ cities
- Add more facility types (mental health, physiotherapy, dental)
- Integrate practitioner verification (certification checks)

### 12.2 Medium-Term (3-6 Months)

**Platform Features:**
- **Real-time messaging**: Direct chat between customer and caregiver
- **Video consultation**: WebRTC-based telehealth appointments
- **Medication tracking**: Schedule reminders for patients
- **Emergency SOS**: One-tap alert with location sharing
- **Care plans**: Structured care programs with milestones

**Advanced AI:**
- Fine-tuned care recommendation model
- Sentiment analysis on reviews
- Automated care plan generation
- Voice-first interface with custom Wake Word

**Scaling:**
- Implement Redis caching layer for API responses
- Add Atlas Search for full-text facility/provider search
- Implement database read replicas
- Add rate limiting middleware (express-rate-limit)

### 12.3 Long-Term (6-12 Months)

**Ecosystem:**
- **Mobile apps**: React Native for iOS and Android
- **Marketplace**: Subscription plans, corporate wellness packages
- **Insurance integration**: Claim filing and policy verification
- **Telemedicine platform**: End-to-end virtual healthcare
- **IoT integration**: Wearable device data for patient monitoring

**Enterprise:**
- Multi-tenant architecture for hospital chains
- White-label solution for healthcare providers
- HIPAA/GDPR compliance framework
- SLA-based service guarantees
- Advanced analytics dashboard (Power BI/Tableau integration)

**Community:**
- Caregiver training & certification platform
- Patient support groups and forums
- Rating transparency with verified reviews only
- Community health metrics and anonymized data insights

---

## 13. Limitations & Known Issues

### 13.1 Technical Limitations

| Issue | Impact | Workaround |
|---|---|---|
| **Redis is optional** | Scheduled scraping jobs don't run without Redis | Trigger jobs manually via admin dashboard or run seed |
| **Free tier cold starts** | Render free tier sleeps after 15 min idle; first request takes 30-60s | Upgrade to Starter ($7/mo) for instant wake |
| **Nominatim 1 req/sec** | Facility scraping limited to ~3,600 queries/hour | Already rate-limited in code; acceptable for current scale |
| **No HTTPS on local dev** | Google OAuth requires HTTPS in production | Local dev uses HTTP; Google buttons fail in dev without localhost exception |
| **Mock payments** | No real money processing | Suitable for demo/POC; requires payment gateway integration for production |
| **No email service** | No password reset or booking notifications | Future scope item |
| **Vercel serverless timeout (10s)** | Long API calls (OSM/Wikidata 15s timeouts) may exceed | Workers handle scraping; user-facing calls use shorter timeouts |
| **Single region** | Render Singapore region; higher latency for non-Asia users | Add multi-region deployment in future |
| **No automated backups** | MongoDB Atlas free tier has no automated backups | Manual mongodump before destructive operations |

### 13.2 Known Bugs

- Google Sign-In button width: GIS library doesn't accept `100%`; uses container offsetWidth (fixed in v1.0)
- Google Sign-In popup blocked by browser: Requires user gesture (click) to open
- Caregiver skills search: Case-sensitivity handled via RegExp (fixed in v1.0)
- Seed transactionId collision: Counter-based ID prevents duplicate (fixed in v1.0)
- Preview Vercel URLs: Don't inherit production env vars; use production URL only

### 13.3 Security Notes

- **Token storage in localStorage**: Vulnerable to XSS; prefer HttpOnly cookies for production
- **Google token verification**: Backend currently trusts frontend-decoded credential; production should verify server-side
- **No request rate limiting**: API can be flooded; add `express-rate-limit` for production
- **No CSRF protection**: API is stateless but CSRF token recommended for cookie-based auth in future

---

## Appendix A: Project Structure

```
root/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express app entry
│   │   ├── middleware/
│   │   │   └── auth.ts           # JWT authenticate + authorize
│   │   ├── models/               # 7 Mongoose models
│   │   ├── routes/               # 12 route files
│   │   ├── scripts/              # seed.ts, seedAggregator.ts
│   │   ├── modules/
│   │   │   └── healthcareAggregator/
│   │   │       ├── models/       # 5 aggregator models
│   │   │       ├── routes/       # public + admin routes
│   │   │       ├── services/     # httpScraper, bulkWriteService
│   │   │       ├── queues/       # BullMQ setup
│   │   │       ├── workers/      # 3 job workers
│   │   │       └── utils/        # hash, retry, rateLimiter, validators
│   │   └── data/                 # Static data files
│   ├── dist/                     # Compiled JS
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router pages
│   │   ├── components/           # UI components (shadcn-style)
│   │   ├── lib/
│   │   │   └── utils.ts          # fetchAPI, cn()
│   │   ├── store/
│   │   │   └── index.ts          # Zustand (auth + chat)
│   │   └── styles/
│   │       └── globals.css       # Tailwind v4
│   ├── public/                   # Static assets
│   └── tsconfig.json
│
├── docker-compose.yml            # Local MongoDB + Redis
├── render.yaml                   # Render blueprint
├── package.json                  # Monorepo scripts
├── README.md
└── PROJECT_REPORT.md             # This file
```

## Appendix B: Seed Data Summary

After running `npm run seed` and `npm run seed-aggregator`:

| Entity | Count | Details |
|---|---|---|
| Admin users | 1 | admin@caresphere.in |
| Customer users | 100 | rajesh.kumar@caresphere.in + customer2..100@example.com |
| Caregiver users | 50 | priya.sharma@caresphere.com + caregiver2..50@example.com |
| Caregiver profiles | 50 | With skills, rates, ratings, bios |
| Bookings | 120 | Various statuses (PENDING, ACCEPTED, COMPLETED, CANCELLED) |
| Payments | ~95 | Escrow, released, refunded |
| Reviews | 80 | Ratings 3-5 with comments |
| Facilities | ~50 | Real data from OpenStreetMap + Wikidata |
| **Password (all)** | | `caregiver123` |

---

> **CareSphere** — Built by Bermuda Triangle, 2026.  
> Contact: caresphere0029@gmail.com  
> Repository: [github.com/Aveek29/TrustCare-Management-System](https://github.com/Aveek29/TrustCare-Management-System)
