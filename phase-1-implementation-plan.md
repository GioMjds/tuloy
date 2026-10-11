# Tuloy: Initial Implementation Plan (MVP v0)

## 1. Constraints and Assumptions

- Solo dev, ₱20k budget, so **free tiers only** (Vercel, Neon/Supabase, Render/Fly).
- The goal is a **demo that convinces a real shop owner**, not a full product. A live queue that updates in real time is the "wow" feature.
- **Assumption to challenge:** customers must not need accounts. Walk-in customers will not sign up, so they get a ticket via name or phone plus a token stored on their device.
- If your existing Takda monorepo (NestJS + Next.js + Prisma + WebSocket gateway, queue numbering, walk-in registration) is in decent shape, **fork it and rebrand to Tuloy** instead of rebuilding. Audit it first (half a day).

---

## 2. Database Decision: Prisma + PostgreSQL, with a Thin IndexedDB Layer

| Option | Description                | Pros                                      | Cons                                                                                                  |
| ------ | -------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| A      | Postgres only              | Single source of truth, shared state      | No offline view                                                                                       |
| B      | IndexedDB only             | Zero backend, works offline               | Per-device data, so a queue shared between customer and owner is impossible. Fails the core use case. |
| C      | Postgres + IndexedDB cache | Real shared queue plus offline resilience | Slightly more code                                                                                    |

**Recommendation: C, scoped small.**

- Postgres is the source of truth.
- IndexedDB only caches the customer's active ticket and the last-known queue snapshot, so the PWA still shows "You're #4" when signal drops.
- No sync engine and no offline writes in v0.

---

## 3. Scope: One Vertical Slice

### In

- Owner logs in, sees the dashboard, manages services and business hours.
- Customer opens the shop's link or QR code, picks a service and joins the queue (remote or walk-in).
- Customer sees live position and estimated wait.
- Owner can call next, skip, complete, or mark a no-show.
- Customer can book an appointment slot (no double-booking).
- Filipino/English toggle, installable PWA.

### Out (explicitly)

- Payments
- SMS/push notifications
- Multi-branch
- Analytics
- Customer accounts

---

## 4. Data Model (Prisma Sketch)

```text
Business
  id, slug, name, category, openTime, closeTime, timezone

Owner
  id, email, passwordHash, businessId

Service
  id, businessId, name, durationMin, priceCentavos

QueueTicket
  id, businessId, serviceId, number, displayCode (A007),
  customerName, phone?, token,
  source (REMOTE | WALK_IN),
  status (WAITING | CALLED | SERVING | DONE | SKIPPED | NO_SHOW),
  queueDate, createdAt, calledAt

QueueCounter
  businessId + queueDate (composite PK), lastNumber

Appointment
  id, businessId, serviceId, customerName, phone?, token,
  startsAt, endsAt, status
  @@unique([businessId, startsAt])
```

### Two Key Decisions

1. **Ticket numbers come from `QueueCounter`**, incremented inside a transaction. This avoids race conditions and resets daily.
2. **Slots are computed, not stored.** Generate them from business hours plus service duration, minus existing appointments. The unique constraint is the last line of defense against double-booking.

---

## 5. API Surface (NestJS)

| Method | Endpoint                                 | Purpose                            | Auth   |
| ------ | ---------------------------------------- | ---------------------------------- | ------ |
| POST   | `/auth/login`                            | Owner login, returns JWT           | Public |
| GET    | `/businesses/:slug`                      | Public shop info + services        | Public |
| POST   | `/businesses/:slug/queue`                | Join queue, returns ticket + token | Public |
| GET    | `/queue/:token`                          | My ticket + position + ETA         | Token  |
| GET    | `/businesses/:slug/queue`                | Full queue                         | Owner  |
| POST   | `/queue/:id/call`                        | Call ticket                        | Owner  |
| POST   | `/queue/:id/skip`                        | Skip ticket                        | Owner  |
| POST   | `/queue/:id/complete`                    | Complete ticket                    | Owner  |
| POST   | `/queue/:id/no-show`                     | Mark no-show                       | Owner  |
| GET    | `/businesses/:slug/slots?date&serviceId` | Available appointment slots        | Public |
| POST   | `/businesses/:slug/appointments`         | Book an appointment                | Public |
| PATCH  | `/appointments/:id/cancel`               | Cancel an appointment              | Token  |

### Realtime

- Socket.IO gateway with **a room per business**.
- Emit `queue.updated` on every change.
- Clients **refetch on the event**, which is simple and avoids state drift.
- Add a **15s polling fallback**.

### ETA

`position × avg service duration` is enough for v0.

---

## 6. Mock Data (Seed Script)

Three businesses with different shapes, to prove the product is not barbershop-only:

| Business type             | Shape             |
| ------------------------- | ----------------- |
| Barbershop                | Short services    |
| Clinic                    | Appointment-heavy |
| Vulcanizing / repair shop | Walk-in-heavy     |

Each business has:

- 3 to 4 services in ₱ pricing
- 8 to 12 tickets in mixed states
- A few appointments across the week

**Demo simulator** (`pnpm demo:simulate`): adds a random customer every N seconds and auto-advances the queue, so you can show a live demo without staging it by hand.

---

## 7. Structure

```text
tuloy/
├── apps/
│   ├── web/        Next.js (App Router, next-pwa/Serwist, next-intl)
│   └── api/        NestJS (modules: auth, business, queue, appointments, gateway)
└── packages/
    ├── db/         Prisma schema, migrations, seed
    └── shared/     DTO types / zod schemas
```

---

## 8. Phases

| Phase | Name                | Duration  | Deliverable                                         | Done when                                                      |
| ----- | ------------------- | --------- | --------------------------------------------------- | -------------------------------------------------------------- |
| 0     | Setup               | 0.5–1 day | Repo audit or scaffold, Neon DB, env, CI lint       | `pnpm dev` runs web + api                                      |
| 1     | Data                | 1 day     | Schema, migration, seed                             | Seed produces the 3 shops                                      |
| 2     | Queue core          | 2 days    | Join, call, skip, complete, transactional numbering | A concurrency test with 20 parallel joins gives unique numbers |
| 3     | Realtime            | 1 day     | Gateway + room events                               | Two browser tabs update live                                   |
| 4     | Customer PWA        | 2–3 days  | Shop page, join flow, live ticket view, i18n        | Ticket survives a refresh and loads offline from IndexedDB     |
| 5     | Owner dashboard     | 2 days    | Login, queue controls, service CRUD                 | Owner can run a full shift on mock data                        |
| 6     | Appointments        | 2 days    | Slot generation, booking, cancel                    | Double-booking returns `409`                                   |
| 7     | PWA polish + deploy | 1–2 days  | Manifest, install prompt, QR generator, deploy      | Installable on a phone from a live URL                         |

**Total: roughly 2.5 to 3 weeks part-time.**

> If time is tight, **cut Phase 6 (Appointments) first.** The queue alone is the sellable demo.

---

## 9. Risks and Edge Cases

| Risk                             | Detail                                                                      | Mitigation                                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Free-tier cold starts            | Render's free tier sleeps, which kills the first impression and WebSockets. | Keep-alive ping before demos, or use Fly.io. **Decide before Phase 7.**                                        |
| No-shows and fake joins          | With no accounts, anyone can spam the queue.                                | v0: rate limit per IP and an owner "remove ticket" action. Phone verification comes later.                     |
| Lost token                       | If a customer clears their browser, the ticket is orphaned.                 | Allow lookup by phone and ticket code.                                                                         |
| Timezone                         | The daily reset will break at midnight if "today" is computed wrongly.      | Store UTC, compute "today" in the business's timezone (`Asia/Manila`).                                         |
| Owner changes the queue mid-call | Invalid state jumps corrupt the queue.                                      | Make transitions explicit in the service layer (`WAITING → CALLED → SERVING → DONE`) and reject invalid jumps. |
| Realtime event storms            | Refetch-on-event may not scale.                                             | Fine at demo scale. Revisit past roughly 50 concurrent tickets per shop.                                       |
