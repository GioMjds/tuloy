---
name: Tuloy
description: Queue and appointment booking PWA for Filipino walk-in businesses
---

<!-- SEED: re-run $impeccable document once there's code to capture the actual tokens and components. -->

# Design System: Tuloy

## Overview

**Creative North Star: "The Neighborhood Barber's Clipboard"**

Tuloy is built for high-speed counter execution under real-world conditions: bright daylight reflections, wet hands, busy background chatter, and unstable 3G networks. The visual language merges the glanceable status ergonomics of Linear, the large touch-surface confidence of Square POS, and the accessible everyday clarity of GCash. Every screen exists to eliminate waiting anxiety for customers and cognitive friction for staff.

The system is strictly utilitarian and responsive. It rejects bloated legacy POS software (cramped tables, microscopic buttons, nested dialog mazes) and Silicon Valley SaaS slop (gradient hero text, floating glassmorphism cards, nested cards, and decorative animations).

**Key Characteristics:**

- High-contrast, sunlight-readable surfaces designed for counter tablets and mobile browsers.
- 48px+ generous touch targets for rapid, error-free tapping during peak rushes.
- Zero non-essential decoration: typography, contrast, and status colors do all the communicative work.
- Responsive, instant interaction feedback (150–200ms) with zero blocking transition delays.

## Colors

The palette operates under a strict Restrained color strategy. Pure neutral backgrounds provide maximum contrast, an anchor deep indigo/violet (`oklch(0.48 0.16 269)`) serves primary actions, and an amber accent highlights urgent queue states.

**The Restrained Rule.** The primary brand accent and status indicators never exceed 10% of any screen surface. Backgrounds remain pure neutral for maximum legibility under shop lighting. Warmth is carried by clarity and voice, not tinted surfaces.

- **Primary:** Deep Indigo / Violet (`oklch(0.48 0.16 269)`) [to be resolved into exact code tokens during implementation]
- **Accent:** Amber Queue Accent [to be resolved during implementation for `serving`, `now-calling` state pills]
- **Neutral:** Pure White / Neutral Gray scale [to be resolved during implementation; body text ≥7:1 contrast]

## Typography

A single robust sans-serif (Inter / Geist Sans) carries all roles from display headings to counter PIN pads and queue ticket numbers.

**The Arm's Length Rule.** Any information staff must read from behind the counter (ticket prefix, position number, service name) must remain distinct at a distance of 1 meter on a budget 10-inch tablet.

- **Display & Queue Numbers:** Bold tabular numbers with high x-height [font pairing to be chosen at implementation].
- **Headlines & Titles:** Semi-bold sans for shop headers and section titles.
- **Body & Labels:** Regular/Medium sans with balanced line length (65–75ch for prose; dense for tabular queue lists).

## Elevation

Surfaces are flat by default. Depth is conveyed strictly through subtle 1px border definition and tonal surface shifts, never decorative drop shadows. Raised states appear only to elevate active dialogs or floating status banners.

**The Flat-By-Default Rule.** Never apply blur shadows as decoration. A single solid border or crisp 1-2px tonal outline handles surface separation.

## Do's and Don'ts

### Do:

- **Do** maintain strict WCAG AA contrast (≥4.5:1 for body text, ≥3:1 for large display elements).
- **Do** ensure all tap targets on the staff screen are at least 48×48px.
- **Do** format queue tickets with unambiguous prefixes (`W-` for staff walk-ins, `A-` for online/QR joins).
- **Do** provide immediate optimistic visual feedback on tap within 150–200ms.
- **Do** preserve natural bilingual Filipino/English terminology (`Pila`, `Turno`, `Walk-in`, `Tuloy`).

### Don't:

- **Don't** use gradient text (`background-clip: text`), decorative background grids, or diagonal stripes.
- **Don't** use glassmorphism, background blurs, or nested cards.
- **Don't** use side-stripe borders (`border-left` or `border-right` > 1px) on cards, list items, or callouts.
- **Don't** over-round cards or inputs (`border-radius` > 16px).
- **Don't** use microscopic touch targets or dense legacy POS-style spreadsheets.
- **Don't** orchestrate multi-second page load animations that delay staff from calling the next customer.
