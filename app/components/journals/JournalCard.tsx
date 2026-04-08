'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Play, Trash2 } from 'lucide-react';
import { Card } from '@/app/components/ui';
import type { Journal } from '@/lib/db/types';

function base64ToBlobUrl(base64: string, type = 'audio/webm'): string {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type });
  return URL.createObjectURL(blob);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface JournalCardProps {
  journal: Journal;
  onDelete?: (id: string) => void;
}

export function JournalCard({ journal, onDelete }: JournalCardProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const url = useMemo(
    () => base64ToBlobUrl(journal.audioBase64),
    [journal.audioBase64],
  );
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying((p) => !p);
  };

  return (
    <Card
      variant="sm"
      style={{
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 16,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        backdropFilter: 'blur(8px)',
        backgroundColor: 'rgba(255,255,255,0.07)',
      }}
    >
      <audio
        ref={audioRef}
        src={url}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.3)',
          background: 'rgba(255,255,255,0.15)',
          color: 'var(--tt-text-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            color: 'var(--tt-text-muted)',
            fontSize: 12,
            margin: 0,
          }}
        >
          {formatDate(journal.createdAt)}
        </p>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(journal.id)}
          aria-label="Remove"
          style={{
            padding: 8,
            border: 'none',
            borderRadius: 8,
            background: 'transparent',
            color: 'var(--tt-text-tertiary)',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={18} />
        </button>
      )}
    </Card>
  );
}
