'use client';

import type { PlacedDecoration } from '@/app/hooks/useTree';

interface ChristmasTreeSVGProps {
  growthStage: number;
  placedDecorations: PlacedDecoration[];
}

const TREE_SLOTS = [
  { id: 'slot-0', x: 50, y: 28 },
  { id: 'slot-1', x: 35, y: 42 },
  { id: 'slot-2', x: 65, y: 42 },
  { id: 'slot-3', x: 42, y: 54 },
  { id: 'slot-4', x: 58, y: 54 },
  { id: 'slot-5', x: 50, y: 64 },
  { id: 'slot-6', x: 30, y: 72 },
  { id: 'slot-7', x: 70, y: 72 },
  { id: 'slot-8', x: 50, y: 80 },
  { id: 'slot-9', x: 38, y: 86 },
  { id: 'slot-10', x: 62, y: 86 },
];

const CONTAINER_WIDTH = 200;
const CONTAINER_HEIGHT = 240;

export default function ChristmasTreeSVG({
  growthStage,
  placedDecorations,
}: ChristmasTreeSVGProps) {
  const placedBySlot = new Map(placedDecorations.map((d) => [d.slotId, d.emoji]));
  const scale = 0.7 + growthStage * 0.08;

  return (
    <div
      style={{
        position: 'relative',
        width: CONTAINER_WIDTH,
        height: CONTAINER_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
      }}
    >
      <div
        style={{
          transformOrigin: 'bottom center',
          transform: `scale(${scale})`,
          position: 'relative',
          width: CONTAINER_WIDTH,
          height: CONTAINER_HEIGHT,
        }}
      >
        <svg
          width={CONTAINER_WIDTH}
          height={CONTAINER_HEIGHT}
          viewBox="0 0 200 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
          style={{ display: 'block' }}
        >
          {/* Trunk */}
          <rect
            x="80"
            y="195"
            width="40"
            height="45"
            rx="4"
            fill="#92400e"
            stroke="#b45309"
            strokeWidth="2"
          />
          {/* Foliage: three layered triangles (bottom to top) */}
          <path
            d="M 25 195 L 100 95 L 175 195 Z"
            fill="#166534"
            stroke="#15803d"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M 45 130 L 100 55 L 155 130 Z"
            fill="#15803d"
            stroke="#16a34a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M 65 75 L 100 18 L 135 75 Z"
            fill="#16a34a"
            stroke="#22c55e"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Star on top */}
          <path
            d="M 100 8 L 103 18 L 114 18 L 105 24 L 108 34 L 100 28 L 92 34 L 95 24 L 86 18 L 97 18 Z"
            fill="#facc15"
            stroke="#fbbf24"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          {TREE_SLOTS.slice(0, Math.min(placedDecorations.length + 3, 11)).map((slot) => {
            const emoji = placedBySlot.get(slot.id);
            const left = (slot.x / 100) * CONTAINER_WIDTH;
            const top = (slot.y / 100) * CONTAINER_HEIGHT;
            return (
              <div
                key={slot.id}
                style={{
                  position: 'absolute',
                  left: left - 14,
                  top: top - 14,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: emoji ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                  border: emoji ? '2px solid rgba(255,255,255,0.5)' : '1.5px dashed rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}
              >
                {emoji ?? ''}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
