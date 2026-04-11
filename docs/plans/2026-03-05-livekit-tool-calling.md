# LiveKit Tool Calling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `propose_missions` and `end_conversation` tool calling to the LiveKit agent so Tammy proposes missions at the end of every conversation.

**Architecture:** Tools are defined using the `tool()` helper from `@livekit/agents` and passed to `TammyAgent`. When Tammy calls a tool, its `execute` function publishes a data channel message to the LiveKit room; the React client's existing `DataReceived` handler emits the event to `useVoiceSession`, which already wires `missionChoices` and `end` to the talk page.

**Tech Stack:** `@livekit/agents` `tool()` helper (JSONSchema7 parameters), LiveKit data channel (`room.localParticipant.publishData`), TypeScript

---

## Workflow

```
git checkout -b feat/livekit-tool-calling
# implement tasks below
# manual end-to-end test
git push origin feat/livekit-tool-calling
# open PR → merge → deploy app to Vercel + restart agent on server
```

---

### Task 1: Update `TammyAgent` to accept tools and update instructions

**Files:**
- Modify: `livekit-agent/agent.ts`

**Step 1: Read the current file**

```bash
cat livekit-agent/agent.ts
```

**Step 2: Replace the file with the updated version**

The constructor now accepts an optional `tools` array and passes it to `super()`. Instructions gain a mission-ending directive.

```ts
import { voice, type ToolContext } from '@livekit/agents';

export class TammyAgent extends voice.Agent {
  constructor(options?: { childName?: string; topics?: string[]; tools?: ToolContext }) {
    let instructions = `You are Tammy, a friendly sea turtle who chats with children aged 4-10.

CONVERSATION FOCUS — stay on the child:
- Always focus on the child: their feelings, what they did today, and what they are saying right now.
- Prioritise how they feel and what happened in their day. Do not wander off into unrelated topics.
- Listen to what the child actually said and respond to that. Keep the conversation about them.

SPEAKING RULES:
- Always respond in English only.
- Keep every response to 1 sentence + 1 question. No more.
- End EVERY turn with a single simple question that invites the child to speak.
- Use tiny words. Short sentences. Lots of warmth. Never discuss violence or scary topics.

ENDING THE CONVERSATION:
- When the child says goodbye, wants to stop, or after 8-10 turns, wrap up warmly.
- Before ending, ALWAYS call propose_missions with exactly 3 fun challenges based on what the child talked about.
- After calling propose_missions, say a warm goodbye, then call end_conversation.`;

    if (options?.childName) {
      instructions += `\n\nThe child's name is ${options.childName}. Use their name occasionally.`;
    }
    if (options?.topics?.length) {
      instructions += `\n\nThis child has enjoyed talking about: ${options.topics.join(', ')}. Reference naturally if relevant.`;
    }

    super({ instructions, tools: options?.tools });
  }
}
```

**Step 3: Verify TypeScript compiles**

```bash
cd livekit-agent && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors (or only pre-existing ones unrelated to this file).

**Step 4: Commit**

```bash
git add livekit-agent/agent.ts
git commit -m "feat(agent): accept tools + add mission-ending instructions to TammyAgent"
```

---

### Task 2: Define tools and wire them in `main.ts`

**Files:**
- Modify: `livekit-agent/main.ts`

**Step 1: Read the current file**

```bash
cat livekit-agent/main.ts
```

**Step 2: Add the `tool` import at the top**

Add `tool` to the existing `@livekit/agents` import:

```ts
import { type JobContext, ServerOptions, cli, defineAgent, tool, voice } from '@livekit/agents';
```

**Step 3: Add `sendData` helper and tool definitions inside the `entry` function, before `session` is created**

Insert after `const { childName, topics } = parseDispatchMetadata(ctx);`:

```ts
    // ── Tools ────────────────────────────────────────────────────────────────
    // room is available after ctx.connect(); tools are only called during
    // conversation so this reference is always live by then.
    const room = ctx.room;

    const proposeMissionsTool = tool({
      description: 'Propose exactly 3 age-appropriate missions/challenges for the child based on what they talked about. Call this before ending every conversation.',
      parameters: {
        type: 'object' as const,
        properties: {
          choices: {
            type: 'array',
            description: 'Exactly 3 mission choices',
            minItems: 3,
            maxItems: 3,
            items: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Short mission title (5 words max)' },
                description: { type: 'string', description: 'What the child will do (1 sentence)' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'stretch'], description: 'easy=anyone can do it, medium=a little challenge, stretch=big challenge' },
              },
              required: ['title', 'description', 'difficulty'],
            },
          },
        },
        required: ['choices'],
      },
      execute: async (args: { choices: Array<{ title: string; description: string; difficulty: string }> }) => {
        sendData(room, { type: 'missionChoices', choices: args.choices });
        return 'Missions proposed successfully.';
      },
    });

    const endConversationTool = tool({
      description: 'End the conversation after you have said goodbye. Only call this after propose_missions.',
      execute: async () => {
        sendData(room, { type: 'endConversation' });
        // Disconnect after a short delay so farewell audio can finish playing
        setTimeout(() => { room.disconnect(); }, 3000);
        return 'Conversation ended.';
      },
    });
```

**Step 4: Pass tools to `TammyAgent`**

Replace:
```ts
      agent: new TammyAgent({ childName, topics }),
```
With:
```ts
      agent: new TammyAgent({ childName, topics, tools: [proposeMissionsTool, endConversationTool] }),
```

**Step 5: Remove the now-redundant `const room = ctx.room;` line** that already existed after `await ctx.connect()`

The variable is now declared earlier (before `session`). Remove the duplicate:
```ts
    const room = ctx.room;  // ← delete this line (appears after ctx.connect())
```

**Step 6: Verify TypeScript compiles**

```bash
cd livekit-agent && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 7: Commit**

```bash
git add livekit-agent/main.ts
git commit -m "feat(agent): add propose_missions and end_conversation tools to LiveKit agent"
```

---

### Task 3: Handle new data channel message types in `livekit.ts`

**Files:**
- Modify: `lib/speech/voice/livekit.ts:74-92`

**Step 1: Write the failing test**

In `__tests__/services/livekit-provider.test.ts` (create if it doesn't exist):

```ts
// __tests__/services/livekit-provider.test.ts
import { LiveKitVoiceProvider } from '@/lib/speech/voice/livekit';

// Mock livekit-client
jest.mock('livekit-client', () => ({
  Room: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    localParticipant: { setMicrophoneEnabled: jest.fn().mockResolvedValue(undefined) },
  })),
  RoomEvent: { Disconnected: 'disconnected', DataReceived: 'dataReceived', TrackSubscribed: 'trackSubscribed', TrackUnsubscribed: 'trackUnsubscribed' },
  Track: { Kind: { Audio: 'audio' } },
}));

describe('LiveKitVoiceProvider data channel', () => {
  let provider: LiveKitVoiceProvider;

  beforeEach(() => {
    provider = new LiveKitVoiceProvider();
  });

  it('emits missionChoices when agent sends missionChoices data message', () => {
    const choices = [
      { title: 'Draw a turtle', description: 'Draw a picture', difficulty: 'easy' },
      { title: 'Read a book', description: 'Read for 10 mins', difficulty: 'medium' },
      { title: 'Write a story', description: 'Write 5 sentences', difficulty: 'stretch' },
    ];
    const payload = new TextEncoder().encode(JSON.stringify({ type: 'missionChoices', choices }));

    const onChoices = jest.fn();
    provider.on('missionChoices', onChoices);

    // Simulate DataReceived
    (provider as any).handleData(payload);

    expect(onChoices).toHaveBeenCalledWith(choices);
  });

  it('calls stop() when agent sends endConversation data message', () => {
    const stopSpy = jest.spyOn(provider, 'stop');
    const payload = new TextEncoder().encode(JSON.stringify({ type: 'endConversation' }));

    (provider as any).handleData(payload);

    expect(stopSpy).toHaveBeenCalled();
  });
});
```

**Step 2: Run to verify it fails**

```bash
npx jest __tests__/services/livekit-provider.test.ts --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `handleData` method doesn't exist yet.

**Step 3: Extract `handleData` method and add new message types**

In `lib/speech/voice/livekit.ts`, extract the data parsing logic from the `DataReceived` handler into a `private handleData` method, and add the two new cases:

```ts
  // Called by RoomEvent.DataReceived and directly in tests
  private handleData(payload: Uint8Array): void {
    try {
      const text = new TextDecoder().decode(payload);
      const parsed = JSON.parse(text) as {
        type?: string;
        text?: string;
        role?: 'user' | 'assistant';
        choices?: unknown[];
      };
      if (parsed.type === 'transcript' && typeof parsed.text === 'string') {
        const role = parsed.role === 'assistant' ? 'assistant' : 'user';
        this.emit('userTranscript', parsed.text);
        this._messages = [...this._messages, { role, content: parsed.text }];
        this.emit('messages', this._messages);
      } else if (parsed.type === 'missionChoices' && Array.isArray(parsed.choices)) {
        this.emit('missionChoices', parsed.choices as import('../types').MissionSuggestion[]);
      } else if (parsed.type === 'endConversation') {
        this.stop();
      }
    } catch {
      // ignore non-JSON or other data
    }
  }
```

Update the `DataReceived` room event handler to call `this.handleData`:

```ts
      room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
        if (this._generation !== gen) return;
        this.handleData(payload);
      });
```

**Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/services/livekit-provider.test.ts --no-coverage 2>&1 | tail -20
```

Expected: PASS — 2 tests passing.

**Step 5: Run full test suite to check for regressions**

```bash
npx jest --no-coverage 2>&1 | tail -10
```

Expected: same pass count as before (233+).

**Step 6: Commit**

```bash
git add lib/speech/voice/livekit.ts __tests__/services/livekit-provider.test.ts
git commit -m "feat(client): handle missionChoices and endConversation data messages in LiveKitVoiceProvider"
```

---

### Task 4: Manual end-to-end test

**Step 1: Start the agent in dev mode on your local machine (or server)**

```bash
cd livekit-agent && pnpm dev
```

Confirm you see `registered worker` in the logs.

**Step 2: Open `/talk` in the browser**

- Click "Talk to Tammy"
- Confirm Tammy greets you
- Have a short conversation (3-4 turns)
- Say "goodbye" or "I have to go"
- Confirm: mission choices appear in the UI (`MissionSelectView`)
- Confirm: selecting a mission saves it and navigates to `/missions`

**Step 3: Check agent logs for any errors**

```bash
# local dev:
# check terminal output for errors

# or on server:
journalctl -t turtle-talk-agent -n 30 --no-pager
```

---

### Task 5: Deploy and merge

**Step 1: Push branch and open PR**

```bash
git push origin feat/livekit-tool-calling
gh pr create --title "feat: propose_missions + end_conversation tool calling in LiveKit agent" \
  --body "Adds tool calling to the LiveKit agent. Tammy now proposes 3 missions at end of every conversation.

## Changes
- \`livekit-agent/agent.ts\`: accept tools, add mission-ending instructions
- \`livekit-agent/main.ts\`: define propose_missions + end_conversation tools
- \`lib/speech/voice/livekit.ts\`: handle missionChoices + endConversation data messages

## Test plan
- [ ] Manual end-to-end: Tammy greets, converses, proposes missions, ends conversation
- [ ] MissionSelectView appears with 3 choices
- [ ] Selecting a mission saves to DB and navigates to /missions
- [ ] Agent logs show no errors"
```

**Step 2: Merge to master after review**

```bash
gh pr merge --squash
git checkout master && git pull
```

**Step 3: Deploy app to Vercel production**

```bash
vercel --prod
```

**Step 4: Deploy agent to server**

On the remote server:
```bash
cd /path/to/livekit-agent
git pull
pnpm install
sudo systemctl restart turtle-talk-agent
```

**Step 5: Monitor for 10 minutes**

```bash
# on server
journalctl -t turtle-talk-agent -f
```

Watch for: job dispatched, session started, tool calls executed, session closed cleanly.

---

## Future Tasks (full scope, not in this plan)

| Tool | What it does |
|---|---|
| `report_mood` | Agent signals mood per turn → client updates turtle animation |
| `acknowledge_mission_progress` | Agent notes when child mentions working on their mission |
| `note_child_info` | Agent captures child's name, interests for memory persistence |
