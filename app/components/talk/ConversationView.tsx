'use client';

import { useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useVoiceSession } from '@/app/hooks/useVoiceSession';
import { useMissions } from '@/app/hooks/useMissions';
import { usePersonalMemory } from '@/app/hooks/usePersonalMemory';
import { useChildSession } from '@/app/hooks/useChildSession';
import { createVoiceProvider } from '@/lib/speech/voice';
import { getUserFacingMessage } from '@/lib/speech/errors';
import TurtleCharacter from '@/app/components/talk/TurtleCharacter';
import MissionSelectView from '@/app/components/talk/MissionSelectView';
import ConversationSubtitles from '@/app/components/talk/ConversationSubtitles';
import ConversationBubblesCard from '@/app/components/talk/ConversationBubblesCard';
import BottomNav from '@/app/components/BottomNav';
import { PullToRetry } from '@/app/components/talk/PullToRetry';
import type { TalkNavProps } from '@/app/components/BottomNav';
import type { MissionSuggestion } from '@/lib/speech/types';

const ACTIVE_STATES_SET = new Set(['listening', 'recording', 'processing', 'speaking']);

const STATE_LABELS: Record<string, string> = {
  idle:       'Getting ready...',
  connecting: 'Connecting to Shelly...',
  listening:  'Shelly is listening 👂',
  recording:  'I hear you! 🎤',
  processing: 'Shelly is thinking... 🐢',
  speaking:   'Shelly is speaking!',
  muted:      'Microphone off 🔇',
  ended:      'Goodbye! 🌊',
};

export function ConversationView() {
  const router = useRouter();
  const { child } = useChildSession();
  const childId = child?.childId;
  const { addMission, completedMissions, activeMissions } = useMissions(childId);
  const { childName, messages: savedMessages, topics, saveChildName, saveMessages, saveTopic } =
    usePersonalMemory(childId);

  const [pendingMissionChoices, setPendingMissionChoices] = useState<MissionSuggestion[] | null>(null);

  // Use a ref so the onEnd callback always reads the latest value without needing re-registration
  const pendingChoicesRef = useRef<MissionSuggestion[] | null>(null);
  pendingChoicesRef.current = pendingMissionChoices;

  const difficultyProfile: 'beginner' | 'intermediate' | 'confident' =
    completedMissions.length >= 5 ? 'confident'
    : completedMissions.length >= 2 ? 'intermediate'
    : 'beginner';

  // The child's first active mission, if any — passed to the agent for coaching
  const activeMission = activeMissions[0] ?? null;

  // Stable provider instance — one per mount (default: LiveKit room + agent)
  const providerRef = useRef<ReturnType<typeof createVoiceProvider> | null>(null);
  if (!providerRef.current) providerRef.current = createVoiceProvider();

  const { state, mood, messages, pendingUserTranscript, isMuted, error, isMeaningful, toggleMute, endConversation, startListening } =
    useVoiceSession(providerRef.current, {
      // Stay on /talk when call ends; post-call bar shows Continue / My Missions / Home
      onEnd: () => {},
      onMissionChoices: setPendingMissionChoices,
      initialMessages: savedMessages,
      childName,
      topics,
      onChildName: saveChildName,
      onTopic: saveTopic,
      onMessagesChange: saveMessages,
      difficultyProfile,
      activeMission,
    });

  // Do not auto-start: AudioContext must be created/resumed after a user gesture (Chrome autoplay policy).
  // Start only when the user taps "Start" / "Talk to Shelly" so the gesture unblocks audio.

  const callEnded = state === 'ended';

  const noopFn = useCallback(() => {}, []);

  const talkNavProps: TalkNavProps = useMemo(() => ({
    state,
    isMuted,
    isMeaningful,
    hasError: !!error,
    onStart: startListening,
    onEnd: endConversation,
    onToggleMute: ACTIVE_STATES_SET.has(state) ? toggleMute : noopFn,
    onContinue: startListening,
  }), [state, isMuted, isMeaningful, error, startListening, endConversation, toggleMute, noopFn]);

  if (pendingMissionChoices) {
    return (
      <MissionSelectView
        choices={pendingMissionChoices}
        onSelect={(choice) => {
          addMission(choice);
          setPendingMissionChoices(null);
          router.push('/missions');
        }}
        onDismiss={() => {
          setPendingMissionChoices(null);
          router.push('/missions');
        }}
      />
    );
  }

  return (
    <main
      style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 48,
        paddingBottom: 120,
        paddingLeft: 20,
        paddingRight: 20,
        gap: 16,
      }}
    >
      {/* ── Top bar: TurtleTalk title (centered) ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '14px 20px',
          zIndex: 20,
        }}
      >
        <span
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.95rem',
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          TurtleTalk
        </span>
      </div>

      {/* ── Turtle (moved up) ── */}
      <PullToRetry onRetry={error ? startListening : undefined}>
        <div className={state === 'listening' ? 'tt-listening-ring' : undefined}>
          <TurtleCharacter mood={mood} size={200} />
        </div>
      </PullToRetry>

      {/* ── Conversation card: last 3 bubbles, show/hide toggle ── */}
      <div style={{ width: '100%', maxWidth: 440 }}>
        <ConversationBubblesCard messages={messages} pendingUserTranscript={pendingUserTranscript} />
      </div>

      {state !== 'idle' && state !== 'connecting' && state !== 'ended' && (
        <p
          style={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: '0.95rem',
            fontWeight: 600,
            margin: 0,
            textAlign: 'center',
            minHeight: 22,
          }}
        >
          {STATE_LABELS[state] ?? ''}
        </p>
      )}

      {/* ── Subtitles; when error, show one short line and Try again is in the bottom bar ── */}
      <ConversationSubtitles messages={messages} state={state} pendingUserTranscript={pendingUserTranscript} />
      {error && (
        <p
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.9rem',
            margin: 0,
            textAlign: 'center',
            maxWidth: 360,
          }}
        >
          {getUserFacingMessage(error)}
        </p>
      )}

      {/* ── Dev-only: trigger MissionSelectView without a full conversation ── */}
      {process.env.NODE_ENV !== 'production' && (
        <button
          type="button"
          onClick={() => setPendingMissionChoices([
            { title: 'Draw a turtle', description: 'Draw your best sea turtle picture.', difficulty: 'easy' },
            { title: 'Help at home', description: 'Do one helpful thing without being asked.', difficulty: 'medium' },
            { title: 'Write a story', description: 'Write 5 sentences about an ocean adventure.', difficulty: 'stretch' },
          ])}
          style={{
            position: 'fixed',
            bottom: 80,
            right: 12,
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(0,0,0,0.4)',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.75rem',
            cursor: 'pointer',
            zIndex: 50,
          }}
        >
          🧪 Test Missions
        </button>
      )}

      {/* ── Bottom nav: always rendered, shows call controls when in active/connecting/ended state ── */}
      <BottomNav talkProps={talkNavProps} />
    </main>
  );
}
