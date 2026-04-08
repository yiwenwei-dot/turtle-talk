'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { TurtleMood, Message, MissionSuggestion } from '@/lib/speech/types';
import type {
  VoiceConversationProvider,
  VoiceSessionState,
  VoiceSessionOptions,
  AppToolCallEvent,
} from '@/lib/speech/voice/types';
import { handleAppToolCall } from '@/lib/speech/appTools';

interface UseVoiceSessionOptions extends VoiceSessionOptions {
  onEnd?: () => void;
  onMissionChoices?: (choices: MissionSuggestion[]) => void;
  onChildName?: (name: string) => void;
  onTopic?: (topic: string) => void;
  onMessagesChange?: (msgs: Message[]) => void;
  /** When true, call start() once after subscribing so the call starts without user tapping. */
  autoConnect?: boolean;
}

interface UseVoiceSessionResult {
  state: VoiceSessionState;
  mood: TurtleMood;
  messages: Message[];
  /** Set as soon as STT returns (before meta); cleared when messages update. Show "You said: ..." for sync. */
  pendingUserTranscript: string | null;
  isMuted: boolean;
  error: string | null;
  isMeaningful: boolean;
  startListening: () => Promise<void>;
  toggleMute: () => void;
  endConversation: () => void;
  /** Stop the provider, clear all local state, and allow autoConnect to fire again on next session. */
  resetSession: () => void;
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
  const [isMeaningful, setIsMeaningful] = useState(false);
  const callStartRef = useRef<number | null>(null);
  const meaningfulTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoConnectDoneRef = useRef(false);

  // Keep option callbacks in refs so event handlers never go stale
  const optsRef = useRef(options);
  useEffect(() => { optsRef.current = options; });

  // Register provider event listeners once (re-run only if provider instance changes).
  // When autoConnect is true, start the call after listeners are attached so we never miss state updates.
  useEffect(() => {
    const ACTIVE_STATES = new Set(['listening', 'recording', 'processing', 'speaking']);
    const onState = (s: VoiceSessionState) => {
      setState(s);
      if (ACTIVE_STATES.has(s) && callStartRef.current === null) {
        callStartRef.current = Date.now();
        meaningfulTimerRef.current = setTimeout(() => setIsMeaningful(true), 40_000);
      }
      if (s === 'ended' || s === 'idle') {
        if (meaningfulTimerRef.current) clearTimeout(meaningfulTimerRef.current);
        meaningfulTimerRef.current = null;
        callStartRef.current = null;
        // keep isMeaningful true until next call so gold state persists to post-call bar
      }
    };
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
    const onAppTool = (call: AppToolCallEvent) => {
      void handleAppToolCall(call);
    };
    const onError   = (msg: string) => {
      console.info('[Shelly] error from provider:', msg || '(empty)');
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
    provider.on('appToolCall',   onAppTool);
    provider.on('error',          onError);
    provider.on('end',            onEnd);

    const autoConnect = optsRef.current.autoConnect;
    if (autoConnect && !autoConnectDoneRef.current) {
      autoConnectDoneRef.current = true;
      queueMicrotask(() => {
        const opts = optsRef.current;
        setError(null);
        setIsMeaningful(false);
        provider.start({
          childName:         opts.childName,
          topics:            opts.topics,
          initialMessages:   opts.initialMessages,
          difficultyProfile: opts.difficultyProfile,
          activeMission:     opts.activeMission,
          ageGroup:          opts.ageGroup,
          favoriteBook:      opts.favoriteBook,
          funFacts:          opts.funFacts,
          timezone:          opts.timezone,
          clientLocalTime:   opts.clientLocalTime,
          location:          opts.location,
        }).catch(() => {});
      });
    }

    return () => {
      provider.off('stateChange',     onState);
      provider.off('moodChange',      onMood);
      provider.off('messages',        onMsgs);
      provider.off('userTranscript',   onUserTranscript);
      provider.off('missionChoices',  onChoices);
      provider.off('childName',      onName);
      provider.off('topic',          onTopic);
      provider.off('appToolCall',   onAppTool);
      provider.off('error',          onError);
      provider.off('end',            onEnd);
      // Clean up the provider when unmounting or when provider changes
      provider.stop();
      if (meaningfulTimerRef.current) clearTimeout(meaningfulTimerRef.current);
    };
  }, [provider]);

  const startListening = useCallback(async () => {
    console.info('[Shelly] startListening called');
    setError(null);
    setIsMeaningful(false);
    const opts = optsRef.current;
    await provider.start({
      childName:         opts.childName,
      topics:            opts.topics,
      initialMessages:   opts.initialMessages,
      difficultyProfile: opts.difficultyProfile,
      activeMission:     opts.activeMission,
      ageGroup:          opts.ageGroup,
      favoriteBook:      opts.favoriteBook,
      funFacts:          opts.funFacts,
      timezone:          opts.timezone,
      clientLocalTime:   opts.clientLocalTime,
      location:          opts.location,
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

  const resetSession = useCallback(() => {
    provider.stop();
    setState('idle');
    setMood('idle');
    setMessages([]);
    setPendingUserTranscript(null);
    setIsMuted(false);
    setError(null);
    setIsMeaningful(false);
    callStartRef.current = null;
    if (meaningfulTimerRef.current) clearTimeout(meaningfulTimerRef.current);
    meaningfulTimerRef.current = null;
    autoConnectDoneRef.current = false;
  }, [provider]);

  return { state, mood, messages, pendingUserTranscript, isMuted, error, isMeaningful, startListening, toggleMute, endConversation, resetSession };
}
