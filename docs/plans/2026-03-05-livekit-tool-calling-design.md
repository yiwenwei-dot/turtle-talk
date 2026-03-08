# LiveKit Agent Tool Calling — Design

**Date:** 2026-03-05
**Status:** Approved
**Scope:** Core tools only (`propose_missions`, `end_conversation`)

## Background

The LiveKit agent (`livekit-agent/main.ts`) currently has no tool calling. Missions are never proposed and conversations end without any structured output. The native provider path had 5 LangChain tools; this design ports the two core ones to the LiveKit/OpenAI Realtime path.

## Full Scope (implement incrementally)

| Tool | Priority |
|---|---|
| `propose_missions` | Core (this plan) |
| `end_conversation` | Core (this plan) |
| `report_mood` | Later |
| `acknowledge_mission_progress` | Later |
| `note_child_info` | Later |

## Architecture (Option A — Realtime tools on agent)

All tool logic lives in the agent. The client receives results via the LiveKit data channel and reacts without any extra API calls.

```
[Child speaks] → OpenAI Realtime → [Shelly responds]
                                  → [Shelly calls propose_missions tool]
                                      → agent sends { type: 'missionChoices', choices } over data channel
                                  → [Shelly calls end_conversation tool]
                                      → agent sends { type: 'endConversation' } over data channel
                                      → agent disconnects room after farewell audio
```

## Section 1: Agent (`livekit-agent/main.ts`)

Two tools added to `RealtimeModel`:

- **`propose_missions`** — `choices: MissionSuggestion[]` (array of 3, each with `title`, `description`, `theme: MissionTheme`, `difficulty: 'easy'|'medium'|'stretch'`). Shelly calls this when wrapping up.
- **`end_conversation`** — no args. Called after missions are proposed. Agent disconnects room after a short delay so farewell audio can finish.

`ShellyAgent` instructions amended: "At the end of every conversation, call `propose_missions` with 3 age-appropriate challenges based on what the child mentioned, then call `end_conversation`."

Tool call handler:
1. Send tool result back to model (required by OpenAI Realtime)
2. Publish data message to room (`missionChoices` or `endConversation`)
3. For `end_conversation`: short delay then `room.disconnect()`

## Section 2: Data Channel Protocol

New message types (alongside existing `transcript`):

```ts
type LiveKitControlMessage =
  | { type: 'missionChoices'; choices: MissionSuggestion[] }
  | { type: 'endConversation' };
```

- Both sent with `{ reliable: true }`
- Order guaranteed: `missionChoices` before `endConversation`
- `MissionSuggestion` matches the existing type in `lib/speech/types.ts` (title, description, optional theme, difficulty).

## Section 3: Client (`lib/speech/voice/livekit.ts`)

Two new cases in the `DataReceived` handler:

```ts
if (parsed.type === 'missionChoices') this.emit('missionChoices', parsed.choices);
if (parsed.type === 'endConversation') this.stop();
```

No changes needed to `app/talk/page.tsx`, `useVoiceSession.ts`, or any DB/mission hooks — existing wiring handles both events.

## Workflow

1. Feature branch off `master`
2. Implement + test locally (agent dev mode against LiveKit Cloud)
3. Deploy agent to server, deploy app to Vercel preview
4. Manual test end-to-end
5. Merge to master, deploy to production, monitor agent logs
