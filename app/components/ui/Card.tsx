'use client';

import type { ReactNode } from 'react';

export type CardVariant = 'default' | 'sm';

const BASE_CARD: React.CSSProperties = {
  background: 'var(--tt-surface)',
  border: '1px solid var(--tt-surface-border)',
  boxShadow: 'var(--tt-shadow-glass)',
};

const VARIANT_STYLES: Record<CardVariant, React.CSSProperties> = {
  default: { ...BASE_CARD, borderRadius: 'var(--tt-radius-card)',    padding: '20px' },
  sm:      { ...BASE_CARD, borderRadius: 'var(--tt-radius-card-sm)', padding: '16px' },
};

export interface CardProps {
  variant?: CardVariant;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({
  variant = 'default',
  children,
  className = '',
  style,
}: CardProps) {
  return (
    <div
      data-variant={variant}
      className={className}
      style={{
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </div>
  );
}
