# Design: Talk Nav Unification + Meaningful Call Gold State

## Overview

Unify the "Talk to Shelly" entry point and in-call controls into the existing BottomNav bar.
Eliminate the floating button in /talk page content. Maintain the existing visual language.

---

## 1. Center Button Redesign (BottomNav — all pages)

- **Idle / other pages**: Perfect circle (~68px diameter), `Phone` icon, green gradient — same colours as current pill (`#16a34a → #22c55e`), same box-shadow
- **On hover / focus / when on /talk (idle)**: Animates outward to pill with "Talk to Shelly" label, same expand logic currently in use (max-width 0 → 140, opacity 0 → 1)
- Icon changes from `Mic` to `Phone` (lucide)
- Size bump: circle is larger than current pill so it reads as a clear primary action

---

## 2. /talk Page Integration

Remove the floating "Talk to Shelly" button from page content. Remove `TalkBottomBar`.
Add `BottomNav` to `/talk/page.tsx` with optional `talkProps` that drive call-state rendering.

### BottomNav talkProps interface

```ts
interface TalkNavProps {
  state: VoiceSessionState;        // idle | connecting | listening | recording | processing | speaking | ended
  isMuted: boolean;
  isMeaningful: boolean;           // true when call elapsed >= 40s
  hasError: boolean;
  onStart: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onContinue: () => void;          // for post-call "Keep talking"
  onRetry: () => void;             // used internally by hold-to-refresh only
}
```

### Nav state machine

| State | Left slot | Center | Right slot |
|---|---|---|---|
| `idle` | Home/Appreciation | Phone circle → "Talk to Shelly" pill | Missions |
| `connecting` | (hidden/faded) | Spinner + "Connecting…" pill (disabled) | (hidden) |
| Active call, < 40s | Mute button | End call pill (red gradient) | (empty) |
| Active call, >= 40s | Mute button | End call pill (**gold gradient**) | Tiny `RotateCcw` icon (error only) |
| `ended` | My Missions | Keep talking (green pill) | Home |

Active states: `listening`, `recording`, `processing`, `speaking`.

---

## 3. Gold Meaningful Call

- Track elapsed time in `useVoiceSession`: start a `Date.now()` ref when state transitions away from `idle`/`connecting` to any active state; expose `isMeaningful: boolean` (elapsed >= 40 000ms).
- Pass `isMeaningful` down to BottomNav via `talkProps`.
- End Call button gradient changes: `#b45309 → #d97706` (amber-700 → amber-600) with glow `rgba(217,119,6,0.5)`.
- No automatic mission trigger at 40s — missions still fire at conversation end as before. Gold is purely a visual cue for the child/parent.

---

## 4. Error Recovery

**No functional "Try again" button.** Three subtle recovery paths:

### a) Subtle icon (far right slot, error only)
- `RotateCcw` 16px, `opacity: 0.35`, `cursor: default`, no hover state, no onClick.
- Purely decorative — signals something is off without adding UI noise.

### b) Pull Shelly to retry
- `onPointerDown` / `onPointerMove` on `TurtleCharacter` wrapper div.
- If user drags down > 60px, trigger a retry: call `onRetry()` (which calls `startListening()`).
- Visual: turtle translates down with the drag, snaps back with a spring transition.

### c) Hold End Call to refresh (2s)
- On `pointerdown` on the End Call button: start a 2s timer via `useRef`.
- After 2s: label changes to "Refreshing…", button turns grey, calls `onRetry()`.
- After 1.5s (reconnecting): button reverts to "End call" with red gradient.
- On `pointerup` before 2s: cancel timer, no action (normal end-call tap still works at < 500ms threshold).

---

## 5. Architecture

### Files changed
- `app/components/BottomNav.tsx` — accept optional `talkProps`; render call-state nav when present
- `app/talk/page.tsx` — remove floating button; remove `TalkBottomBar`; add `<BottomNav talkProps={...} />`
- `app/hooks/useVoiceSession.ts` — expose `isMeaningful: boolean`
- `app/components/talk/TurtleCharacter.tsx` — add pull-down gesture wrapper
- `app/components/talk/TalkBottomBar.tsx` — **delete** (functionality absorbed into BottomNav)

### What does NOT change
- BottomNav visual style (glass blur, border, shadow, border-radius, padding, colours)
- All existing animation classes (`tt-tap-shake`, `tt-icon-wiggle`, `active:scale-[0.98]`)
- `ConversationBubblesCard`, `ConversationSubtitles`, `TurtleCharacter` rendering
- Post-call `MissionSelectView` flow
- All other pages (home, missions, journals) — BottomNav renders exactly as today

---

## 6. Out of scope
- Long-press journal shortcut on center button — keep as-is
- Any changes to the TTS/STT/mission agent logic
- Accessibility improvements beyond existing aria-labels
