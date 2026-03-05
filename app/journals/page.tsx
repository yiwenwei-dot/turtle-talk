'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Play, Trash2 } from 'lucide-react';
import { useChildSession } from '@/app/hooks/useChildSession';
import { useJournals } from '@/app/hooks/useJournals';
import BottomNav from '@/app/components/BottomNav';
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

function JournalCard({
  journal,
  onDelete,
}: {
  journal: Journal;
  onDelete?: (id: string) => void;
}) {
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
    <div
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
    </div>
  );
}

export default function JournalsPage() {
  const { child } = useChildSession();
  const { journals, canUseJournals, deleteJournal } = useJournals(child?.childId);

  return (
    <main
      style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 120px',
      }}
    >
      <h1
        style={{
          color: 'var(--tt-text-primary)',
          fontSize: '1.5rem',
          fontWeight: 800,
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          margin: '0 0 8px',
          textAlign: 'center',
        }}
      >
        My Journals
      </h1>
      <p
        style={{
          color: 'var(--tt-text-secondary)',
          fontSize: '0.95rem',
          margin: '0 0 24px',
          textAlign: 'center',
        }}
      >
        Voice notes you recorded for later.
      </p>

      {!canUseJournals && (
        <p
          style={{
            color: 'var(--tt-text-muted)',
            fontSize: '0.9rem',
            textAlign: 'center',
            padding: '24px 20px',
          }}
        >
          Journaling is only available when using local storage.
        </p>
      )}

      {canUseJournals && journals.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 48 }}>📔</span>
          <p style={{ color: 'var(--tt-text-secondary)', fontSize: 16, margin: 0 }}>
            No journal entries yet.
          </p>
          <p style={{ color: 'var(--tt-text-muted)', fontSize: 14, margin: 0 }}>
            Long-press the mic in the bar below to record a voice note.
          </p>
          <Link
            href="/journal"
            style={{
              marginTop: 8,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              color: 'white',
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              borderRadius: 12,
              textDecoration: 'none',
            }}
          >
            Record now
          </Link>
        </div>
      )}

      {canUseJournals && journals.length > 0 && (
        <div
          style={{
            width: '100%',
            maxWidth: 560,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {journals.map((j) => (
            <JournalCard key={j.id} journal={j} onDelete={deleteJournal} />
          ))}
        </div>
      )}

      <BottomNav />
    </main>
  );
}
