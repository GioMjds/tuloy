# Product

## Register

product

## Users

- **Customer:** Walk-in or booked client using their own phone in a browser (no install, no account). Context: waiting inside or near the shop, noisy environment, potentially weak 3G data, or no smartphone at all (staff-assisted). Job: scan QR, see queue position and estimated wait, get served without anxiety.
- **Staff (Barber / Stylist / Receptionist):** Running queue on a single shop-owned tablet or phone. Context: busy counter, wet/dirty hands, fast-paced walk-ins, occasional internet drops. Job: quick PIN login, register walk-in, call next, mark done/skip/no-show with zero lag.
- **Owner:** Shop owner managing operations on phone or laptop. Context: checking between shifts or at end of day. Job: view daily counts, update services and operating hours.
- **Admin:** Platform developer providing productized support and onboarding. Job: monitor sync health, shop status, and error logs across shops.

## Product Purpose

Tuloy is an offline-resilient queue and booking PWA built specifically for Filipino walk-in businesses (starting with barbershops and salons). It replaces paper notebooks, messy Messenger threads, and walkaway customer loss with a live, transparent queue. Success means zero lost customers to invisible waits, zero queue confusion during power or internet cuts, and effortless daily shop management.

## Brand Personality

- **Voice & Tone:** Direct, approachable, respectful, and grounded in Filipino neighborhood culture ("Tuloy na po").
- **3-Word Personality:** Utilitarian, warm, unflappable.
- **Emotional Goals:** Reassurance and calm for waiting customers; effortless control and confidence for busy staff.

## Anti-references

- **Silicon Valley SaaS Clichés:** Gradient text, floating glassmorphism cards, nested cards, decorative background grids, and gratuitous loading animations.
- **Bloated Enterprise POS:** Cluttered spreadsheets, microscopic buttons, nested dialog trees, and multi-step modal mazes.
- **Gamified Consumer Apps:** Cartoon mascots, celebratory confetti, pushy upsells, and distracting visual noise.

## Design Principles

- **Counter-ready clarity:** Interfaces must be glanceable from arm's length on a budget tablet in bright shop lighting. High visual hierarchy, clear ticket numbers, and zero ambiguity.
- **Zero-friction queueing:** Customers never download apps or create accounts. Joining takes one tap; checking status takes zero effort.
- **Respect the connection:** Built for real-world Philippine mobile connectivity. Throttled 3G lightweight payloads, instant optimistic UI, clear offline indicators, and robust local outbox queuing.
- **Filipino hospitality:** Authentic bilingual Filipino/English experience matching local shop workflows, using natural terminology (`Pila`, `Turno`, `Walk-in`, `Tuloy`).

## Accessibility & Inclusion

- **WCAG Level:** WCAG 2.1 AA compliant. Minimum 4.5:1 contrast for body text and 3:1 for large display elements.
- **Touch Ergonomics:** Generous touch targets (minimum 48×48px) suitable for fast tablet interactions and one-handed phone use.
- **Low-Bandwidth & Environmental:** Functional under direct sunlight and high ambient shop glare; minimal asset payloads for fast loading on throttled 2G/3G connections.
- **Non-Smartphone Fallback:** Staff-assisted registration ensures customers without smartphones or data can always participate.
