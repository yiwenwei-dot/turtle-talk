'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square, Play, Save } from 'lucide-react';
import { useChildSession } from '@/app/hooks/useChildSession';
import { useMicPermission } from '@/app/hooks/useMicPermission';
import { getDb, getDeviceId } from '@/lib/db';
import BottomNav from '@/app/components/BottomNav';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      resolve(base64 ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function JournalPage() {
  const router = useRouter();
  const { child } = useChildSession();
  const { status: micStatus, requestPermission } = useMicPermission();
  const childId = child?.childId ?? (typeof window !== 'undefined' ? getDeviceId() : 'default');
  const db = getDb();

  const [state, setState] = useState<'idle' | 'recording' | 'recorded'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const recordedBlobRef = useRef<Blob | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const canJournal = typeof db.addJournal === 'function';

  const startRecording = useCallback(async () => {
    setError(null);
    if (micStatus !== 'granted') await requestPermission();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        if (chunks.length) {
          recordedBlobRef.current = new Blob(chunks, { type: 'audio/webm' });
          setState('recorded');
        } else {
          setState('idle');
        }
      };
      recorder.start();
      setState('recording');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start recording.');
      setState('idle');
    }
  }, [micStatus, requestPermission]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  const playRecorded = useCallback(() => {
    const blob = recordedBlobRef.current;
    if (!blob || !audioRef.current) return;
    const url = URL.createObjectURL(blob);
    audioRef.current.src = url;
    audioRef.current.play();
  }, []);

  const saveJournal = useCallback(async () => {
    if (!db.addJournal || !recordedBlobRef.current) return;
    setSaving(true);
    setError(null);
    try {
      const base64 = await blobToBase64(recordedBlobRef.current);
      await db.addJournal(childId, base64);
      router.push('/journals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
      setSaving(false);
    }
  }, [childId, db, router]);

  return (
    <main
      style={{
        position: 'relative',
        zIndex: 10,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px 120px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <h1
          style={{
            color: 'var(--tt-text-primary)',
            fontSize: '1.5rem',
            fontWeight: 800,
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            margin: '0 0 8px',
          }}
        >
          Journal
        </h1>
        <p
          style={{
            color: 'var(--tt-text-secondary)',
            fontSize: '0.95rem',
            margin: '0 0 28px',
          }}
        >
          Record a voice note for later. No live session — just you and the mic.
        </p>

        {!canJournal && (
          <p
            style={{
              color: 'var(--tt-text-muted)',
              fontSize: '0.9rem',
              marginBottom: 24,
              padding: '12px 16px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: 12,
            }}
          >
            Journaling is only available when using local storage.
          </p>
        )}

        {error && (
          <p
            style={{
              color: 'var(--tt-text-primary)',
              background: 'rgba(239,68,68,0.2)',
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 14,
              marginBottom: 16,
            }}
          >
            {error}
          </p>
        )}

        {state === 'idle' && canJournal && (
          <button
            type="button"
            onClick={startRecording}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '16px 32px',
              fontSize: 18,
              fontWeight: 700,
              color: 'white',
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              border: 'none',
              borderRadius: 9999,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(22,163,74,0.4)',
            }}
          >
            <Mic size={24} strokeWidth={2} /> Start recording
          </button>
        )}

        {state === 'recording' && (
          <button
            type="button"
            onClick={stopRecording}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '16px 32px',
              fontSize: 18,
              fontWeight: 700,
              color: 'white',
              background: 'rgba(239,68,68,0.9)',
              border: 'none',
              borderRadius: 9999,
              cursor: 'pointer',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          >
            <Square size={24} strokeWidth={2} fill="currentColor" /> Stop
          </button>
        )}

        {state === 'recorded' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <audio ref={audioRef} controls style={{ width: '100%', maxWidth: 280 }} />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={playRecorded}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--tt-text-primary)',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
              >
                <Play size={18} fill="currentColor" /> Play
              </button>
              <button
                type="button"
                onClick={saveJournal}
                disabled={saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'white',
                  background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                  border: 'none',
                  borderRadius: 12,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <Save size={18} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
