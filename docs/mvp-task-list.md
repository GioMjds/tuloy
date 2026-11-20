# MVP Task List

Goal: deployable v1 (no offline outbox, booking, or PWA). Do in order; each step is shippable on its own.

## 1. Baseline (verify before building)

- [ ] Run `pnpm --dir api test` and `pnpm --dir api build`; fix failures.
- [ ] Run `pnpm --dir web build` and lint; fix failures.
- [ ] Fill `.env.example` (api and web) with variable names only.
- [ ] Commit or discard the pending `.gitignore` change and deleted plan doc.

## 2. Businesses API

- [x] `GET /businesses/:slug` (public): name, slug, hours, active services.
- [x] Implement `BusinessesService` with Prisma; 404 on unknown slug.
- [x] Unit test for the service and controller.
- [x] Add `web/lib/endpoints/businesses.ts` (Zod schema) and replace the placeholder schema in `web/app/(public)/b/[slug]/page.tsx`.

## 3. Realtime

- [ ] Finish `api/src/queue/queue.gateway.ts`: room per business, emit on join, call, skip, complete, no-show.
- [ ] Delete the empty `api/src/gateway/*` files.
- [ ] Web hook: subscribe to the room and invalidate queue query keys; polling fallback.

## 4. Customer flow

- [ ] Shop page: services list and "Join queue" form (nickname, optional phone, privacy notice).
- [ ] Live ticket page: number, position, status, live updates (uses the ticket token).
- [ ] Filipino and English strings for all new copy.

## 5. Staff and owner queue screen

- [ ] Owner dashboard queue list (uses `useOwnerQueueQuery`).
- [ ] Walk-in registration (`W-` numbering).
- [ ] Call, skip, done, no-show actions; disabled when offline.
- [ ] Status colors per AGENTS.md.

## 6. Public display

- [ ] Read-only "Now serving" page per shop, realtime, readable at 1 meter.

## 7. Owner stats

- [ ] `GET` today's counts (waiting, done, no-show) and show on the dashboard.

## 8. Deploy

- [ ] GitHub Actions: lint, test, build on PR.
- [ ] Neon Postgres, run migrations and seed.
- [ ] API on Railway or Render (always-on, WebSocket).
- [ ] Web on Vercel; `app.` and `api.` subdomains of one domain.
- [ ] Phone smoke test over HTTPS.

## Later

Staff PIN login, booking, admin console, offline outbox, PWA.
