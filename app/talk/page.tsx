'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMicPermission } from '@/app/hooks/useMicPermission';
import { useVoiceSession } from '@/app/hooks/useVoiceSession';
import { useMissions } from '@/app/hooks/useMissions';
import { usePersonalMemory } from '@/app/hooks/usePersonalMemory';
import { useChildSession } from '@/app/hooks/useChildSession';
import { createVoiceProvider } from '@/lib/speech/voice';
import { getUserFacingMessage } from '@/lib/speech/errors';
import TurtleCharacter from '@/app/components/talk/TurtleCharacter';
import MicPermission from '@/app/components/talk/MicPermission';
import MissionSelectView from '@/app/components/talk/MissionSelectView';
import ConversationSubtitles from '@/app/components/talk/ConversationSubtitles';
import ConversationBubblesCard from '@/app/components/talk/ConversationBubblesCard';
import TalkBottomBar from '@/app/components/talk/TalkBottomBar';
import type { MissionSuggestion } from '@/lib/speech/types';

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

function ConversationView() {
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

  const { state, mood, messages, pendingUserTranscript, isMuted, error, toggleMute, endConversation, startListening } =
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

  const callEnded = state === 'ended';

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
        paddingBottom: 100,
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
      <div className={state === 'listening' ? 'tt-listening-ring' : undefined}>
        <TurtleCharacter mood={mood} size={200} />
      </div>

      {/* ── Conversation card: last 3 bubbles, show/hide toggle ── */}
      <div style={{ width: '100%', maxWidth: 440 }}>
        <ConversationBubblesCard messages={messages} pendingUserTranscript={pendingUserTranscript} />
      </div>

      {/* ── When idle: Start button; when connecting: same button with "Connecting..." and disabled; otherwise status label ── */}
      {state === 'idle' || state === 'connecting' ? (
        <button
          type="button"
          className="tt-tap-shake"
          onClick={() => state === 'idle' && startListening()}
          disabled={state === 'connecting'}
          style={{
            padding: '12px 28px',
            borderRadius: 9999,
            border: '2px solid rgba(255,255,255,0.3)',
            background: state === 'connecting'
              ? 'linear-gradient(135deg, #15803d, #16a34a)'
              : 'linear-gradient(135deg, #16a34a, #22c55e)',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: state === 'connecting' ? 'wait' : 'pointer',
            boxShadow: '0 4px 20px rgba(22,163,74,0.4)',
            opacity: state === 'connecting' ? 0.9 : 1,
          }}
          aria-label={state === 'connecting' ? 'Connecting to Shelly' : 'Start conversation with Shelly'}
        >
          {state === 'connecting' ? 'Connecting…' : 'Talk to Shelly'}
        </button>
      ) : (
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

      {/* ── Contextual bottom bar: Mute, Try again (when error), End call (in-call) or post-call actions (Continue, My Missions, Home) ── */}
      <TalkBottomBar
        callEnded={callEnded}
        onEndCall={endConversation}
        onContinueConversation={startListening}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        hasError={!!error}
        onTryAgain={error ? startListening : undefined}
      />
    </main>
  );
}

export default function TalkPage() {
  const { status, requestPermission } = useMicPermission();
  const router = useRouter();

  if (status === 'checking') {
    return (
      <main
        style={{
          position: 'relative', zIndex: 10, minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <p style={{ color: 'white', fontSize: 18 }}>Loading...</p>
      </main>
    );
  }

  if (status === 'denied' || status === 'prompt') {
    return <MicPermission onGranted={requestPermission} onDenied={() => router.push('/')} />;
  }

  return <ConversationView />;
}
