import type { Metadata } from 'next';
import AppreciationBottomNav from './AppreciationBottomNav';

export const metadata: Metadata = {
  title: 'My Tree',
  description:
    'Your tree grows with every cheer from your grown-up. Decorate it and unlock wish list items.',
  openGraph: {
    title: 'My Tree | TurtleTalk',
    description: 'Decorate your tree with cheers and unlock wishes.',
  },
};

export default function AppreciationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AppreciationBottomNav />
    </>
  );
}
