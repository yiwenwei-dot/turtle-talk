# Vapi Assistant Integration Design

**Date:** 2026-02-27
**Status:** Approved

## Problem

The app already has `VapiVoiceProvider` using inline assistant config in `vapi.start()`. The goal is to switch to a pre-built Vapi dashboard assistant (`985d923d-6efc-43ef-b9a9-4b935c954a9c`) while keeping the custom LLM backend (`/api/vapi/llm`) for guardrails, mood, and missions.

## Approach

Use `assistantId` + `assistantOverrides` in `vapi.start()`. The dashboard assistant owns voice/transcriber config; the model is overridden at call-time to point at our custom LLM endpoint.

## Changes

### `lib/speech/voice/vapi.ts`

Replace the inline `vapi.start({ transcriber, model, voice, name })` call with:

```ts
await this.vapi.start({
  assistantId: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID,
  assistantOverrides: {
    model: {
      provider: 'custom-llm',
      url: `${llmBaseUrl}/api/vapi/llm`,
      model: 'tammy',
      metadataSendMode: 'variable',
    },
    variableValues: {
      childName: options.childName ?? 'friend',
    },
  },
  metadata: {
    childName: options.childName ?? null,
    topics: options.topics ?? [],
    difficultyProfile: options.difficultyProfile ?? 'beginner',
    activeMission: options.activeMission ?? null,
  },
});
```

Where `llmBaseUrl` is `process.env.NEXT_PUBLIC_CUSTOM_LLM_URL || (typeof window !== 'undefined' ? window.location.origin : '')`.

### New env vars

```
NEXT_PUBLIC_VAPI_ASSISTANT_ID=985d923d-6efc-43ef-b9a9-4b935c954a9c
NEXT_PUBLIC_CUSTOM_LLM_URL=   # empty in prod; set to ngrok URL for local dev
```

### No changes needed

- `/api/vapi/llm/route.ts` — already reads context from `body.metadata`
- `app/talk/page.tsx` — already instantiates `VapiVoiceProvider`
- `useVoiceSession` hook — no change
- All other files — no change

## Local Dev

Set `NEXT_PUBLIC_CUSTOM_LLM_URL=https://<id>.ngrok.io` in `.env.local` so Vapi can reach the custom LLM endpoint from their servers.

## Vapi Dashboard Requirements

- The assistant's **voice and transcriber** can be configured in the dashboard (ElevenLabs key added to Vapi provider settings)
- The **model** is overridden at call-time, so the dashboard model config is irrelevant

## Files Touched

1. `lib/speech/voice/vapi.ts` — swap inline config for assistantId + overrides
2. `.env.example` — add `NEXT_PUBLIC_VAPI_ASSISTANT_ID` and `NEXT_PUBLIC_CUSTOM_LLM_URL`
