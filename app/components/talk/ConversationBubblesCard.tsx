'use client';

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import type { Message } from '@/lib/speech/types';
import ConversationBubbles from './ConversationBubbles';

interface Props {
  messages: Message[];
  pendingUserTranscript?: string | null;
}

export default function ConversationBubblesCard({ messages, pendingUserTranscript }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const hasContent = messages.length > 0 || (pendingUserTranscript?.trim() ?? '').length > 0;

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7379/ingest/c4e58649-e133-4b9b-91a5-50c962a7060e', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'c0ac4b' }, body: JSON.stringify({ sessionId: 'c0ac4b', location: 'ConversationBubblesCard.tsx', message: 'card state', data: { expanded, hasContent, messagesLength: messages.length }, timestamp: Date.now(), hypothesisId: 'H2' }) }).catch(() => {});
  }, [expanded, hasContent, messages.length]);
  // #endregion

  // Measure content height when expanded or when content changes
  useLayoutEffect(() => {
    if (!expanded) return;
    const el = contentRef.current;
    if (!el) return;
    const updateHeight = () => setContentHeight(el.scrollHeight);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded, messages.length, pendingUserTranscript]);

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    overflow: 'hidden',
    transition: 'background 0.2s ease',
  };

  return (
    <div style={cardStyle}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          width: '100%',
          padding: '10px 14px',
          minHeight: 44,
          border: 'none',
          background: 'transparent',
          color: 'rgba(255,255,255,0.85)',
          fontSize: '0.9rem',
          fontWeight: 600,
          cursor: 'pointer',
          userSelect: 'none',
        }}
        aria-expanded={expanded}
        aria-label={expanded ? 'Hide conversation' : 'Show conversation'}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageCircle size={18} strokeWidth={2} aria-hidden />
          {expanded ? 'Conversation' : hasContent ? 'Tap to show conversation' : 'Conversation'}
        </span>
        <span
          style={{
            position: 'absolute',
            right: 14,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-hidden
        >
          {expanded ? (
            <ChevronUp size={20} strokeWidth={2} />
          ) : (
            <ChevronDown size={20} strokeWidth={2} />
          )}
        </span>
      </button>
      <div
        style={{
          overflow: 'hidden',
          maxHeight: expanded ? contentHeight : 0,
          transition: 'max-height 0.3s ease-out',
        }}
      >
        <div
          ref={contentRef}
          style={{ padding: '0 8px 12px' }}
        >
          <ConversationBubbles messages={messages} pendingUserTranscript={pendingUserTranscript} />
        </div>
      </div>
    </div>
  );
}
