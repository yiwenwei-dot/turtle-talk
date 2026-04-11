# Holistic UI/UX Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Lift the quality of the full TurtleTalk app with targeted, scoped improvements across every page — no rearchitecting, just filling gaps and fixing rough edges.

**Architecture:** Each task is an independent file-level change. Tasks are ordered by risk (lowest first). All changes are purely UI/UX — no new API routes or data model changes required.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind v4, inline styles (child area), CSS variables (parent area), Lucide icons

---

## Task 1: Talk page — remove debug telemetry + wire turtle mood

**Files:**
- Modify: `app/talk/page.tsx:94-144`

**Context:**
Line 144 hardcodes `mood="idle"` on the turtle. `mood` is already returned by `useVoiceSession` (line 57). Lines 94–98 are a debug telemetry `useEffect` that POSTs to a local dev server — should not ship.

**Step 1: Remove debug block**

In `app/talk/page.tsx`, delete lines 94–98 entirely (the `// #region agent log` block):
```
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7379/ingest/c4e58649...', { ... }).catch(() => {});
  }, [messages.length, pendingUserTranscript, state]);
  // #endregion
```

**Step 2: Wire turtle mood**

Change line 144 from:
```tsx
<TurtleCharacter mood="idle" size={200} />
```
To:
```tsx
<TurtleCharacter mood={mood} size={200} />
```
(`mood` is already destructured from `useVoiceSession` at line 57.)

**Step 3: Run tests**

```bash
cd /c/Users/iankt/Projects/turtle-talk
npx jest __tests__/components/talk/TurtleCharacter --no-coverage 2>&1 | tail -20
```
Expected: all existing TurtleCharacter tests pass (mood prop was already tested).

**Step 4: Verify no import left**

Check that `useEffect` import is still needed by other effects on the page. The `useMicPermission` and `useVoiceSession` hooks use effects internally, so this page still imports `useEffect` via `useState`/`useRef` — confirm line 3 still reads `import { useEffect, useRef, useState } from 'react';`. If `useEffect` is no longer called directly in `ConversationView`, remove it from the destructure.

**Step 5: Commit**

```bash
git add app/talk/page.tsx
git commit -m "fix: wire turtle mood to session state; remove debug telemetry"
```

---

## Task 2: Talk page — VAD listening glow ring

**Files:**
- Modify: `app/globals.css`
- Modify: `app/talk/page.tsx:143-145`

**Context:**
When `state === 'listening'`, show a pulsing cyan glow ring around the turtle to give clear visual feedback that the mic is active. Uses CSS animation only.

**Step 1: Add keyframe to globals.css**

Append to `app/globals.css`:
```css
/* ── Talk page: listening glow ring ── */
@keyframes listeningRing {
  0%, 100% { box-shadow: 0 0 0 0px rgba(6, 182, 212, 0.5); }
  50%       { box-shadow: 0 0 0 20px rgba(6, 182, 212, 0); }
}
.tt-listening-ring {
  border-radius: 50%;
  animation: listeningRing 1.4s ease-out infinite;
}
```

**Step 2: Wrap turtle in talk page**

Replace the single `<TurtleCharacter>` line in `app/talk/page.tsx` (currently line 144) with:
```tsx
<div className={state === 'listening' ? 'tt-listening-ring' : undefined}>
  <TurtleCharacter mood={mood} size={200} />
</div>
```

**Step 3: Visual check**
Start the dev server and verify:
- On `/talk`, pressing "Talk to Tammy" and the state transitioning to `listening` shows a cyan pulse ring
- Ring disappears when state changes to `recording` or `speaking`

**Step 4: Commit**

```bash
git add app/globals.css app/talk/page.tsx
git commit -m "feat: add VAD listening glow ring around turtle"
```

---

## Task 3: Journal page — recording duration counter

**Files:**
- Modify: `app/journal/page.tsx`

**Context:**
During recording, no time indicator is shown. Add a live MM:SS counter that starts when recording begins and resets when stopped.

**Step 1: Add duration state + interval**

In `app/journal/page.tsx`, add state and a `useEffect` after the existing `const [saveSuccess, ...]` line:

```tsx
const [recordingSeconds, setRecordingSeconds] = useState(0);

useEffect(() => {
  if (state !== 'recording') {
    setRecordingSeconds(0);
    return;
  }
  const id = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
  return () => clearInterval(id);
}, [state]);
```

**Step 2: Format helper**

Add above the component (or inline):
```tsx
function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
```

**Step 3: Render timer next to Stop button**

In the `state === 'recording'` block, add the timer below the Stop button:
```tsx
{state === 'recording' && (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
    <button ... > {/* existing stop button */} </button>
    <span
      style={{
        fontFamily: 'monospace',
        fontSize: '1.1rem',
        fontWeight: 700,
        color: 'var(--tt-text-secondary)',
        letterSpacing: '0.04em',
      }}
    >
      {formatDuration(recordingSeconds)}
    </span>
  </div>
)}
```

**Step 4: Add "Your recording:" label**

In the `state === 'recorded'` block, above the `<audio>` element add:
```tsx
<p style={{ color: 'var(--tt-text-secondary)', fontSize: 14, margin: '0 0 6px' }}>
  Your recording:
</p>
```

**Step 5: Commit**

```bash
git add app/journal/page.tsx
git commit -m "feat: add recording duration timer and audio label to journal page"
```

---

## Task 4: Home page — welcoming sub-headline

**Files:**
- Modify: `app/page.tsx`

**Context:**
The home page is minimal. Add a second line below "Talk to Tammy" that adds warmth and context. Keep it static (no async data needed, simplicity is key).

**Step 1: Add sub-headline**

In `app/page.tsx`, after the `<p>` tag that says "Talk to Tammy" (lines 43–52), add:
```tsx
<p
  style={{
    color: 'var(--tt-text-muted)',
    fontSize: 'clamp(0.8rem, 2.5vw, 0.95rem)',
    marginBottom: 0,
    textAlign: 'center',
    fontWeight: 500,
  }}
>
  Your turtle friend is ready to chat 🌿
</p>
```

**Step 2: Verify**

Run `npm run dev` and visit `/`. Confirm the sub-line appears below "Talk to Tammy" and doesn't push the messages strip too far down on small screens.

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add welcoming sub-headline to home page"
```

---

## Task 5: Missions page — difficulty label on cards

**Files:**
- Modify: `app/missions/page.tsx`

**Context:**
`Mission` has an optional `difficulty?: 'easy' | 'medium' | 'stretch'` field (defined in `lib/speech/types.ts:10`). Show a small badge when present.

**Step 1: Add difficulty badge in MissionCard**

In the `MissionCard` component (`app/missions/page.tsx`), add this after the title `<p>` (currently line 103–113). Place it between the title and description paragraphs:

```tsx
{isActive && mission.difficulty && (
  <span
    style={{
      display: 'inline-block',
      marginTop: 4,
      padding: '2px 8px',
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      background:
        mission.difficulty === 'easy' ? 'rgba(34,197,94,0.25)' :
        mission.difficulty === 'medium' ? 'rgba(234,179,8,0.25)' :
        'rgba(239,68,68,0.25)',
      color:
        mission.difficulty === 'easy' ? '#86efac' :
        mission.difficulty === 'medium' ? '#fde047' :
        '#fca5a5',
    }}
  >
    {mission.difficulty}
  </span>
)}
```

**Step 2: Run tests**

```bash
npx jest __tests__/components/talk --no-coverage 2>&1 | tail -10
```
(No dedicated missions test file; confirm no TS errors with `npx tsc --noEmit 2>&1 | head -20`.)

**Step 3: Commit**

```bash
git add app/missions/page.tsx
git commit -m "feat: show difficulty badge on mission cards"
```

---

## Task 6: ChildrenModal — confirm remove + copy login code

**Files:**
- Modify: `app/components/parent/ChildrenModal.tsx`

**Context:**
Remove button executes instantly with no confirmation. Login codes have no copy affordance.

### Part A: Confirm before remove

**Step 1: Add confirm state**

In `ChildrenModal`, add state after `removingId`:
```tsx
const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
```

**Step 2: Update Remove button logic**

Replace the Remove button (lines 156–172) with a two-step confirm pattern:
```tsx
{confirmRemoveId === child.id ? (
  <div style={{ display: 'flex', gap: 4 }}>
    <button
      type="button"
      onClick={() => setConfirmRemoveId(null)}
      style={{
        padding: '6px 8px', fontSize: 12,
        border: '1px solid var(--pd-card-border)',
        borderRadius: 8, background: 'var(--pd-surface-overlay)',
        cursor: 'pointer', color: 'var(--pd-text-secondary)',
      }}
    >
      Cancel
    </button>
    <button
      type="button"
      onClick={() => { setConfirmRemoveId(null); handleRemove(child.id); }}
      disabled={removingId === child.id}
      style={{
        padding: '6px 8px', fontSize: 12,
        border: '1px solid rgba(220,38,38,0.3)',
        borderRadius: 8, background: 'var(--pd-surface-overlay)',
        color: 'var(--pd-error)', cursor: 'pointer',
      }}
    >
      {removingId === child.id ? '…' : 'Sure?'}
    </button>
  </div>
) : (
  <button
    type="button"
    onClick={() => setConfirmRemoveId(child.id)}
    style={{
      padding: '6px 10px', fontSize: 13,
      border: '1px solid rgba(220,38,38,0.3)',
      borderRadius: 8, background: 'var(--pd-surface-overlay)',
      color: 'var(--pd-error)', cursor: 'pointer',
    }}
  >
    Remove
  </button>
)}
```

### Part B: Copy login code

**Step 1: Add copy state**

Add state after `confirmRemoveId`:
```tsx
const [copiedId, setCopiedId] = useState<string | null>(null);
```

**Step 2: Replace login code text with copy button**

Replace the login code `<div>` (lines 136–138) with:
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
  <span style={{ fontSize: 12, color: 'var(--pd-text-secondary)', fontFamily: 'monospace', letterSpacing: 1 }}>
    {child.loginKey ?? '—'}
  </span>
  {child.loginKey && (
    <button
      type="button"
      title="Copy login code"
      onClick={async () => {
        await navigator.clipboard.writeText(child.loginKey!);
        setCopiedId(child.id);
        setTimeout(() => setCopiedId(null), 1500);
      }}
      style={{
        padding: '2px 6px', fontSize: 11,
        border: '1px solid var(--pd-card-border)',
        borderRadius: 6, background: 'var(--pd-surface-overlay)',
        cursor: 'pointer', color: copiedId === child.id ? 'var(--pd-success)' : 'var(--pd-text-tertiary)',
      }}
    >
      {copiedId === child.id ? '✓' : 'Copy'}
    </button>
  )}
</div>
```

**Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | head -20
```
Expected: 0 errors.

**Step 4: Commit**

```bash
git add app/components/parent/ChildrenModal.tsx
git commit -m "feat: add confirm-before-remove and copy-login-code to ChildrenModal"
```

---

## Task 7: Parent page — wish list delete confirmation

**Files:**
- Modify: `app/parent/page.tsx`

**Context:**
Wish items can be deleted with a single click — no confirmation. Apply the same two-step pattern as Task 6.

**Step 1: Add state**

In `ParentPage`, add after `wishListError` state:
```tsx
const [confirmWishId, setConfirmWishId] = useState<string | null>(null);
```

**Step 2: Update Remove button in wish list section**

Replace the Remove button `onClick` (lines 348–368) with:
```tsx
{confirmWishId === item.id ? (
  <div style={{ display: 'flex', gap: 4 }}>
    <button
      type="button"
      onClick={() => setConfirmWishId(null)}
      style={{
        padding: '6px 8px', fontSize: 12,
        border: '1px solid var(--pd-card-border)',
        borderRadius: 8, background: 'var(--pd-surface-overlay)',
        cursor: 'pointer', color: 'var(--pd-text-secondary)',
      }}
    >
      Cancel
    </button>
    <button
      type="button"
      onClick={async () => {
        setConfirmWishId(null);
        try { await deleteWishItem(item.id); }
        catch (e) { setWishListError(e instanceof Error ? e.message : 'Failed to delete'); }
      }}
      style={{
        padding: '6px 8px', fontSize: 12,
        border: '1px solid rgba(220,38,38,0.3)',
        borderRadius: 8, background: 'var(--pd-surface-overlay)',
        color: 'var(--pd-error)', cursor: 'pointer',
      }}
    >
      Sure?
    </button>
  </div>
) : (
  <button
    type="button"
    onClick={() => setConfirmWishId(item.id)}
    style={{
      padding: '6px 12px', borderRadius: 8,
      border: '1px solid var(--pd-card-border)',
      background: 'var(--pd-surface-overlay)',
      fontSize: 13, color: 'var(--pd-text-secondary)', cursor: 'pointer',
    }}
  >
    Remove
  </button>
)}
```

**Step 3: Type-check + commit**

```bash
npx tsc --noEmit 2>&1 | head -10
git add app/parent/page.tsx
git commit -m "feat: add confirm-before-delete to wish list"
```

---

## Task 8: Skeleton loaders for loading states

**Files:**
- Modify: `app/globals.css`
- Modify: `app/parent/page.tsx` (lines 249, 327)

**Context:**
Several loading states show plain "Loading…" text. Replace with a simple shimmer skeleton bar.

**Step 1: Add shimmer animation to globals.css**

Append to `app/globals.css`:
```css
/* ── Parent dashboard: skeleton loader ── */
@keyframes skeletonShimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.pd-skeleton {
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    var(--pd-surface-soft) 25%,
    var(--pd-surface-overlay) 50%,
    var(--pd-surface-soft) 75%
  );
  background-size: 800px 100%;
  animation: skeletonShimmer 1.4s ease-in-out infinite;
}
```

**Step 2: Replace weekly report loading text**

In `app/parent/page.tsx`, replace line 249:
```tsx
{weeklyReportLoading && <p style={{ color: 'var(--pd-text-tertiary)', fontSize: 15 }}>Loading…</p>}
```
With:
```tsx
{weeklyReportLoading && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div className="pd-skeleton" style={{ height: 20, width: '60%' }} />
    <div className="pd-skeleton" style={{ height: 16, width: '40%' }} />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div className="pd-skeleton" style={{ height: 80 }} />
      <div className="pd-skeleton" style={{ height: 80 }} />
    </div>
  </div>
)}
```

**Step 3: Replace dinner questions loading text**

In `DinnerQuestions.tsx` line 101–103:
```tsx
{loading && (
  <p style={{ color: 'var(--pd-text-tertiary)', fontSize: 15 }}>Loading…</p>
)}
```
Replace with:
```tsx
{loading && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {[80, 65, 72].map((w, i) => (
      <div key={i} className="pd-skeleton" style={{ height: 52, width: `${w}%`, borderRadius: 14 }} />
    ))}
  </div>
)}
```

**Step 4: Replace wish list loading text** in `app/parent/page.tsx` line 327:
```tsx
{wishListLoading ? (
  <p style={{ color: 'var(--pd-text-tertiary)', fontSize: 15 }}>Loading wish list…</p>
) : ...}
```
Replace the loading branch with:
```tsx
{wishListLoading ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {[100, 85].map((w, i) => (
      <div key={i} className="pd-skeleton" style={{ height: 44, width: `${w}%`, borderRadius: 12 }} />
    ))}
  </div>
) : ...}
```

**Step 5: Commit**

```bash
git add app/globals.css app/parent/page.tsx app/components/parent/DinnerQuestions.tsx
git commit -m "feat: replace Loading text with skeleton shimmer loaders"
```

---

## Task 9: ParentHeader — disable co-parent button, remove misleading modal

**Files:**
- Modify: `app/components/parent/ParentHeader.tsx`

**Context:**
The Co-parent button opens a modal that says "Coming soon." This is misleading UX. Replace with a disabled button + tooltip text instead.

**Step 1: Remove coparentModalOpen state**

Delete the line: `const [coparentModalOpen, setCoparentModalOpen] = useState(false);`

**Step 2: Update the Co-parent button**

Replace the Co-parent button (lines 197–220):
```tsx
<button
  type="button"
  role="menuitem"
  disabled
  title="Coming soon"
  style={{
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    border: 'none',
    background: 'transparent',
    cursor: 'not-allowed',
    fontSize: 14,
    color: 'var(--pd-text-tertiary)',
    textAlign: 'left',
    opacity: 0.5,
  }}
>
  <UserPlus size={18} />
  Co-parent
  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, background: 'var(--pd-surface-soft)', border: '1px solid var(--pd-card-border)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.03em' }}>
    Soon
  </span>
</button>
```

**Step 3: Remove the coparent modal JSX**

Delete the entire `{coparentModalOpen && ( ... )}` block (lines 256–304).

**Step 4: Verify unused import**

`UserPlus` from lucide-react is still used. Confirm the import is intact. Remove `useState` from import if `coparentModalOpen` was the only local state — but `dropdownOpen` still uses it, so keep it.

**Step 5: Type-check + commit**

```bash
npx tsc --noEmit 2>&1 | head -10
git add app/components/parent/ParentHeader.tsx
git commit -m "fix: disable co-parent button and remove misleading Coming Soon modal"
```

---

## Task 10: BookCard — "Search online" link

**Files:**
- Modify: `app/components/parent/BookCard.tsx`

**Context:**
The book detail modal has no way to find or buy the book. Add a simple "Find this book →" search link.

**Step 1: Add link in modal after "About the book" section**

In `app/components/parent/BookCard.tsx`, after the `<div style={{ marginBottom: 20 }}>` block (the "About the book" section, ending around line 166), add before the Close button:

```tsx
<a
  href={`https://www.google.com/search?q=${encodeURIComponent(`${book.title} ${book.author} book`)}`}
  target="_blank"
  rel="noopener noreferrer"
  style={{
    display: 'block',
    marginBottom: 16,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--pd-accent)',
    textDecoration: 'none',
  }}
>
  Find this book →
</a>
```

**Step 2: Commit**

```bash
git add app/components/parent/BookCard.tsx
git commit -m "feat: add Find this book search link to BookCard modal"
```

---

## Task 11: DinnerQuestions — show theme label

**Files:**
- Modify: `app/components/parent/DinnerQuestions.tsx`

**Context:**
Each `DinnerQuestion` has a `theme: string` field (defined at line 8) that is never displayed. Show it as a small chip.

**Step 1: Add theme chip to each question**

In `DinnerQuestions.tsx`, inside the `list.map((q) => ...)` block, after the question text `<span>` (line 180–189), add:

```tsx
{q.theme && (
  <span
    style={{
      marginLeft: 10,
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--pd-accent)',
      background: 'var(--pd-accent-soft)',
      border: '1px solid var(--pd-accent)',
      borderRadius: 4,
      padding: '1px 5px',
      whiteSpace: 'nowrap',
      letterSpacing: '0.03em',
      flexShrink: 0,
      alignSelf: 'flex-start',
    }}
  >
    {q.theme}
  </span>
)}
```

Note: the outer button is `display: flex; alignItems: flex-start`. The theme chip will appear inline with the checkbox and question text. You may need to wrap the question `<span>` and theme chip in a nested flex div if alignment looks off.

**Step 2: Commit**

```bash
git add app/components/parent/DinnerQuestions.tsx
git commit -m "feat: show theme label on dinner questions"
```

---

## Final Step: Run full test suite

```bash
cd /c/Users/iankt/Projects/turtle-talk
npx jest --no-coverage 2>&1 | tail -30
```
Expected: all previously-passing tests still pass (233 or more). If any fail, fix before proceeding.

```bash
git log --oneline -12
```
Verify 11 new commits on `feature/home-page-ui-improvements`.

---

## Summary of Files Modified

| File | Tasks |
|------|-------|
| `app/talk/page.tsx` | 1, 2 |
| `app/journal/page.tsx` | 3 |
| `app/page.tsx` | 4 |
| `app/missions/page.tsx` | 5 |
| `app/components/parent/ChildrenModal.tsx` | 6 |
| `app/parent/page.tsx` | 7, 8 |
| `app/globals.css` | 2, 8 |
| `app/components/parent/DinnerQuestions.tsx` | 8, 11 |
| `app/components/parent/ParentHeader.tsx` | 9 |
| `app/components/parent/BookCard.tsx` | 10 |
