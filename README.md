# Tuloy

> **Tuloy na po.** Queue and appointment booking for Filipino walk-in businesses: barbershops, salons, clinics, and more.

![status](https://img.shields.io/badge/status-in%20development-orange)
![stack](https://img.shields.io/badge/stack-Next.js%20%7C%20NestJS%20%7C%20PostgreSQL-teal)
![pwa](https://img.shields.io/badge/PWA-offline--capable-green)

Tuloy replaces the notebook, the Messenger thread, and the "bukas na lang po" with a live queue. Customers scan a QR code to join. Staff run the queue from one shop device. Owners see the day at a glance. It keeps working when the shop's internet doesn't.

> Formerly developed under the working name **Takda**.

---

## Table of Contents

- [Why Tuloy](#why-tuloy)
- [Users and Roles](#users-and-roles)
- [Features](#features)
- [How Queueing Works](#how-queueing-works)
- [Offline Design](#offline-design)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Testing](#testing)
- [Deployment](#deployment)
- [Pilot Checklist](#pilot-checklist)
- [Roadmap](#roadmap)
- [Privacy](#privacy)
- [Author](#author)
- [License](#license)

---

## Why Tuloy

Small walk-in businesses lose customers to long waits and no-shows, and manage it with paper or chat apps. Tuloy is built for that reality:

- **No app install for customers.** A QR code or link is enough.
- **No smartphone required.** Staff can register any customer at the counter.
- **Works on weak connections.** Lightweight pages, polling fallback, and an offline mode for staff.
- **Filipino-first.** Filipino/English UI, ₱ context, and workflows that match how local shops actually run.

## Users and Roles

| Role         | Who                      | Core jobs                                         | Device                               |
| ------------ | ------------------------ | ------------------------------------------------- | ------------------------------------ |
| **Customer** | Walk-in or booked client | Join the queue, view position, book a slot        | Own phone, browser only, no login    |
| **Staff**    | Barber, receptionist     | Register walk-ins, call next, skip, done, no-show | Shop tablet or phone (installed PWA) |
| **Owner**    | Shop owner               | Manage services, hours, staff; view daily counts  | Phone or laptop                      |
| **Admin**    | Platform support         | Onboard shops, monitor sync health, troubleshoot  | Laptop                               |

## Features

### MVP

- [ ] Shop onboarding (done by admin): shop, services, hours, staff accounts
- [ ] Staff login with quick PIN
- [ ] Walk-in registration (`W-` numbering)
- [ ] QR join for customers (`A-` numbering) with a live ticket page
- [ ] Staff actions: call next, skip, done, no-show
- [ ] Public display page (read-only "Now serving")
- [ ] Booking with fixed-duration services, including staff-assisted booking
- [ ] Ticket and booking `source` tracking (`staff`, `qr`, `online`)
- [ ] Filipino / English toggle
- [ ] Owner dashboard: today's counts, services, hours
- [ ] Admin console: shops list, last-synced status, error log
- [ ] Staff offline mode with outbox sync

### Later (only when a pilot asks)

GCash / PayMongo deposits, SMS or push notifications, thermal ticket printing, self-service kiosk mode, multi-branch support, loyalty ("suki") points, advanced reports.

## How Queueing Works

Two independent number sequences prevent collisions when the staff device is offline:

| Prefix | Issued by                              | Example |
| ------ | -------------------------------------- | ------- |
| `W-`   | Staff device (walk-ins, works offline) | `W-012` |
| `A-`   | Server (QR / online joins)             | `A-007` |

**Ticket lifecycle (planned):**

```
waiting -> called -> serving -> done
              |         |
              v         v
           skipped   no_show        (cancelled: customer or staff)
```

The **server is the authority** on state transitions. If an offline action no longer makes sense after sync (for example, calling a ticket that was cancelled online), it is rejected and flagged on the staff screen instead of silently dropped.

## Offline Design

| Role         | Offline behavior                                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Customer** | Cannot join offline. A cached ticket page shows the last known position with a "last updated" badge. Customers without data are registered by staff.                                       |
| **Staff**    | Cached queue; create walk-ins (`W-`), call next, mark done/skip/no-show. Actions queue in a local **outbox** and sync on reconnect. Visible Offline / Synced indicator with pending count. |
| **Owner**    | Read-only cached dashboard. Edits require internet.                                                                                                                                        |
| **Admin**    | Online only. Sees per-shop last-synced time.                                                                                                                                               |

**Sync rules**

1. Every offline action gets a client-generated UUID; API endpoints are idempotent on it.
2. Only the staff device issues numbers offline (`W-`).
3. Server state wins on conflict; rejected actions are surfaced to staff.
4. Offline scope is limited to walk-in, call, done, skip, no-show. Service and booking edits require internet in v1.

Out of scope for v1: an offline public display (it shows stale data with a banner).

## Architecture

```
 Customer phone      Staff tablet (PWA)      Owner / Admin
   (browser)         + IndexedDB outbox         (browser)
        \                    |                     /
         \                   |                    /
          +------- HTTPS + WebSocket (Socket.IO) -+
                             |
                       NestJS API  ----  PostgreSQL
                    (REST + WS gateway)    (Prisma)
```

- Single API instance and single database. No Redis, queues, or microservices until a real bottleneck appears.
- Every query is scoped by `shopId`.
- Audit log for staff actions.

## Tech Stack

| Layer         | Technology                                                         |
| ------------- | ------------------------------------------------------------------ |
| Frontend      | Next.js (App Router), React, TypeScript, Tailwind CSS              |
| PWA / Offline | Serwist (service worker), Dexie (IndexedDB outbox)                 |
| Client data   | TanStack Query, zod, react-hook-form                               |
| Realtime      | Socket.IO (WebSocket with polling fallback)                        |
| Backend       | NestJS, TypeScript                                                 |
| Database      | PostgreSQL + Prisma                                                |
| Auth          | JWT, argon2-hashed PINs                                            |
| Testing       | Vitest, Playwright                                                 |
| Monitoring    | Sentry                                                             |
| Hosting       | Vercel (web), always-on host for API + WebSocket, managed Postgres |

## Project Structure

> Adjust to match the actual repository layout.

```
tuloy/
|-- apps/
|   |-- web/            # Next.js PWA (customer, staff, owner, admin, display)
|   `-- api/            # NestJS API + WebSocket gateway
|-- docker-compose.yml  # Local PostgreSQL
|-- pnpm-workspace.yaml
|-- package.json
`-- README.md
```

## Getting Started

### Prerequisites

- Node.js (current LTS) and pnpm (`corepack enable`)
- Docker Desktop (for local PostgreSQL)
- Git
- A real Android phone for PWA, offline, and slow-network testing

### Setup

```bash
# 1. Clone and install
git clone <your-repo-url> tuloy
cd tuloy
pnpm install

# 2. Start the database
docker compose up -d

# 3. Configure environment (see below)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 4. Run migrations (and seed, if a seed script exists)
pnpm --filter api prisma migrate dev

# 5. Start everything
pnpm dev
```

The web app runs on `http://localhost:3000` and the API on `http://localhost:4000` (adjust to your ports).

### Testing the PWA on a phone

Service workers work on `localhost`, but a phone needs HTTPS. Use a Vercel preview deployment, or Next.js's experimental HTTPS dev option (check the current Next.js docs).

## Environment Variables

**`apps/api/.env`**

| Variable       | Description                                         |
| -------------- | --------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string                        |
| `JWT_SECRET`   | Secret for signing tokens (use a long random value) |
| `CORS_ORIGIN`  | Allowed web origin(s)                               |
| `PORT`         | API port                                            |
| `SENTRY_DSN`   | Optional, error reporting                           |

**`apps/web/.env.local`**

| Variable              | Description               |
| --------------------- | ------------------------- |
| `NEXT_PUBLIC_API_URL` | Base URL of the API       |
| `NEXT_PUBLIC_WS_URL`  | WebSocket URL of the API  |
| `SENTRY_DSN`          | Optional, error reporting |

Never commit real secrets. Keep `.env` files out of version control.

## Scripts

| Command                                  | Description                                       |
| ---------------------------------------- | ------------------------------------------------- |
| `pnpm dev`                               | Run web and API in development                    |
| `pnpm build`                             | Build all apps                                    |
| `pnpm lint`                              | Lint all apps                                     |
| `pnpm test`                              | Run unit tests                                    |
| `pnpm --filter web exec playwright test` | Run end-to-end tests, including offline scenarios |
| `pnpm --filter api prisma migrate dev`   | Create and apply a migration                      |

> Script names are placeholders; align them with the `package.json` files.

## Testing

- **Unit:** Vitest for services, validation, and numbering logic.
- **End-to-end:** Playwright, including offline tests via `context.setOffline(true)`.
- **Required tests:**
  - Shop A can never read shop B's tickets (tenant isolation).
  - Offline actions sync **exactly once** after reconnect (idempotency).
  - `W-` and `A-` sequences never collide.

## Deployment

| Piece           | Target                                     | Notes                                                        |
| --------------- | ------------------------------------------ | ------------------------------------------------------------ |
| Web             | Vercel                                     | Preview deployments for phone testing                        |
| API + WebSocket | Railway, Render, or a small VPS            | Needs an always-on server. Avoid hosts that sleep when idle. |
| Database        | Managed PostgreSQL (Neon or Supabase)      | Verify free-tier limits and pause behavior                   |
| Domain          | `app.` and `api.` subdomains of one domain | Keeps auth cookies same-site and CORS simple                 |

CI (GitHub Actions): lint, test, build on every pull request.

## Pilot Checklist

Before a shop goes live, run a full simulated day on **one staff tablet**:

- [ ] Staff registers walk-ins and runs the queue without help
- [ ] Customers join via QR on a throttled connection
- [ ] A 30-minute internet cut mid-day: staff keeps working
- [ ] After reconnect, every offline action appears exactly once
- [ ] Public display shows correct "Now serving"
- [ ] Owner can read the day's counts
- [ ] A new staff member learns the screen in about 10 minutes

## Roadmap

1. Rebrand to Tuloy and verify existing flows
2. Source tracking and `W-` / `A-` numbering
3. Public display page
4. Offline outbox for staff
5. Admin console with last-synced status
6. Pilot with 3 shops (barbershops and salons first)
7. Based on pilot demand: deposits, notifications, printing, kiosk mode, then a second niche (clinics)

## Privacy

Tuloy collects minimal customer data (a nickname and an optional phone number). A short privacy notice is shown at join time. Because personal data is stored, review obligations under the Philippine Data Privacy Act (RA 10173) before going live.

## Author

**Gio**
Portfolio: [giomjds.vercel.app](https://giomjds.vercel.app)
GitHub: [@GioMjds](https://github.com/GioMjds)

## License

TBD. Choose a license (or keep the repository private and proprietary) before sharing publicly.
