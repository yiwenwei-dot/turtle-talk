'use client';

import React, { type ReactNode } from 'react';

export interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}

interface TabProps {
  value: string;
  label: string;
}

// Internal-only props injected by Tabs via cloneElement — not part of the public API
interface TabInternalProps extends TabProps {
  _active?: boolean;
  _onSelect?: () => void;
}

export function Tabs({ value, onChange, children }: TabsProps) {
  const mappedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement<TabInternalProps>(child)) return child;
    const tabValue = child.props.value;
    return React.cloneElement(child, {
      _active: tabValue === value,
      _onSelect: () => onChange(tabValue),
    });
  });

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        flexDirection: 'row',
        gap: 4,
        background: 'var(--tt-surface)',
        border: '1px solid var(--tt-surface-border)',
        borderRadius: 'var(--tt-radius-pill)',
        padding: 4,
      }}
    >
      {mappedChildren}
    </div>
  );
}

export function Tab({ label, _active = false, _onSelect }: TabInternalProps) {
  return (
    <button
      role="tab"
      aria-selected={_active}
      data-active={_active}
      type="button"
      onClick={_onSelect}
      style={{
        background: _active ? 'var(--tt-primary)' : 'transparent',
        color: _active ? 'var(--tt-text-primary)' : 'var(--tt-text-muted)',
        borderRadius: 'var(--tt-radius-pill)',
        padding: '8px 16px',
        border: 'none',
        fontSize: '0.875rem',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background var(--tt-transition-fast), color var(--tt-transition-fast)',
      }}
    >
      {label}
    </button>
  );
}
