import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Parent Dashboard',
  description:
    'A weekly overview of your child\'s TurtleTalk activity — emotional themes explored, brave missions taken on, dinner conversation starters, and recommended books.',
  robots: {
    index: false, // keep parent view private from search engines
    follow: false,
  },
  openGraph: {
    title: 'Parent Dashboard | TurtleTalk',
    description: "Weekly summary of your child's conversations, missions, and growth with Tammy.",
  },
};

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
