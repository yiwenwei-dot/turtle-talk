'use client';

import Link from 'next/link';
import { useChildSession } from '@/app/hooks/useChildSession';
import { useJournals } from '@/app/hooks/useJournals';
import BottomNav from '@/app/components/BottomNav';
import { JournalCard } from '@/app/components/journals/JournalCard';

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
