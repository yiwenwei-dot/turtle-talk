'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const supabase = createClient();

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { shouldCreateUser: true },
      });
      if (err) {
        setError(err.message || 'Could not send code');
        return;
      }
      setMessage('Check your email for the 8-digit code');
      setStep('code');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = code.replace(/\D/g, '').slice(0, 8);
    if (trimmed.length !== 8) {
      setError('Please enter the 8-digit code');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: trimmed,
        type: 'email',
      });
      if (err) {
        setError(err.message || 'Invalid code');
        return;
      }

      const res = await fetch('/api/auth/post-login-check', {
        credentials: 'include',
      });
      const data = await res.json();

      if (!data.allowed) {
        await supabase.auth.signOut();
        if (data.reason === 'suspended') {
          setError('This account has been suspended.');
        } else if (data.reason === 'not_approved') {
          setMessage(data.message || "You're on the list! We'll email you when you can sign in.");
          setError(null);
        } else {
          setError(data.message || 'You cannot sign in yet.');
        }
        setLoading(false);
        return;
      }

      router.push('/parent');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'linear-gradient(180deg, #0f766e 0%, #134e4a 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 20,
          padding: 32,
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: 24,
            fontWeight: 700,
            color: 'white',
            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        >
          Parent login
        </h1>
        <p
          style={{
            margin: '0 0 24px',
            fontSize: 14,
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          {step === 'email'
            ? 'Enter your email and we’ll send you a one-time code.'
            : 'Enter the 8-digit code from your email.'}
        </p>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                fontSize: 16,
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'white',
                color: '#134e4a',
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="00000000"
              maxLength={8}
              disabled={loading}
              style={{
                padding: '14px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                fontSize: 24,
                letterSpacing: 8,
                textAlign: 'center',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '14px 20px',
                borderRadius: 12,
                border: 'none',
                background: 'white',
                color: '#134e4a',
                fontSize: 16,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Checking…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setError(null); setMessage(null); }}
              style={{
                padding: 10,
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.8)',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        {error && (
          <p style={{ margin: '16px 0 0', color: '#fecaca', fontSize: 14 }}>
            {error}
          </p>
        )}
        {message && !error && (
          <p style={{ margin: '16px 0 0', color: 'rgba(255,255,255,0.95)', fontSize: 14 }}>
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
