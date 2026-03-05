'use client';

import type { EncouragementItem } from '@/app/hooks/useEncouragement';

interface DecorationBoxProps {
  items: EncouragementItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPlaceOnTree: (encouragementId: string) => void;
  isPlacing: boolean;
}

export default function DecorationBox({
  items,
  selectedId,
  onSelect,
  onPlaceOnTree,
  isPlacing,
}: DecorationBoxProps) {
  return (
    <div
      style={{
        flexShrink: 0,
        width: '100%',
        maxWidth: 160,
        padding: 16,
        borderRadius: 16,
        background: 'rgba(120,53,15,0.4)',
        border: '2px solid rgba(180,83,9,0.6)',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <p
        style={{
          margin: '0 0 12px',
          fontSize: '0.9rem',
          fontWeight: 700,
          color: 'var(--tt-text-primary)',
          textAlign: 'center',
        }}
      >
        Pick a cheer and put it on your tree
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        {items.length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--tt-text-secondary)', margin: 0, textAlign: 'center' }}>
            No new cheers yet — ask your grown-up to send you some!
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(selectedId === item.id ? null : item.id)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: selectedId === item.id ? '3px solid #fbbf24' : '2px solid rgba(255,255,255,0.3)',
                background: selectedId === item.id ? 'rgba(251,191,36,0.25)' : 'rgba(255,255,255,0.1)',
                fontSize: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label={`Select ${item.emoji} to put on tree`}
            >
              {item.emoji}
            </button>
          ))
        )}
      </div>
      {selectedId && (
        <button
          type="button"
          onClick={() => onPlaceOnTree(selectedId)}
          disabled={isPlacing}
          style={{
            width: '100%',
            padding: '10px 16px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            color: 'white',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: isPlacing ? 'wait' : 'pointer',
          }}
        >
          {isPlacing ? 'Putting it on…' : 'Put on tree'}
        </button>
      )}
    </div>
  );
}
