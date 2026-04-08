'use client';

import type { ReactNode, ButtonHTMLAttributes } from 'react';
import type { ButtonVariant } from './Button';

const ICON_BTN_STYLES: Partial<Record<ButtonVariant, React.CSSProperties>> = {
  ghost: {
    background: 'var(--tt-ghost-bg)',
    boxShadow: 'none',
    border: '1px solid var(--tt-ghost-border)',
  },
  danger: {
    background: 'var(--tt-grad-danger)',
    boxShadow: 'var(--tt-shadow-danger)',
    border: '2px solid var(--tt-btn-border-overlay)',
  },
  primary: {
    background: 'var(--tt-grad-primary)',
    boxShadow: 'var(--tt-shadow-primary)',
    border: '2px solid var(--tt-btn-border-overlay)',
  },
  gold: {
    background: 'var(--tt-grad-gold)',
    boxShadow: 'var(--tt-shadow-gold)',
    border: '2px solid var(--tt-btn-border-overlay)',
  },
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Exclude<ButtonVariant, 'connect'>;
  /** Override the default 64px size (px value) */
  size?: number;
  children: ReactNode;
}

export function IconButton({
  variant = 'ghost',
  size,
  children,
  className = '',
  style,
  disabled,
  ...rest
}: IconButtonProps) {
  const dim = size !== undefined ? `${size}px` : 'var(--tt-icon-btn-size)';
  return (
    <button
      type="button"
      data-variant={variant}
      disabled={disabled}
      className={`tt-tap-shake active:scale-[0.98] active:opacity-90 ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: dim,
        height: dim,
        minWidth: dim,
        minHeight: dim,
        borderRadius: 'var(--tt-radius-pill)',
        color: 'var(--tt-btn-color)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        transition: `background var(--tt-transition-fast), box-shadow var(--tt-transition-fast)`,
        ...(ICON_BTN_STYLES[variant] ?? {}),
        ...style,
        opacity: disabled ? 0.6 : 1,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
