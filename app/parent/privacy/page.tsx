/**
 * /parent/privacy — AI transparency and data rights page.
 * Server Component; redirects to /login if not authenticated.
 */
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { DataRightsRow } from './DataRightsRow';

export const metadata: Metadata = {
  title: 'Privacy & Data | TurtleTalk',
  robots: { index: false, follow: false },
};

export default async function PrivacyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Load children linked to this parent
  const { data: links } = await supabase
    .from('parent_child')
    .select('child_id')
    .eq('parent_id', user.id);

  const childIds = (links ?? []).map((r: { child_id: string }) => r.child_id);

  type ChildRow = { id: string; first_name: string; emoji: string };
  let children: ChildRow[] = [];
  if (childIds.length > 0) {
    const { data } = await supabase
      .from('children')
      .select('id, first_name, emoji')
      .in('id', childIds)
      .order('created_at', { ascending: false });
    children = (data ?? []) as ChildRow[];
  }

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: 17,
    fontWeight: 600,
    color: 'var(--pd-text-primary)',
    margin: '0 0 12px',
    letterSpacing: '-0.02em',
  };

  const bodyStyle: React.CSSProperties = {
    fontSize: 15,
    color: 'var(--pd-text-secondary)',
    lineHeight: 1.6,
    margin: '0 0 10px',
  };

  const listItemStyle: React.CSSProperties = {
    fontSize: 15,
    color: 'var(--pd-text-secondary)',
    lineHeight: 1.5,
  };

  const linkStyle: React.CSSProperties = {
    color: 'var(--pd-accent)',
    textDecoration: 'underline',
  };

  return (
    <div
      className="parent-dashboard"
      style={{ minHeight: '100dvh', background: 'var(--pd-bg-gradient)' }}
    >
      {/* Simple top bar */}
      <header
        className="parent-dashboard"
        style={{
          background: 'var(--pd-header-bg)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          padding: '0 20px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <a
            href="/parent"
            style={{
              fontSize: 14,
              color: 'var(--pd-text-secondary)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            &#8592; Dashboard
          </a>
          <span
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--pd-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Privacy &amp; Data
          </span>
        </div>
      </header>

      <main
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '28px 20px 60px',
          display: 'flex',
          flexDirection: 'column',
          gap: 28,
        }}
      >
        {/* Section 1: What we store */}
        <div className="pd-card-elevated" style={{ padding: 24 }}>
          <h2 style={sectionHeadingStyle}>What we store</h2>
          <p style={bodyStyle}>
            TurtleTalk stores only what is necessary to personalise your child&apos;s experience.
            For each child profile we hold:
          </p>
          <ul style={{ paddingLeft: 20, margin: '0 0 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li style={listItemStyle}>Child name and chosen emoji avatar</li>
            <li style={listItemStyle}>Conversation topics and emotional themes noted during sessions</li>
            <li style={listItemStyle}>Mission history (brave challenges your child has taken on)</li>
            <li style={listItemStyle}>Wish list items added by you</li>
            <li style={listItemStyle}>Encouragements (emoji cheers) sent by you</li>
            <li style={listItemStyle}>Progress tree state</li>
          </ul>
          <p style={{ ...bodyStyle, margin: 0 }}>
            <strong style={{ color: 'var(--pd-text-primary)' }}>We do not store audio recordings</strong>{' '}
            of any kind.{' '}
            <strong style={{ color: 'var(--pd-text-primary)' }}>
              Conversation transcripts are not retained on TurtleTalk servers
            </strong>{' '}
            — only short thematic summaries are saved so Tammy can remember context across sessions.
          </p>
        </div>

        {/* Section 2: AI processing */}
        <div className="pd-card-elevated" style={{ padding: 24 }}>
          <h2 style={sectionHeadingStyle}>AI processing</h2>
          <p style={bodyStyle}>
            TurtleTalk uses the following third-party AI providers to power conversations:
          </p>
          <ul style={{ paddingLeft: 20, margin: '0 0 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li style={listItemStyle}>
              <strong style={{ color: 'var(--pd-text-primary)' }}>Anthropic Claude</strong> —
              conversation AI and guardrails.{' '}
              <a
                href="https://www.anthropic.com/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
              >
                Privacy policy
              </a>
            </li>
            <li style={listItemStyle}>
              <strong style={{ color: 'var(--pd-text-primary)' }}>Google Gemini</strong> —
              conversation AI and speech processing.{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
              >
                Privacy policy
              </a>
            </li>
            <li style={listItemStyle}>
              <strong style={{ color: 'var(--pd-text-primary)' }}>OpenAI Whisper</strong> —
              speech-to-text transcription.{' '}
              <a
                href="https://openai.com/policies/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
              >
                Privacy policy
              </a>
            </li>
          </ul>
          <p style={bodyStyle}>
            Audio and text are sent to these providers in real time for processing and are{' '}
            <strong style={{ color: 'var(--pd-text-primary)' }}>
              not retained by TurtleTalk servers
            </strong>
            . Conversations are processed transiently and are not stored after the session ends.
          </p>
          <p style={{ ...bodyStyle, margin: 0 }}>
            <strong style={{ color: 'var(--pd-text-primary)' }}>
              Your data is not used to train any AI models
            </strong>{' '}
            by TurtleTalk or its providers under our current API agreements.
          </p>
        </div>

        {/* Section 3: Your data rights */}
        <div className="pd-card-elevated" style={{ padding: 24 }}>
          <h2 style={sectionHeadingStyle}>Your data rights</h2>
          <p style={bodyStyle}>
            You can download a copy of all stored data for any of your children, or permanently
            delete it at any time.
          </p>

          {children.length === 0 ? (
            <p style={{ ...bodyStyle, margin: 0 }}>
              No children are linked to your account yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {children.map((child) => (
                <DataRightsRow
                  key={child.id}
                  childId={child.id}
                  childName={child.first_name}
                  childEmoji={child.emoji}
                />
              ))}
            </div>
          )}

          <p
            style={{
              fontSize: 14,
              color: 'var(--pd-text-tertiary)',
              margin: '20px 0 0',
              lineHeight: 1.5,
            }}
          >
            To delete your parent account entirely, please contact us at{' '}
            <a href="mailto:support@turtletalk.app" style={linkStyle}>
              support@turtletalk.app
            </a>
            . We will process your request within 30 days.
          </p>
        </div>
      </main>
    </div>
  );
}
