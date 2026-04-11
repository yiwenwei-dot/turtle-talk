'use client';

import { useState, useEffect, useRef } from 'react';
import type { Message } from '@/lib/speech/types';
import type { VoiceSessionState } from '@/lib/speech/voice/types';

const WORDS_PER_CHUNK = 4;
const CHUNK_INTERVAL_MS = 1300;

function getWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

interface Props {
  messages: Message[];
  state: VoiceSessionState;
  /** Shown as soon as STT returns (before meta) so "You said: ..." appears in sync with voice */
  pendingUserTranscript?: string | null;
}

export default function ConversationSubtitles({ messages, state, pendingUserTranscript }: Props) {
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const isProcessing = state === 'processing';
  const isEmpty = messages.length === 0 && !isProcessing && !pendingUserTranscript?.trim();
  const showPending = isProcessing && (pendingUserTranscript?.trim() ?? '').length > 0;

  const [phase, setPhase] = useState<'idle' | 'user' | 'tammy'>('idle');
  const [wordIndex, setWordIndex] = useState(0);
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const turnIdRef = useRef<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearIntervalRef = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    const userContent = lastUser?.content ?? '';
    const assistantContent = lastAssistant?.content ?? '';
    const newTurnId = `${userContent}|${assistantContent}`;

    if (isEmpty || (!userContent.trim() && !assistantContent.trim() && !showPending)) {
      clearIntervalRef();
      setPhase('idle');
      setWordIndex(0);
      setCurrentWords([]);
      return;
    }

    if (newTurnId !== turnIdRef.current || showPending) {
      if (showPending) {
        turnIdRef.current = `${pendingUserTranscript ?? ''}|`;
        clearIntervalRef();
        const pendingWords = getWords(pendingUserTranscript ?? '');
        if (pendingWords.length > 0) {
          setPhase('user');
          setCurrentWords(pendingWords);
          setWordIndex(0);
        }
      } else {
        turnIdRef.current = newTurnId;
        clearIntervalRef();
        const userWords = getWords(userContent);
        const assistantWords = getWords(assistantContent);

        if (userWords.length > 0) {
          setPhase('user');
          setCurrentWords(userWords);
          setWordIndex(0);
        } else if (assistantWords.length > 0) {
          setPhase('tammy');
          setCurrentWords(assistantWords);
          setWordIndex(0);
        } else {
          setPhase('idle');
          setCurrentWords([]);
          setWordIndex(0);
          return;
        }
      }
    }

    return () => clearIntervalRef();
  }, [messages, isEmpty, lastUser?.content, lastAssistant?.content, showPending, pendingUserTranscript]);

  useEffect(() => {
    if (phase === 'idle' || currentWords.length === 0) return;

    intervalRef.current = setInterval(() => {
      setWordIndex((prev) => {
        const next = prev + WORDS_PER_CHUNK;
        if (next >= currentWords.length) {
          if (phase === 'user' && lastAssistant?.content?.trim()) {
            const assistantWords = getWords(lastAssistant.content);
            if (assistantWords.length > 0) {
              clearIntervalRef();
              setPhase('tammy');
              setCurrentWords(assistantWords);
              return 0;
            }
          }
          clearIntervalRef();
          setPhase('idle');
          return 0;
        }
        return next;
      });
    }, CHUNK_INTERVAL_MS);

    return () => clearIntervalRef();
  }, [phase, currentWords, lastAssistant?.content]);

  const chunk = currentWords.slice(wordIndex, wordIndex + WORDS_PER_CHUNK);
  const captionText = chunk.join(' ');
  const isTammy = phase === 'tammy';
  const showCaption = (phase === 'user' || phase === 'tammy') && captionText.length > 0;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 440,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        padding: '0 4px',
        minHeight: 110,
      }}
    >
      {isEmpty ? (
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '1.15rem',
            fontWeight: 600,
            margin: 0,
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Say something to Tammy! 🐢
        </p>
      ) : (
        <div style={{ textAlign: 'center', width: '100%' }}>
          {isProcessing && !showCaption ? (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingTop: 4 }}>
              {[0, 1, 2].map((j) => (
                <span
                  key={j}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.75)',
                    display: 'inline-block',
                    animation: 'typingDot 1.2s ease-in-out infinite',
                    animationDelay: `${j * 0.2}s`,
                  }}
                />
              ))}
            </div>
          ) : showCaption ? (
            <p
              style={{
                fontSize: 'clamp(1.2rem, 4.5vw, 1.5rem)',
                fontWeight: 700,
                color: isTammy ? '#4ade80' : 'white',
                lineHeight: 1.45,
                margin: 0,
                textShadow: '0 2px 12px rgba(0,0,0,0.45)',
                animation: 'subtitleFade 0.3s ease-out both',
              }}
              aria-label={isTammy ? 'Tammy' : 'You'}
            >
              {captionText}
            </p>
          ) : phase === 'idle' && (lastAssistant || lastUser) ? (
            <p
              style={{
                fontSize: 'clamp(0.95rem, 3.5vw, 1.1rem)',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.5)',
                margin: 0,
              }}
            >
              &nbsp;
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
