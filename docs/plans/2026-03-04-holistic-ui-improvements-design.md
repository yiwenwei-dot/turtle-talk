# Turtle Talk — Holistic UI/UX Improvements

**Date:** 2026-03-04
**Branch:** feature/home-page-ui-improvements
**Approach:** Horizontal sweep — targeted improvements across every page

## Goal

Lift the quality of both the child-facing and parent-facing UX holistically. No new features,
no rearchitecting. Fill in rough edges, fix broken wiring, add simple safety nets, and
improve feedback/polish throughout. Simplicity is the guiding principle.

---

## Child Area

### Home page (`app/page.tsx`)
- Wire up the existing sky animation (CSS `home-hero` already defined)
- Add a welcoming sub-headline beneath "Talk to Tammy"
- Show a streak/last-session nudge from localStorage if available
- Increase turtle emoji size and prominence as the hero visual

### Talk page (`app/talk/page.tsx`)
- **Remove** debug telemetry `useEffect` (hardcoded endpoint, lines ~95–97)
- **Fix turtle mood** — wire the `mood` field returned by `/api/talk` to `TurtleCharacter`'s `mood` prop (currently always `"idle"`)
- Add VAD state visual feedback — a pulsing glow ring around the turtle when `isListening`
- Improve button press feedback — subtle scale/ripple on tap

### Missions page (`app/missions/page.tsx`)
- Add difficulty label (easy / medium / stretch) to mission cards
- Improve empty-state: add emoji illustration + slightly more actionable message
- "Done!" button: ensure the success animation (✓ flash) is visually satisfying

### Appreciation / Tree (`app/appreciation/page.tsx`, `DecorationBox.tsx`)
- Add scroll indicator to decoration picker modal when items overflow viewport
- Improve guest-mode messaging — clear "Log in to save your tree" CTA instead of vague note
- Tighten wish unlock toast animation

### Journal (`app/journal/page.tsx`)
- Add a live duration counter ("0:12 ▶") while recording
- Add "Your recording:" label above the `<audio>` element

---

## Parent Area

### ChildrenModal (`app/components/parent/ChildrenModal.tsx`)
- Add confirm dialog ("Remove [Name]? This can't be undone.") before executing child removal
- Add copy-to-clipboard icon next to each child's login code

### Wish list (in `app/appreciation/page.tsx` or parent context)
- Add confirm dialog before deleting a wish item

### Loading states
- Replace "Loading…" text in `WeeklySummary` and `DinnerQuestions` with skeleton placeholder bars (gray shimmer via CSS animation)

### Co-parent button (`app/components/parent/ParentHeader.tsx`)
- Remove misleading "Coming soon" modal — replace with a disabled/grayed button + tooltip badge

### BookCard modal (`app/components/parent/BookCard.tsx`)
- Add "Search online →" link (Google or Amazon search URL) in the book detail modal

### DinnerQuestions (`app/components/parent/DinnerQuestions.tsx`)
- Render the `theme` field as a small category label on each question

---

## Out of Scope

- New pages or features
- Design system token refactor
- Co-parent full implementation
- Test coverage changes (unless a fix breaks existing tests)

---

## Success Criteria

- No debug/telemetry code visible in production bundle
- Turtle mood changes dynamically during conversation
- Destructive actions (remove child, delete wish) have a confirmation step
- Login codes are copyable in one tap
- Every "Loading…" text replaced with a skeleton
- Recording duration visible while journaling
- Home page feels welcoming and alive, not bare
