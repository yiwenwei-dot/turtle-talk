# Design: Mission Decoration Rewards

**Date:** 2026-03-05
**Status:** Approved

## Summary

Each completed mission awards the child a decoration (theme emoji) they can manually place on their tree in `/appreciation`. No login required — uses localStorage device ID and the child's name from personal memory (fallback: "Explorer").

## Goals

- Demo-ready flow: Talk to Shelly → get a mission → complete it → earn a decoration → place it on the tree
- No authentication required at any point in this flow
- Logged-in experience (existing server API path) is untouched

## Data Model

**New localStorage key:** `tt_placed_missions_<deviceId>` → `string[]`

Stored as a list of mission IDs that have been placed on the tree. Everything else is derived:

```
unplacedDecorations = completedMissions
  .filter(m => !placedMissionIds.includes(m.id))
  .map(m => ({ id: m.id, emoji: THEME_EMOJI[m.theme ?? 'curious'] }))

placedDecorations = placedMissionIds
  .map((id, i) => ({ emoji: THEME_EMOJI[missionById[id]?.theme ?? 'curious'], slotId: `slot-${i+1}` }))
```

**Child name:** Already stored in localStorage by `usePersonalMemory` when Shelly learns it. Fallback to `"Explorer"` if absent.

**Theme → Emoji map (existing):**
- brave=🦁, kind=💛, calm=🌊, confident=⭐, creative=🎨, social=🤝, curious=🔍

## Decoration Flow

1. Child talks to Shelly → picks a mission → mission saved as `active`
2. Child completes mission → taps "Done!" → mission transitions to `completed`
3. Completed mission with theme emoji appears in the **rewards box** on `/appreciation`
4. Child taps decoration → taps "Put on tree" → `placeDecoration(missionId)` fires
5. Mission ID added to `tt_placed_missions_<deviceId>` → decoration appears on tree SVG

## UI Changes

### `/appreciation` page

**Guest path (no login):**
- Header title: `"{childName ?? 'Explorer'}'s Tree"`
- Subtitle: `"Decorate it with your mission rewards!"`
- Tree renders from `useLocalTree` (localStorage, no API)
- Decoration picker shows unplaced mission-earned decorations
- Empty rewards box: `"Complete a mission to earn your first decoration!"`
- Wish list section: hidden; replaced by `"Complete more missions with Shelly!"`

**Logged-in path:** unchanged — existing `useTree` + `useEncouragement` + server APIs

### `DecorationBox` component

Accepts `items: { id: string; emoji: string }[]` — compatible shape for both paths (encouragement items from server, or mission-earned items from localStorage).

## Files to Change

| File | Type | Change |
|------|------|--------|
| `app/hooks/useLocalTree.ts` | New | localStorage tree state; `placeDecoration(missionId)`; derives placed/unplaced from `useMissions` |
| `lib/db/providers/localStorage.ts` | Edit | Add `getPlacedMissionIds` / `savePlacedMissionIds` helpers (not on `DatabaseService` interface) |
| `app/appreciation/page.tsx` | Edit | Guest path uses `useLocalTree` + `usePersonalMemory`; shows child name / "Explorer" |
| `app/appreciation/DecorationBox.tsx` | Edit | Widen `items` prop type to `{ id: string; emoji: string }[]` |

## Out of Scope

- No new routes
- No changes to `useMissions`, `useTree`, `useEncouragement`, server APIs, `ChristmasTreeSVG`, `MissionsPage`, `BottomNav`, or auth flow
- No wish-list unlocking for the guest/localStorage path
