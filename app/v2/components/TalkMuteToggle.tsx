'use client';

import { Mic, MicOff } from 'lucide-react';

export interface TalkMuteToggleProps {
  isMuted: boolean;
  onToggle: () => void;
  /** Only show when call is in one of these states */
  callActive: boolean;
}

const SIZE = 44;

export default function TalkMuteToggle({ isMuted, onToggle, callActive }: TalkMuteToggleProps) {
  if (!callActive) return null;

  const Icon = isMuted ? MicOff : Mic;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isMuted ? 'Unmute' : 'Mute'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: SIZE,
        height: SIZE,
        borderRadius: '50%',
        background: isMuted ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.1)',
        border: isMuted ? '1.5px solid rgba(239,68,68,0.4)' : '1.5px solid rgba(255,255,255,0.15)',
        cursor: 'pointer',
        color: isMuted ? '#ef4444' : 'var(--v2-text-secondary)',
        transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.15s ease',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <Icon size={20} strokeWidth={2} aria-hidden />
    </button>
  );
}
