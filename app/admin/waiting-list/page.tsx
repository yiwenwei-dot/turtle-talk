'use client';

import { useState, useEffect, useMemo } from 'react';
import { AdminPageHeader } from '@/app/components/admin/AdminPageHeader';

interface WaitingListEntry {
  id: string;
  email: string;
  status: string;
  created_at: string;
  invited_at: string | null;
  approved_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: 'Pending', color: '#d97706', bg: 'rgba(217,119,6,0.12)', dot: '#d97706' },
  invited: { label: 'Invited', color: '#2563eb', bg: 'rgba(37,99,235,0.12)', dot: '#2563eb' },
  approved: { label: 'Approved', color: '#16a34a', bg: 'rgba(22,163,74,0.12)', dot: '#16a34a' },
  rejected: { label: 'Rejected', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', dot: '#9ca3af' },
};

const FILTERS = ['all', 'pending', 'invited', 'approved', 'rejected'] as const;
type Filter = (typeof FILTERS)[number];

function WLBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 20,
      fontSize: 12, fontWeight: 500,
      color: c.color, background: c.bg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminWaitingListPage() {
  const [entries, setEntries] = useState<WaitingListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [patching, setPatching] = useState<string | null>(null);
  const [patchError, setPatchError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/waiting-list', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((d) => setEntries((d as { entries: WaitingListEntry[] }).entries ?? []))
      .catch(() => setFetchError('Failed to load waiting list'))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length };
    for (const e of entries) c[e.status] = (c[e.status] ?? 0) + 1;
    return c;
  }, [entries]);

  const filtered = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.status === filter)),
    [entries, filter]
  );

  async function updateStatus(id: string, status: string) {
    setPatching(id);
    setPatchError(null);
    try {
      const res = await fetch(`/api/admin/waiting-list/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setPatchError((d as { error?: string }).error ?? 'Update failed');
        return;
      }
      const now = new Date().toISOString();
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id
            ? {
                ...e,
                status,
                invited_at: status === 'invited' ? now : e.invited_at,
                approved_at: status === 'approved' ? now : e.approved_at,
              }
            : e
        )
      );
    } catch {
      setPatchError('Network error');
    } finally {
      setPatching(null);
    }
  }

  function RowActions({ entry }: { entry: WaitingListEntry }) {
    const busy = patching === entry.id;
    const { status } = entry;
    const isPending = status === 'pending';
    const isInvited = status === 'invited';
    const isRejected = status === 'rejected';

    if (!isPending && !isInvited && !isRejected) return null;

    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(isPending || isInvited) && (
          <button
            onClick={() => updateStatus(entry.id, 'approved')}
            disabled={busy}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              border: '1px solid rgba(22,163,74,0.35)', background: 'rgba(22,163,74,0.08)', color: '#16a34a',
              opacity: busy ? 0.5 : 1,
            }}
          >
            Approve
          </button>
        )}
        {isPending && (
          <button
            onClick={() => updateStatus(entry.id, 'invited')}
            disabled={busy}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              border: '1px solid rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.08)', color: '#2563eb',
              opacity: busy ? 0.5 : 1,
            }}
          >
            Invite
          </button>
        )}
        {(isPending || isInvited) && (
          <button
            onClick={() => updateStatus(entry.id, 'rejected')}
            disabled={busy}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              border: '1px solid rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.07)', color: '#dc2626',
              opacity: busy ? 0.5 : 1,
            }}
          >
            Reject
          </button>
        )}
        {isRejected && (
          <button
            onClick={() => updateStatus(entry.id, 'approved')}
            disabled={busy}
            style={{
              padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer',
              border: '1px solid rgba(22,163,74,0.35)', background: 'rgba(22,163,74,0.08)', color: '#16a34a',
              opacity: busy ? 0.5 : 1,
            }}
          >
            Approve
          </button>
        )}
      </div>
    );
  }

  const pendingBadge = !loading && counts.pending > 0 ? (
    <span style={{
      fontSize: 12, fontWeight: 600, color: '#d97706',
      background: 'rgba(217,119,6,0.12)', padding: '3px 10px', borderRadius: 20,
      border: '1px solid rgba(217,119,6,0.2)',
    }}>
      {counts.pending} pending
    </span>
  ) : null;

  return (
    <>
      <AdminPageHeader title="Waiting List" parentHref="/admin" right={pendingBadge} />

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 60px' }}>
        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px', borderRadius: 20, textTransform: 'capitalize', cursor: 'pointer',
                  border: active ? '1.5px solid var(--pd-accent)' : '1px solid var(--pd-card-border)',
                  background: active ? 'var(--pd-accent-soft)' : 'var(--pd-surface-soft)',
                  color: active ? 'var(--pd-accent)' : 'var(--pd-text-secondary)',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {f}{counts[f] !== undefined ? ` (${counts[f]})` : ''}
              </button>
            );
          })}
        </div>

        {patchError && (
          <div style={{
            marginBottom: 12, fontSize: 13, color: 'var(--pd-error)',
            padding: '9px 14px', background: 'rgba(220,38,38,0.08)',
            borderRadius: 10, border: '1px solid rgba(220,38,38,0.2)',
          }}>
            {patchError}
          </div>
        )}

        <div className="pd-card-elevated" style={{ overflow: 'hidden' }}>
          {loading && (
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="pd-skeleton" style={{ height: 52, borderRadius: 8 }} />
              ))}
            </div>
          )}

          {fetchError && (
            <div style={{ padding: 32, color: 'var(--pd-error)', textAlign: 'center', fontSize: 14 }}>
              {fetchError}
            </div>
          )}

          {!loading && !fetchError && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--pd-card-border)' }}>
                    {['Email', 'Status', 'Joined', 'Invited', 'Actions'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '10px 16px', textAlign: 'left',
                          fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
                          color: 'var(--pd-text-tertiary)', whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{ padding: 40, textAlign: 'center', color: 'var(--pd-text-tertiary)', fontSize: 14 }}
                      >
                        No entries
                      </td>
                    </tr>
                  )}
                  {filtered.map((e, i) => (
                    <tr
                      key={e.id}
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid var(--pd-card-border)' : 'none',
                      }}
                    >
                      <td style={{
                        padding: '12px 16px', fontSize: 13, color: 'var(--pd-text-primary)',
                        fontFamily: 'ui-monospace, monospace',
                        maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {e.email}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <WLBadge status={e.status} />
                      </td>
                      <td style={{
                        padding: '12px 16px', fontSize: 12,
                        color: 'var(--pd-text-tertiary)', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap',
                      }}>
                        {formatDate(e.created_at)}
                      </td>
                      <td style={{
                        padding: '12px 16px', fontSize: 12,
                        color: 'var(--pd-text-tertiary)', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap',
                      }}>
                        {formatDate(e.invited_at)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <RowActions entry={e} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
