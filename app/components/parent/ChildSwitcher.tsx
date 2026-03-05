'use client';

import { useState } from 'react';

export interface Child {
  id: string;
  name: string;
  age: number;
  avatar: string;
  completedMissions: number;
  /** 6-character login code for child device sign-in */
  loginKey?: string;
}

interface Props {
  children: Child[];
  activeChild: Child;
  onSelect: (child: Child) => void;
}

export function ChildSwitcher({ children, activeChild, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(245, 245, 247, 0.9)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          borderRadius: 24,
          padding: '6px 14px 6px 8px',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--pd-text-primary)',
        }}
      >
        <span style={{ fontSize: 22 }}>{activeChild.avatar}</span>
        <span>{activeChild.name}</span>
        <span style={{ fontSize: 10, color: '#9ca3af', marginLeft: 2 }}>▼</span>
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
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="parent-dashboard"
            style={{
              background: 'var(--pd-modal-bg)',
              borderRadius: 20,
              padding: 28,
              width: 320,
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600, color: 'var(--pd-text-primary)', letterSpacing: '-0.02em' }}>
              Switch child
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--pd-text-secondary)' }}>
              Select a child profile to view
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => { onSelect(child); setOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    background: child.id === activeChild.id ? 'var(--pd-accent-soft)' : 'var(--pd-surface-soft)',
                    border: `1px solid ${child.id === activeChild.id ? 'var(--pd-accent)' : 'var(--pd-card-border)'}`,
                    borderRadius: 14,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <span style={{ fontSize: 32 }}>{child.avatar}</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--pd-text-primary)' }}>{child.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--pd-text-secondary)' }}>
                      Age {child.age} · {child.completedMissions} missions completed
                    </div>
                  </div>
                  {child.id === activeChild.id && (
                    <span style={{ marginLeft: 'auto', color: 'var(--pd-accent)', fontSize: 16 }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
