'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminPageHeader } from '@/app/components/admin/AdminPageHeader';
import { checkResponseForInvalidSession } from '@/lib/auth-client';

interface SessionSettings {
  allowInterruptions: boolean;
}

const DEFAULTS: SessionSettings = { allowInterruptions: false };

export default function SessionSettingsPage() {
  const [settings, setSettings] = useState<SessionSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/session-settings', { credentials: 'include' })
      .then(async (res) => {
        if (await checkResponseForInvalidSession(res)) return null;
        if (!res.ok) throw new Error('Failed to load settings');
        return res.json();
      })
      .then((data) => {
        if (data == null) return;
        setSettings(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(
    async (next: SessionSettings) => {
      setSaving(true);
      setSaved(false);
      setError(null);
      try {
        const res = await fetch('/api/admin/session-settings', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        });
        if (await checkResponseForInvalidSession(res)) return;
        if (!res.ok) throw new Error('Save failed');
        const data = await res.json();
        setSettings(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const toggle = (key: keyof SessionSettings) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    save(next);
  };

  return (
    <>
      <AdminPageHeader title="Session settings" parentHref="/admin" />
      <div style={{ padding: 24, maxWidth: 640 }}>
        {loading ? (
          <p style={{ color: 'var(--pd-text-secondary)' }}>Loading...</p>
        ) : (
          <>
            {error && (
              <div
                style={{
                  background: 'rgba(220,38,38,0.08)',
                  border: '1px solid rgba(220,38,38,0.25)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  color: '#dc2626',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                background: 'var(--pd-card-bg)',
                border: '1px solid var(--pd-card-border)',
                borderRadius: 12,
                padding: 20,
              }}
            >
              <h2
                style={{
                  margin: '0 0 4px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--pd-text-primary)',
                }}
              >
                Voice session behaviour
              </h2>
              <p
                style={{
                  margin: '0 0 20px',
                  fontSize: 13,
                  color: 'var(--pd-text-tertiary)',
                  lineHeight: 1.5,
                }}
              >
                These settings apply to all new voice sessions. Existing sessions are not affected.
              </p>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <span
                  role="switch"
                  aria-checked={settings.allowInterruptions}
                  tabIndex={0}
                  onClick={() => !saving && toggle('allowInterruptions')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (!saving) toggle('allowInterruptions');
                    }
                  }}
                  style={{
                    flexShrink: 0,
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    background: settings.allowInterruptions
                      ? 'var(--pd-accent, #22c55e)'
                      : 'var(--pd-text-tertiary, #ccc)',
                    position: 'relative',
                    transition: 'background 0.2s',
                    marginTop: 1,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: settings.allowInterruptions ? 22 : 2,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      background: '#fff',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                    }}
                  />
                </span>
                <span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--pd-text-primary)',
                    }}
                  >
                    Allow interruptions
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: 'var(--pd-text-tertiary)',
                      marginTop: 2,
                      lineHeight: 1.45,
                    }}
                  >
                    When enabled, children can interrupt Shelly while she is speaking.
                    When disabled, Shelly finishes her response before listening.
                  </span>
                </span>
              </label>
            </div>

            {saved && (
              <p
                style={{
                  marginTop: 12,
                  fontSize: 13,
                  color: 'var(--pd-accent, #22c55e)',
                  fontWeight: 500,
                }}
              >
                Saved
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
