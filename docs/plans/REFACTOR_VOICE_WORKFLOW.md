# Refactor: Voice workflow – best practice and plan

## 1. Best practice and ideal workflow

### 1.1 Target architecture

- **Single state machine**: One explicit set of states and allowed transitions. Our states are already well-defined: `idle | listening | recording | processing | speaking | muted | ended`. The ideal is to drive all transitions through one place so the UI cannot get stuck or show inconsistent state.
- **Event-driven, provider-agnostic UI**: The React layer subscribes to a single “session” abstraction (current: `VoiceConversationProvider`). The provider owns: mic/VAD (native) or SDK (VAPI), API calls, and stream handling. It emits typed events; the hook maps them to React state. No duplicate pipeline logic in the hook.
- **Single “transition” API for symmetric states**: For states that always go together (e.g. “back to listening” = state `listening` + mood `listening`), use one method (e.g. `transitionToListening()`) so state and mood are never out of sync. Already partially done in `NativeVoiceProvider`.
- **Stream and error handling**: Every failure path (network, server error, empty response, decode error) should emit a single error event and transition to a known state (listening or idle), with no duplicate or competing transitions.
- **No duplicate pipelines**: One implementation of “native” flow (VAD → POST /api/talk → NDJSON stream → play) and one of “VAPI” flow. The hook should only subscribe and expose state; it should not reimplement VAD, fetch, or stream parsing.

### 1.2 Ideal flow (native)

1. **Start**: `idle` → `listening` (and mood `listening`) as soon as `start()` is called; acquire mic; if fail → `idle` + error.
2. **VAD**: `listening` ⇄ `recording` on volume thresholds; on stop recording → send blob.
3. **Request**: `listening` → `processing` (mood `confused`); POST /api/talk; read NDJSON.
4. **Meta**: If `responseText` non-empty → `speaking` + mood from server; if empty → `listening` (single transition).
5. **Audio**: On `audio` event → play; on `onended` → `listening` (or end call if `pendingEnd`). On stream end with no audio after meta → `listening`.
6. **Errors**: Any throw or `type: 'error'` → emit error, then `transitionToListening()` (or `idle` if before mic).
7. **Mute**: `listening`/`recording`/… ⇄ `muted` with `prevState` for restore.
8. **End**: Cleanup; `ended` + mood `idle` + `emit('end')`.

All “back to listening” paths use the same helper so event management is seamless and no path is missed.

---

## 2. Current state and what to remove

### 2.1 Dead or redundant code (cleaned up)

| Item | Status |
|------|--------|
| **useSpeechConversation** | **Removed.** Talk page uses `useVoiceSession` + `VoiceConversationProvider` only. |
| **Legacy debug logs** | **Removed.** Ingest `fetch` calls and `appendFileSync` debug-e0caad.log from native.ts, route, SpeechService. Console `[Tammy]` logs kept for support. See [DEBUG.md](../../DEBUG.md). |
| **missionDeclined** | Only existed in the removed hook; not in provider or API. Omitted from types. |

### 2.2 What to keep

- **VoiceConversationProvider interface** and **VoiceEventMap**: Clear contract; native and VAPI both implement it.
- **useVoiceSession**: Thin adapter; only subscribes to provider events and exposes `startListening`, `toggleMute`, `endConversation`. No pipeline logic.
- **NativeVoiceProvider** and **VapiVoiceProvider**: Single place for each pipeline; `transitionToListening()` and explicit transitions in native are the right direction.
- **/api/talk** and **/api/vapi/llm**: Server pipeline (STT → guardrails → chat → TTS or tool_calls) is correct; keep streaming and error shape.

---

## 3. Refactor plan

### Phase 1: Remove dead code (low risk) — DONE

1. **Deleted `app/hooks/useSpeechConversation.ts`**; updated `.cursorrules`, CHANGELOG, and this doc. Talk page uses `useVoiceSession` + providers only.

2. **Optional: drop `missionDeclined`**  
   - If it’s only in the removed hook and not in the API or provider options, remove it from types and from any remaining option bags.

### Phase 2: Harden native provider (event management)

3. **Keep a single “back to listening” path**  
   - Already introduced: `transitionToListening()` in `NativeVoiceProvider`.  
   - Ensure every path that should return to listening uses it (blob too small, meta empty, stream ended without meta, stream ended while speaking, catch block, playAudio onended, playAudio decode error).  
   - Ensure stream-end logic uses `if / else if` so only one of “no meta” vs “still speaking” runs (no double transition). Already done.

4. **Optional: explicit FSM type**  
   - Define a small type or const map of allowed transitions, e.g. `ALLOWED_TRANSITIONS[from][to]`, and have `setState`/`transitionToListening` assert or log on invalid transition. This makes the state machine explicit and testable without adding XState yet.

### Phase 3: Consistency and observability

5. **Unify “listening” entry**  
   - Native: we already call `transitionToListening()` at start (before and after getUserMedia success).  
   - VAPI: we already emit `stateChange('listening')` and `moodChange('listening')` when starting the call.  
   - No change required if behavior is correct; only verify there are no lingering “idle” or “speaking” stuck states.

6. **Debug instrumentation**  
   - Keep one minimal set of logs (e.g. `[Tammy]` stage logs) or remove them and rely on session-based instrumentation when debugging.  
   - Remove or replace old ingest URLs (e.g. `e0caad`) with a single config (e.g. env or session ID) so we don’t scatter magic IDs.

7. **Empty LLM response**  
   - Server already sends meta with empty `responseText` and no audio when the LLM returns empty.  
   - Client already treats empty `responseText` as “no TTS” and calls `transitionToListening()`.  
   - Optional: server could send a short fallback phrase when the LLM returns empty so Tammy always says something; keep as product decision.

---

## 4. Challenges

| Challenge | Mitigation |
|-----------|------------|
| **React Strict Mode double-mount** | Provider’s `start()` may run twice. Native: guard with a “started” flag or abort on cleanup before getUserMedia resolves. VAPI: already using `_generation` to ignore stale events. Ensure cleanup (e.g. in useVoiceSession) calls `provider.stop()` so the previous run is torn down. |
| **Stream parsing edge cases** | NDJSON might split across chunks. Current logic (buffer, split by `\n`, pop last incomplete line) is standard. Add a simple test with multi-chunk stream. Malformed lines: wrap `JSON.parse` in try/catch and skip or treat as error. |
| **VAPI vs native parity** | Both must emit the same events for the same conceptual state (listening, speaking, error, end). Keep a small parity checklist: state + mood for start, speech-start/end, transcript, error, end. |
| **Mute during processing/speaking** | Native VAD already skips when `muted` or `processing`/`speaking`. Unmute restores `prevState`. Ensure `transitionToListening()` does not run when `state === 'muted'` (already guarded). |
| **Empty response and “stuck speaking”** | Handled by: (1) meta with empty response → `transitionToListening()`, (2) stream ended while `speaking` → `transitionToListening()`. No further change if logs confirm these paths run. |

---

## 5. Summary

- **Ideal workflow**: One explicit state machine, one transition helper for “back to listening”, event-driven provider(s), hook only subscribes and exposes state. No duplicate pipeline logic.
- **Removed**: `useSpeechConversation` and legacy debug ingest/file logs. See [DEBUG.md](../../DEBUG.md) for voice debugging.
- **Keep and tighten**: Provider pattern, `useVoiceSession`, `transitionToListening()`, stream-end and empty-response handling. Optionally add an explicit FSM type and minimal, configurable logging.
- **Risks**: Double-mount, stream parsing, and parity between native and VAPI; all have clear mitigations above.

After Phase 1, the codebase has a single path for the native voice workflow (provider + hook) and a clear plan to keep event management seamless and testable.
