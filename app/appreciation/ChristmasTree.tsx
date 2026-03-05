'use client';

import type { PlacedDecoration } from '@/app/hooks/useTree';
import ChristmasTreeSVG from '@/app/appreciation/ChristmasTreeSVG';

interface ChristmasTreeProps {
  growthStage: number;
  placedDecorations: PlacedDecoration[];
}

export default function ChristmasTree({
  growthStage,
  placedDecorations,
}: ChristmasTreeProps) {
  return (
    <ChristmasTreeSVG
      growthStage={growthStage}
      placedDecorations={placedDecorations}
    />
  );
}
