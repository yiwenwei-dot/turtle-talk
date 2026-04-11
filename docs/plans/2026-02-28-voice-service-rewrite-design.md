# Voice Service Rewrite Design
**Date:** 2026-02-28

## Problem

The Vapi integration gets stuck in an endless "Tammy is speaking" state. The old `VapiVoiceProvider` tried to detect when the assistant stopped speaking by listening for `message.type === 'status-update' && message.status === 'ended'`. That event never fires reliably, so the state never clears.

## Goal

A working voice conversation with Vapi. No mood signals, no mission function calls — just a child talking to Tammy and Tammy talking back.

## Scope

Three files change. Everything else is untouched.

| File | Change |
|------|--------|
| `lib/speech/voice/vapi.ts` | Full rewrite |
| `app/api/vapi/llm/route.ts` | Simplify — plain text, no tool_calls |
| `lib/speech/voice/native.ts` | Delete (unused) |

Unchanged: `base.ts`, `types.ts`, `index.ts`, `useVoiceSession.ts`, `talk/page.tsx`, all components.

## State Machine (the fix)

The core insight: **`speech-start` clears `speaking`**. When the user starts talking, the assistant has definitionally stopped. No need to wait for a "stopped" event from Vapi.

```
call-start              → listening
speech-start            → recording   (from listening OR speaking)
speech-end              → processing
transcript (assistant)  → speaking
call-end                → ended + emit 'end'
setMuted(true)          → muted
setMuted(false)         → listening
```

Turtle mood mapping:
- `listening` / `recording` → `'listening'`
- `processing` → `'confused'`
- `speaking` → `'talking'`
- `ended` → `'idle'`

The generation counter (guards against React Strict Mode double-invoke stale events) is kept.

## API Route: `/api/vapi/llm`

Remove all `tool_calls`. Plain OpenAI-compatible response only.

Steps:
1. Parse `body.messages` + `body.metadata`
2. Find last user message
3. `ChildSafeGuardrail.checkInput()` — fallback if blocked
4. `chat.chat()` — get response text
5. `ChildSafeGuardrail.checkOutput()` — sanitize if needed
6. Return `{ choices: [{ message: { role: 'assistant', content } }] }` — no `tool_calls`

Metadata (childName, topics, difficultyProfile, activeMission) is still extracted and passed as context to Claude for personalisation, but nothing flows back to the UI as events.

## What Does Not Change

- `BaseVoiceProvider` and the typed event system
- `useVoiceSession` hook
- `talk/page.tsx` — `onMissionChoices` stays registered but will never fire; that's fine
- All existing tests that don't touch vapi.ts or the llm route
