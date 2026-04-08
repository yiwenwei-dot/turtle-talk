'use client';

import { Suspense } from 'react';
import AppreciationPageInner from '@/app/components/appreciation/AppreciationPageInner';

export default function AppreciationPage() {
  return (
    <Suspense>
      <AppreciationPageInner />
    </Suspense>
  );
}
