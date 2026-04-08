'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMicPermission } from '@/app/hooks/useMicPermission';
import { useVoiceSession } from '@/app/hooks/useVoiceSession';
import { useAwareness } from '@/app/hooks/useAwareness';
import { useMissions } from '@/app/hooks/useMissions';
import { usePersonalMemory } from '@/app/hooks/usePersonalMemory';
import { useChildSession } from '@/app/hooks/useChildSession';
import { useCallFeedback } from '@/app/hooks/useCallFeedback';
import { createVoiceProvider } from '@/lib/speech/voice';
import { getDeviceId } from '@/lib/db';
import type { MissionSuggestion } from '@/lib/speech/types';
import type { CallRating } from '../components/HowWasYourCallModal';
import BraveMissionsView from '../components/BraveMissionsView';
import PostCallModal from '../components/PostCallModal';
import MenuButton from '../components/MenuButton';
import TalkStatusIndicator from '../components/TalkStatusIndicator';
import ShellyLogoPlaceholder from '../components/ShellyLogoPlaceholder';
import TalkConversationCard from '../components/TalkConversationCard';
import TalkEndCallButton from '../components/TalkEndCallButton';
import TalkMuteToggle from '../components/TalkMuteToggle';
import MicPermissionV2 from '../components/MicPermissionV2';
import HowWasYourCallModal from '../components/HowWasYourCallModal';

const ACTIVE_STATES = new Set([
  'listening',
  'recording',
  'processing',
  'speaking',
  'muted',
]);

function V2ConversationView() {
  const router = useRouter();
  const { child } = useChildSession();
  const childId = child?.childId;
  const { saveCallFeedback } = useCallFeedback();
  const { addMission, completedMissions, activeMissions } = useMissions(childId);
  const {
    childName,
    messages: savedMessages,
    topics,
    saveChildName,
    saveMessages,
    saveTopic,
  } = usePersonalMemory(childId);

  const [pendingMissionChoices, setPendingMissionChoices] = useState<MissionSuggestion[] | null>(
    null,
  );
  const [feedbackModalDismissed, setFeedbackModalDismissed] = useState(false);
  const [showFeedbackThenPostCall, setShowFeedbackThenPostCall] = useState(false);
  const [showPostCallModal, setShowPostCallModal] = useState(false);

  const callEndedAtRef = useRef<string | null>(null);
  const feedbackRatingRef = useRef<CallRating | null>(null);

  const difficultyProfile: 'beginner' | 'intermediate' | 'confident' =
    completedMissions.length >= 5
      ? 'confident'
      : completedMissions.length >= 2
        ? 'intermediate'
        : 'beginner';

  const activeMission = activeMissions[0] ?? null;
  const { timezone, clientLocalTime, location } = useAwareness();

  const providerRef = useRef<ReturnType<typeof createVoiceProvider> | null>(null);
  if (!providerRef.current) providerRef.current = createVoiceProvider();

  const {
    state,
    messages,
    pendingUserTranscript,
    isMuted,
    error,
    toggleMute,
    endConversation,
    startListening,
  } = useVoiceSession(providerRef.current, {
    autoConnect: true,
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
    timezone: timezone || undefined,
    clientLocalTime,
    location: location ?? undefined,
  });

  const hasError = !!error;
  const status = hasError ? 'error' : state === 'connecting' ? 'warning' : 'ok';
  const callActive = ACTIVE_STATES.has(state);

  useEffect(() => {
    if (state !== 'ended') setFeedbackModalDismissed(false);
  }, [state]);

  const showHowWasYourCallModal =
    state === 'ended' && !showPostCallModal && (showFeedbackThenPostCall || !feedbackModalDismissed);
  const showPostCallAfterFeedback = state === 'ended' && showPostCallModal;

  useEffect(() => {
    if (showHowWasYourCallModal && !callEndedAtRef.current) {
      callEndedAtRef.current = new Date().toISOString();
    }
  }, [showHowWasYourCallModal]);

  const handleFeedbackDone = useCallback(() => {
    const callEndedAt = callEndedAtRef.current ?? new Date().toISOString();
    const dismissedAt = new Date().toISOString();
    const timeToDismissMs =
      callEndedAtRef.current != null
        ? Date.now() - new Date(callEndedAtRef.current).getTime()
        : undefined;
    const effectiveChildId =
      childId ?? (typeof window !== 'undefined' ? getDeviceId() : 'default');
    saveCallFeedback({
      childId: effectiveChildId,
      rating: feedbackRatingRef.current ?? null,
      dismissedAt,
      callEndedAt,
      source: 'v2',
      ...(timeToDismissMs != null && { timeToDismissMs }),
    })
      .catch((err) => {
        // Avoid crashing the UI if feedback persistence fails (e.g. table missing in Supabase).
        console.error('[CallFeedback] save failed', err);
      })
      .finally(() => {
      callEndedAtRef.current = null;
      feedbackRatingRef.current = null;
      if (showFeedbackThenPostCall) {
        setShowFeedbackThenPostCall(false);
      }
      setFeedbackModalDismissed(true);
      setShowPostCallModal(true);
    });
  }, [childId, saveCallFeedback, showFeedbackThenPostCall]);

  if (pendingMissionChoices && !callActive) {
    return (
      <BraveMissionsView
        choices={pendingMissionChoices}
        onSelectMission={(choice) => {
          addMission(choice);
          setPendingMissionChoices(null);
          router.push('/missions');
        }}
        onFinishCall={() => {
          setPendingMissionChoices(null);
          setShowFeedbackThenPostCall(true);
        }}
        onTalkAboutMission={(mission) => {
          addMission(mission);
          setPendingMissionChoices(null);
          router.push('/talk');
        }}
      />
    );
  }

  return (
    <>
      {showHowWasYourCallModal && (
        <HowWasYourCallModal
          onSelect={(rating) => {
            feedbackRatingRef.current = rating;
          }}
          onDone={handleFeedbackDone}
        />
      )}

      {showPostCallAfterFeedback && (
        <PostCallModal
          onNewCall={() => {
            setShowPostCallModal(false);
            startListening();
          }}
          onGoHome={() => {
            setShowPostCallModal(false);
            router.push('/');
          }}
        />
      )}

      <MenuButton />

      <div
        style={{
          position: 'fixed',
          top: 'max(16px, env(safe-area-inset-top))',
          right: 'max(16px, env(safe-area-inset-right))',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <TalkStatusIndicator status={status} hasError={hasError} />
      </div>

      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'max(80px, env(safe-area-inset-top)) 24px max(120px, calc(24px + env(safe-area-inset-bottom)))',
          gap: 20,
          maxWidth: 500,
          margin: '0 auto',
        }}
      >
        <ShellyLogoPlaceholder
          animate={state === 'connecting'}
          compact={state !== 'idle'}
        />
        <TalkConversationCard
          messages={messages}
          pendingUserTranscript={pendingUserTranscript}
          isThinking={state === 'processing'}
          state={state}
        />
        <TalkEndCallButton
          state={state}
          hasError={hasError}
          missionGenerated={!!pendingMissionChoices && callActive}
          onEnd={endConversation}
          onRetry={startListening}
          onStart={startListening}
        />
        <TalkMuteToggle isMuted={isMuted} onToggle={toggleMute} callActive={callActive} />
      </main>
    </>
  );
}

export default function V2TalkPage() {
  const { status, requestPermission } = useMicPermission();
  const router = useRouter();

  if (status === 'checking') {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--v2-bg)',
        }}
      >
        <p style={{ color: 'var(--v2-text-secondary)', fontSize: '1.125rem' }}>Loading...</p>
      </main>
    );
  }

  if (status === 'denied' || status === 'prompt') {
    return (
      <MicPermissionV2
        onGranted={requestPermission}
        onDenied={() => router.push('/')}
      />
    );
  }

  return <V2ConversationView />;
}
