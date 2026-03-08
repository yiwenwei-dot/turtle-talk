# Debugging voice and audio

## Voice pipeline overview

- **Talk page** uses `useVoiceSession` with a `VoiceConversationProvider` (native or Vapi).
- **Native path**: Mic → VAD (in [lib/speech/voice/native.ts](lib/speech/voice/native.ts)) → record on speech → POST blob to `/api/talk` → NDJSON stream (meta + base64 audio) → client plays audio and returns to listening.
- **Vapi path**: Vapi handles mic, VAD, STT, TTS; our server runs guardrails + LLM via `/api/vapi/llm`.

## Startup health-check

When the server starts (`next dev` or `next start`), a health checklist runs in the background. The terminal shows a one-line summary (e.g. `[health] OK` or `[health] 1 critical, 2 errors`). For the full checklist (what was checked, Critical/Error/Info), set `HEALTHCHECK_VERBOSE=true` in `.env.local`. GET `/api/health` returns the same summary as JSON; use `?verbose=1` or header `X-Health-Detail: 1` for details.

## Enabling verbose logs

- **Browser**: Open DevTools → Console. All `[Shelly]` logs from the native provider and hook appear there (e.g. `native start`, `recording`, `meta received`, `audio ended, back to listening`).
- **Server**: `[Shelly]` and `[talk/route]` logs are printed to the terminal running `npm run dev` (or your server stdout). SpeechService and route log stream start, processToText, meta sent, TTS start, audio sent, and errors.
- **Structured debug (session log file)**: Set `ENABLE_SESSION_LOGGING=true` in `.env.local` to enable the non-blocking logging agent. Events are enqueued in memory and written in the background to `logs/voice-session.log` (NDJSON, one JSON object per line). Categories include `api_talk`, `state_machine`, `voice_native`, `tool_call`, `summary`, `thinking`. The log directory is created on first write. Logging never blocks the critical path (STT → LLM → TTS).

## Audio issues checklist

Use this to verify the pipeline is healthy after changes or when debugging.

1. **Mic and permissions**
   - User grants microphone access; no persistent "Could not access microphone" in UI.
   - If denied, the app shows the mic-permission screen and does not call the provider.
   - **System/browser mic:** On Windows (and other OSes), the system or browser may be using the wrong input device. If Shelly doesn’t hear you or hears silence, ask the user to check: Windows Sound settings → Input device; browser (e.g. Chrome) site settings → Microphone → ensure the correct device is selected.

2. **State flow**
   - After start: state moves to `listening`. UI shows "Shelly is listening".
   - On speech (above VAD threshold for 150 ms): state → `recording`, then when silence for 600 ms → request to `/api/talk`, state → `processing`.
   - When meta is received: state → `speaking`, mood from meta. When audio finishes playing: state → `listening` again.
   - Mute: state → `muted`; unmute → back to previous state (usually `listening`).

3. **Empty or noise-only input**
   - Very short or quiet audio: blob may be dropped (size &lt; 6000 bytes) and client goes back to listening without calling the API.
   - If the server receives audio but STT returns empty text: route closes the stream without sending meta; client stream-end handler should transition back to listening (no TTS).

4. **Errors**
   - API errors (4xx/5xx) or stream `type: 'error'`: client should show the error message and transition back to listening (or show "Try again"). No stuck "processing" or "speaking".
   - TTS or decode failures: same — error surfaced, transition to listening.

5. **"Unusual activity" / provider limits**
   - **ElevenLabs TTS** can return 401 with `detected_unusual_activity` on free tier (server IP, VPN, or abuse detection). The app maps this to a friendly message and, if `GEMINI_API_KEY` is set, automatically falls back to Gemini TTS for that request. To avoid it: set `SPEECH_TTS_PROVIDER=gemini` or use a paid ElevenLabs plan.
   - **OpenAI** (STT or chat) may show similar "unusual activity" from server/datacenter IPs. Using `SPEECH_STT_PROVIDER=gemini` avoids OpenAI STT; Gemini can have slightly higher latency but is more reliable from server environments.

6. **No double-play or stuck state**
   - Only one playback at a time; when audio ends, exactly one transition to listening.
   - Stream ended without meta (e.g. empty user text): client transitions to listening, does not wait for meta.

## Capturing a failing session

- **Client**: Reproduce the issue with DevTools Console open; copy or save the `[Shelly]` log sequence.
- **Network**: In DevTools → Network, find the POST to `/api/talk`; inspect request (FormData) and response (NDJSON stream or error body).
- **Server**: Note the terminal output for that request (route and SpeechService logs). Include any `SpeechServiceError` or stack trace.

## Key files

| Area            | File |
|-----------------|------|
| Talk page       | [app/talk/page.tsx](app/talk/page.tsx) |
| Voice hook      | [app/hooks/useVoiceSession.ts](app/hooks/useVoiceSession.ts) |
| Native provider | [lib/speech/voice/native.ts](lib/speech/voice/native.ts) |
| Talk API        | [app/api/talk/route.ts](app/api/talk/route.ts) |
| Speech service  | [lib/speech/SpeechService.ts](lib/speech/SpeechService.ts) |
| Config          | [lib/speech/config.ts](lib/speech/config.ts) |
| Startup health  | [lib/health/](lib/health/), [app/api/health/route.ts](app/api/health/route.ts) |
