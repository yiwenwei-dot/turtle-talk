'use client';

import { useState } from 'react';

export interface Book {
  id: string;
  title: string;
  author: string;
  shortDescription: string;
  coverEmoji: string;
  ageRange: string;
  recommendedFor: string[];
  whyRecommended: string;
  fullDescription: string;
}

interface Props {
  book: Book;
}

export function BookCard({ book }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="pd-card-elevated"
        style={{
          borderRadius: 16,
          padding: '18px',
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          transition: 'box-shadow 0.2s, transform 0.2s',
          border: '1px solid var(--pd-card-border)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '';
          (e.currentTarget as HTMLButtonElement).style.transform = '';
        }}
      >
        <div style={{ display: 'flex', gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 68,
              background: 'linear-gradient(165deg, #ebebed 0%, #e8e8ed 100%)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              flexShrink: 0,
            }}
          >
            {book.coverEmoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--pd-text-primary)', marginBottom: 2 }}>
              {book.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--pd-text-secondary)', marginBottom: 6 }}>
              {book.author} · Ages {book.ageRange}
            </div>
            <p style={{ fontSize: 14, color: 'var(--pd-text-primary)', margin: 0, lineHeight: 1.4 }}>
              {book.shortDescription}
            </p>
          </div>
        </div>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="parent-dashboard"
            style={{
              background: 'var(--pd-modal-bg)',
              borderRadius: 20,
              padding: 28,
              maxWidth: 480,
              width: '100%',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div
                style={{
                  width: 64,
                  height: 84,
                  background: 'linear-gradient(165deg, #ebebed 0%, #e8e8ed 100%)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  flexShrink: 0,
                }}
              >
                {book.coverEmoji}
              </div>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600, color: 'var(--pd-text-primary)', letterSpacing: '-0.02em' }}>
                  {book.title}
                </h3>
                <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--pd-text-secondary)' }}>
                  {book.author} · Ages {book.ageRange}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--pd-accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 6,
                }}
              >
                Why we recommend this
              </div>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--pd-text-primary)', lineHeight: 1.5 }}>
                {book.whyRecommended}
              </p>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--pd-text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 6,
                }}
              >
                About the book
              </div>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--pd-text-primary)', lineHeight: 1.5 }}>
                {book.fullDescription}
              </p>
            </div>

            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(`${book.title} ${book.author} book`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                marginBottom: 16,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--pd-accent)',
                textDecoration: 'none',
              }}
            >
              Find this book →
            </a>

            <button
              onClick={() => setOpen(false)}
              style={{
                width: '100%',
                padding: '12px 0',
                background: 'var(--pd-card-gray)',
                border: '1px solid var(--pd-card-border)',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 500,
                color: 'var(--pd-text-primary)',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
