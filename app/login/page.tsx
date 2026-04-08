'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

const CODE_LENGTH = 8;

// ---------------------------------------------------------------------------
// OTP digit boxes
// ---------------------------------------------------------------------------
function OtpInput({ onComplete, disabled }: { onComplete: (code: string) => void; disabled: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const focus = (i: number) => refs.current[i]?.focus();

  const update = useCallback((next: string[]) => {
    setDigits(next);
    if (next.every(Boolean)) onComplete(next.join(''));
  }, [onComplete]);

  function handleChange(i: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = digit;
    update(next);
    if (digit && i < CODE_LENGTH - 1) focus(i + 1);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = [...digits];
        next[i] = '';
        update(next);
      } else if (i > 0) {
        focus(i - 1);
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focus(i - 1);
    } else if (e.key === 'ArrowRight' && i < CODE_LENGTH - 1) {
      focus(i + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH).fill('');
    pasted.split('').forEach((d, idx) => { next[idx] = d; });
    update(next);
    focus(Math.min(pasted.length, CODE_LENGTH - 1));
  }

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          style={{
            width: 38,
            height: 48,
            borderRadius: 10,
            border: d
              ? '2px solid rgba(255,255,255,0.9)'
              : '2px solid rgba(255,255,255,0.25)',
            background: d ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
            color: 'white',
            fontSize: 22,
            fontWeight: 700,
            textAlign: 'center',
            outline: 'none',
            transition: 'border-color 0.15s, background 0.15s',
            caretColor: 'transparent',
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auth mode toggle
// ---------------------------------------------------------------------------
type AuthMode = 'otp' | 'password' | 'forgot';

function ModeToggle({ mode, onChange }: { mode: AuthMode; onChange: (m: 'otp' | 'password') => void }) {
  const pill: React.CSSProperties = {
    flex: 1,
    padding: '8px 0',
    borderRadius: 8,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  };
  const active = mode === 'forgot' ? 'password' : mode;
  return (
    <div style={{
      display: 'flex', gap: 4, padding: 4,
      background: 'rgba(0,0,0,0.2)', borderRadius: 12, marginBottom: 24,
    }}>
      <button
        type="button"
        onClick={() => onChange('otp')}
        style={{
          ...pill,
          background: active === 'otp' ? 'white' : 'transparent',
          color: active === 'otp' ? '#134e4a' : 'rgba(255,255,255,0.75)',
        }}
      >
        Magic link
      </button>
      <button
        type="button"
        onClick={() => onChange('password')}
        style={{
          ...pill,
          background: active === 'password' ? 'white' : 'transparent',
          color: active === 'password' ? '#134e4a' : 'rgba(255,255,255,0.75)',
        }}
      >
        Password
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
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

const primaryBtn: React.CSSProperties = {
  padding: '14px 20px',
  borderRadius: 12,
  border: 'none',
  background: 'white',
  color: '#134e4a',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  width: '100%',
};

const ghostBtn: React.CSSProperties = {
  padding: 10,
  background: 'transparent',
  border: 'none',
  color: 'rgba(255,255,255,0.7)',
  fontSize: 14,
  cursor: 'pointer',
  width: '100%',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('otp');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Waiting list inline form
  const [wlEmail, setWlEmail] = useState('');
  const [wlLoading, setWlLoading] = useState(false);
  const [wlMsg, setWlMsg] = useState<string | null>(null);
  const [wlExpanded, setWlExpanded] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const urlError = searchParams.get('error');
    if (urlError) setError(urlError);
  }, [searchParams]);

  function switchMode(m: 'otp' | 'password') {
    setMode(m);
    setStep('email');
    setError(null);
    setMessage(null);
  }

  async function postLoginCheck(): Promise<boolean> {
    const res = await fetch('/api/auth/post-login-check', { credentials: 'include' });
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
      return false;
    }
    return true;
  }

  // OTP — send code
  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Please enter your email'); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ email: trimmed, options: { shouldCreateUser: true } });
      if (err) { setError(err.message || 'Could not send code'); return; }
      setMessage('Check your email for the 8-digit code');
      setStep('code');
    } finally { setLoading(false); }
  }

  // OTP — verify code (auto-triggered when all 8 digits entered)
  async function handleVerifyCode(code: string) {
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: 'email' });
      if (err) { setError(err.message || 'Invalid code'); return; }
      if (!(await postLoginCheck())) return;
      router.push('/parent'); router.refresh();
    } finally { setLoading(false); }
  }

  // Password login
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Please enter your email'); return; }
    if (!password) { setError('Please enter your password'); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      if (err) { setError(err.message || 'Sign in failed'); return; }
      if (!(await postLoginCheck())) return;
      router.push('/parent'); router.refresh();
    } finally { setLoading(false); }
  }

  // Forgot password — send reset email
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setMessage(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError('Please enter your email'); return; }
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/confirm`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (err) { setError(err.message || 'Could not send reset email'); return; }
      setMessage('Reset link sent! Check your email.');
    } finally { setLoading(false); }
  }

  // Waiting list
  async function handleWaitingList(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = wlEmail.trim().toLowerCase();
    if (!trimmed) return;
    setWlLoading(true);
    try {
      const res = await fetch('/api/waiting-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      setWlMsg(data.message ?? data.error ?? 'Done!');
    } catch {
      setWlMsg('Something went wrong');
    } finally { setWlLoading(false); }
  }

  const subtitle = {
    otp: step === 'email' ? "Enter your email and we'll send you a one-time code." : 'Enter the 8-digit code from your email.',
    password: 'Sign in with your email and password.',
    forgot: 'Enter your email and we\'ll send you a reset link.',
  }[mode];

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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Image
            src="/TurtleTalk---Logo.png"
            alt="TurtleTalk"
            width={72}
            height={72}
            style={{ borderRadius: 20 }}
          />
        </div>
        <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
          {mode === 'forgot' ? 'Reset password' : 'Parent login'}
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{subtitle}</p>

        {/* Mode toggle — hidden on code step and forgot mode back-link is shown separately */}
        {step === 'email' && mode !== 'forgot' && (
          <ModeToggle mode={mode} onChange={switchMode} />
        )}

        {/* ── OTP email step ── */}
        {mode === 'otp' && step === 'email' && (
          <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email" disabled={loading} style={inputStyle} />
            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending…' : 'Send code'}
            </button>
          </form>
        )}

        {/* ── OTP code step ── */}
        {mode === 'otp' && step === 'code' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <OtpInput onComplete={handleVerifyCode} disabled={loading} />
            {loading && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Verifying…</p>
            )}
            <button type="button" onClick={() => { setStep('email'); setError(null); setMessage(null); }} style={ghostBtn}>
              Use a different email
            </button>
          </div>
        )}

        {/* ── Password ── */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email" disabled={loading} style={inputStyle} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" autoComplete="current-password" disabled={loading} style={inputStyle} />
            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <button type="button" onClick={() => { setMode('forgot'); setError(null); setMessage(null); }} style={ghostBtn}>
              Forgot password?
            </button>
          </form>
        )}

        {/* ── Forgot password ── */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoComplete="email" disabled={loading} style={inputStyle} />
            <button type="submit" disabled={loading} style={{ ...primaryBtn, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <button type="button" onClick={() => { setMode('password'); setError(null); setMessage(null); }} style={ghostBtn}>
              Back to sign in
            </button>
          </form>
        )}

        {error && <p style={{ margin: '16px 0 0', color: '#fecaca', fontSize: 14 }}>{error}</p>}
        {message && !error && <p style={{ margin: '16px 0 0', color: 'rgba(255,255,255,0.95)', fontSize: 14 }}>{message}</p>}

        {/* ── Waiting list ── */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          {!wlMsg ? (
            <>
              <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center' }}>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setWlExpanded((x) => !x)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Join the waiting list
                </button>
              </p>
              {wlExpanded && (
                <form onSubmit={handleWaitingList} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email" value={wlEmail} onChange={(e) => setWlEmail(e.target.value)}
                    placeholder="your@email.com" disabled={wlLoading}
                    style={{ ...inputStyle, fontSize: 14, padding: '10px 14px', flex: 1 }}
                  />
                  <button
                    type="submit" disabled={wlLoading}
                    style={{
                      padding: '10px 16px', borderRadius: 12, border: 'none',
                      background: 'white', color: '#134e4a', fontSize: 14, fontWeight: 700,
                      cursor: wlLoading ? 'not-allowed' : 'pointer', flexShrink: 0,
                      opacity: wlLoading ? 0.7 : 1,
                    }}
                  >
                    {wlLoading ? '…' : 'Join'}
                  </button>
                </form>
              )}
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.9)', textAlign: 'center' }}>{wlMsg}</p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
