import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Journals',
  description: 'Voice notes you recorded for later.',
};

export default function JournalsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
