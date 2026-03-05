'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Square, Play, Save, X } from 'lucide-react';
import { useChildSession } from '@/app/hooks/useChildSession';
import { useMicPermission } from '@/app/hooks/useMicPermission';
import { getDb, getDeviceId } from '@/lib/db';

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

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JournalModal({ isOpen, onClose }: JournalModalProps) {
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
      onClose();
      router.push('/journals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
      setSaving(false);
    }
  }, [childId, db, onClose, router]);

  if (!isOpen) return null;

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(6px)',
          zIndex: 90,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="journal-modal-title"
        style={{
          position: 'fixed',
          top: '4%',
          left: '4%',
          right: '4%',
          bottom: '4%',
          maxHeight: '92vh',
          margin: 'auto',
          background: 'rgba(8, 22, 48, 0.96)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 24,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
          zIndex: 91,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: 44,
            height: 44,
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.1)',
            color: 'var(--tt-text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={22} strokeWidth={2} />
        </button>

        <h2
          id="journal-modal-title"
          style={{
            color: 'var(--tt-text-primary)',
            fontSize: '1.5rem',
            fontWeight: 800,
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            margin: '0 0 8px',
          }}
        >
          Journal
        </h2>
        <p
          style={{
            color: 'var(--tt-text-secondary)',
            fontSize: '0.95rem',
            margin: '0 0 32px',
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

        {/* Media controls */}
        {state === 'idle' && canJournal && (
          <button
            type="button"
            onClick={startRecording}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '20px 40px',
              fontSize: 20,
              fontWeight: 700,
              color: 'white',
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              border: 'none',
              borderRadius: 9999,
              cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(22,163,74,0.4)',
            }}
          >
            <Mic size={28} strokeWidth={2} /> Start recording
          </button>
        )}

        {state === 'recording' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
            <span
              style={{
                display: 'inline-block',
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.9)',
                animation: 'pulse 1.2s ease-in-out infinite',
              }}
            />
            <button
              type="button"
              onClick={stopRecording}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                padding: '20px 40px',
                fontSize: 20,
                fontWeight: 700,
                color: 'white',
                background: 'rgba(239,68,68,0.9)',
                border: 'none',
                borderRadius: 9999,
                cursor: 'pointer',
              }}
            >
              <Square size={24} strokeWidth={2} fill="currentColor" /> Stop
            </button>
          </div>
        )}

        {state === 'recorded' && (
          <div
            style={{
              width: '100%',
              maxWidth: 360,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              alignItems: 'center',
            }}
          >
            <audio
              ref={audioRef}
              controls
              style={{
                width: '100%',
                height: 48,
                borderRadius: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={playRecorded}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '14px 28px',
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--tt-text-primary)',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 14,
                  cursor: 'pointer',
                }}
              >
                <Play size={20} fill="currentColor" /> Play
              </button>
              <button
                type="button"
                onClick={saveJournal}
                disabled={saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '14px 28px',
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'white',
                  background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                  border: 'none',
                  borderRadius: 14,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <Save size={20} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
