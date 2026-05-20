# Prowider Mini Lead Distribution System

## Live Demo
https://prowider-ashen.vercel.app

## Routes
- `/request-service` — Customer enquiry form
- `/dashboard` — Real-time provider dashboard  
- `/test-tools` — Webhook simulation & testing panel

## Tech Stack
- Next.js 16 (App Router)
- PostgreSQL on Neon
- Prisma 7 with @prisma/adapter-pg
- Server-Sent Events (SSE) for real-time updates
- Postgres advisory locks for concurrency safety
- Vercel for deployment

## Allocation Algorithm
Each lead is assigned exactly 3 providers:
1. Mandatory providers are assigned first based on service:
   - Service 1 → Provider 1 always
   - Service 2 → Provider 5 always
   - Service 3 → Provider 1 + Provider 4 always
2. Remaining slots are filled via round-robin from a
   service-specific pool. The current index is stored
   in the AllocationState table so it persists across
   server restarts and is truly fair over time.
3. Providers at monthly quota (10) are skipped.

## Concurrency Handling
Postgres advisory locks (pg_advisory_xact_lock) are
acquired per serviceId before assignment begins.
Simultaneous leads for the same service queue up
instead of racing, preventing duplicate assignments
or index corruption.

## Webhook Idempotency
Every webhook call requires an idempotencyKey.
The system checks the WebhookEvent table before
processing. If the key exists, it returns success
without re-processing. The key insertion and quota
reset happen in a single atomic transaction.

## Setup Instructions
1. Clone the repo
2. Run `npm install`
3. Set DATABASE_URL in .env (Neon PostgreSQL)
4. Run `npx prisma db push`
5. Run `npx prisma generate`
6. Run `npx prisma db seed`
7. Run `npm run dev`