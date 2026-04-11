'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Phone } from 'lucide-react';

const LONG_PRESS_MS = 500;

export default function TalkButton() {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressHandledRef = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const handlePointerDown = () => {
    setPressed(true);
    longPressHandledRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressHandledRef.current = true;
      longPressTimerRef.current = null;
      setLongPressTriggered(true);
      setTimeout(() => setLongPressTriggered(false), 800);
    }, LONG_PRESS_MS);
  };

  const handlePointerUp = () => {
    setPressed(false);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (longPressHandledRef.current) {
      e.preventDefault();
      longPressHandledRef.current = false;
    }
  };

  const showLabel = hovered || longPressTriggered;

  return (
    <Link
      href="/talk"
      aria-label="Start a Brave Call with Tammy"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        textDecoration: 'none',
        minHeight: 'var(--v2-touch-min)',
        padding: showLabel ? '12px 24px' : '12px 20px',
        borderRadius: 'var(--v2-radius-pill)',
        background: longPressTriggered ? 'var(--v2-primary-dark)' : 'var(--v2-primary)',
        boxShadow: 'var(--v2-shadow-card)',
        border: 'none',
        cursor: 'pointer',
        transition: 'transform var(--v2-transition-fast), background var(--v2-transition-fast), padding var(--v2-transition-spring), box-shadow var(--v2-transition-fast)',
        transform: pressed ? 'scale(0.98)' : 'scale(1)',
      }}
    >
      <span style={{ display: 'inline-flex', flexShrink: 0 }}>
        <Phone size={26} color="white" strokeWidth={2} aria-hidden />
      </span>
      <span
        style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'white',
          whiteSpace: 'nowrap',
          maxWidth: showLabel ? 140 : 0,
          overflow: 'hidden',
          opacity: showLabel ? 1 : 0,
          marginLeft: showLabel ? 10 : 0,
          transition: 'max-width var(--v2-transition-spring), opacity var(--v2-transition-fast), margin-left var(--v2-transition-fast)',
        }}
      >
        Brave Call with Tammy
      </span>
    </Link>
  );
}
