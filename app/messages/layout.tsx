import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Messages',
  description:
    'Read past conversation highlights from your chats with Tammy — fun moments, topics explored, and encouragement to revisit.',
  openGraph: {
    title: 'Messages | TurtleTalk',
    description: 'Conversation highlights from your sessions with Tammy the sea turtle.',
  },
};

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
