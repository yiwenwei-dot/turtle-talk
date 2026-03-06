import Link from 'next/link';

interface AdminPageHeaderProps {
  /** Page title shown in the header */
  title: string;
  /** If set, renders a breadcrumb link before the title */
  parentHref?: string;
  parentLabel?: string;
  /** Optional content rendered on the right side of the header */
  right?: React.ReactNode;
}

/**
 * Shared sticky header for all admin pages.
 * Inherits parent-dashboard CSS variables from the AdminLayout wrapper.
 */
export function AdminPageHeader({
  title,
  parentHref,
  parentLabel = '← Admin',
  right,
}: AdminPageHeaderProps) {
  return (
    <header
      style={{
        background: 'var(--pd-header-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--pd-card-border)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {parentHref && (
        <>
          <Link
            href={parentHref}
            style={{ fontSize: 13, color: 'var(--pd-accent)', textDecoration: 'none', flexShrink: 0 }}
          >
            {parentLabel}
          </Link>
          <span style={{ color: 'var(--pd-text-tertiary)', fontSize: 16, flexShrink: 0, opacity: 0.4 }}>/</span>
        </>
      )}
      <h1
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--pd-text-primary)',
          flex: 1,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h1>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </header>
  );
}
