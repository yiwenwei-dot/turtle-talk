import Link from 'next/link';

export const metadata = {
  title: 'Admin | TurtleTalk',
  description: 'User and application management',
  robots: { index: false, follow: false },
};

interface AdminCard {
  title: string;
  description: string;
  href?: string;
}

const cards: AdminCard[] = [
  { title: 'User management', description: 'View and manage all accounts — access status, suspension, and roles.', href: '/admin/users' },
  { title: 'Waiting list', description: 'Review, invite, approve, or reject access requests.', href: '/admin/waiting-list' },
  { title: 'Support requests', description: 'Coming soon' },
  { title: 'Feature flags', description: 'Coming soon' },
];

export default function AdminPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f9fafb',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header
        style={{
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Admin</h1>
        <Link
          href="/parent"
          style={{ fontSize: 14, color: '#0f766e', textDecoration: 'none' }}
        >
          ← Parent dashboard
        </Link>
      </header>
      <main
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
          }}
        >
          {cards.map((card) => {
            const inner = (
              <>
                <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: '#111827' }}>
                  {card.title}
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: card.href ? '#0f766e' : '#6b7280' }}>
                  {card.href ? card.description : 'Coming soon'}
                </p>
              </>
            );

            const sharedStyle: React.CSSProperties = {
              padding: 20,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              display: 'block',
              textDecoration: 'none',
              transition: 'box-shadow 0.15s, border-color 0.15s',
            };

            return card.href ? (
              <Link
                key={card.title}
                href={card.href}
                style={sharedStyle}
              >
                {inner}
              </Link>
            ) : (
              <div key={card.title} style={sharedStyle}>
                {inner}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
