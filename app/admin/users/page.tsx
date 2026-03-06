'use client';

import { useState, useEffect, useMemo } from 'react';
import { AdminPageHeader } from '@/app/components/admin/AdminPageHeader';

interface AdminUser {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  access_status: string;
  suspended_at: string | null;
  created_at: string;
}


const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: 'Admin', color: '#0f766e', bg: 'rgba(15,118,110,0.12)' },
  parent: { label: 'Parent', color: '#525256', bg: 'rgba(82,82,86,0.1)' },
  child: { label: 'Child', color: '#d97706', bg: 'rgba(217,119,6,0.12)' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  customer: { label: 'Customer', color: '#16a34a', bg: 'rgba(22,163,74,0.12)', dot: '#16a34a' },
  trial: { label: 'Trial', color: '#d97706', bg: 'rgba(217,119,6,0.12)', dot: '#d97706' },
  inactive: { label: 'Inactive', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', dot: '#9ca3af' },
};

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_CONFIG[role] ?? { label: role, color: '#525256', bg: 'rgba(82,82,86,0.1)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
      color: c.color, background: c.bg,
    }}>
      {c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] ?? { label: status, color: '#6b7280', bg: 'rgba(107,114,128,0.1)', dot: '#9ca3af' };
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

function initials(user: AdminUser) {
  if (user.display_name) return user.display_name.slice(0, 2).toUpperCase();
  if (user.email) return user.email.slice(0, 2).toUpperCase();
  return '??';
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
      <span style={{ fontSize: 13, color: 'var(--pd-text-tertiary)' }}>{label}</span>
      <div>{value}</div>
    </div>
  );
}

interface UserModalProps {
  user: AdminUser;
  onClose: () => void;
  onUpdated: (updated: Partial<AdminUser>) => void;
}

function UserModal({ user, onClose, onUpdated }: UserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? 'Update failed');
        return false;
      }
      return true;
    } catch {
      setError('Network error');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function setAccessStatus(status: string) {
    if (await patch({ access_status: status })) onUpdated({ access_status: status });
  }

  async function toggleSuspend() {
    const suspended_at = user.suspended_at ? null : new Date().toISOString();
    if (await patch({ suspended_at })) onUpdated({ suspended_at });
  }

  async function toggleRole() {
    const role = user.role === 'admin' ? 'parent' : 'admin';
    if (await patch({ role })) onUpdated({ role });
  }

  async function sendPasswordReset() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { error?: string }).error ?? 'Could not send reset email');
      } else {
        setError(null);
        // surface success inline via a transient message
        setResetSent(true);
        setTimeout(() => setResetSent(false), 4000);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      />
      <div style={{
        position: 'fixed', zIndex: 50,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(480px, calc(100vw - 32px))',
        background: 'var(--pd-modal-bg)',
        border: '1px solid var(--pd-card-border)',
        borderRadius: 20,
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        overflow: 'hidden',
      }}>
        {/* Modal header */}
        <div style={{
          padding: '20px 24px 18px',
          borderBottom: '1px solid var(--pd-card-border)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
            background: user.suspended_at ? 'rgba(220,38,38,0.1)' : 'var(--pd-accent-soft)',
            color: user.suspended_at ? '#dc2626' : 'var(--pd-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 700,
          }}>
            {initials(user)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 16, fontWeight: 600, color: 'var(--pd-text-primary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user.display_name ?? user.email ?? 'Unknown user'}
            </div>
            {user.display_name && (
              <div style={{
                fontSize: 12, color: 'var(--pd-text-tertiary)', marginTop: 2,
                fontFamily: 'ui-monospace, monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user.email}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none', flexShrink: 0,
              background: 'var(--pd-surface-soft)', color: 'var(--pd-text-tertiary)',
              fontSize: 20, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Modal body */}
        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <InfoRow label="Role" value={<RoleBadge role={user.role} />} />
            <InfoRow label="Access status" value={<StatusBadge status={user.access_status} />} />
            <InfoRow
              label="Joined"
              value={
                <span style={{ fontSize: 13, fontFamily: 'ui-monospace, monospace', color: 'var(--pd-text-secondary)' }}>
                  {formatDate(user.created_at)}
                </span>
              }
            />
            {user.suspended_at && (
              <InfoRow
                label="Suspended since"
                value={<span style={{ fontSize: 13, color: 'var(--pd-error)' }}>{formatDate(user.suspended_at)}</span>}
              />
            )}
          </div>

          {/* Access status selector */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--pd-text-tertiary)', marginBottom: 8,
            }}>
              Access Status
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['inactive', 'trial', 'customer'] as const).map((s) => {
                const active = user.access_status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setAccessStatus(s)}
                    disabled={loading || active}
                    style={{
                      flex: 1, padding: '9px 4px', borderRadius: 10,
                      border: active ? '2px solid var(--pd-accent)' : '1px solid var(--pd-card-border)',
                      background: active ? 'var(--pd-accent-soft)' : 'var(--pd-surface-soft)',
                      color: active ? 'var(--pd-accent)' : 'var(--pd-text-secondary)',
                      fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                      cursor: active ? 'default' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role + Suspend actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={toggleRole}
              disabled={loading}
              style={{
                flex: 1, padding: '11px 8px', borderRadius: 10,
                border: '1px solid var(--pd-card-border)',
                background: 'var(--pd-surface-soft)',
                color: 'var(--pd-text-primary)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {user.role === 'admin' ? 'Demote to Parent' : 'Promote to Admin'}
            </button>
            <button
              onClick={toggleSuspend}
              disabled={loading}
              style={{
                flex: 1, padding: '11px 8px', borderRadius: 10,
                border: user.suspended_at ? '1px solid rgba(22,163,74,0.35)' : '1px solid rgba(220,38,38,0.3)',
                background: user.suspended_at ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.07)',
                color: user.suspended_at ? '#16a34a' : '#dc2626',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {user.suspended_at ? 'Unsuspend' : 'Suspend'}
            </button>
          </div>

          {/* Password reset */}
          <button
            onClick={sendPasswordReset}
            disabled={loading || !user.email}
            style={{
              width: '100%', padding: '11px 8px', borderRadius: 10,
              border: '1px solid rgba(99,102,241,0.3)',
              background: 'rgba(99,102,241,0.07)',
              color: '#6366f1',
              fontSize: 13, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? 'Sending…' : 'Send password reset email'}
          </button>

          {resetSent && (
            <div style={{
              fontSize: 13, color: '#16a34a', textAlign: 'center',
              padding: '8px 12px', background: 'rgba(22,163,74,0.08)', borderRadius: 8,
            }}>
              Reset email sent to {user.email}
            </div>
          )}

          {error && (
            <div style={{
              fontSize: 13, color: 'var(--pd-error)', textAlign: 'center',
              padding: '8px 12px', background: 'rgba(220,38,38,0.08)', borderRadius: 8,
            }}>
              {error}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    fetch('/api/admin/users', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((d) => setUsers((d as { users: AdminUser[] }).users ?? []))
      .catch(() => setFetchError('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.display_name?.toLowerCase().includes(q) ||
        u.role.includes(q) ||
        u.access_status.includes(q)
    );
  }, [users, search]);

  function handleUpdated(userId: string, updated: Partial<AdminUser>) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
    setSelectedUser((prev) => (prev?.id === userId ? { ...prev, ...updated } : prev));
  }

  const countBadge = !loading ? (
    <span style={{
      fontSize: 12, fontWeight: 600, color: 'var(--pd-text-tertiary)',
      background: 'var(--pd-surface-soft)', padding: '3px 10px', borderRadius: 20,
      border: '1px solid var(--pd-card-border)',
    }}>
      {filtered.length}
    </span>
  ) : null;

  return (
    <>
      <AdminPageHeader title="Users" parentHref="/admin" right={countBadge} />

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 60px' }}>
        <div style={{ marginBottom: 16 }}>
          <input
            type="search"
            placeholder="Search by name, email, role, or status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 16px', boxSizing: 'border-box',
              borderRadius: 12, border: '1px solid var(--pd-card-border)',
              background: 'var(--pd-input-bg)', color: 'var(--pd-text-primary)',
              fontSize: 14, outline: 'none',
            }}
          />
        </div>

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
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--pd-card-border)' }}>
                    {['User', 'Role', 'Status', 'Suspended', 'Joined'].map((h) => (
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
                        No users found
                      </td>
                    </tr>
                  )}
                  {filtered.map((u, i) => (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid var(--pd-card-border)' : 'none',
                        cursor: 'pointer', transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--pd-surface-soft)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* User cell */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                            background: u.suspended_at ? 'rgba(220,38,38,0.1)' : 'var(--pd-accent-soft)',
                            color: u.suspended_at ? '#dc2626' : 'var(--pd-accent)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700,
                          }}>
                            {initials(u)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 500, color: 'var(--pd-text-primary)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
                            }}>
                              {u.display_name ?? u.email ?? 'Unknown'}
                            </div>
                            {u.display_name && (
                              <div style={{
                                fontSize: 11, color: 'var(--pd-text-tertiary)',
                                fontFamily: 'ui-monospace, monospace',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
                              }}>
                                {u.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}><RoleBadge role={u.role} /></td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={u.access_status} /></td>
                      <td style={{
                        padding: '12px 16px', fontSize: 12, whiteSpace: 'nowrap',
                        color: u.suspended_at ? 'var(--pd-error)' : 'var(--pd-text-tertiary)',
                      }}>
                        {u.suspended_at ? formatDate(u.suspended_at) : '—'}
                      </td>
                      <td style={{
                        padding: '12px 16px', fontSize: 12,
                        color: 'var(--pd-text-tertiary)', fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap',
                      }}>
                        {formatDate(u.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdated={(updated) => handleUpdated(selectedUser.id, updated)}
        />
      )}
    </>
  );
}
