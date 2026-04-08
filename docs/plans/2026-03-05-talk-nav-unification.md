# Talk Nav Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Merge the floating Talk to Shelly button and TalkBottomBar into the existing BottomNav so /talk feels like a brave, seamless part of the app rather than a separate screen.

**Architecture:** `useVoiceSession` gains `isMeaningful` (elapsed >= 40s). `BottomNav` gains optional `talkProps`; when present it renders call-state controls instead of nav items. `/talk/page.tsx` drops the floating button + TalkBottomBar, mounts `<BottomNav talkProps={…} />`. Pull-turtle and hold-end-call provide error recovery.

**Tech Stack:** Next.js 16, React 19, TypeScript, lucide-react, inline styles (no Tailwind classes added)

---

## Task 1: Expose `isMeaningful` from `useVoiceSession`

Track elapsed call time in the hook. A call is meaningful after 40 seconds of active audio.

**Files:**
- Modify: `app/hooks/useVoiceSession.ts`

**Step 1: Add elapsed tracking to the hook**

Open `app/hooks/useVoiceSession.ts`. After the existing `const [error, setError] = useState<string | null>(null);` line (line 41), add:

```ts
const [isMeaningful, setIsMeaningful] = useState(false);
const callStartRef = useRef<number | null>(null);
const meaningfulTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

**Step 2: Wire it to state transitions**

In the existing `onState` handler (currently `const onState = (s: VoiceSessionState) => setState(s);`), replace with:

```ts
const ACTIVE_STATES = new Set(['listening', 'recording', 'processing', 'speaking']);
const onState = (s: VoiceSessionState) => {
  setState(s);
  if (ACTIVE_STATES.has(s) && callStartRef.current === null) {
    callStartRef.current = Date.now();
    meaningfulTimerRef.current = setTimeout(() => setIsMeaningful(true), 40_000);
  }
  if (s === 'ended' || s === 'idle') {
    if (meaningfulTimerRef.current) clearTimeout(meaningfulTimerRef.current);
    meaningfulTimerRef.current = null;
    callStartRef.current = null;
    // keep isMeaningful true until next call so gold state persists to post-call bar
  }
};
```

**Step 3: Reset isMeaningful when a new call starts**

In the existing `startListening` callback, before the `await provider.start(...)` call, add:
```ts
setIsMeaningful(false);
```

**Step 4: Add `isMeaningful` to the return type and return value**

Add `isMeaningful: boolean;` to `UseVoiceSessionResult` interface.

Add `isMeaningful` to the return object:
```ts
return { state, mood, messages, pendingUserTranscript, isMuted, error, isMeaningful, startListening, toggleMute, endConversation };
```

**Step 5: Cleanup on unmount**

Add cleanup for the meaningful timer in the existing `useEffect` cleanup function (the one that calls `provider.stop()`):
```ts
return () => {
  // ...existing cleanup...
  if (meaningfulTimerRef.current) clearTimeout(meaningfulTimerRef.current);
};
```

**Step 6: Run tests**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest --testPathPattern="useVoiceSession|voice" --no-coverage 2>&1 | tail -20
```
Expected: all existing tests pass (no new tests for this — it's a timer, hard to unit test without fake timers).

---

## Task 2: Redesign BottomNav center button (circle → pill, Phone icon, bigger)

Swap `Mic` for `Phone`, enlarge the circle to 64px, keep the same expand-on-hover animation.

**Files:**
- Modify: `app/components/BottomNav.tsx`

**Step 1: Update the import**

Change the import line from:
```ts
import { Home, Leaf, Star, Mic } from 'lucide-react';
```
to:
```ts
import { Home, Leaf, Star, Phone } from 'lucide-react';
```

**Step 2: Replace the center button pill div**

Find the inner `<div>` inside the center `<Link href="/talk">` (around line 135–169) and replace it with:

```tsx
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: talkExpanded ? 'auto' : 64,
    height: 64,
    padding: talkExpanded ? '10px 22px' : 0,
    borderRadius: 9999,
    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
    boxShadow: '0 4px 24px rgba(22,163,74,0.55)',
    border: '2px solid rgba(255,255,255,0.25)',
    flexShrink: 0,
    transition: 'width 0.25s ease, padding 0.25s ease, transform 0.15s ease, opacity 0.15s ease',
    overflow: 'hidden',
  }}
  className="active:scale-[0.98] active:opacity-90"
>
  <span className="tt-icon-wiggle" style={{ display: 'inline-flex', flexShrink: 0 }}>
    <Phone size={26} color="white" strokeWidth={2} aria-hidden />
  </span>
  <span
    style={{
      fontSize: '0.95rem',
      fontWeight: 700,
      color: 'white',
      whiteSpace: 'nowrap',
      maxWidth: talkExpanded ? 160 : 0,
      overflow: 'hidden',
      opacity: talkExpanded ? 1 : 0,
      transition: 'max-width 0.25s ease, opacity 0.2s ease',
    }}
  >
    Talk to Shelly
  </span>
</div>
```

**Step 3: Verify visually**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx next dev --port 3001 2>&1 &
```
Open http://localhost:3001 — center button should be a larger circle with a phone icon. Hover it — should expand to "Talk to Shelly" pill.

Kill dev server when done.

---

## Task 3: Add `talkProps` interface to BottomNav

When `talkProps` is provided (i.e. on /talk page), the nav renders call-state controls instead of Home | Talk | Missions.

**Files:**
- Modify: `app/components/BottomNav.tsx`

**Step 1: Add the `TalkNavProps` interface at the top of the file (after imports)**

```ts
export interface TalkNavProps {
  state: 'idle' | 'connecting' | 'listening' | 'recording' | 'processing' | 'speaking' | 'ended';
  isMuted: boolean;
  isMeaningful: boolean;
  hasError: boolean;
  onStart: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onContinue: () => void;
}

interface BottomNavProps {
  talkProps?: TalkNavProps;
}
```

**Step 2: Update the component signature**

Change:
```ts
export default function BottomNav() {
```
to:
```ts
export default function BottomNav({ talkProps }: BottomNavProps = {}) {
```

**Step 3: Add helper constants inside the component (after the `pathname` hook)**

```ts
const ACTIVE_CALL_STATES = new Set(['listening', 'recording', 'processing', 'speaking']);
const isCallActive = talkProps ? ACTIVE_CALL_STATES.has(talkProps.state) : false;
const isConnecting = talkProps?.state === 'connecting';
const isEnded = talkProps?.state === 'ended';
const isIdle = !talkProps || talkProps.state === 'idle';
```

**Step 4: Add hold-to-refresh state for End Call button**

After the existing `longPressHandledRef`:
```ts
const holdEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const [endCallHolding, setEndCallHolding] = useState(false);
```

**Step 5: Add hold-to-refresh handlers**

```ts
const handleEndPointerDown = () => {
  holdEndTimerRef.current = setTimeout(() => {
    holdEndTimerRef.current = null;
    setEndCallHolding(true);
    talkProps?.onStart(); // retry = restart
    setTimeout(() => setEndCallHolding(false), 1500);
  }, 2000);
};

const handleEndPointerUp = () => {
  if (holdEndTimerRef.current) {
    clearTimeout(holdEndTimerRef.current);
    holdEndTimerRef.current = null;
  }
};

const handleEndClick = () => {
  if (!endCallHolding) talkProps?.onEnd();
};
```

**Step 6: Build the talk-state render (add this just before the `return` statement)**

```tsx
// ── /talk page: call-state nav ──────────────────────────────────────────
if (talkProps && !isIdle) {
  const { state, isMuted, isMeaningful, hasError, onToggleMute, onContinue } = talkProps;

  // Post-call bar
  if (isEnded) {
    return (
      <nav
        className="bottom-nav"
        style={{
          position: 'fixed',
          bottom: 'max(16px, env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 24px)',
          maxWidth: 500,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'stretch',
          padding: '16px 20px max(14px, env(safe-area-inset-bottom))',
          borderRadius: 32,
          background: 'rgba(8, 22, 48, 0.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 12 }}>
          {/* My Missions */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <Link
              href="/missions"
              aria-label="My Missions"
              className="tt-tap-shake"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, minWidth: 44, padding: '10px 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                <Star size={20} strokeWidth={2} aria-hidden />
                <span>My Missions</span>
              </div>
            </Link>
          </div>
          {/* Keep talking */}
          <button
            type="button"
            className="tt-tap-shake active:scale-[0.98] active:opacity-90"
            onClick={onContinue}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, padding: '10px 20px', borderRadius: 9999, background: isMeaningful ? 'linear-gradient(135deg, #b45309, #d97706)' : 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: isMeaningful ? '0 4px 20px rgba(217,119,6,0.5)' : '0 4px 20px rgba(22,163,74,0.5)', border: '2px solid rgba(255,255,255,0.25)', color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <Phone size={22} strokeWidth={2} />
            Keep talking
          </button>
          {/* Home */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Link
              href="/"
              aria-label="Home"
              className="tt-tap-shake"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, minWidth: 44, padding: '10px 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                <Home size={20} strokeWidth={2} aria-hidden />
                <span>Home</span>
              </div>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // Connecting or active call bar
  const endGradient = isMeaningful
    ? 'linear-gradient(135deg, #b45309, #d97706)'
    : 'linear-gradient(135deg, #dc2626, #ef4444)';
  const endShadow = isMeaningful
    ? '0 4px 20px rgba(217,119,6,0.5)'
    : '0 4px 20px rgba(220,38,38,0.5)';

  return (
    <nav
      className="bottom-nav"
      style={{
        position: 'fixed',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 24px)',
        maxWidth: 500,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 20px max(14px, env(safe-area-inset-bottom))',
        borderRadius: 32,
        background: 'rgba(8, 22, 48, 0.88)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%' }}>
        {/* Mute button — left */}
        {isCallActive && (
          <button
            type="button"
            className="tt-tap-shake active:scale-[0.98] active:opacity-90"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44, minWidth: 44, padding: '10px 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}
          >
            {isMuted ? (
              <MicOff size={22} strokeWidth={2} color="#fbbf24" />
            ) : (
              <Mic size={22} strokeWidth={2} />
            )}
          </button>
        )}

        {/* Center: connecting spinner OR end call */}
        {isConnecting ? (
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, padding: '10px 24px', borderRadius: 9999, background: 'linear-gradient(135deg, #15803d, #16a34a)', border: '2px solid rgba(255,255,255,0.25)', color: 'white', fontSize: '0.95rem', fontWeight: 700, opacity: 0.85 }}
          >
            <Phone size={22} strokeWidth={2} />
            Connecting…
          </div>
        ) : (
          <button
            type="button"
            className="tt-tap-shake active:scale-[0.98] active:opacity-90"
            aria-label={endCallHolding ? 'Refreshing' : 'End call'}
            onPointerDown={handleEndPointerDown}
            onPointerUp={handleEndPointerUp}
            onPointerLeave={handleEndPointerUp}
            onClick={handleEndClick}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, padding: '10px 24px', borderRadius: 9999, background: endCallHolding ? 'rgba(100,100,100,0.5)' : endGradient, boxShadow: endCallHolding ? 'none' : endShadow, border: '2px solid rgba(255,255,255,0.25)', color: 'white', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.3s ease, box-shadow 0.3s ease' }}
          >
            <PhoneOff size={22} strokeWidth={2} />
            {endCallHolding ? 'Refreshing…' : 'End call'}
          </button>
        )}

        {/* Far-right: subtle error hint */}
        {hasError && isCallActive && (
          <div
            aria-label="Connection issue"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, opacity: 0.35, cursor: 'default', userSelect: 'none' }}
          >
            <RotateCcw size={16} strokeWidth={2} color="white" />
          </div>
        )}
      </div>
    </nav>
  );
}
```

**Step 7: Add missing imports**

Ensure the import line has all needed icons:
```ts
import { Home, Leaf, Star, Phone, Mic, MicOff, PhoneOff, RotateCcw } from 'lucide-react';
```

---

## Task 4: Update /talk/page.tsx — remove floating button, add BottomNav with talkProps

**Files:**
- Modify: `app/talk/page.tsx`

**Step 1: Update imports**

Replace the `TalkBottomBar` import with `BottomNav`:
```ts
import BottomNav from '@/app/components/BottomNav';
import type { TalkNavProps } from '@/app/components/BottomNav';
```
Remove: `import TalkBottomBar from '@/app/components/talk/TalkBottomBar';`

**Step 2: Pull `isMeaningful` from `useVoiceSession`**

The destructure on line 57:
```ts
const { state, mood, messages, pendingUserTranscript, isMuted, error, toggleMute, endConversation, startListening } =
  useVoiceSession(providerRef.current, { … });
```
Add `isMeaningful`:
```ts
const { state, mood, messages, pendingUserTranscript, isMuted, error, isMeaningful, toggleMute, endConversation, startListening } =
```

**Step 3: Build talkProps object**

After the `const callEnded = state === 'ended';` line, add:

```ts
const ACTIVE_STATES_SET = new Set(['listening', 'recording', 'processing', 'speaking']);
const talkNavProps: TalkNavProps = {
  state,
  isMuted,
  isMeaningful,
  hasError: !!error,
  onStart: startListening,
  onEnd: endConversation,
  onToggleMute: ACTIVE_STATES_SET.has(state) ? toggleMute : () => {},
  onContinue: startListening,
};
```

**Step 4: Remove the floating "Talk to Shelly" button and status label**

Delete the entire block from line 148 to 185 (the `state === 'idle' || state === 'connecting'` ternary and the `<p>` status label). Replace with just the status label for active states (so the child knows what's happening):

```tsx
{state !== 'idle' && state !== 'connecting' && state !== 'ended' && (
  <p
    style={{
      color: 'rgba(255,255,255,0.65)',
      fontSize: '0.95rem',
      fontWeight: 600,
      margin: 0,
      textAlign: 'center',
      minHeight: 22,
    }}
  >
    {STATE_LABELS[state] ?? ''}
  </p>
)}
```

**Step 5: Replace `TalkBottomBar` with `BottomNav`**

Remove the entire:
```tsx
{state !== 'idle' && (
  <TalkBottomBar … />
)}
```

Replace with (always rendered — the nav is always present):
```tsx
<BottomNav talkProps={talkNavProps} />
```

**Step 6: Add pull-turtle-to-retry gesture wrapper around `<TurtleCharacter>`**

Replace:
```tsx
<div className={state === 'listening' ? 'tt-listening-ring' : undefined}>
  <TurtleCharacter mood={mood} size={200} />
</div>
```

With:

```tsx
<PullToRetry onRetry={error ? startListening : undefined}>
  <div className={state === 'listening' ? 'tt-listening-ring' : undefined}>
    <TurtleCharacter mood={mood} size={200} />
  </div>
</PullToRetry>
```

**Step 7: Add the `PullToRetry` component above `ConversationView`**

```tsx
function PullToRetry({ children, onRetry }: { children: React.ReactNode; onRetry?: () => void }) {
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);

  const THRESHOLD = 60;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!onRetry) return;
    startYRef.current = e.clientY;
    triggeredRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startYRef.current === null || !onRetry) return;
    const delta = Math.max(0, e.clientY - startYRef.current);
    setDragY(Math.min(delta, THRESHOLD + 20));
    if (delta >= THRESHOLD && !triggeredRef.current) {
      triggeredRef.current = true;
      onRetry();
    }
  };

  const onPointerUp = () => {
    startYRef.current = null;
    setDragY(0);
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        transform: `translateY(${dragY}px)`,
        transition: dragY === 0 ? 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        cursor: onRetry ? 'grab' : 'default',
        touchAction: 'none',
      }}
    >
      {children}
    </div>
  );
}
```

Add `useState, useRef` are already imported — confirm they're in the import list.

**Step 8: Remove the paddingBottom: 100 from main — the nav now handles spacing**

Change `paddingBottom: 100` to `paddingBottom: 120` (give a little more room for the nav bar).

---

## Task 5: /talk idle state — BottomNav shows normal nav with Phone circle

When `state === 'idle'`, we pass `talkProps` but the BottomNav's `isIdle` check will fall through to the normal nav render (Home | Phone circle | Missions). The center link still navigates to `/talk` and `onPointerDown` fires `onStart` instead.

**Files:**
- Modify: `app/components/BottomNav.tsx`

**Step 1: Make idle center button trigger the call on /talk**

In the existing center `<Link href="/talk">` block, add an `onClick` handler that, when `talkProps` is present and state is idle, calls `onStart` and prevents navigation:

```tsx
onClick={(e) => {
  if (talkProps && talkProps.state === 'idle') {
    e.preventDefault();
    talkProps.onStart();
  }
  handleTalkClick(e);
}}
```

This means: on /talk when idle, tapping the phone circle starts the call. On any other page, it navigates to /talk as before.

**Step 2: On /talk idle, always show the label (not just on hover)**

Adjust the expand logic in the center div's label span. Currently it's `talkExpanded`. Change it to:

```tsx
const showTalkLabel = talkExpanded || (talkProps?.state === 'idle');
```

And use `showTalkLabel` instead of `talkExpanded` for `maxWidth` and `opacity`.

---

## Task 6: Verify build and cleanup

**Files:**
- Delete: `app/components/talk/TalkBottomBar.tsx`

**Step 1: Verify no remaining imports of TalkBottomBar**
```bash
cd C:/Users/iankt/projects/turtle-talk && grep -r "TalkBottomBar" app/ --include="*.tsx" --include="*.ts"
```
Expected: no output.

**Step 2: Delete TalkBottomBar**
```bash
rm C:/Users/iankt/projects/turtle-talk/app/components/talk/TalkBottomBar.tsx
```

**Step 3: Run full build**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx next build 2>&1 | tail -30
```
Expected: clean build, no type errors.

**Step 4: Run test suite**
```bash
cd C:/Users/iankt/projects/turtle-talk && npx jest --no-coverage 2>&1 | tail -20
```
Expected: same pass count as before (233+).

**Step 5: Commit**
```bash
cd C:/Users/iankt/projects/turtle-talk && git add app/components/BottomNav.tsx app/talk/page.tsx app/hooks/useVoiceSession.ts && git add -A -- app/components/talk/ && git commit -m "$(cat <<'EOF'
feat(talk): unify Talk to Shelly button into BottomNav with call-state morphing

- Phone circle → pill replaces Mic in center nav; bigger, bolder
- /talk page: BottomNav stays visible; call controls replace nav items
- End Call turns gold after 40s meaningful call
- Hold End Call 2s to refresh; pull turtle down to retry on error
- Subtle RotateCcw hint (no button) when connection fails
- Remove floating Talk to Shelly button and TalkBottomBar component

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Testing Checklist (manual)

- [ ] Home page: center button is a large circle with Phone icon
- [ ] Hover center button: expands smoothly to "Talk to Shelly" pill
- [ ] Tap center button from home: navigates to /talk
- [ ] /talk idle: same nav bar, same Phone circle, tapping starts call
- [ ] /talk connecting: bar shows "Connecting…" pill, no flanks
- [ ] /talk active: Mute left, End Call center (red); hold End Call 2s → "Refreshing…"
- [ ] /talk 40s+ active: End Call turns gold
- [ ] /talk ended: My Missions | Keep Talking | Home bar
- [ ] /talk ended + meaningful: Keep Talking is gold
- [ ] /talk error: subtle RotateCcw visible at far right, no button affordance
- [ ] Pull turtle down when error: triggers retry
- [ ] Missions, journals, journal pages: BottomNav unchanged
