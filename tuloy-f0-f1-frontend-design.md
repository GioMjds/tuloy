# Tuloy Frontend: Design Reconciliation Patch (applies on top of F0/F1 scaffold)

Reconciles the F0/F1 scaffold with `DESIGN.md`, `PRODUCT.md` and your existing `web/globals.css`.
Paths use `web/src/...`; drop `src/` if your app has none.

---

## 0. What conflicted, and the decision

| #   | Conflict                                                                                                   | Decision                                                            |
| --- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Scaffold assumed `shadcn init` still to run; your `globals.css` shows it already has                       | **Skip `shadcn init`.** Only run `shadcn add` for components.       |
| 2   | Scaffold `layout.tsx` has no fonts; overwriting yours would drop the font variable                         | **Merge, don't overwrite** (§2)                                     |
| 3   | shadcn default sizes are 32–36px; DESIGN/PRODUCT require **48px** targets                                  | Override Button and Input sizes (§3)                                |
| 4   | shadcn Card/Button/Input carry `shadow-*`; DESIGN says flat by default                                     | Strip decorative shadows (§3)                                       |
| 5   | `--radius-2xl` to `--radius-4xl` compute to 18–26px; DESIGN caps at 16px                                   | Clamp in `globals.css` (§1)                                         |
| 6   | `--ink-faint`, `--muted-foreground`, `--ring` fail or miss the contrast targets                            | Fix tokens (§1)                                                     |
| 7   | Two parallel token systems (`--surface/--ink` vs shadcn `--background/--foreground`) with different values | One system (§1)                                                     |
| 8   | shadcn `Sidebar` shows at 768px+, eating 256px of a 10" tablet in portrait                                 | **Drop shadcn Sidebar**; plain `aside` at `lg` (1024px) and up (§4) |
| 9   | Scaffold said "no optimistic updates in v0"; DESIGN says optimistic feedback in 150–200ms                  | Revised policy (§6)                                                 |
| 10  | PRODUCT.md promises an offline outbox; phase-1 plan says **no offline writes in v0**                       | Keep the plan; fix PRODUCT.md (§6)                                  |
| 11  | PRODUCT.md has a **Staff PIN login**; backend has only Business Owner + Super Admin                        | Defer Staff; design for it (§6)                                     |
| 12  | Plan's `displayCode` is `A007`; DESIGN wants `A-007` / `W-007`                                             | Derive in the frontend (§6)                                         |

---

## 1. `web/globals.css` edits

**1a. One token system.** Components use shadcn's semantic tokens (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`). Your `--surface*` / `--ink*` set duplicates them with _different_ values (`--ink: #0f172a` is slate-tinted; DESIGN wants pure neutral).

- If nothing in the code uses `surface-*` / `ink-*` classes yet: **delete** those variables and their `--color-surface*` / `--color-ink*` lines in `@theme inline`.
- If something does: alias them instead.

```css
--surface: var(--background);
--surface-muted: var(--muted);
--surface-border: var(--border);
--surface-border-strong: var(--border);
--ink: var(--foreground);
--ink-muted: var(--muted-foreground);
--ink-faint: var(--muted-foreground); /* old value failed AA */
```

**1b. Contrast fixes** (ratios are approximate; confirm with a checker)

```css
:root {
  /* was oklch(0.556 0 0) ≈ 4.7:1. DESIGN asks for ≥7:1 body text. */
  --muted-foreground: oklch(0.45 0 0); /* ≈ 7.4:1 on white */

  /* was oklch(0.708 0 0) ≈ 2.6:1, below the 3:1 minimum for focus indicators */
  --ring: var(--primary);
}
```

`--ink-faint` (`#94a3b8`, about 2.6:1) must never be used for text; see the alias above.

**1c. Radius cap (DESIGN: nothing over 16px).** Add inside `@theme inline`, after the existing radius lines:

```css
--radius-2xl: 1rem;
--radius-3xl: 1rem;
--radius-4xl: 1rem;
```

`rounded-xl` (14px) stays valid. Use `rounded-full` only for dots and avatars, never for cards or inputs.

**1d. Dark mode.** The scaffold cuts dark mode from v0, and DESIGN.md doesn't ask for it (it targets sunlight-readable light surfaces). Delete the `.dark { ... }` block (and, if unused, the `@custom-variant dark` line) to avoid dead tokens. Its primary (`oklch(0.60 0.16 269)` with white text) likely fails 4.5:1 anyway. Restore from git when you actually need it.

**1e. Amber is a fill, never text on white.** Status pills use `bg-accent-amber-subtle text-accent-amber-foreground` (or solid `bg-accent-amber` with `text-accent-amber-foreground`).

---

## 2. `web/src/app/layout.tsx`: merge, don't overwrite

Your `globals.css` has `--font-sans: var(--font-sans)` in `@theme inline`. That only resolves if `next/font` sets `--font-sans` on `<html>`. Keep whatever your current layout does for fonts (shadcn's init usually generates it) and graft the scaffold's providers onto it. The target shape:

```tsx
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { QueryProvider } from '@/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import './globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-sans' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'Tuloy',
  description: 'Pila at booking para sa mga lokal na negosyo',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html
      lang={locale}
      className={cn('font-sans', sans.variable, mono.variable)}
    >
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>{children}</QueryProvider>
          <Toaster richColors position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

If you already use Inter or a different variable name, keep yours; only the `--font-sans` variable name must match.

---

## 3. shadcn component overrides (edit the files in `web/src/components/ui/`)

Class strings vary by shadcn version, so edit the existing variants rather than pasting whole files.

**Button** (`button.tsx`), in the cva `size` variants:

| Variant   | Set to                                                                                     |
| --------- | ------------------------------------------------------------------------------------------ |
| `default` | `h-12 px-5 text-base`                                                                      |
| `sm`      | `h-12 px-4 text-sm` (no sub-48px size exists; keeps existing `size="sm"` call sites valid) |
| `lg`      | `h-14 px-6 text-base`                                                                      |
| `icon`    | `size-12`                                                                                  |

**Input** (`input.tsx`): `h-12 text-base` (also stops iOS from zooming the page on focus; it zooms below 16px). Remove `md:text-sm` if present.

**Remove decorative shadows.** Find them:

```bash
rg "shadow-" web/src/components/ui
```

- `card.tsx`: remove `shadow-sm`.
- `button.tsx` (outline variant) and `input.tsx`: remove `shadow-xs`.
- **Keep** shadows on `dialog`, `alert-dialog`, `dropdown-menu`, `popover` and `sonner`. DESIGN allows raised state for floating layers.

**No nested cards.** The login card is a single card, which is fine. Never put a `Card` inside a `Card` (queue ticket cards sit directly on the page background, not inside a wrapper card).

**Patches to scaffold components (48px rule):**

```tsx
// locale-switcher.tsx: drop size="sm" (Button default is now 48px)
<Button variant="ghost" disabled={pending} /* ... */>

// user-menu.tsx: give the trigger a 48px hit area
<DropdownMenuTrigger aria-label={user.email} className="grid size-12 place-items-center rounded-full">
  <Avatar className="size-9">...</Avatar>
</DropdownMenuTrigger>

// bottom-nav.tsx: label text-xs → text-sm (arm's-length readability); keep min-h-14
// and change md:hidden → lg:hidden on the <nav> (see §4)
```

---

## 4. Shell: replace the shadcn Sidebar with a plain `aside`

A 10" tablet in portrait is about 800px wide. With shadcn's `Sidebar` at the `md` breakpoint (768px), a 256px sidebar leaves roughly 540px for the queue board. Instead: **bottom nav below 1024px, sidebar at 1024px and up.** A plain `aside` is also less code than fighting the shadcn sidebar's hardcoded `md:` classes.

Do **not** run `shadcn add sidebar`. If you already added it, delete `components/ui/sidebar.tsx`.

`web/src/components/layout/app-sidebar.tsx` (replaces the previous version)

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { isActive, navByVariant } from '@/config/nav';
import { cn } from '@/lib/utils';

export function AppSidebar({ variant }: { variant: 'owner' | 'admin' }) {
  const t = useTranslations();
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
      <div className="flex h-14 items-center border-b px-4 font-semibold">
        {t('common.appName')}
      </div>
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navByVariant[variant].map(({ href, labelKey, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-medium',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  )}
                >
                  <Icon className="size-5" />
                  {t(labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
```

`web/src/components/layout/dashboard-shell.tsx` (replaces the previous version)

```tsx
'use client';
import { useEffect, type ReactNode } from 'react';
import { AppSidebar } from './app-sidebar';
import { BottomNav } from './bottom-nav';
import { ConnectionStatus } from './connection-status';
import { LocaleSwitcher } from './locale-switcher';
import { UserMenu } from './user-menu';
import { useUiStore } from '@/stores/ui-store';

export function DashboardShell({
  variant,
  children,
}: {
  variant: 'owner' | 'admin';
  children: ReactNode;
}) {
  useEffect(() => {
    useUiStore.persist.rehydrate();
  }, []);

  return (
    <div className="flex min-h-dvh">
      <AppSidebar variant={variant} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-2 border-b px-4">
          <ConnectionStatus />
          <LocaleSwitcher />
          <UserMenu />
        </header>
        {/* pb-24 clears the fixed bottom nav below lg */}
        <main className="flex-1 p-4 pb-24 lg:p-6 lg:pb-6">{children}</main>
        <BottomNav variant={variant} />
      </div>
    </div>
  );
}
```

Also in the install step, change the `shadcn add` list to: `button input label form card badge separator skeleton sonner dropdown-menu avatar` (no `sidebar`).

---

## 5. Fonts, numbers and copy

- **Queue numbers.** Use `tabular-nums font-bold` (Tailwind) and a size you can read at 1 meter: `text-6xl` or larger for the customer's position and the "now serving" number. Build one `QueueNumber` component in F2 and use it everywhere so sizing stays consistent (the Arm's Length Rule).
- **Bilingual terms.** DESIGN says to preserve `Pila`, `Turno`, `Walk-in`, `Tuloy`. In `fil.json`, never translate "Walk-in". Use "Turno" for a customer's turn. `en.json` can keep "Queue", but keep "Walk-in" as is. Add these keys when F2 starts: `ticket.turn` ("Turn" / "Turno"), `source.WALK_IN` ("Walk-in" in both).
- **Voice.** PRODUCT.md sets the tone as "Tuloy na po". Use "po" in customer-facing Filipino strings (shop page, join flow, ticket view). Owner UI strings can stay neutral.
- **Payload budget (2G/3G).** After F3, check the `next build` output and set a budget for the public ticket page (a reasonable target is under 150 KB of first-load JS, gzipped). Load `socket.io-client` and the QR library only on the routes that need them (`next/dynamic`), not in the root providers.

---

## 6. Product and plan conflicts that need your call

### 6.1 Staff PIN login (PRODUCT.md "Staff" user) vs. two backend roles

| Option | What                                                                             | Verdict                                                     |
| ------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| A      | v0: the Business Owner account is logged in on the counter tablet; no Staff role | **Recommended for the demo.** Matches the 12h session plan. |
| B      | Add a `STAFF` role plus per-staff PIN, with device binding and PIN rate limiting | 2–3 days of backend work; do after a shop says yes          |

Trade-off of A: staff on the shared tablet can reach Services and Settings. Acceptable for a demo; not for production.

**Frontend prep that costs almost nothing:** keep `roleSchema` and `homeFor` as maps/enums (add `'STAFF'` later without touching middleware structure), and keep the owner board at `/dashboard` so a future Staff role reuses it with a reduced nav.

### 6.2 Offline outbox

PRODUCT.md says "robust local outbox queuing"; the phase-1 plan says "no sync engine and no offline writes in v0." **Keep the plan.** v0 offline behavior:

- Reads: cached ticket and queue snapshot (F3).
- Writes: owner action buttons **disable** with a clear "Offline" state and message rather than failing silently.
- `ConnectionStatus` already covers the indicator.

Then edit PRODUCT.md so agents don't build the outbox early. Change the principle to something like: _"Respect the connection: lightweight payloads, instant feedback, clear offline indicators. Offline write queueing is post-v0."_ The "Admin: monitor sync health" line should also become post-v0 (there is no sync engine to monitor). For v0 the admin stays at shops + owners.

### 6.3 Optimistic UI (revises my earlier "no optimistic updates")

| Action                                                       | Policy                                                                                                                                                                                                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any button tap                                               | Pressed/pending visual state within 150ms, button locked until the response (prevents double taps)                                                                                                                                           |
| Owner transitions (call / serve / complete / skip / no-show) | **Optimistic cache update with rollback on error.** The shared transition map makes invalid jumps impossible client-side, and the backend still rejects bad ones. Implement with TanStack `onMutate` / `onError` / `onSettled → invalidate`. |
| Customer join                                                | **No optimistic number.** The number comes from the server counter; show an immediate pending state, then the real ticket.                                                                                                                   |

This lands in F2; F0/F1 are unaffected.

### 6.4 Ticket codes: `A-007` / `W-007`

Your DESIGN rule: `W-` for staff walk-ins, `A-` for online/QR joins. The plan's data model stores `displayCode` as `A007`. Recommend deriving it in the frontend:

```ts
export const formatTicketCode = (
  source: 'REMOTE' | 'WALK_IN',
  number: number,
) => `${source === 'WALK_IN' ? 'W' : 'A'}-${String(number).padStart(3, '0')}`;
```

Both sources share one counter per business per day, so `W-003` and `A-004` interleave in a single sequence. Nothing becomes ambiguous. If you'd rather keep a single source of truth, change `displayCode` generation in the Queue module instead. Don't do both.

### 6.5 Status colors (F2 prep, from DESIGN.md)

| Status              | Treatment                                                     |
| ------------------- | ------------------------------------------------------------- |
| `WAITING`           | neutral (`bg-secondary text-secondary-foreground`)            |
| `CALLED`, `SERVING` | amber (`bg-accent-amber-subtle text-accent-amber-foreground`) |
| `DONE`              | green subtle                                                  |
| `SKIPPED`           | muted neutral                                                 |
| `NO_SHOW`           | red subtle                                                    |

Primary indigo is reserved for actions. Every status pill also carries a text label (and an icon), so color is never the only signal.

---

## 7. Additions to `AGENTS.md` / `CLAUDE.md` / `GEMINI.md`

```md
## Design rules (web/)

- Use shadcn semantic tokens (bg-background, text-foreground, text-muted-foreground, border-border). Do not use surface-_ / ink-_ classes.
- Every tap target is at least 48x48px. Inputs are h-12 text-base.
- Flat by default: no decorative shadows (dialogs, menus and toasts excepted). No glassmorphism, no gradient text, no nested cards, no side-stripe borders.
- No radius above 16px on cards or inputs (rounded-full only for dots and avatars).
- Status colors: amber = CALLED/SERVING, green = DONE, red = NO_SHOW, neutral = WAITING/SKIPPED. Amber is a fill, never text on white.
- Queue numbers: tabular-nums, bold, readable at 1 meter. Keep Pila / Turno / Walk-in untranslated per DESIGN.md.
- No offline write queue in v0. Disable owner actions when offline.
```

---

## 8. Checklist deltas (add to the F0/F1 acceptance lists)

- [ ] `rg "shadow-" web/src` shows only dialog, dropdown, popover and sonner files
- [ ] `rg "rounded-(2xl|3xl|4xl)" web/src` returns nothing
- [ ] Every interactive element on `/login` and in the dashboard shell measures at least 48×48px in devtools (locale switcher and user menu included)
- [ ] 800px-wide viewport (10" tablet, portrait): no sidebar, bottom nav visible, full-width content
- [ ] 1024px and up: sidebar visible, bottom nav hidden
- [ ] Muted text (descriptions, labels) passes 7:1 against white in a contrast checker
- [ ] Tabbing through the login form shows a clearly visible indigo focus ring
- [ ] Fonts render as Geist (check the `<html>` classes include the `--font-sans` variable)
