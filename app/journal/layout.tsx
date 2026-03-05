import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Journal',
  description: 'Record a voice note for later. No live session — just you and the mic.',
};

export default function JournalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
