import Link from 'next/link';
import { AdminPageHeader } from '@/app/components/admin/AdminPageHeader';

interface AdminCard {
  title: string;
  description: string;
  href?: string;
}

const cards: AdminCard[] = [
  { title: 'User management', description: 'View and manage all accounts — access status, suspension, and roles.', href: '/admin/users' },
  { title: 'Waiting list', description: 'Review, invite, approve, or reject access requests.', href: '/admin/waiting-list' },
  { title: 'Call satisfaction', description: 'View ratings and feedback from the "How was your call?" modal.', href: '/admin/satisfaction' },
  { title: 'Session settings', description: 'Configure voice session behaviour — interruptions, and more.', href: '/admin/session-settings' },
  { title: 'Tattle Cards', description: 'Manage the conversation prompt cards shown to children.', href: '/admin/tattle-cards' },
  { title: 'Support requests', description: 'Coming soon' },
  { title: 'Feature flags', description: 'Coming soon' },
];

export default function AdminPage() {
  const backToParent = (
    <Link
      href="/parent"
      style={{ fontSize: 13, color: 'var(--pd-accent)', textDecoration: 'none' }}
    >
      Parent dashboard →
    </Link>
  );

  return (
    <>
      <AdminPageHeader title="Admin" right={backToParent} />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px 60px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
          }}
        >
          {cards.map((card) => {
            const inner = (
              <>
                <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: 'var(--pd-text-primary)' }}>
                  {card.title}
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: card.href ? 'var(--pd-accent)' : 'var(--pd-text-tertiary)' }}>
                  {card.href ? card.description : 'Coming soon'}
                </p>
              </>
            );

            const sharedStyle: React.CSSProperties = {
              padding: 20,
              background: 'var(--pd-card)',
              border: '1px solid var(--pd-card-border)',
              borderRadius: 16,
              display: 'block',
              textDecoration: 'none',
              boxShadow: 'var(--pd-shadow-card)',
              transition: 'box-shadow 0.15s',
            };

            return card.href ? (
              <Link key={card.title} href={card.href} style={sharedStyle}>
                {inner}
              </Link>
            ) : (
              <div key={card.title} style={{ ...sharedStyle, opacity: 0.6 }}>
                {inner}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
