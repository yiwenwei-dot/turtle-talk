'use client';

import React from 'react';

export type DemoTheme = 'dark' | 'light';

export function DemoShell(props: { children: React.ReactNode; onResetAll: () => void; theme: DemoTheme }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          props.theme === 'dark'
            ? 'var(--v2-bg)'
            : 'radial-gradient(circle at top, #fdf6ff 0, #f3fbff 45%, #eef7ff 100%)',
        color: props.theme === 'dark' ? '#F5F7FF' : '#1b1333',
        fontFamily: 'var(--font-varela, system-ui)',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 60,
          background:
            props.theme === 'dark'
              ? 'rgba(10, 10, 12, 0.82)'
              : 'rgba(255, 255, 255, 0.86)',
          backdropFilter: 'blur(10px)',
          borderBottom:
            props.theme === 'dark'
              ? '1px solid rgba(255,255,255,0.08)'
              : '1px solid rgba(0,0,40,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>Tammy</div>
            <div
              style={{
                color: 'var(--v2-text-secondary)',
                fontSize: 13,
              }}
            >
              Voice companion for brave kids
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={props.onResetAll}
              style={{
                appearance: 'none',
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--v2-text)',
                padding: '8px 10px',
                borderRadius: 10,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Start over
            </button>
          </div>
        </div>
      </div>
      {props.children}
    </div>
  );
}

export function Card(props: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section
      style={{
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'rgba(15, 18, 40, 0.96)',
        borderRadius: 20,
        padding: 16,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: 16, letterSpacing: 0.2 }}>{props.title}</h2>
        {props.right}
      </header>
      <div style={{ marginTop: 12 }}>{props.children}</div>
    </section>
  );
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: 'primary' | 'ghost';
    kind?: 'default' | 'tapToSpeak';
  },
) {
  const tone = props.tone ?? 'primary';
  const kind = props.kind ?? 'default';
  const bg =
    tone === 'primary'
      ? kind === 'tapToSpeak'
        ? 'linear-gradient(135deg, #1FD27C, #0BAF5B)'
        : 'linear-gradient(135deg, #00CFB9, #00B8A3)'
      : 'rgba(255,255,255,0.06)';

  return (
    <button
      {...props}
      style={{
        appearance: 'none',
        border: '1px solid rgba(255,255,255,0.16)',
        background: bg,
        color: 'white',
        padding: '10px 14px',
        borderRadius: 999,
        fontWeight: 700,
        cursor: 'pointer',
        ...props.style,
      }}
    />
  );
}

export function HelpIconButton(props: { 'aria-label': string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={props['aria-label']}
      onClick={props.onClick}
      style={{
        width: 26,
        height: 26,
        borderRadius: '999px',
        border: '1px solid rgba(255,255,255,0.22)',
        background: 'rgba(255,255,255,0.08)',
        color: 'var(--v2-text-secondary)',
        fontSize: 14,
        fontWeight: 800,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      ?
    </button>
  );
}

export function InputRow(props: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'center' }}>
      <div style={{ color: 'var(--v2-text-secondary)', fontSize: 13 }}>{props.label}</div>
      <input
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(0,0,0,0.18)',
          color: 'var(--v2-text)',
          outline: 'none',
        }}
      />
    </div>
  );
}

export function SelectRow<T extends string>(props: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; help?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'center' }}>
      <div
        style={{
          color: 'var(--v2-text)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {props.label}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {props.options.map((o) => (
          <button
            key={o.value}
            onClick={() => props.onChange(o.value)}
            style={{
              appearance: 'none',
              cursor: 'pointer',
              borderRadius: 999,
              padding: '8px 10px',
              border: '1px solid rgba(255,255,255,0.14)',
              background: props.value === o.value ? 'rgba(120,140,255,0.32)' : 'rgba(255,255,255,0.16)',
              color: 'var(--v2-text)',
              fontWeight: 650,
              fontSize: 13,
            }}
            title={o.help}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ModalBackdrop(props: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      role="presentation"
      onClick={props.onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 101,
          width: 'calc(100% - 32px)',
          maxWidth: 440,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(247, 249, 255, 0.98)',
          border: '1px solid rgba(12, 18, 40, 0.10)',
          borderRadius: 24,
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
          overflow: 'hidden',
        }}
      >
        {props.children}
      </div>
    </div>
  );
}

