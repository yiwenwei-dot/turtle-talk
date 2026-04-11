'use client';

export default function TalkTitleTile() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '12px 20px',
        borderRadius: 'var(--v2-radius-card)',
        background: 'var(--v2-glass)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--v2-glass-border)',
        boxShadow: 'var(--v2-shadow-card)',
      }}
    >
      <span
        style={{
          fontSize: '1.125rem',
          fontWeight: 700,
          color: 'var(--v2-text-primary)',
          textShadow: '0 1px 1px rgba(255,255,255,0.5)',
        }}
      >
        Talking with tammy
      </span>
    </div>
  );
}
