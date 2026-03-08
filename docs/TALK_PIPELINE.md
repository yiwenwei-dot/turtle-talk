# Talk-to-Shelly pipeline

End-to-end flow from "Talk to Shelly" until the conversation is done: interruption, mute, transcription, captioning, and tools.

## Provider choice

- **Native** (`NEXT_PUBLIC_VOICE_PROVIDER=native` or unset): browser VAD → POST /api/talk (stream) → STT → guardrails → LLM (with tools) → TTS → stream back meta + audio.
- **VAPI** (`NEXT_PUBLIC_VOICE_PROVIDER=vapi`): Vapi handles mic, VAD, STT, TTS; our backend is only `/api/vapi/llm` (guardrails + LLM + tool_calls).

---

## Native path (default)

### 1. Page load & start

- `/talk` → mic permission (useMicPermission) → `ConversationView`.
- `createVoiceProvider()` → `NativeVoiceProvider`.
- `useVoiceSession(provider)` → `startListening()` in useEffect → `provider.start(options)`.

### 2. NativeVoiceProvider.start()

- `getUserMedia({ audio: true })`; on failure → `emit('error', 'Could not access microphone')`.
- Create AudioContext, AnalyserNode, start VAD poll (setInterval).
- `setState('listening')`, `emit('moodChange', 'listening')`.

### 3. VAD (voice activity detection)

- **listening** → average volume > threshold for VAD_START_MS → **recording**.
- **recording** → volume < threshold for VAD_STOP_MS → `stopRecording()` → build blob → `sendAudio(blob)`.

### 4. sendAudio(blob) → /api/talk

- If blob too small → back to **listening** (no request).
- `setState('processing')`, `emit('moodChange', 'confused')`.
- POST FormData: `audio`, `messages`, `childName`, `topics`, `difficultyProfile`, `activeMission`.
- If `!res.ok` → read body as JSON for `error` → `throw` → catch → `emit('error', msg)`.
- If no body → `throw` → same catch.
- Otherwise read NDJSON stream.

### 5. /api/talk stream (server)

1. Parse form, build context, create STT/TTS/chat/guardrail, `SpeechService`.
2. **Stream start**: `ReadableStream.start()`.
3. **processToText**: STT → input guardrails → chat (LLM + tools) → output guardrails.
   - Empty `userText` → close stream without sending meta (client will reset to **listening**).
4. Send `{ type: 'meta', userText, responseText, mood, missionChoices?, endConversation?, childName?, topic?, missionProgressNote? }`.
5. If `responseText` non-empty: TTS → send `{ type: 'audio', base64 }`.
6. On any error: send `{ type: 'error', error }` then close. Client throws on `event.type === 'error'`.

### 6. Client stream handling (native)

- For each line: `meta` → update messages, emit missionChoices/end/childName/topic, **speaking** + mood; `audio` → `playAudio(base64)`; `error` → throw.
- After loop: if no meta and state still **processing** → back to **listening** (empty turn).
- Any throw → catch → `emit('error', msg)`, **listening**, **moodChange**('listening').

### 7. playAudio(base64)

- Decode → play. On `source.onended`: if `pendingEnd` → `stop()`; else **listening** + mood.
- On decode error → `emit('error', 'Audio playback failed: ...')`, **listening**.

### 8. Mute

- `toggleMute()` → `provider.setMuted(!prev)`.
- Native: `audioCtx.suspend()` / `resume()`, `setState('muted')` or restore previous state.

### 9. End call

- `endConversation()` → `provider.stop()` → cleanup (VAD, recorder, stream), `setState('ended')`, `emit('end')`.
- `onEnd` in options → if no `pendingMissionChoices`, `router.push('/missions')`.

### 10. Captioning / transcription (native)

- **User**: text comes from server in `meta.userText` (from STT); appended to `messages` as `{ role: 'user', content: userText }`.
- **Shelly**: `meta.responseText` appended as assistant message. Rendered by `ConversationSubtitles` (last user + last assistant; processing shows typing dots).

### 11. Tools (native path)

- LLM (e.g. Gemini) returns tool calls: `report_mood`, `propose_missions`, `end_conversation`, `note_child_info`, `acknowledge_mission_progress`.
- Chat provider parses these and returns `ChatResponse`: mood, missionChoices, endConversation, childName, topic, missionProgressNote.
- Route sends them in `meta`; client applies via `emit('missionChoices')`, `pendingEnd = true`, `emit('childName')`, `emit('topic')`. Mission choices → `MissionSelectView`; end → after last audio plays, `stop()`.

### 12. Interruption (native)

- No barge-in: while **processing** or **speaking**, VAD loop does nothing (early return). User must wait for Shelly to finish or end the call.

---

## VAPI path

### 1. Start

- `provider.start()` → dynamic import `@vapi-ai/web`, `vapi.start(assistantId, { model: custom-llm, url: /api/vapi/llm, messages: [system with context] }, voice: 11labs, …)`.
- Missing env → `emit('error', '...')`.

### 2. /api/vapi/llm

- Receives `messages`; system message holds JSON context (childName, topics, difficultyProfile, activeMission).
- Last user message → guardrail → `chat.chat()` → output guardrail → build tool_calls: `reportMood`, optionally `proposeMissions`, `reportEndConversation`.
- Returns OpenAI-format completion with `content` and `tool_calls`. On error → 200 with fallback text + reportMood(confused).

### 3. Vapi events → our state

- **call-start** → **listening**.
- **speech-start** → **recording**.
- **speech-end** → **processing**.
- **message** (transcript, final) → append to messages, emit; if assistant → **speaking**, mood.
- **message** (function-call): reportMood → moodChange; proposeMissions → missionChoices; reportEndConversation → stop().
- **message** (status-update, ended) → **listening**.
- **call-end** → **ended**, **end**.
- **error** → `emit('error', msg)`.

### 4. Mute / captioning / tools (VAPI)

- Mute: `vapi.setMuted(muted)`; we emit **muted** or **listening**.
- Captioning: transcript messages (user + assistant) from Vapi; we append to `messages` and render in `ConversationSubtitles`.
- Tools: same semantics as native; implemented as OpenAI tool_calls from our LLM response; Vapi fires function-call events we handle above.

---

## LiveKit path (agent on server)

- `createVoiceProvider()` → `LiveKitVoiceProvider` (when configured); `provider.start()` POSTs to `/api/livekit/token` to mint a room token and LiveKit URL.
- Browser joins the room; a `shelly` LiveKit agent (see `livekit-agent/`) runs the OpenAI Realtime pipeline and sends:
  - `{ type: 'transcript', role, text }` messages for captions.
  - `{ type: 'missionChoices', choices: MissionSuggestion[] }` once per call end, where each choice has `title`, `description`, optional `theme`, and `difficulty: 'easy'|'medium'|'stretch'`.
  - `{ type: 'endConversation' }` when the call should end.
- `LiveKitVoiceProvider` parses these as `LiveKitControlMessage` values and emits the same high-level events as other providers (`missionChoices`, `end`, `userTranscript`, etc.), so `useVoiceSession` and the missions UI behave identically.

---

## Error surfacing (browser)

- **useVoiceSession**: subscribes to `provider.on('error', setError)`. UI shows `error` with "Oops! Shelly had a little hiccup", the **actual error message** below it, and "Try again".
- **Native**: microphone failure, `!res.ok` (with JSON `error` or `HTTP status`), no body, stream `type: 'error'`, playAudio decode failure → all lead to `emit('error', msg)`.
- **VAPI**: start failure (env, network), and `vapi.on('error')` → `emit('error', msg)`.
- **/api/talk**: all failures send `{ type: 'error', error }` in the stream before closing; client parses and emits.

---

## Console logs (stages)

Non-revealing `[Shelly]` logs mark each stage so you can see where the pipeline is in the browser and server console.
