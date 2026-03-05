'use client';

import { useState, useRef, useEffect } from 'react';
import type { Child } from './ChildSwitcher';

const EMOJI_OPTIONS = ['🐢', '🦊', '🦋', '🐻', '🦁', '🐸', '🐶', '🐱', '🌟'];

interface ChildrenModalProps {
  open: boolean;
  onClose: () => void;
  children: Child[];
  activeChild: Child | null;
  onSelectChild: (child: Child) => void;
  onChildrenChange: () => void;
}

export function ChildrenModal({
  open,
  onClose,
  children,
  activeChild,
  onSelectChild,
  onChildrenChange,
}: ChildrenModalProps) {
  const [addMode, setAddMode] = useState(false);
  const [addFirstName, setAddFirstName] = useState('');
  const [addEmoji, setAddEmoji] = useState('🐢');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [newChildLoginKey, setNewChildLoginKey] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    const name = addFirstName.trim();
    if (!name) {
      setAddError('Please enter a name');
      return;
    }
    setAddSubmitting(true);
    try {
      const res = await fetch('/api/parent/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ firstName: name, emoji: addEmoji }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || 'Could not add child');
        return;
      }
      setNewChildLoginKey(data.child?.loginKey ?? null);
      setAddFirstName('');
      setAddEmoji('🐢');
      onChildrenChange();
    } finally {
      setAddSubmitting(false);
    }
  }

  async function handleRemove(childId: string) {
    setRemovingId(childId);
    try {
      const res = await fetch('/api/parent/children', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ childId }),
      });
      if (res.ok) onChildrenChange();
    } finally {
      setRemovingId(null);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="children-modal-title"
        className="parent-dashboard"
        style={{
          background: 'var(--pd-modal-bg)',
          borderRadius: 20,
          padding: 28,
          width: '100%',
          maxWidth: 400,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="children-modal-title" style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600, color: 'var(--pd-text-primary)', letterSpacing: '-0.02em' }}>
          Children
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--pd-text-secondary)' }}>
          Add or remove children. Each child has a login code for device sign-in.
        </p>

        {children.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {children.map((child) => (
              <li
                key={child.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  background: child.id === activeChild?.id ? 'var(--pd-accent-soft)' : 'var(--pd-surface-soft)',
                  border: `1px solid ${child.id === activeChild?.id ? 'var(--pd-accent)' : 'var(--pd-card-border)'}`,
                  borderRadius: 14,
                }}
              >
                <span style={{ fontSize: 28 }} aria-hidden>{child.avatar}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--pd-text-primary)' }}>{child.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: 'var(--pd-text-secondary)', fontFamily: 'monospace', letterSpacing: 1 }}>
                      {child.loginKey ?? '—'}
                    </span>
                    {child.loginKey && (
                      <button
                        type="button"
                        title="Copy login code"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(child.loginKey!);
                            setCopiedId(child.id);
                            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
                            copyTimerRef.current = setTimeout(() => setCopiedId(null), 1500);
                          } catch {
                            // clipboard API unavailable — silent fail
                          }
                        }}
                        style={{
                          padding: '2px 6px', fontSize: 11,
                          border: '1px solid var(--pd-card-border)',
                          borderRadius: 6, background: 'var(--pd-surface-overlay)',
                          cursor: 'pointer',
                          color: copiedId === child.id ? 'var(--pd-success)' : 'var(--pd-text-tertiary)',
                        }}
                      >
                        {copiedId === child.id ? '✓' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => { onSelectChild(child); onClose(); }}
                    style={{
                      padding: '6px 10px',
                      fontSize: 13,
                      border: '1px solid var(--pd-card-border)',
                      borderRadius: 8,
                      background: 'var(--pd-surface-overlay)',
                      cursor: 'pointer',
                      color: 'var(--pd-text-primary)',
                    }}
                  >
                    View
                  </button>
                  {confirmRemoveId === child.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(null)}
                        style={{
                          padding: '6px 8px', fontSize: 12,
                          border: '1px solid var(--pd-card-border)',
                          borderRadius: 8, background: 'var(--pd-surface-overlay)',
                          cursor: 'pointer', color: 'var(--pd-text-secondary)',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => { setConfirmRemoveId(null); handleRemove(child.id); }}
                        disabled={removingId === child.id}
                        style={{
                          padding: '6px 8px', fontSize: 12,
                          border: '1px solid rgba(220,38,38,0.3)',
                          borderRadius: 8, background: 'var(--pd-surface-overlay)',
                          color: 'var(--pd-error)', cursor: removingId === child.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {removingId === child.id ? '…' : 'Sure?'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(child.id)}
                      style={{
                        padding: '6px 10px', fontSize: 13,
                        border: '1px solid rgba(220,38,38,0.3)',
                        borderRadius: 8, background: 'var(--pd-surface-overlay)',
                        color: 'var(--pd-error)', cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {newChildLoginKey && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              background: 'var(--pd-success-soft)',
              borderRadius: 10,
              fontSize: 13,
              color: '#166534',
            }}
          >
            New login code: <strong style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{newChildLoginKey}</strong>
          </div>
        )}

        {!addMode ? (
          <button
            type="button"
            onClick={() => { setAddMode(true); setAddError(null); setNewChildLoginKey(null); }}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px dashed var(--pd-accent)',
              background: 'var(--pd-accent-soft)',
              color: 'var(--pd-accent)',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add child
          </button>
        ) : (
          <form onSubmit={handleAddChild} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ fontSize: 14, fontWeight: 500 }}>First name</label>
            <input
              value={addFirstName}
              onChange={(e) => setAddFirstName(e.target.value)}
              placeholder="e.g. Alex"
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <label style={{ fontSize: 14, fontWeight: 500 }}>Emoji</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAddEmoji(em)}
                  style={{
                    fontSize: 22,
                    padding: 8,
                  border: addEmoji === em ? '2px solid var(--pd-accent)' : '1px solid var(--pd-card-border)',
                  borderRadius: 8,
                  background: addEmoji === em ? 'var(--pd-accent-soft)' : 'var(--pd-surface-soft)',
                    cursor: 'pointer',
                  }}
                >
                  {em}
                </button>
              ))}
            </div>
            {addError && <p style={{ color: 'var(--pd-error)', fontSize: 14, margin: 0 }}>{addError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => { setAddMode(false); setAddError(null); setNewChildLoginKey(null); }}
                disabled={addSubmitting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: 'var(--pd-surface-overlay)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addSubmitting}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--pd-accent)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: addSubmitting ? 'not-allowed' : 'pointer',
                }}
              >
                {addSubmitting ? 'Adding…' : 'Add'}
              </button>
            </div>
          </form>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid var(--pd-card-border)',
            background: 'var(--pd-surface-overlay)',
            cursor: 'pointer',
            fontSize: 15,
            color: 'var(--pd-text-primary)',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
