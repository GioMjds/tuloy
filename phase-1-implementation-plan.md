Tuloy: Initial Implementation Plan (MVP v0)

1. Constraints and assumptions
   Solo dev, ₱20k budget, so free tiers only (Vercel, Neon/Supabase, Render/Fly).
   The goal is a demo that convinces a real shop owner, not a full product. A live queue that updates in real time is the “wow” feature.
   Assumption to challenge: customers must not need accounts. Walk-in customers will not sign up, so they get a ticket via name or phone plus a token stored on their device.
   If your existing Takda monorepo (NestJS + Next.js + Prisma + WebSocket gateway, queue numbering, walk-in registration) is in decent shape, fork it and rebrand to Tuloy instead of rebuilding. Audit it first (half a day).
2. Database decision: Prisma + PostgreSQL, with a thin IndexedDB layer
   Option Pros Cons
   A. Postgres only Single source of truth, shared state No offline view
   B. IndexedDB only Zero backend, works offline Per-device data, so a queue shared between customer and owner is impossible. Fails the core use case.
   C. Postgres + IndexedDB cache Real shared queue plus offline resilience Slightly more code

Recommendation: C, scoped small. Postgres is the source of truth. IndexedDB only caches the customer’s active ticket and the last-known queue snapshot, so the PWA still shows “You’re #4” when signal drops. No sync engine and no offline writes in v0.

3. Scope: one vertical slice

In:

Owner logs in, sees the dashboard, manages services and business hours.
Customer opens the shop’s link or QR code, picks a service and joins the queue (remote or walk-in).
Customer sees live position and estimated wait.
Owner can call next, skip, complete, or mark a no-show.
Customer can book an appointment slot (no double-booking).
Filipino/English toggle, installable PWA.

Out (explicitly): payments, SMS/push notifications, multi-branch, analytics, customer accounts.

4. Data model (Prisma sketch)
   Business id, slug, name, category, openTime, closeTime, timezone
   Owner id, email, passwordHash, businessId
   Service id, businessId, name, durationMin, priceCentavos
   QueueTicket id, businessId, serviceId, number, displayCode (A007),
   customerName, phone?, token, source (REMOTE|WALK_IN),
   status (WAITING|CALLED|SERVING|DONE|SKIPPED|NO_SHOW),
   queueDate, createdAt, calledAt
   QueueCounter businessId + queueDate (composite PK), lastNumber
   Appointment id, businessId, serviceId, customerName, phone?, token,
   startsAt, endsAt, status
   @@unique([businessId, startsAt])

Two key decisions:

Ticket numbers come from QueueCounter, incremented inside a transaction. This avoids race conditions and resets daily.
Slots are computed, not stored: generate them from business hours plus service duration, minus existing appointments. The unique constraint is the last line of defense against double-booking. 5. API surface (NestJS)
POST /auth/login owner JWT
GET /businesses/:slug public shop info + services
POST /businesses/:slug/queue join queue → ticket + token
GET /queue/:token my ticket + position + ETA
GET /businesses/:slug/queue (owner) full queue
POST /queue/:id/call | skip | complete | no-show (owner)
GET /businesses/:slug/slots?date&serviceId
POST /businesses/:slug/appointments
PATCH /appointments/:id/cancel

Realtime: Socket.IO gateway with a room per business. Emit queue.updated on every change. Clients refetch on the event, which is simple and avoids state drift. Add a 15s polling fallback.

ETA: position × avg service duration is enough for v0.

6. Mock data (seed script)
   3 businesses with different shapes: a barbershop (short services), a clinic (appointment-heavy), and a vulcanizing or repair shop (walk-in-heavy). This proves the product is not barbershop-only.
   Each has 3 to 4 services in ₱ pricing, 8 to 12 tickets in mixed states, and a few appointments across the week.
   A demo simulator (pnpm demo:simulate) that adds a random customer every N seconds and auto-advances the queue, so you can show a live demo without staging it by hand.
7. Structure
   tuloy/
   apps/web Next.js (App Router, next-pwa/Serwist, next-intl)
   apps/api NestJS (modules: auth, business, queue, appointments, gateway)
   packages/db Prisma schema, migrations, seed
   packages/shared DTO types / zod schemas
8. Phases
   Phase Deliverable Done when
9. Setup (0.5–1 day) Repo audit or scaffold, Neon DB, env, CI lint pnpm dev runs web + api
10. Data (1 day) Schema, migration, seed Seed produces the 3 shops
11. Queue core (2 days) Join, call, skip, complete, transactional numbering A concurrency test with 20 parallel joins gives unique numbers
12. Realtime (1 day) Gateway + room events Two browser tabs update live
13. Customer PWA (2–3 days) Shop page, join flow, live ticket view, i18n Ticket survives a refresh and loads offline from IndexedDB
14. Owner dashboard (2 days) Login, queue controls, service CRUD Owner can run a full shift on mock data
15. Appointments (2 days) Slot generation, booking, cancel Double-booking returns 409
16. PWA polish + deploy (1–2 days) Manifest, install prompt, QR generator, deploy Installable on a phone from a live URL

That is roughly 2.5 to 3 weeks part-time. If time is tight, cut Phase 6 first. The queue alone is the sellable demo.

9. Risks and edge cases
   Free-tier cold starts: Render’s free tier sleeps, which kills the first impression and WebSockets. Mitigation: a keep-alive ping before demos, or Fly.io. Decide before Phase 7.
   No-shows and fake joins: with no accounts, anyone can spam the queue. v0 mitigation: rate limit per IP and an owner “remove ticket” action. Phone verification comes later.
   Lost token: if a customer clears their browser, the ticket is orphaned. Allow lookup by phone and ticket code.
   Timezone: store UTC, compute “today” in the business’s timezone (Asia/Manila), or the daily reset will break at midnight.
   Owner changes the queue mid-call: make state transitions explicit in the service layer (WAITING → CALLED → SERVING → DONE) and reject invalid jumps.
   Realtime event storms: the refetch-on-event approach is fine at demo scale. Revisit if you pass roughly 50 concurrent tickets per shop.
