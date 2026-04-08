'use client';

interface DataRightsRowProps {
  childId: string;
  childName: string;
  childEmoji: string;
}

export function DataRightsRow({ childId, childName, childEmoji }: DataRightsRowProps) {
  const exportUrl = `/api/parent/data-export?childId=${encodeURIComponent(childId)}`;

  async function handleDelete() {
    if (
      !confirm(
        `Permanently delete all of ${childName}'s data? This cannot be undone.`
      )
    ) {
      return;
    }
    const res = await fetch('/api/parent/delete-account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ childId }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const d = await res.json().catch(() => ({}));
      alert((d as { error?: string }).error ?? 'Deletion failed. Please try again.');
    }
  }

  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: 14,
        background: 'var(--pd-surface-soft)',
        border: '1px solid var(--pd-card-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }} aria-hidden>{childEmoji}</span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--pd-text-primary)',
          }}
        >
          {childName}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <a
          href={exportUrl}
          download
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: 10,
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'none',
            background: 'var(--pd-accent)',
            color: '#fff',
          }}
        >
          Download data
        </a>
        <button
          type="button"
          onClick={handleDelete}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            borderRadius: 10,
            border: '1px solid rgba(220,38,38,0.35)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            background: 'var(--pd-surface-soft)',
            color: 'var(--pd-error)',
          }}
        >
          Delete {childName}&apos;s data
        </button>
      </div>
    </div>
  );
}
