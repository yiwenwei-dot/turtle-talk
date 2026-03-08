'use client';

export interface ShellyLogoPlaceholderProps {
  /** When true, applies a gentle bobbing animation (e.g. during connecting). */
  animate?: boolean;
  /** When true, renders a smaller icon (e.g. after conversation starts). */
  compact?: boolean;
}

export default function ShellyLogoPlaceholder({ animate = false, compact = false }: ShellyLogoPlaceholderProps) {
  const size = compact ? 56 : 100;
  const fontSize = compact ? 32 : 48;
  const minHeight = compact ? 80 : 120;

  return (
    <div
      style={{
        minHeight,
        width: '100%',
        maxWidth: compact ? 140 : 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
      }}
      aria-hidden
    >
      <div
        className={animate ? 'v2-shelly-connecting' : undefined}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'var(--v2-primary)',
          opacity: 0.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize,
          lineHeight: 1,
        }}
      >
        🐢
      </div>
    </div>
  );
}
