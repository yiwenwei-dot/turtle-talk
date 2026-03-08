import Link from 'next/link';
import './v2/v2-tokens.css';

export default function NotFound() {
  return (
    <div
      className="v2-ui"
      style={{
        minHeight: '100vh',
        background: 'var(--v2-bg)',
        fontFamily: "var(--font-varela), 'Varela Round', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom))',
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--v2-primary)',
            opacity: 0.2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            lineHeight: 1,
          }}
          aria-hidden
        >
          🐢
        </div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--v2-text-primary)',
            margin: 0,
          }}
        >
          This page wandered off
        </h1>
        <p
          style={{
            fontSize: '1rem',
            color: 'var(--v2-text-secondary)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          We couldn’t find what you’re looking for. No worries — head back home and keep exploring!
        </p>
        <Link
          href="/"
          className="v2-btn-primary-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 28px',
            borderRadius: 'var(--v2-radius-pill)',
            fontSize: '1rem',
            textDecoration: 'none',
            minHeight: 'var(--v2-touch-min, 44px)',
          }}
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
