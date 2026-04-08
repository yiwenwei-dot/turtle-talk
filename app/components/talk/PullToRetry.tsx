'use client';

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

export function PullToRetry({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const triggeredRef = useRef(false);
  const THRESHOLD = 60;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!onRetry) return;
    startYRef.current = e.clientY;
    triggeredRef.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startYRef.current === null || !onRetry) return;
    const delta = Math.max(0, e.clientY - startYRef.current);
    setDragY(Math.min(delta, THRESHOLD + 20));
    if (delta >= THRESHOLD && !triggeredRef.current) {
      triggeredRef.current = true;
      onRetry();
    }
  };

  const onPointerUp = () => {
    startYRef.current = null;
    setDragY(0);
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        transform: `translateY(${dragY}px)`,
        transition: dragY === 0 ? 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
        cursor: onRetry ? 'grab' : 'default',
        touchAction: 'none',
      }}
    >
      {children}
    </div>
  );
}
