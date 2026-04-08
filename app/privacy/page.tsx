import type { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'TurtleTalk privacy policy — how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div
      className="parent-dashboard"
      style={{
        minHeight: '100vh',
        background: 'var(--pd-bg-gradient)',
        color: 'var(--pd-text-primary)',
        fontFamily: 'var(--font-varela, system-ui)',
      }}
    >
      <main
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '40px 20px 80px',
          lineHeight: 1.7,
        }}
      >
        {/* Back link */}
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 28,
            padding: '8px 14px',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--pd-accent)',
            background: 'var(--pd-accent-soft)',
            borderRadius: 999,
            textDecoration: 'none',
            border: '1px solid transparent',
            transition: 'border-color 0.15s',
          }}
        >
          &larr; Back to TurtleTalk
        </a>

        {/* Header */}
        <div
          style={{
            background: 'var(--pd-card)',
            border: '1px solid var(--pd-card-border)',
            borderRadius: 'var(--pd-radius-lg)',
            boxShadow: 'var(--pd-shadow-card)',
            padding: '32px 28px',
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 12,
          }}
        >
          <Image
            src="/TurtleTalk---Logo.png"
            alt="TurtleTalk"
            width={80}
            height={80}
            style={{ borderRadius: 20 }}
          />
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              margin: 0,
              color: 'var(--pd-text-primary)',
              letterSpacing: -0.3,
            }}
          >
            Privacy Policy
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'var(--pd-text-tertiary)',
              margin: 0,
            }}
          >
            Effective date: March 13, 2026 &middot; Last updated: March 13, 2026
          </p>
        </div>

        {/* Sections */}
        <div style={{ display: 'grid', gap: 16 }}>
          <Section title="1. Who We Are">
            <p>
              TurtleTalk (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) provides an AI voice companion
              designed for children aged 5&ndash;13. This Privacy Policy explains how we collect, use, and safeguard
              information when you or your child use TurtleTalk, including the interactive demo experience.
            </p>
          </Section>

          <Section title="2. Information We Collect">
            <SubHeading>a. Demo Experience</SubHeading>
            <p>During the demo, we may collect:</p>
            <ul>
              <li><strong>First name</strong> and <strong>age range</strong> of the child</li>
              <li><strong>Favorite book</strong> and <strong>fun facts</strong> shared during onboarding</li>
              <li><strong>Voice conversation data</strong> processed in real time for the AI conversation</li>
              <li><strong>Mission selections</strong> and <strong>survey ratings</strong></li>
              <li><strong>Parent email address</strong> if voluntarily provided to join the waiting list</li>
            </ul>

            <SubHeading>b. Registered Accounts</SubHeading>
            <p>
              When a parent creates a full account, we additionally collect login credentials, child profiles,
              and conversation history necessary to deliver the service.
            </p>

            <SubHeading>c. Automatic Information</SubHeading>
            <p>
              We use Vercel Analytics to collect anonymized, aggregate usage data (page views, device type).
              We do not use advertising trackers or sell personal information.
            </p>
          </Section>

          <Section title="3. How We Use Information">
            <ul>
              <li>Provide and personalize the TurtleTalk conversation experience</li>
              <li>Generate age-appropriate mission suggestions</li>
              <li>Display the parent dashboard and weekly summaries</li>
              <li>Improve the quality and safety of our AI responses</li>
              <li>Communicate with parents about their account or waitlist status</li>
            </ul>
          </Section>

          <Section title="4. Children&rsquo;s Privacy (COPPA Compliance)">
            <p>
              We take children&rsquo;s privacy seriously and comply with the Children&rsquo;s Online Privacy
              Protection Act (COPPA).
            </p>
            <ul>
              <li>
                <strong>Parental consent:</strong> We require a parent or guardian to provide consent before a
                child uses TurtleTalk. In the demo, consent is collected via an on-screen acknowledgment before
                any data is gathered.
              </li>
              <li>
                <strong>Limited collection:</strong> We collect only the minimum information necessary to deliver
                the experience (first name, age range, conversation content).
              </li>
              <li>
                <strong>No behavioral advertising:</strong> We never use children&rsquo;s data for targeted
                advertising or share it with advertisers.
              </li>
              <li>
                <strong>Parental access:</strong> Parents may review, request deletion of, or refuse further
                collection of their child&rsquo;s information by contacting us at the address below.
              </li>
            </ul>
          </Section>

          <Section title="5. Voice Data">
            <p>
              Voice conversations with Shelly are streamed to our AI provider in real time to generate responses.
              Audio is processed transiently and is <strong>not stored as audio recordings</strong> after the
              conversation ends. Text transcripts may be temporarily retained to improve session quality and are
              deleted within 30 days.
            </p>
          </Section>

          <Section title="6. Data Retention">
            <ul>
              <li>
                <strong>Demo sessions:</strong> Demo data is retained for up to 90 days after the session, then
                automatically deleted.
              </li>
              <li>
                <strong>Registered accounts:</strong> Data is retained for the duration of the account. Parents
                may request deletion at any time.
              </li>
              <li>
                <strong>Waitlist emails:</strong> Retained until the parent unsubscribes or we complete the
                waitlist process.
              </li>
            </ul>
          </Section>

          <Section title="7. Data Sharing">
            <p>We do not sell personal information. We share data only with:</p>
            <ul>
              <li>
                <strong>AI service providers</strong> (e.g., Anthropic, Google, OpenAI) to process voice
                conversations, subject to their data processing agreements.
              </li>
              <li>
                <strong>Hosting and infrastructure providers</strong> (e.g., Vercel, Supabase) necessary to
                operate the service.
              </li>
              <li>
                <strong>Legal requirements:</strong> When required by law, regulation, or valid legal process.
              </li>
            </ul>
          </Section>

          <Section title="8. California Privacy Rights (CCPA/CPRA)">
            <p>If you are a California resident, you have the right to:</p>
            <ul>
              <li><strong>Know</strong> what personal information we collect and how it is used</li>
              <li><strong>Delete</strong> your personal information</li>
              <li><strong>Opt out</strong> of the sale or sharing of personal information (we do not sell data)</li>
              <li><strong>Non-discrimination</strong> for exercising your privacy rights</li>
            </ul>
            <p>
              To exercise these rights, contact us using the information in Section 11 below. We will respond
              within 45 days as required by law.
            </p>
          </Section>

          <Section title="9. Security">
            <p>
              We use industry-standard measures to protect personal information, including encrypted connections
              (HTTPS), access controls, and secure infrastructure. No system is 100% secure, and we cannot
              guarantee absolute security.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will post the updated version on this page
              with a revised &ldquo;Last updated&rdquo; date. Material changes affecting children&rsquo;s data
              will be communicated to parents via email when possible.
            </p>
          </Section>

          <Section title="11. Contact Us">
            <p>
              If you have questions about this Privacy Policy, want to exercise your privacy rights, or need
              to reach us about your child&rsquo;s data, please contact:
            </p>
            <p>
              <strong>TurtleTalk</strong>
              <br />
              Email:{' '}
              <a
                href="mailto:hello@turtletalk.io"
                style={{ color: 'var(--pd-accent)', textDecoration: 'underline' }}
              >
                hello@turtletalk.io
              </a>
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--pd-card)',
        border: '1px solid var(--pd-card-border)',
        borderRadius: 'var(--pd-radius-lg)',
        boxShadow: 'var(--pd-shadow-card)',
        padding: '24px 24px 20px',
      }}
    >
      <h2
        style={{
          fontSize: 17,
          fontWeight: 700,
          margin: '0 0 12px',
          color: 'var(--pd-text-primary)',
          letterSpacing: -0.1,
        }}
      >
        {props.title}
      </h2>
      <div
        style={{
          fontSize: 14,
          color: 'var(--pd-text-secondary)',
          lineHeight: 1.7,
        }}
      >
        {props.children}
      </div>
    </section>
  );
}

function SubHeading(props: { children: React.ReactNode }) {
  return (
    <h4
      style={{
        fontSize: 14,
        fontWeight: 700,
        marginTop: 16,
        marginBottom: 4,
        color: 'var(--pd-text-primary)',
      }}
    >
      {props.children}
    </h4>
  );
}
