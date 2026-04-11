# Changelog

All notable changes to TurtleTalk are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and
Semantic Versioning (`MAJOR.MINOR.PATCH`).

## Format and workflow

- Versions follow SemVer: `MAJOR.MINOR.PATCH`.
- The `Unreleased` section collects changes merged to `main` since the last tagged release.
- When cutting a release, move items from `Unreleased` into a new
  `## [x.y.z] - YYYY-MM-DD` section grouped under `Added`, `Changed`, `Fixed`
  (and optionally `Removed`, `Security`).
- Each released version can also have a short `Notes` subsection explaining why the
  release exists and any caveats or migrations.

---

## [Unreleased]

### Added — Voice Provider Abstraction (`lib/speech/voice/`)

A new provider layer decouples the voice conversation pipeline from the React hooks. Any
voice provider can now be swapped in via a single env var without changing UI code.

- **`lib/speech/voice/types.ts`** — `VoiceConversationProvider` interface with a typed
  event map (`stateChange`, `moodChange`, `messages`, `missionChoices`, `childName`,
  `topic`, `error`, `end`).
- **`lib/speech/voice/base.ts`** — `BaseVoiceProvider` abstract class handles
  event-emitter bookkeeping so concrete providers only implement `start/stop/setMuted`.
- **`lib/speech/voice/native.ts`** — `NativeVoiceProvider` — the existing VAD +
  MediaRecorder + `/api/talk` pipeline extracted into a standalone class.
- **`lib/speech/voice/vapi.ts`** — `VapiVoiceProvider` — Vapi WebRTC integration.
  Vapi handles mic, VAD, STT (Deepgram), and TTS (ElevenLabs). Our server runs
  guardrails + LLM via `/api/vapi/llm`. Mood and mission choices return as Vapi
  function-call events.
- **`lib/speech/voice/index.ts`** — `createVoiceProvider(name?)` factory reads
  `NEXT_PUBLIC_VOICE_PROVIDER` (`'native'` default, or `'vapi'`).

### Added — Vapi LLM Endpoint (`app/api/vapi/llm/route.ts`)

`POST /api/vapi/llm` — OpenAI-compatible chat completion endpoint used by Vapi's
`custom-llm` model provider.

- Receives Vapi's conversation messages array.
- Runs `ChildSafeGuardrail` on the latest user message.
- Calls our `AnthropicChatProvider` (or OpenAI) for the response.
- Returns the response text for Vapi's TTS to speak, plus `tool_calls` for `reportMood`,
  `proposeMissions`, and `reportEndConversation` so the client receives structured events.

### Added — `useVoiceSession` hook (`app/hooks/useVoiceSession.ts`)

Thin hook over any `VoiceConversationProvider` (native or Vapi). Same return shape (state, mood, messages, controls).
instance and returns the same `{ state, mood, messages, isMuted, error, startListening,
toggleMute, endConversation }` shape.

### Changed — Talk page uses `useVoiceSession` + `NativeVoiceProvider`

`app/talk/page.tsx` now instantiates a `NativeVoiceProvider` once per mount and passes
it to `useVoiceSession`. Behaviour is identical to before; the provider layer enables
future Vapi switching without touching the page.

### Changed — Config (`lib/speech/config.ts`)

Added `voiceProvider` field driven by `NEXT_PUBLIC_VOICE_PROVIDER` env var.

### Changed — Talk page UI redesign

- **Subtitle display** — removed the dark glass box. Text floats directly on the ocean
  background with text-shadow for readability. Tammy's line is large
  (`clamp(1.2rem, 4.5vw, 1.5rem)`, bold white); the user's line is smaller and dimmer.
- **Fewer controls** — only the End Call button is prominent (72 px, red gradient, bottom
  centre). Mute is a small 40 px circle in the top-left corner. Start Over removed from
  the main conversation view.
- **Cleaner header** — TurtleTalk title centred; mute icon left; right spacer keeps
  layout balanced.

### Fixed — API abuse detection (carried from previous session)

- `VAD_THRESHOLD` raised 15 → 35 in `NativeVoiceProvider` (ambient noise no longer
  triggers recording).
- `MIN_AUDIO_BYTES = 6000` guard discards clips shorter than ~400 ms.
- `receivedMeta` tracker resets client from `processing` when stream closes without a
  meta event.
- `SpeechService.processToText/process` return an empty sentinel instead of calling the
  LLM when STT transcription is blank.
- `/api/talk` discards turns with empty transcriptions and guards ElevenLabs TTS against
  empty response text.

### Changed — Bottom navigation & home screen (carried from previous session)

- **BottomNav** — 3-item floating pill: My Garden | 📞 Call (elevated) | My Missions.
  80 px call button, 56 px min-height touch targets, `max-width: 500 px`.
- **MessagesButton** — glassy pill below the home hero text; shows message count badge
  (red dot when `count > 0`, dimmed "none yet" when 0).
- **`/messages` page** — stub with friendly empty state.

### Dependencies

- Added `@vapi-ai/web` for Vapi WebRTC integration.

---

## Environment Variables

```
# .env.local

# Voice provider — 'native' (default) or 'vapi'
NEXT_PUBLIC_VOICE_PROVIDER=native

# Required for NEXT_PUBLIC_VOICE_PROVIDER=vapi
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your-vapi-web-public-key

# Optional: override ElevenLabs voice in Vapi mode
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
```
