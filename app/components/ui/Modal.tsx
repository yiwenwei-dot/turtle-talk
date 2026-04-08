'use client';

import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Max width of the panel (default: 480px) */
  maxWidth?: number;
}

const BACKDROP_STYLE: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.65)',
  zIndex: 100,
};

function getPanelStyle(maxWidth: number): React.CSSProperties {
  return {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 101,
    background: 'var(--tt-surface)',
    border: '1px solid var(--tt-surface-border)',
    boxShadow: 'var(--tt-shadow-glass)',
    borderRadius: 'var(--tt-radius-card)',
    padding: '24px',
    width: 'calc(100% - 40px)',
    maxWidth: `${maxWidth}px`,
    color: 'var(--tt-text-primary)',
  };
}

export function Modal({ open, onClose, children, maxWidth = 480 }: ModalProps) {
  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true">
      <div style={BACKDROP_STYLE} onClick={onClose} />
      <div
        style={getPanelStyle(maxWidth)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
