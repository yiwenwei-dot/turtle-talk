'use client';

import type { Message } from '@/lib/speech/types';

const MAX_VISIBLE = 3;

export interface TalkConversationBubblesProps {
  messages: Message[];
  pendingUserTranscript?: string | null;
}

export default function TalkConversationBubbles({
  messages,
  pendingUserTranscript,
}: TalkConversationBubblesProps) {
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

  return (
    <div
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
        <p
          style={{
            margin: 0,
            padding: '16px 0',
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--v2-text-secondary)',
            lineHeight: 1.45,
            textAlign: 'center',
          }}
        >
          Shelly&apos;s words will appear here once you start a conversation.
        </p>
      ) : (
        displayItems.map((item, i) => {
          const isUser = item.role === 'user';
          return (
            <div
              key={`${i}-${item.content.slice(0, 30)}`}
              style={{
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
                wordBreak: 'break-word',
                textShadow: isUser ? 'none' : '0 1px 1px rgba(255,255,255,0.3)',
              }}
            >
              {item.content}
            </div>
          );
        })
      )}
    </div>
  );
}
