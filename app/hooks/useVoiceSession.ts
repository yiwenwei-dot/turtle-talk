'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { TurtleMood, Message, MissionSuggestion } from '@/lib/speech/types';
import type { VoiceConversationProvider, VoiceSessionState, VoiceSessionOptions } from '@/lib/speech/voice/types';

interface UseVoiceSessionOptions extends VoiceSessionOptions {
  onEnd?: () => void;
  onMissionChoices?: (choices: MissionSuggestion[]) => void;
  onChildName?: (name: string) => void;
  onTopic?: (topic: string) => void;
  onMessagesChange?: (msgs: Message[]) => void;
}

interface UseVoiceSessionResult {
  state: VoiceSessionState;
  mood: TurtleMood;
  messages: Message[];
  /** Set as soon as STT returns (before meta); cleared when messages update. Show "You said: ..." for sync. */
  pendingUserTranscript: string | null;
  isMuted: boolean;
  error: string | null;
  startListening: () => Promise<void>;
  toggleMute: () => void;
  endConversation: () => void;
}

/**
 * Thin React hook over any VoiceConversationProvider.
 * Subscribes to provider events and exposes state, mood, messages, and controls.
 */
export function useVoiceSession(
  provider: VoiceConversationProvider,
  options: UseVoiceSessionOptions = {},
): UseVoiceSessionResult {
  const [state, setState] = useState<VoiceSessionState>('idle');
  const [mood, setMood] = useState<TurtleMood>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingUserTranscript, setPendingUserTranscript] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep option callbacks in refs so event handlers never go stale
  const optsRef = useRef(options);
  useEffect(() => { optsRef.current = options; });

  // Register provider event listeners once (re-run only if provider instance changes)
  useEffect(() => {
    const onState  = (s: VoiceSessionState) => setState(s);
    const onMood   = (m: TurtleMood) => setMood(m);
    const onMsgs   = (msgs: Message[]) => {
      setMessages(msgs);
      setPendingUserTranscript(null);
      optsRef.current.onMessagesChange?.(msgs);
    };
    const onUserTranscript = (text: string) => setPendingUserTranscript(text);
    const onChoices = (choices: MissionSuggestion[]) => optsRef.current.onMissionChoices?.(choices);
    const onName    = (name: string) => optsRef.current.onChildName?.(name);
    const onTopic   = (topic: string) => optsRef.current.onTopic?.(topic);
    const onError   = (msg: string) => {
      console.info('[Shelly] error from provider:', msg ? 'received' : 'empty');
      setError(msg);
    };
    const onEnd     = () => optsRef.current.onEnd?.();

    provider.on('stateChange',     onState);
    provider.on('moodChange',      onMood);
    provider.on('messages',        onMsgs);
    provider.on('userTranscript',  onUserTranscript);
    provider.on('missionChoices',  onChoices);
    provider.on('childName',      onName);
    provider.on('topic',          onTopic);
    provider.on('error',          onError);
    provider.on('end',            onEnd);

    return () => {
      provider.off('stateChange',     onState);
      provider.off('moodChange',      onMood);
      provider.off('messages',        onMsgs);
      provider.off('userTranscript',   onUserTranscript);
      provider.off('missionChoices',  onChoices);
      provider.off('childName',      onName);
      provider.off('topic',          onTopic);
      provider.off('error',          onError);
      provider.off('end',            onEnd);
      // Clean up the provider when unmounting or when provider changes
      provider.stop();
    };
  }, [provider]);

  const startListening = useCallback(async () => {
    console.info('[Shelly] startListening called');
    setError(null);
    const opts = optsRef.current;
    await provider.start({
      childName:         opts.childName,
      topics:            opts.topics,
      initialMessages:   opts.initialMessages,
      difficultyProfile: opts.difficultyProfile,
      activeMission:     opts.activeMission,
    });
  }, [provider]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      provider.setMuted(!prev);
      return !prev;
    });
  }, [provider]);

  const endConversation = useCallback(() => {
    provider.stop();
  }, [provider]);

  return { state, mood, messages, pendingUserTranscript, isMuted, error, startListening, toggleMute, endConversation };
}
