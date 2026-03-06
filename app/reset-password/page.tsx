'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const inputStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(255,255,255,0.15)',
  color: 'white',
  fontSize: 16,
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the user arrives via the reset link.
    // The token is in the URL hash; the client SDK handles it automatically.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
      if (event === 'SIGNED_OUT') setExpired(true);
    });

    // Also check if already in a recovery session (e.g. page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) { setError(err.message || 'Could not update password'); return; }
      setDone(true);
      setTimeout(() => router.push('/parent'), 2500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      background: 'linear-gradient(180deg, #0f766e 0%, #134e4a 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(255,255,255,0.12)',
        borderRadius: 20, padding: 32,
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}>
        {done ? (
          <>
            <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: 'white' }}>Password updated</h1>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
              You&apos;re all set. Taking you to your dashboard…
            </p>
          </>
        ) : expired ? (
          <>
            <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: 'white' }}>Link expired</h1>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
              This reset link has expired or already been used.
            </p>
            <button
              onClick={() => router.push('/login')}
              style={{
                padding: '14px 20px', borderRadius: 12, border: 'none',
                background: 'white', color: '#134e4a', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', width: '100%',
              }}
            >
              Back to sign in
            </button>
          </>
        ) : !ready ? (
          <>
            <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: 'white' }}>Reset password</h1>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
              Verifying your reset link…
            </p>
          </>
        ) : (
          <>
            <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: 'white' }}>Set new password</h1>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
              Choose a strong password for your account.
            </p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                autoComplete="new-password"
                disabled={loading}
                style={inputStyle}
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                disabled={loading}
                style={inputStyle}
              />
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '14px 20px', borderRadius: 12, border: 'none',
                  background: 'white', color: '#134e4a', fontSize: 16, fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', width: '100%',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Saving…' : 'Set password'}
              </button>
            </form>
            {error && <p style={{ margin: '16px 0 0', color: '#fecaca', fontSize: 14 }}>{error}</p>}
          </>
        )}
      </div>
    </main>
  );
}
