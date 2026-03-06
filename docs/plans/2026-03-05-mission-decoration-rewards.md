# Mission Decoration Rewards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Each completed mission awards a theme-emoji decoration the child can manually place on the `/appreciation` tree — no login required, localStorage-backed.

**Architecture:** Two new exported functions in `localStorage.ts` store placed mission IDs. A new `useLocalTree` hook derives tree state (placed decorations, unplaced rewards) from those IDs + existing `useMissions`. The `/appreciation` page branches on `isGuest`: guests get the localStorage path, logged-in users keep the unchanged server-API path.

**Tech Stack:** React hooks, localStorage, existing `useMissions` + `usePersonalMemory`, `ChristmasTreeSVG` (unchanged), Jest + `@testing-library/react`.

---

### Task 1: Add localStorage helpers for placed mission IDs

**Files:**
- Modify: `lib/db/providers/localStorage.ts`

The `key()` and `readJSON`/`writeJSON` helpers already exist in this file — we just export two new functions that use them. They are NOT added to the `DatabaseService` interface (localStorage-only).

**Step 1: Add the two exported functions**

At the bottom of `lib/db/providers/localStorage.ts`, before the closing of the file, add:

```typescript
// ---------------------------------------------------------------------------
// Tree decoration helpers (localStorage-only, not on DatabaseService interface)
// ---------------------------------------------------------------------------

export function getPlacedMissionIds(childId: string): string[] {
  return readJSON<string[]>(key(childId, 'placed-missions'), []);
}

export function savePlacedMissionIds(childId: string, ids: string[]): void {
  writeJSON(key(childId, 'placed-missions'), ids);
}
```

Note: `key('default', 'placed-missions')` resolves to `'turtle-talk-placed-missions'` (the LEGACY_KEYS map doesn't contain 'placed-missions', so the fallback `turtle-talk-${suffix}` applies). For any real deviceId it becomes `turtle-talk-<deviceId>-placed-missions`.

**Step 2: Verify no TypeScript errors**

```bash
cd C:\Users\iankt\Projects\turtle-talk && npx tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: no errors (or only pre-existing errors unrelated to this file).

**Step 3: Commit**

```bash
git add lib/db/providers/localStorage.ts
git commit -m "feat(db): add getPlacedMissionIds/savePlacedMissionIds localStorage helpers"
```

---

### Task 2: Create `useLocalTree` hook (with tests first)

**Files:**
- Create: `app/hooks/useLocalTree.ts`
- Create: `__tests__/hooks/useLocalTree.test.ts`

**Step 1: Write the failing tests**

Create `__tests__/hooks/useLocalTree.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useLocalTree } from '@/app/hooks/useLocalTree';

// Pin getDeviceId to 'default' so legacy key names are used
jest.mock('@/lib/db', () => ({
  ...jest.requireActual('@/lib/db'),
  getDeviceId: () => 'default',
}));

// Mock useMissions so we control completedMissions
jest.mock('@/app/hooks/useMissions', () => ({
  useMissions: jest.fn(),
}));

import { useMissions } from '@/app/hooks/useMissions';

const KEY_PLACED = 'turtle-talk-placed-missions';

function mockStorage(data: Record<string, string> = {}) {
  const store: Record<string, string> = { ...data };
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation((k) => store[k] ?? null);
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => { store[k] = v; });
  return store;
}

const makeMission = (id: string, theme: string, status: 'active' | 'completed' = 'completed') => ({
  id,
  title: `Mission ${id}`,
  description: 'desc',
  theme,
  difficulty: 'easy' as const,
  status,
  createdAt: new Date().toISOString(),
});

afterEach(() => jest.restoreAllMocks());

describe('useLocalTree — initial state', () => {
  it('returns empty placed/unplaced when storage empty and no completed missions', () => {
    mockStorage();
    (useMissions as jest.Mock).mockReturnValue({ completedMissions: [] });
    const { result } = renderHook(() => useLocalTree());
    expect(result.current.placedDecorations).toEqual([]);
    expect(result.current.unplacedDecorations).toEqual([]);
    expect(result.current.placedCount).toBe(0);
  });

  it('derives unplaced decorations from completed missions not yet on tree', () => {
    mockStorage();
    (useMissions as jest.Mock).mockReturnValue({
      completedMissions: [makeMission('m1', 'calm'), makeMission('m2', 'brave')],
    });
    const { result } = renderHook(() => useLocalTree());
    expect(result.current.unplacedDecorations).toHaveLength(2);
    expect(result.current.unplacedDecorations[0]).toEqual({ id: 'm1', emoji: '🌊' });
    expect(result.current.unplacedDecorations[1]).toEqual({ id: 'm2', emoji: '🦁' });
  });

  it('loads already-placed missions from localStorage and excludes them from unplaced', () => {
    mockStorage({ [KEY_PLACED]: JSON.stringify(['m1']) });
    (useMissions as jest.Mock).mockReturnValue({
      completedMissions: [makeMission('m1', 'calm'), makeMission('m2', 'brave')],
    });
    const { result } = renderHook(() => useLocalTree());
    expect(result.current.placedDecorations).toHaveLength(1);
    expect(result.current.placedDecorations[0]).toEqual({ emoji: '🌊', slotId: 'slot-0' });
    expect(result.current.unplacedDecorations).toHaveLength(1);
    expect(result.current.unplacedDecorations[0].id).toBe('m2');
  });
});

describe('useLocalTree — placeDecoration', () => {
  it('moves a decoration from unplaced to placed and persists to localStorage', () => {
    const store = mockStorage();
    (useMissions as jest.Mock).mockReturnValue({
      completedMissions: [makeMission('m1', 'curious')],
    });
    const { result } = renderHook(() => useLocalTree());
    act(() => result.current.placeDecoration('m1'));
    expect(result.current.placedDecorations).toHaveLength(1);
    expect(result.current.unplacedDecorations).toHaveLength(0);
    expect(JSON.parse(store[KEY_PLACED])).toEqual(['m1']);
  });

  it('ignores duplicate placeDecoration calls', () => {
    const store = mockStorage({ [KEY_PLACED]: JSON.stringify(['m1']) });
    (useMissions as jest.Mock).mockReturnValue({
      completedMissions: [makeMission('m1', 'kind')],
    });
    const { result } = renderHook(() => useLocalTree());
    act(() => result.current.placeDecoration('m1'));
    expect(result.current.placedCount).toBe(1);
    expect(JSON.parse(store[KEY_PLACED])).toHaveLength(1);
  });
});

describe('useLocalTree — growthStage', () => {
  it('is 0 when nothing is placed', () => {
    mockStorage();
    (useMissions as jest.Mock).mockReturnValue({ completedMissions: [] });
    const { result } = renderHook(() => useLocalTree());
    expect(result.current.growthStage).toBe(0);
  });

  it('increases every 2 placed decorations up to max 5', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `m${i}`);
    mockStorage({ [KEY_PLACED]: JSON.stringify(ids) });
    (useMissions as jest.Mock).mockReturnValue({
      completedMissions: ids.map((id) => makeMission(id, 'curious')),
    });
    const { result } = renderHook(() => useLocalTree());
    expect(result.current.growthStage).toBe(5);
  });
});
```

**Step 2: Run tests to confirm they fail**

```bash
cd C:\Users\iankt\Projects\turtle-talk && npx jest __tests__/hooks/useLocalTree.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `Cannot find module '@/app/hooks/useLocalTree'`

**Step 3: Create `app/hooks/useLocalTree.ts`**

```typescript
'use client';

import { useState, useCallback } from 'react';
import { getDeviceId } from '@/lib/db';
import { getPlacedMissionIds, savePlacedMissionIds } from '@/lib/db/providers/localStorage';
import { useMissions } from '@/app/hooks/useMissions';
import type { PlacedDecoration } from '@/app/hooks/useTree';

const THEME_EMOJI: Record<string, string> = {
  brave: '🦁',
  kind: '💛',
  calm: '🌊',
  confident: '⭐',
  creative: '🎨',
  social: '🤝',
  curious: '🔍',
};

export interface EarnedDecoration {
  /** mission ID — used as the key when placing on tree */
  id: string;
  emoji: string;
}

export function useLocalTree(childId?: string) {
  const id = childId ?? (typeof window !== 'undefined' ? getDeviceId() : 'default');
  const { completedMissions } = useMissions(id);

  const [placedMissionIds, setPlacedMissionIds] = useState<string[]>(
    () => (typeof window !== 'undefined' ? getPlacedMissionIds(id) : []),
  );

  const placedSet = new Set(placedMissionIds);

  // Decorations the child has earned but not yet placed on the tree
  const unplacedDecorations: EarnedDecoration[] = completedMissions
    .filter((m) => !placedSet.has(m.id))
    .map((m) => ({ id: m.id, emoji: THEME_EMOJI[m.theme ?? 'curious'] ?? '🔍' }));

  // Decorations already on the tree (for ChristmasTreeSVG)
  const missionById = Object.fromEntries(completedMissions.map((m) => [m.id, m]));
  const placedDecorations: PlacedDecoration[] = placedMissionIds.map((mId, i) => ({
    emoji: THEME_EMOJI[missionById[mId]?.theme ?? 'curious'] ?? '🔍',
    slotId: `slot-${i}`,
  }));

  const placedCount = placedMissionIds.length;
  // Tree grows one stage per 2 decorations, capped at 5
  const growthStage = Math.min(Math.floor(placedCount / 2), 5);

  const placeDecoration = useCallback(
    (missionId: string) => {
      setPlacedMissionIds((prev) => {
        if (prev.includes(missionId)) return prev;
        const next = [...prev, missionId];
        savePlacedMissionIds(id, next);
        return next;
      });
    },
    [id],
  );

  return {
    placedDecorations,
    unplacedDecorations,
    placedCount,
    growthStage,
    placeDecoration,
  };
}
```

**Step 4: Run tests — expect pass**

```bash
cd C:\Users\iankt\Projects\turtle-talk && npx jest __tests__/hooks/useLocalTree.test.ts --no-coverage 2>&1 | tail -20
```

Expected: all tests PASS.

**Step 5: Commit**

```bash
git add app/hooks/useLocalTree.ts __tests__/hooks/useLocalTree.test.ts
git commit -m "feat(hooks): add useLocalTree — localStorage-backed tree state from completed missions"
```

---

### Task 3: Widen `DecorationBox` items prop

**Files:**
- Modify: `app/appreciation/DecorationBox.tsx`

Currently `items: EncouragementItem[]` (which has `{id, emoji, created_at}`). We widen to `{id: string; emoji: string}[]` — `EncouragementItem` still satisfies this so logged-in usage is unchanged.

**Step 1: Update the prop interface**

In `DecorationBox.tsx`, replace:

```typescript
import type { EncouragementItem } from '@/app/hooks/useEncouragement';

interface DecorationBoxProps {
  items: EncouragementItem[];
```

with:

```typescript
interface DecorationItem {
  id: string;
  emoji: string;
}

interface DecorationBoxProps {
  items: DecorationItem[];
```

Remove the `EncouragementItem` import (no longer needed in this file).

**Step 2: Update the `onPlaceOnTree` callback type**

The callback signature stays `(id: string) => void` — no change needed there.

**Step 3: Verify TypeScript**

```bash
cd C:\Users\iankt\Projects\turtle-talk && npx tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: no new errors.

**Step 4: Commit**

```bash
git add app/appreciation/DecorationBox.tsx
git commit -m "refactor(DecorationBox): widen items prop to accept any {id, emoji} items"
```

---

### Task 4: Update `/appreciation` page — guest path uses localStorage tree

**Files:**
- Modify: `app/appreciation/page.tsx`

This is the largest change. The logged-in path is untouched. We add a parallel guest path.

**Step 1: Add imports for `useLocalTree` and `usePersonalMemory`**

At the top of `page.tsx`, add:

```typescript
import { useLocalTree } from '@/app/hooks/useLocalTree';
import { usePersonalMemory } from '@/app/hooks/usePersonalMemory';
import type { EarnedDecoration } from '@/app/hooks/useLocalTree';
```

**Step 2: Add hooks inside `AppreciationPageInner`**

After the existing hook calls, add:

```typescript
// Guest (no-login) path — localStorage tree + mission-earned decorations
const { childName } = usePersonalMemory();
const {
  placedDecorations: localPlacedDecorations,
  unplacedDecorations,
  placedCount: localPlacedCount,
  growthStage: localGrowthStage,
  placeDecoration,
} = useLocalTree();
```

**Step 3: Update derived values to branch on `isGuest`**

Replace the existing lines:

```typescript
const treeState = isGuest ? DUMMY_TREE : (tree ?? null);
const growthStage = treeState?.growth_stage ?? 0;
const placedDecorations = treeState?.placed_decorations ?? [];
const displayItems = isGuest ? [] : encouragementItems;
const placedCount = treeState?.placed_count ?? 0;
```

with:

```typescript
const growthStage = isGuest ? localGrowthStage : (tree?.growth_stage ?? 0);
const placedDecorations = isGuest ? localPlacedDecorations : (tree?.placed_decorations ?? []);
const placedCount = isGuest ? localPlacedCount : (tree?.placed_count ?? 0);
// For the decoration picker: guest uses mission-earned items; logged-in uses encouragement items
const displayItems: { id: string; emoji: string }[] = isGuest ? unplacedDecorations : encouragementItems;
```

Remove the `DUMMY_TREE` constant and `treeState` line (no longer used).

**Step 4: Update `handlePlaceOnTree` to branch on `isGuest`**

Replace:

```typescript
const handlePlaceOnTree = useCallback(
  async (encouragementId: string) => {
    if (isPlacing || isGuest) return;
    setIsPlacing(true);
    try {
      const result = await placeOnTree(encouragementId);
      setSelectedEncouragementId(null);
      refetchTree();
      refetchEncouragement();
      refetchWishList();
      if (result.unlocked) setUnlockToast(true);
    } catch (e) {
      console.error('[Appreciation] placeOnTree', e);
    } finally {
      setIsPlacing(false);
    }
  },
  [isPlacing, isGuest, placeOnTree, refetchTree, refetchEncouragement, refetchWishList]
);
```

with:

```typescript
const handlePlaceOnTree = useCallback(
  async (itemId: string) => {
    if (isPlacing) return;
    if (isGuest) {
      placeDecoration(itemId);
      setSelectedEncouragementId(null);
      setDecorationModalOpen(false);
      return;
    }
    setIsPlacing(true);
    try {
      const result = await placeOnTree(itemId);
      setSelectedEncouragementId(null);
      refetchTree();
      refetchEncouragement();
      refetchWishList();
      if (result.unlocked) setUnlockToast(true);
    } catch (e) {
      console.error('[Appreciation] placeOnTree', e);
    } finally {
      setIsPlacing(false);
    }
  },
  [isPlacing, isGuest, placeDecoration, placeOnTree, refetchTree, refetchEncouragement, refetchWishList]
);
```

**Step 5: Update the header title to show child name**

Find the `<h1>` with `My Tree` and replace:

```tsx
My Tree
```

with:

```tsx
{isGuest ? `${childName ?? 'Explorer'}'s Tree` : 'My Tree'}
```

**Step 6: Update the guest subtitle**

Find:

```tsx
Decorate it with cheers from your grown-up!
```

Replace with:

```tsx
{isGuest ? 'Decorate it with your mission rewards!' : 'Decorate it with cheers from your grown-up!'}
```

**Step 7: Replace wish list section for guests**

Find the `<section aria-label="My wish list"` block. Wrap its contents so guests see a simple nudge instead:

```tsx
<section
  aria-label="My wish list"
  style={{
    width: '100%',
    marginTop: 8,
    paddingTop: 24,
    borderTop: '1px solid rgba(255,255,255,0.12)',
  }}
>
  {isGuest ? (
    <p
      style={{
        color: 'var(--tt-text-secondary)',
        fontSize: '0.9rem',
        textAlign: 'center',
        lineHeight: 1.6,
        margin: 0,
      }}
    >
      Complete more missions with Shelly to earn more decorations!
    </p>
  ) : (
    <>
      {/* existing wish list JSX stays here unchanged */}
    </>
  )}
</section>
```

**Step 8: Update the decoration picker empty state for guests**

Inside the `DecorationBox` section of the modal (the `displayItems` are now `[]` when guest has no unplaced decorations). The empty state in `DecorationBox` currently says `"No new cheers yet — ask your grown-up to send you some!"`. Update `DecorationBox.tsx` to accept an optional `emptyMessage` prop:

In `DecorationBox.tsx` interface, add:

```typescript
emptyMessage?: string;
```

In the empty state `<p>`, replace the hardcoded string with:

```tsx
{emptyMessage ?? 'No new cheers yet — ask your grown-up to send you some!'}
```

In `page.tsx`, pass the guest empty message:

```tsx
<DecorationBox
  items={displayItems}
  selectedId={selectedEncouragementId}
  onSelect={setSelectedEncouragementId}
  onPlaceOnTree={handlePlaceOnTree}
  isPlacing={isPlacing}
  emptyMessage={isGuest ? 'Complete a mission to earn your first decoration!' : undefined}
/>
```

**Step 9: Verify TypeScript**

```bash
cd C:\Users\iankt\Projects\turtle-talk && npx tsc --noEmit --project tsconfig.json 2>&1 | head -30
```

Expected: no new errors.

**Step 10: Run all tests**

```bash
cd C:\Users\iankt\Projects\turtle-talk && npx jest --no-coverage 2>&1 | tail -15
```

Expected: all existing tests still pass (we haven't broken any existing behavior).

**Step 11: Commit**

```bash
git add app/appreciation/page.tsx app/appreciation/DecorationBox.tsx
git commit -m "feat(appreciation): localStorage guest path — mission-earned decorations, child name from memory"
```

---

### Task 5: Manual smoke test

**Steps:**

1. `pnpm dev` in `C:\Users\iankt\Projects\turtle-talk`
2. Navigate to `/talk` — click "🧪 Test Missions" button (dev-only, bottom-right)
3. Select a mission (e.g. easy 🌿) → lands on `/missions`
4. On `/missions`, tap "Done!" on the active mission → it moves to Completed tab
5. Navigate to `/appreciation` — header should show `Explorer's Tree` (no name set yet)
6. Progress bar should be at 0/10
7. Tap "Pick a cheer and put it on your tree" button → decoration picker opens
8. The theme emoji for the completed mission should appear in the picker
9. Tap the emoji → tap "Put on tree" → decoration appears on the tree SVG
10. Progress bar should advance to 1/10
11. Talk to Shelly briefly, she learns your name → revisit `/appreciation` → header shows `{name}'s Tree`
12. Reload page → decorations persist (localStorage)
13. Verify logged-in path unchanged: log in as a child → `/appreciation` shows server-backed tree as before

---

## Summary

| Task | Files | Tests |
|------|-------|-------|
| 1. localStorage helpers | `lib/db/providers/localStorage.ts` | — (type-checked) |
| 2. `useLocalTree` hook | `app/hooks/useLocalTree.ts` | `__tests__/hooks/useLocalTree.test.ts` |
| 3. Widen `DecorationBox` prop | `app/appreciation/DecorationBox.tsx` | — (existing tests cover render) |
| 4. `/appreciation` guest path | `app/appreciation/page.tsx`, `DecorationBox.tsx` | — (manual smoke test) |
