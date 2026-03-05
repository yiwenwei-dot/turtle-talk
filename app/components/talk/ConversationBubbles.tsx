'use client';

import { useEffect } from 'react';
import type { Message } from '@/lib/speech/types';

const MAX_BUBBLES = 3;

interface Props {
  messages: Message[];
  /** Shown as current user turn while processing (optional fourth bubble or inline) */
  pendingUserTranscript?: string | null;
}

export default function ConversationBubbles({ messages, pendingUserTranscript }: Props) {
  // Build list of items: last N from messages, and optionally pending user as live item
  const items: { role: 'user' | 'assistant'; content: string }[] = [];
  const fromMessages = messages.slice(-MAX_BUBBLES);
  fromMessages.forEach((m) => items.push({ role: m.role, content: m.content }));

  // If we have pending transcript and it's not already the last message, show it as the latest user bubble
  const pending = pendingUserTranscript?.trim();
  if (pending) {
    const lastIsUser = items.length > 0 && items[items.length - 1].role === 'user';
    if (lastIsUser) {
      // Replace last user bubble with live transcript
      items[items.length - 1] = { role: 'user', content: pending };
    } else {
      items.push({ role: 'user', content: pending });
    }
  }

  // Keep only last MAX_BUBBLES
  const displayItems = items.slice(-MAX_BUBBLES);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7379/ingest/c4e58649-e133-4b9b-91a5-50c962a7060e', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c0ac4b' }, body: JSON.stringify({ sessionId: 'c0ac4b', location: 'ConversationBubbles.tsx', message: 'bubbles display', data: { messagesLength: messages.length, pendingLen: pending?.length ?? 0, displayItemsLength: displayItems.length, fromMessagesLen: fromMessages.length }, timestamp: Date.now(), hypothesisId: 'H3' }) }).catch(() => {});
  }, [messages.length, pending]);
  // #endregion

  if (displayItems.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          minHeight: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px 4px',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 440,
        minHeight: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '8px 4px',
      }}
    >
      {displayItems.map((item, i) => {
        const isUser = item.role === 'user';
        return (
          <div
            key={`${i}-${item.content.slice(0, 20)}`}
            style={{
              alignSelf: isUser ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: 16,
              background: isUser
                ? 'rgba(255,255,255,0.2)'
                : 'rgba(74, 222, 128, 0.25)',
              border: `1px solid ${isUser ? 'rgba(255,255,255,0.3)' : 'rgba(74, 222, 128, 0.4)'}`,
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'white',
              lineHeight: 1.4,
              wordBreak: 'break-word',
            }}
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
