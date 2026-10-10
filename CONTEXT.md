# CONTEXT.md

Project context for contributors and AI coding agents. Read this before making changes. `README.md` explains how to run the project; this file explains **why it is built the way it is** and **what must not break**.

---

## 1. What this is

**Tuloy** is a queue and appointment booking PWA for Filipino walk-in businesses (barbershops and salons first, clinics second). Customers join via QR code, staff run the queue from one shop device, owners see daily counts, and an admin (the developer) supports shops.

Formerly the working name **Takda**. The codebase may still contain `takda` identifiers; renaming to `tuloy` is a planned task, not an accident.

## 2. Business model (drives scope)

- Productized service, not self-serve SaaS: the developer sets up each shop, the shop runs it day to day.
- Target: 3 paying pilot shops first, then raise prices and test one-time setup fee vs. small monthly fee.
- Solo developer, student, **total startup budget under PHP 20,000**. Cost and simplicity beat elegance.
- The bottleneck is customers, not code. Do not build features nobody has asked for.

## 3. Users

| Role     | Notes                                                                         |
| -------- | ----------------------------------------------------------------------------- |
| Customer | Browser only, no install, no account. May have weak data or no smartphone.    |
| Staff    | Uses one shop-owned device (tablet or phone). PIN login. Often non-technical. |
| Owner    | Reads daily counts, edits services/hours. Phone or laptop.                    |
| Admin    | The developer. Needs sync health and error visibility per shop.               |

## 4. Architectural invariants (do not break)

1. **Multi-tenant isolation.** Every query is scoped by `shopId`. A test must prove shop A cannot read shop B's data.
2. **Two number sequences.** `W-` numbers are issued only by the staff device (works offline). `A-` numbers are issued only by the server. They never share a counter.
3. **Server is the authority** on ticket state transitions. Invalid offline actions are rejected and surfaced to staff, never silently dropped or force-applied.
4. **Idempotency.** Every offline action carries a client-generated UUID, and its endpoint is idempotent on it. Retries must never create duplicates.
5. **Customers never need an account or an install** to join a queue.
6. **A staff-assisted path always exists** for customers without internet or a smartphone.
7. **Timezone is Asia/Manila** for all queue-day logic.
8. **Minimal customer data:** nickname plus optional phone. No more unless a feature requires it.

## 5. Offline scope

| In scope (v1)                                                                    | Out of scope (v1)                                     |
| -------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Staff: cached queue, walk-in (`W-`), call next, done, skip, no-show, outbox sync | Offline editing of services, hours, bookings          |
| Customer: cached ticket page with "last updated" badge                           | Customer joining a queue offline                      |
| Owner: read-only cached dashboard                                                | Offline public display (shows stale data with banner) |

Visible Offline / Synced indicator and pending-outbox count are required on the staff screen.

## 6. Key decisions and reasons

| Decision                                                          | Reason                                                                          | Revisit when                                                   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| PWA instead of native app                                         | No install friction for customers, one codebase, instant updates, no store fees | A paying customer or a real iOS notification problem forces it |
| Keep the existing Next.js + NestJS + Prisma + PostgreSQL stack    | Already built; rewriting costs weeks                                            | A real bottleneck appears                                      |
| Socket.IO with polling fallback                                   | Weak connections drop raw WebSockets                                            | Never, unless replaced by something simpler                    |
| API runs on an always-on host, not serverless                     | WebSockets need a long-lived server                                             | Hosting cost breaks the budget                                 |
| `app.` and `api.` subdomains of one domain                        | Same-site cookies, simpler CORS                                                 | Never                                                          |
| Hotspot backup plus degraded offline staff mode, not full offline | Full offline sync is costly to get right                                        | Pilot shops report frequent outages                            |
| No self-service kiosk, printer, push, SMS, or payments in MVP     | Hardware and integrations add cost and risk before demand exists                | A pilot shop asks and will pay                                 |
| Admin is the developer, setup is done for the shop                | Owners rarely self-configure; solo support must stay bounded                    | Shop count exceeds roughly 10-15                               |

## 7. Domain glossary

| Term            | Meaning                                                                            |
| --------------- | ---------------------------------------------------------------------------------- |
| **Tuloy**       | "Come in / go ahead." What staff say when it's your turn. The product name.        |
| **Pila**        | Queue, line                                                                        |
| **Turno**       | Turn                                                                               |
| **Suki**        | Regular customer (future loyalty feature)                                          |
| **Walk-in**     | Customer who arrives without a booking; registered by staff (`W-`) or by QR (`A-`) |
| **Source**      | How a ticket or booking was created: `staff`, `qr`, or `online`                    |
| **Outbox**      | Local IndexedDB queue of offline staff actions awaiting sync                       |
| **Now serving** | The number currently being attended, shown on the public display                   |

## 8. Out of scope until a pilot asks

GCash / PayMongo deposits, SMS or push notifications, ticket printing, self-service kiosk, multi-branch, loyalty points, advanced reports. Do not scaffold these "just in case."

## 9. Current status

- Existing from Takda: queue numbering, walk-in registration, Filipino/English i18n, owner dashboard and login designs.
- Planned next, in order:
  1. Rebrand to Tuloy and verify existing flows
  2. Source tracking plus `W-` / `A-` numbering
  3. Public display page
  4. Offline outbox for staff (highest risk, test hardest)
  5. Admin console with last-synced status
  6. Pilot with 3 shops

## 10. Open assumptions (validate with pilots)

- Barbershops and salons have a real, measurable pain from waits and no-shows. Ask each: "How many customers did you lose this week?"
- Shops will have a spare device for staff. If not, the owner's phone becomes the staff screen.
- Owners accept a monthly fee. Test one-time vs. monthly.
- Internet outages are frequent enough to justify offline mode. Ask each shop how often it drops.
- Fixed-duration services fit barbers. Some services vary a lot.
- PIN login is secure enough on a shared shop device.
- Hosting free tiers do not sleep or pause in a way that breaks a live queue. Verify before relying on them.

## 11. Working agreement (for agents and contributors)

- **Understand before coding.** Propose the simplest sound approach first. For non-trivial decisions: constraints, options, trade-offs, one recommendation.
- **Challenge weak assumptions and unnecessary complexity.** No Redis, queues, or microservices without a demonstrated need.
- **Respect the invariants in section 4.** If a change would break one, stop and flag it instead of working around it.
- **Prefer small, reviewable changes** tied to one roadmap item.
- **Required tests:** tenant isolation, offline idempotency (exactly-once after reconnect), `W-`/`A-` sequences never collide.
- **Verify before relying on** package versions, free-tier limits, and prices. Do not assume.
- **Performance target:** the customer page must stay lightweight and usable on a throttled 3G connection.
- **Do not commit secrets.** `.env` files stay out of version control.
- **Surface risks.** If something is uncertain (security, data privacy, hosting behavior), say so in the PR or message rather than guessing.

## 12. Pilot acceptance test

A full simulated day on one staff tablet, including a 30-minute internet cut. Pass criteria: staff handles the outage without asking the developer for help, and every offline action appears exactly once after reconnect.

## 13. Privacy note

Personal data (nickname, phone) is stored, so the Data Privacy Act (RA 10173) applies. Show a short privacy notice at join time and get qualified advice before going live.
