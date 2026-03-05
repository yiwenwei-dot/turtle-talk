This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).  
TurtleTalk is a children's voice-chat app: talk to Shelly the sea turtle, get voice replies, and earn brave missions.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database (Supabase)

**Two data paths:** `NEXT_PUBLIC_DB_PROVIDER` (localStorage / supabase / convex) controls only **missions** and **child memory** (Talk, Missions, World). The **parent dashboard** (/parent) always uses Supabase: children list, weekly reports, dinner questions, and auth. So switching to `localStorage` does not change parent behaviour — you still need Supabase configured for /parent and /login. Parent mission counts and weekly reports read from the Supabase `missions` table; if you use `localStorage` for the app, those counts may be zero or stale.

**Child login** (name + code + emoji on device) requires Supabase and a session secret. In `.env.local` set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `CHILD_SESSION_SECRET` (any random string ≥16 characters). Parents manage children and view login codes at `/parent` → Children.

If you set `NEXT_PUBLIC_DB_PROVIDER=supabase`, run the migrations in your Supabase project or the app will get 404s on `/rest/v1/missions`. In the [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor, run the contents of `supabase/migrations/001_initial.sql`, `002_indexes.sql`, `003_profiles_children_waiting_list.sql`, **`006_fix_profiles_rls_recursion.sql`** (fixes "infinite recursion detected in policy for relation profiles" on /api/parent/children), and **`007_wish_list_tree_encouragement.sql`** (wish list, parent encouragement, child tree for the World page). Alternatively, from the project root run **`npx supabase db push`** (or `supabase db push` if you have the CLI) to apply all pending migrations so the server database matches the codebase.

## Voice and audio

Set `NEXT_PUBLIC_VOICE_PROVIDER` to choose how the app talks to Shelly:

| Provider        | Description |
|----------------|-------------|
| `native`       | (default) Browser VAD + MediaRecorder; STT/LLM/TTS via `/api/talk`. |
| `vapi`         | Vapi WebRTC; custom LLM at `/api/vapi/llm`. |
| `gemini-live`  | Gemini Live API (real-time bidirectional voice). |
| `livekit`      | LiveKit room + agent; agent uses Gemini Live for voice. See [livekit-agent](livekit-agent/README.md). |

For the **native** pipeline, for Shelly to reply with real conversation (not just “I’m listening, tell me more”), use **Anthropic** or **OpenAI** for the chat step: set `SPEECH_CHAT_PROVIDER=anthropic` (or `openai`) and the matching API key in `.env.local`. See `.env.example` for all speech options.

**LiveKit**: To use `livekit`, run the agent in `livekit-agent/` (e.g. `pnpm dev` after `lk cloud auth` and setting `GOOGLE_API_KEY`). Add `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` to `.env.local` so the app can issue room tokens at `/api/livekit/token`.

See [DEBUG.md](DEBUG.md) for the voice pipeline overview, how to enable logs, and an audio-issues checklist.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
