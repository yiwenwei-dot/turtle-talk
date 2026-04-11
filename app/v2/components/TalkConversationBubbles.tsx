'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '@/lib/speech/types';
import type { VoiceSessionState } from '@/lib/speech/voice/types';

const MAX_VISIBLE = 3;

export interface TalkConversationBubblesProps {
  messages: Message[];
  pendingUserTranscript?: string | null;
  isThinking?: boolean;
  state?: VoiceSessionState;
  hideIntroCopy?: boolean;
}

export default function TalkConversationBubbles({
  messages,
  pendingUserTranscript,
  isThinking,
  state,
  hideIntroCopy,
}: TalkConversationBubblesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const items: { role: 'user' | 'assistant'; content: string }[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const pending = pendingUserTranscript?.trim();
  if (pending) {
    const lastIsUser = items.length > 0 && items[items.length - 1].role === 'user';
    if (lastIsUser) {
      items[items.length - 1] = { role: 'user', content: pending };
    } else {
      items.push({ role: 'user', content: pending });
    }
  }

  const displayItems = items.slice(-MAX_VISIBLE * 2);
  const isEmpty = displayItems.length === 0;
  const lastItem = displayItems[displayItems.length - 1];
  const showThinkingBubble = !!isThinking && !isEmpty && lastItem.role === 'user';

  const isConnecting = state === 'connecting';
  const isListeningEmpty = state === 'listening' && isEmpty;

  useEffect(() => {
    const el = bottomRef.current as unknown as { scrollIntoView?: (opts?: ScrollIntoViewOptions) => void } | null;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [displayItems.length, pending, isThinking]);

  return (
    <div
      ref={containerRef}
      className="v2-talk-bubbles-scroll"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        maxHeight: 220,
        overflowY: 'auto',
        padding: '4px 0',
      }}
    >
      {isEmpty ? (
        hideIntroCopy ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '16px 0',
            }}
          >
            <span style={{ fontSize: 30, lineHeight: 1 }} aria-hidden>
              🐢
            </span>
            <p
              style={{
                margin: 0,
                fontSize: '0.8125rem',
                fontWeight: 400,
                color: 'var(--v2-text-muted)',
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              Once you start chatting, your conversation with Tammy will appear here.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              padding: '16px 0',
            }}
          >
            {(isConnecting || isListeningEmpty) && (
              <span
                className={isConnecting ? 'v2-tammy-connecting' : undefined}
                style={{ fontSize: 36, lineHeight: 1 }}
                aria-hidden
              >
                🐢
              </span>
            )}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                margin: 0,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  fontWeight: 400,
                  color: 'var(--v2-text-muted)',
                  lineHeight: 1.45,
                  textAlign: 'center',
                }}
              >
                {isConnecting
                  ? 'Connecting to Tammy'
                  : isListeningEmpty
                    ? 'Say hi or ask a question.'
                    : 'Tap the button below to talk with Tammy.'}
              </p>
              {(isListeningEmpty || (!isConnecting && !isListeningEmpty)) && (
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8125rem',
                    fontWeight: 400,
                    color: 'var(--v2-text-muted)',
                    lineHeight: 1.4,
                    textAlign: 'center',
                    opacity: 0.9,
                  }}
                >
                  {isListeningEmpty
                    ? 'Just talk—Tammy is listening.'
                    : 'Say hi or ask Tammy a question.'}
                </p>
              )}
            </div>
          </div>
        )
      ) : (
        <>
          {displayItems.map((item, i) => {
            const isUser = item.role === 'user';
            const bubbleStyle = {
              alignSelf: isUser ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: 16,
              background: isUser ? 'var(--v2-bubble-user-bg)' : 'var(--v2-glass-strong)',
              border: isUser ? 'none' : '1px solid var(--v2-glass-border)',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: isUser ? 'var(--v2-primary)' : 'var(--v2-text-primary)',
              lineHeight: 1.4,
              wordBreak: 'break-word' as const,
              textShadow: isUser ? 'none' : '0 1px 1px rgba(255,255,255,0.3)',
            };
            return (
              <div key={`${i}-${item.content.slice(0, 30)}`} style={bubbleStyle}>
                {item.content}
              </div>
            );
          })}
          {showThinkingBubble && (
            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: 16,
                background: 'var(--v2-glass-strong)',
                border: '1px solid var(--v2-glass-border)',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--v2-text-primary)',
                lineHeight: 1.4,
                wordBreak: 'break-word',
                textShadow: '0 1px 1px rgba(255,255,255,0.3)',
              }}
            >
              <span className="v2-thinking-bubble">
                <span className="v2-thinking-dot" />
                <span className="v2-thinking-dot" />
                <span className="v2-thinking-dot" />
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </>
      )}
    </div>
  );
}
