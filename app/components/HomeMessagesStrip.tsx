'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, X } from 'lucide-react';
import placeholderData from '@/app/placeholders/home-messages.json';

export type HomeMessage = { id: string; text: string; from?: string };

type PlaceholderData = {
  inspirationalMessage?: { text: string; from?: string };
  messages: HomeMessage[];
};

const data = placeholderData as PlaceholderData;
const inspirationalMessage = data.inspirationalMessage ?? { text: "You've got this!", from: 'Shelly' };
const messagesList: HomeMessage[] = data.messages ?? [];

function MessagesModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Messages"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          maxHeight: '80vh',
          overflow: 'auto',
          borderRadius: 20,
          background: 'rgba(8, 22, 48, 0.95)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2
            style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'white',
            }}
          >
            Messages
          </h2>
          <button
            type="button"
            className="tt-tap-shake"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.25)',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messagesList.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', margin: 0 }}>
              No messages yet.
            </p>
          ) : (
            messagesList.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                {m.from ? (
                  <>
                    <span>{m.text}</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}> – {m.from}</span>
                  </>
                ) : (
                  m.text
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomeMessagesStrip() {
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  return (
    <>
      <button
        type="button"
        className="tt-tap-shake active:opacity-90"
        onClick={openModal}
        style={{
          width: '100%',
          maxWidth: 400,
          padding: '14px 18px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.14)',
          border: '1px solid rgba(255,255,255,0.22)',
          backdropFilter: 'blur(12px)',
          cursor: 'pointer',
          transition: 'background 0.15s, opacity 0.15s',
          textAlign: 'left',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--tt-text-primary)',
            lineHeight: 1.4,
          }}
        >
          {inspirationalMessage.text}
        </p>
        {inspirationalMessage.from && (
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--tt-text-secondary)',
            }}
          >
            – {inspirationalMessage.from}
          </p>
        )}
        <p
          style={{
            margin: '8px 0 0 0',
            fontSize: '0.8rem',
            fontWeight: 500,
            color: 'var(--tt-text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <MessageCircle size={16} strokeWidth={1.75} />
          Tap to see messages
        </p>
      </button>
      {modalOpen && <MessagesModal onClose={closeModal} />}
    </>
  );
}
