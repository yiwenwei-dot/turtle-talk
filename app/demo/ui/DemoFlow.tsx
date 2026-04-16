'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createVoiceProvider, createFreshVoiceProvider } from '@/lib/speech/voice';
import { useVoiceSession } from '@/app/hooks/useVoiceSession';
import { usePersonalMemory } from '@/app/hooks/usePersonalMemory';
import { useMissions } from '@/app/hooks/useMissions';
import { useWakeLock } from '@/app/hooks/useWakeLock';
import { getDeviceId, getGuestDb } from '@/lib/db';
import type { Message, MissionSuggestion } from '@/lib/speech/types';
import books from '@/app/placeholders/books.json';
import {
  clearDemoSession,
  createFreshDemoSession,
  DEMO_STEP_ORDER,
  getFirstStep,
  getNextStep,
  getPreviousStep,
  loadDemoSession,
  saveDemoSession,
  type DemoParentPriority,
  type DemoSession,
  type DemoStep,
} from '../demoSession';
import { getDemoSkippedSteps } from '@/lib/env/demo';
import {
  getTattleCards,
  fetchTattleCards,
  fetchCardDisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
  type TattleCard,
  type CardDisplaySettings,
} from '@/lib/tattle-cards/tattle-cards';
import TalkConversationCard from '@/app/v2/components/TalkConversationCard';
import TalkEndCallButton from '@/app/v2/components/TalkEndCallButton';
import TalkMuteToggle from '@/app/v2/components/TalkMuteToggle';
import TalkStatusIndicator from '@/app/v2/components/TalkStatusIndicator';
import TammyLogoPlaceholder from '@/app/v2/components/TammyLogoPlaceholder';
import MicPermissionV2 from '@/app/v2/components/MicPermissionV2';
import { useMicPermission } from '@/app/hooks/useMicPermission';
import QRCode from 'react-qr-code';
import confetti from 'canvas-confetti';
import { useGuestWishes } from '@/app/hooks/useGuestWishes';
import { resetGuestWishes } from '@/lib/db/providers/localStorage';
import { getThemeLabel } from '@/lib/wishes/thematic-areas';

type DemoMissionChoice = MissionSuggestion & { __index: number };

const ACTIVE_STATES = new Set(['listening', 'recording', 'processing', 'speaking', 'muted']);

function ParentQrCode({ demoId }: { demoId: string }) {
  const [url, setUrl] = useState('/demo/parent');
  useEffect(() => {
    const origin = window.location.origin;
    const hostname = window.location.hostname;
    const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    const build = (base: string) => `${base}/demo/parent?session=${demoId}`;
    if (!isLoopback) {
      setUrl(build(origin));
      return;
    }
    let cancelled = false;
    fetch('/api/lan-host')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { host?: string | null } | null) => {
        if (cancelled) return;
        if (data?.host) {
          setUrl(build(`${window.location.protocol}//${data.host}:${window.location.port || '3000'}`));
        } else {
          setUrl(build(origin));
        }
      })
      .catch(() => {
        if (!cancelled) setUrl(build(origin));
      });
    return () => {
      cancelled = true;
    };
  }, [demoId]);
  return <QRCode value={url} size={160} bgColor="#ffffff" fgColor="#0E1020" />;
}

const SKIPPED_STEPS = getDemoSkippedSteps();

type Book = {
  id: string;
  title: string;
  author: string;
  shortDescription?: string;
  coverEmoji?: string;
  coverUrl?: string;
  ageRange?: string;
  ageGroup?: string;
  goodreadsRating?: number;
  whyKidsChoose?: string[];
  tammySays?: string;
  whyRecommended?: string;
  fullDescription?: string;
  recommendedFor?: string[];
};

type DemoTheme = 'dark' | 'light';

/* ------------------------------------------------------------------ */
/*  Shared UI primitives                                               */
/* ------------------------------------------------------------------ */

function DemoShell(props: { children: React.ReactNode; onResetAll: () => void; theme: DemoTheme }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          props.theme === 'dark'
            ? 'var(--v2-bg)'
            : 'radial-gradient(circle at top, #fdf6ff 0, #f3fbff 45%, #eef7ff 100%)',
        color: props.theme === 'dark' ? '#F5F7FF' : '#1b1333',
        fontFamily: 'var(--font-varela, system-ui)',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 60,
          background:
            props.theme === 'dark'
              ? 'rgba(10, 10, 12, 0.82)'
              : 'rgba(255, 255, 255, 0.86)',
          backdropFilter: 'blur(10px)',
          borderBottom:
            props.theme === 'dark'
              ? '1px solid rgba(255,255,255,0.08)'
              : '1px solid rgba(0,0,40,0.06)',
        }}
      >
        <div
          style={{
            maxWidth: 980,
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontWeight: 800, letterSpacing: 0.3 }}>Tammy</div>
            <div
              style={{
                color: 'var(--v2-text-secondary)',
                fontSize: 13,
              }}
            >
              Voice companion for brave kids
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={props.onResetAll}
              style={{
                appearance: 'none',
                border: '1px solid rgba(255,255,255,0.16)',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--v2-text)',
                padding: '8px 10px',
                borderRadius: 10,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Start over
            </button>
          </div>
        </div>
      </div>
      {props.children}
    </div>
  );
}

function Card(props: { title?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section
      style={{
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'rgba(15, 18, 40, 0.96)',
        borderRadius: 20,
        padding: 16,
      }}
    >
      {(props.title || props.right) && (
        <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: 0.2 }}>{props.title}</h2>
          {props.right}
        </header>
      )}
      <div style={{ marginTop: props.title || props.right ? 12 : 0 }}>{props.children}</div>
    </section>
  );
}

function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    tone?: 'primary' | 'ghost';
    kind?: 'default' | 'tapToSpeak';
  },
) {
  const tone = props.tone ?? 'primary';
  const kind = props.kind ?? 'default';
  const bg =
    tone === 'primary'
      ? kind === 'tapToSpeak'
        ? 'linear-gradient(135deg, #1FD27C, #0BAF5B)'
        : 'linear-gradient(135deg, #00CFB9, #00B8A3)'
      : 'rgba(255,255,255,0.06)';
  return (
    <button
      {...props}
      style={{
        appearance: 'none',
        border: '1px solid rgba(255,255,255,0.16)',
        background: bg,
        color: 'white',
        padding: '10px 14px',
        borderRadius: 999,
        fontWeight: 700,
        cursor: 'pointer',
        ...props.style,
      }}
    />
  );
}

function ModalBackdrop(props: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      role="presentation"
      onClick={props.onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 101,
          width: 'calc(100% - 32px)',
          maxWidth: 440,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(247, 249, 255, 0.98)',
          border: '1px solid rgba(12, 18, 40, 0.10)',
          borderRadius: 24,
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
          overflow: 'hidden',
        }}
      >
        {props.children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  InfoHint — replaces wordy descriptions with a subtle inline hint  */
/* ------------------------------------------------------------------ */

function InfoHint(props: { text: string; onDismiss?: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        fontSize: 12,
        color: 'var(--v2-text-secondary)',
        lineHeight: 1.4,
      }}
    >
      <span style={{ flexShrink: 0 }} aria-hidden>
        {'\u{1F422}'}
      </span>
      <span style={{ flex: 1 }}>{props.text}</span>
      {props.onDismiss && (
        <button
          type="button"
          onClick={props.onDismiss}
          aria-label="Dismiss hint"
          style={{
            appearance: 'none',
            border: 'none',
            background: 'transparent',
            color: 'var(--v2-text-secondary)',
            cursor: 'pointer',
            fontSize: 14,
            padding: 0,
            lineHeight: 1,
          }}
        >
          {'\u00D7'}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StepNavigation — consistent prev / next bar for every step        */
/* ------------------------------------------------------------------ */

function StepNavigation(props: {
  onPrevious?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  previousLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        marginTop: 10,
      }}
    >
      {props.onPrevious ? (
        <PrimaryButton tone="ghost" onClick={props.onPrevious}>
          {props.previousLabel ?? 'Back'}
        </PrimaryButton>
      ) : (
        <div />
      )}
      {props.onNext ? (
        <PrimaryButton onClick={props.onNext} disabled={props.nextDisabled}>
          {props.nextLabel ?? 'Next'}
        </PrimaryButton>
      ) : (
        <div />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modals                                                             */
/* ------------------------------------------------------------------ */

function ConsentModal(props: { open: boolean; onAgree: () => void; onDecline: () => void }) {
  if (!props.open) return null;
  return (
    <ModalBackdrop onClose={props.onDecline}>
      <div style={{ padding: 20, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 750,
            letterSpacing: 0.2,
            color: '#0E1020',
          }}
        >
          Before We Start
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>
          A parent or guardian should review this
        </p>
      </div>
      <div
        style={{
          padding: 20,
          display: 'grid',
          gap: 12,
          fontSize: 14,
          color: '#384165',
          overflowY: 'auto',
        }}
      >
        <p style={{ margin: 0 }}>
          TurtleTalk collects a small amount of information during this demo so Tammy can have a
          personalized conversation with your child:
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li><strong>First name</strong> and <strong>age range</strong></li>
          <li><strong>Favorite book</strong> and <strong>fun facts</strong></li>
          <li><strong>Voice conversation</strong> (processed in real time, not stored as audio)</li>
        </ul>
        <p style={{ margin: 0 }}>
          This data is used only for the demo experience. We do not sell personal information or use it
          for advertising. Voice audio is not recorded or retained after the conversation.
        </p>
        <p style={{ margin: 0, fontSize: 13 }}>
          Read our full{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#6366f1', textDecoration: 'underline' }}
          >
            Privacy Policy
          </a>{' '}
          for details on data handling, retention, and your California privacy rights.
        </p>
      </div>
      <div
        style={{
          padding: 16,
          borderTop: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={props.onDecline}
          style={{
            appearance: 'none',
            border: 'none',
            background: 'none',
            color: '#64748b',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '8px 4px',
          }}
        >
          No thanks
        </button>
        <PrimaryButton onClick={props.onAgree}>I Agree</PrimaryButton>
      </div>
    </ModalBackdrop>
  );
}

function OnboardingModal(props: { open: boolean; onClose: () => void }) {
  if (!props.open) return null;
  return (
    <ModalBackdrop onClose={props.onClose}>
      <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 750,
            letterSpacing: 0.2,
            color: '#0E1020',
          }}
        >
          Welcome to Tammy
        </h2>
      </div>
      <div
        style={{
          padding: 20,
          display: 'grid',
          gap: 10,
          fontSize: 14,
          color: '#384165',
        }}
      >
        <p style={{ margin: 0 }}>
          In this short tour, you'll see how Tammy (our friendly sea turtle) chats with your explorer and what you see as a grown-up.
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
          <li>First, a cozy voice chat where Tammy learns about your explorer.</li>
          <li>Then, brave "missions" that turn talk into tiny real-world actions.</li>
          <li>Finally, a simple parent view and a super-short check-in.</li>
        </ul>
      </div>
      <div
        style={{
          padding: 16,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <PrimaryButton onClick={props.onClose}>Get started</PrimaryButton>
      </div>
    </ModalBackdrop>
  );
}

function SelectRow<T extends string>(props: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string; help?: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'center' }}>
      <div
        style={{
          color: 'var(--v2-text)',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {props.label}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {props.options.map((o) => (
          <button
            key={o.value}
            onClick={() => props.onChange(o.value)}
            style={{
              appearance: 'none',
              cursor: 'pointer',
              borderRadius: 999,
              padding: '8px 10px',
              border: '1px solid rgba(255,255,255,0.14)',
              background: props.value === o.value ? 'rgba(120,140,255,0.32)' : 'rgba(255,255,255,0.16)',
              color: 'var(--v2-text)',
              fontWeight: 650,
              fontSize: 13,
            }}
            title={o.help}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HelpIconButton(props: { 'aria-label': string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={props['aria-label']}
      onClick={props.onClick}
      style={{
        width: 26,
        height: 26,
        borderRadius: '999px',
        border: '1px solid rgba(255,255,255,0.22)',
        background: 'rgba(255,255,255,0.08)',
        color: 'var(--v2-text-secondary)',
        fontSize: 14,
        fontWeight: 800,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      ?
    </button>
  );
}

function InputRow(props: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'center' }}>
      <div style={{ color: 'var(--v2-text-secondary)', fontSize: 13 }}>{props.label}</div>
      <input
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.14)',
          background: 'rgba(0,0,0,0.18)',
          color: 'var(--v2-text)',
          outline: 'none',
        }}
      />
    </div>
  );
}

function DemoSettingsModal(props: {
  open: boolean;
  onClose: () => void;
  session: DemoSession;
  onUpdate: (patch: Partial<DemoSession>) => void;
}) {
  if (!props.open) return null;
  const theme = props.session.demoTheme ?? 'dark';
  const ageGroup = props.session.ageGroup ?? 'unknown';
  return (
    <ModalBackdrop onClose={props.onClose}>
      <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 750,
            letterSpacing: 0.2,
            color: '#0E1020',
          }}
        >
          Settings
        </h2>
      </div>
      <div
        style={{
          padding: 20,
          display: 'grid',
          gap: 14,
          fontSize: 15,
          color: '#384165',
        }}
      >
        <SelectRow
          label="Theme"
          value={theme}
          onChange={(v) => props.onUpdate({ demoTheme: v as DemoTheme })}
          options={[
            { value: 'dark', label: 'Cozy dark' },
            { value: 'light', label: 'Bright light' },
          ]}
        />
        <SelectRow
          label="Child age group"
          value={ageGroup}
          onChange={(v) => props.onUpdate({ ageGroup: v as DemoSession['ageGroup'] })}
          options={[
            { value: '5-7', label: '5-7 years' },
            { value: '8-10', label: '8-10 years' },
            { value: '11-13', label: '11-13 years' },
            { value: '13+', label: '13+ years' },
            { value: 'other', label: 'Mixed ages / other' },
            { value: 'unknown', label: "I'm not sure yet" },
          ]}
        />
        <SelectRow
          label="What should we show first?"
          value={props.session.parentPriority}
          onChange={(v) => props.onUpdate({ parentPriority: v as DemoParentPriority })}
          options={[
            { value: 'weeklySummary', label: 'Weekly-style summary' },
            { value: 'books', label: 'Book ideas' },
            { value: 'dinnerQuestions', label: 'Dinner questions' },
            { value: 'wishList', label: 'Wish list' },
          ]}
        />
      </div>
      <div
        style={{
          padding: 16,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}
      >
        <PrimaryButton tone="ghost" onClick={props.onClose}>
          Close
        </PrimaryButton>
      </div>
    </ModalBackdrop>
  );
}

function ConfirmModal(props: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!props.open) return null;
  return (
    <ModalBackdrop onClose={props.onCancel}>
      <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 750,
            letterSpacing: 0.2,
            color: '#0E1020',
          }}
        >
          {props.title}
        </h2>
      </div>
      <div
        style={{
          padding: 20,
          fontSize: 14,
          color: '#384165',
        }}
      >
        {props.body}
      </div>
      <div
        style={{
          padding: 16,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
        }}
      >
        <PrimaryButton tone="ghost" onClick={props.onCancel}>
          {props.cancelLabel ?? 'Cancel'}
        </PrimaryButton>
        <PrimaryButton onClick={props.onConfirm}>{props.confirmLabel}</PrimaryButton>
      </div>
    </ModalBackdrop>
  );
}

function HelpModal(props: { section: 'voice' | 'missions' | 'parentDashboard' | 'survey'; onClose: () => void }) {
  let title = '';
  let body: React.ReactNode = null;
  if (props.section === 'voice') {
    title = 'How the chat works';
    body = (
      <div style={{ display: 'grid', gap: 8 }}>
        <p style={{ margin: 0 }}>
          Tammy keeps chats short, warm, and age-aware. She listens for your explorer's name, what they love, and what
          feels a bit tricky.
        </p>
        <p style={{ margin: 0 }}>
          Everything runs through guardrails so the conversation stays kid-safe and focused on tiny, doable brave
          steps.
        </p>
      </div>
    );
  } else if (props.section === 'missions') {
    title = 'What are missions?';
    body = (
      <div style={{ display: 'grid', gap: 8 }}>
        <p style={{ margin: 0 }}>
          Missions are tiny real-world challenges, like saying hi to a new classmate or trying a new game for five
          minutes.
        </p>
        <p style={{ margin: 0 }}>
          Tammy suggests 2-3 options and you choose what feels right. In the full app, completed missions grow a
          "courage garden" over time.
        </p>
      </div>
    );
  } else if (props.section === 'parentDashboard') {
    title = 'What this parent view shows';
    body = (
      <div style={{ display: 'grid', gap: 8 }}>
        <p style={{ margin: 0 }}>
          This example view shows the kind of weekly summary you might see: themes from chats, mission activity, and gentle follow-ups.
        </p>
        <p style={{ margin: 0 }}>
          In a real account, this would draw from your child's actual missions and conversations.
        </p>
      </div>
    );
  } else if (props.section === 'survey') {
    title = 'Why this quick survey?';
    body = (
      <div style={{ display: 'grid', gap: 8 }}>
        <p style={{ margin: 0 }}>
          These questions help us learn whether this experience felt clear, safe, and helpful for your family.
        </p>
        <p style={{ margin: 0 }}>
          You can skip anything you like — we only use responses in aggregate to improve the experience.
        </p>
      </div>
    );
  }

  return (
    <ModalBackdrop onClose={props.onClose}>
      <div style={{ padding: 20, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 750,
            letterSpacing: 0.2,
            color: '#0E1020',
          }}
        >
          {title}
        </h2>
      </div>
      <div
        style={{
          padding: 20,
          fontSize: 14,
          color: '#384165',
          display: 'grid',
          gap: 10,
        }}
      >
        {body}
      </div>
      <div
        style={{
          padding: 16,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <PrimaryButton tone="ghost" onClick={props.onClose}>
          Got it
        </PrimaryButton>
      </div>
    </ModalBackdrop>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress breadcrumb                                                */
/* ------------------------------------------------------------------ */

type DemoStage = 'setup' | 'talk' | 'missions' | 'parent' | 'survey';

const STAGES: Array<{ id: DemoStage; label: string }> = [
  { id: 'setup', label: 'Setup' },
  { id: 'talk', label: 'Talk' },
  { id: 'missions', label: 'Missions' },
  { id: 'parent', label: 'Parent view' },
  { id: 'survey', label: 'Check-in' },
];

function getStageForStep(step: DemoStep): DemoStage {
  switch (step) {
    case 'introParentSetup':
    case 'tattleCard':
    case 'childWarmupName':
      return 'setup';
    case 'childCourageConversation':
      return 'talk';
    case 'missionsPick':
    case 'missionDo':
    case 'wish':
      return 'missions';
    case 'parentDashboard':
      return 'parent';
    case 'survey':
    default:
      return 'survey';
  }
}

function StepMap(props: { step: DemoStep }) {
  const currentStage = getStageForStep(props.step);
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <nav
      aria-label="Session progress"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '8px 10px 4px',
        borderRadius: 999,
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.12)',
        margin: '0 auto',
      }}
    >
      {STAGES.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const baseCircle: React.CSSProperties = {
          width: 18,
          height: 18,
          borderRadius: '999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
        };
        const circleStyle: React.CSSProperties = isCurrent
          ? {
              ...baseCircle,
              background: 'linear-gradient(135deg, rgba(70,120,255,0.95), rgba(135,80,255,0.95))',
              color: '#F5F7FF',
            }
          : isCompleted
            ? {
                ...baseCircle,
                background: 'rgba(120,140,255,0.35)',
                color: '#F5F7FF',
              }
            : {
                ...baseCircle,
                border: '1px solid rgba(255,255,255,0.35)',
                color: '#D3DCFF',
              };

        return (
          <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={circleStyle}>{index + 1}</div>
            <span
              style={{
                fontSize: 11,
                fontWeight: isCurrent ? 650 : 500,
                color: isCurrent ? '#F5F7FF' : 'rgba(215,222,255,0.8)',
                whiteSpace: 'nowrap',
              }}
            >
              {stage.label}
            </span>
            {index < STAGES.length - 1 && (
              <div
                aria-hidden="true"
                style={{
                  width: 18,
                  height: 1,
                  borderRadius: 1,
                  background: 'rgba(255,255,255,0.18)',
                  marginLeft: 2,
                }}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Step-specific components                                           */
/* ------------------------------------------------------------------ */

function MissionChoicesCard(props: {
  choices: DemoMissionChoice[];
  onAccept: (choice: DemoMissionChoice) => void;
  onDismiss: () => void;
  onTalkMore: () => void;
  onHelp: () => void;
}) {
  return (
    <Card
      title="Tammy suggests a brave mission"
      right={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <HelpIconButton aria-label="What are missions?" onClick={props.onHelp} />
          <button
            onClick={props.onDismiss}
            style={{
              appearance: 'none',
              border: 'none',
              background: 'transparent',
              color: 'var(--v2-text-secondary)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Skip
          </button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: 12 }}>
        {props.choices.map((c) => (
          <div
            key={c.__index}
            style={{
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              padding: 14,
              display: 'grid',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontWeight: 800 }}>{c.title}</div>
              <div style={{ color: 'var(--v2-text-secondary)', fontSize: 12 }}>
                {c.difficulty ?? 'beginner'}
              </div>
            </div>
            <div style={{ color: 'var(--v2-text-secondary)', lineHeight: 1.35 }}>{c.description}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <PrimaryButton tone="ghost" onClick={props.onTalkMore}>
                Talk more
              </PrimaryButton>
              <PrimaryButton onClick={() => props.onAccept(c)}>Accept mission</PrimaryButton>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

type ChildAgeChoice = 'fiveToSeven' | 'eightToTen' | 'elevenToThirteen' | 'thirteenPlus' | 'noShare';

function mapChildAgeChoiceToAgeGroup(choice: ChildAgeChoice): DemoSession['ageGroup'] {
  switch (choice) {
    case 'fiveToSeven':
      return '5-7';
    case 'eightToTen':
      return '8-10';
    case 'elevenToThirteen':
      return '11-13';
    case 'thirteenPlus':
      return '13+';
    case 'noShare':
    default:
      return 'unknown';
  }
}

function TattleCardPicker(props: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [revealAll, setRevealAll] = useState(false);
  const [cards, setCards] = useState<readonly TattleCard[]>(getTattleCards);
  const [displaySettings, setDisplaySettings] = useState<CardDisplaySettings>(DEFAULT_DISPLAY_SETTINGS);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchTattleCards(), fetchCardDisplaySettings()]).then(
      ([fetchedCards, settings]) => {
        if (cancelled) return;
        if (fetchedCards.length > 0) setCards(fetchedCards);
        setDisplaySettings(settings);
      },
    );
    return () => { cancelled = true; };
  }, []);

  const rotationByIndex: number[] = [-4, 2, -1, 3, -3, 1];

  return (
    <Card title="Pick a Tattle Card">
      <div style={{ display: 'grid', gap: 12 }}>
        <InfoHint text="Tap a card to reveal it, then press Next when you're ready." />
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--v2-text-secondary)',
          }}
        >
          <button
            type="button"
            onClick={() => setRevealAll((prev) => !prev)}
            style={{
              appearance: 'none',
              border: 'none',
              background: 'transparent',
              color: 'var(--v2-text-secondary)',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {revealAll ? 'Hide surprises' : 'Show all cards'}
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 10,
            justifyItems: 'center',
            alignItems: 'stretch',
            marginTop: 4,
          }}
        >
          {cards.map((card, index) => {
            const isSelected = props.selectedId === card.id;
            const isFaceUp = revealAll || isSelected;
            const baseRotation = rotationByIndex[index % rotationByIndex.length] || 0;

            return (
              <div
                key={card.id}
                style={{
                  perspective: 800,
                  width: '100%',
                  maxWidth: 120,
                }}
              >
                <button
                  type="button"
                  onClick={() => props.onSelect(card.id)}
                  style={{
                    width: '100%',
                    aspectRatio: '3 / 4',
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    transform: `rotate(${isSelected ? baseRotation * 0.5 : baseRotation}deg) scale(${
                      isSelected ? 1.05 : 1
                    }) rotateY(${isFaceUp ? 180 : 0}deg)`,
                    transition: 'transform 0.5s ease',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    outline: 'none',
                  }}
                >
                  {/* Back face — TurtleTalk logo */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      borderRadius: 18,
                      border: isSelected
                        ? '2px solid rgba(140,120,255,0.95)'
                        : '1px solid rgba(255,255,255,0.18)',
                      background:
                        'radial-gradient(circle at 30% 20%, rgba(40,55,120,0.95), rgba(20,20,50,0.98))',
                      boxShadow: isSelected
                        ? '0 8px 22px rgba(0,0,0,0.45)'
                        : '0 4px 14px rgba(0,0,0,0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src="/TurtleTalk---Logo.png"
                      alt="TurtleTalk"
                      style={{
                        width: '70%',
                        height: 'auto',
                        objectFit: 'contain',
                        borderRadius: 8,
                        opacity: 0.9,
                      }}
                    />
                    <div
                      style={{
                        fontSize: 11,
                        color: 'rgba(220,225,255,0.8)',
                        fontWeight: 650,
                      }}
                    >
                      Tap to reveal
                    </div>
                  </div>
                  {/* Front face — card content (pre-rotated 180deg so it reads correctly when flipped) */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      borderRadius: 18,
                      border: isSelected
                        ? '2px solid rgba(140,120,255,0.95)'
                        : '1px solid rgba(255,255,255,0.18)',
                      background:
                        'linear-gradient(145deg, rgba(60,80,180,0.9), rgba(150,110,255,0.9))',
                      boxShadow: isSelected
                        ? '0 8px 22px rgba(0,0,0,0.45)'
                        : '0 4px 14px rgba(0,0,0,0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      padding: '10px 8px',
                      textAlign: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ fontSize: 22, lineHeight: 1 }}>{card.emoji}</div>
                    <div
                      style={{
                        fontWeight: 750,
                        fontSize: 13,
                        color: '#F5F7FF',
                      }}
                    >
                      {card.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'rgba(230,235,255,0.92)',
                        lineHeight: 1.3,
                      }}
                    >
                      {card.description}
                    </div>
                    {displaySettings.showSkill && card.skill && (
                      <div
                        style={{
                          fontSize: 9,
                          color: 'rgba(200,210,255,0.85)',
                          fontWeight: 600,
                          marginTop: 2,
                          padding: '2px 6px',
                          background: 'rgba(255,255,255,0.12)',
                          borderRadius: 6,
                        }}
                      >
                        {card.skill}
                      </div>
                    )}
                    {displaySettings.showScenario && card.scenario && (
                      <div
                        style={{
                          fontSize: 9,
                          color: 'rgba(220,225,255,0.7)',
                          fontStyle: 'italic',
                          lineHeight: 1.3,
                          marginTop: 1,
                        }}
                      >
                        {card.scenario}
                      </div>
                    )}
                    {displaySettings.showCategory && card.category && (
                      <div
                        style={{
                          fontSize: 8,
                          color: 'rgba(180,190,255,0.9)',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          marginTop: 2,
                          padding: '1px 5px',
                          background: 'rgba(255,255,255,0.1)',
                          borderRadius: 4,
                        }}
                      >
                        {card.category}
                      </div>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Age-specific data for book and fun-fact steps                      */
/* ------------------------------------------------------------------ */

const BOOKS_BY_AGE: Record<string, { title: string; image: string }[]> = {
  '5-7': [
    { title: 'The Invisible Boy', image: '/images/setup/books/invisible-boy.jpg' },
    { title: 'Dragons Love Tacos', image: '/images/setup/books/dragons-love-tacos.jpg' },
    { title: 'The Book With No Pictures', image: '/images/setup/books/book-no-pictures.jpg' },
  ],
  '8-10': [
    { title: 'Dog Man', image: '/images/setup/books/dog-man.jpg' },
    { title: 'Wonder', image: '/images/setup/books/wonder.jpg' },
    { title: 'The Wild Robot', image: '/images/setup/books/wild-robot.jpg' },
  ],
  '11-13': [
    { title: 'Harry Potter', image: '/images/setup/books/harry-potter.jpg' },
    { title: 'New Kid', image: '/images/setup/books/new-kid.jpg' },
    { title: 'Percy Jackson', image: '/images/setup/books/percy-jackson.jpg' },
  ],
  '13+': [
    { title: 'Harry Potter', image: '/images/setup/books/harry-potter.jpg' },
    { title: 'Percy Jackson', image: '/images/setup/books/percy-jackson.jpg' },
    { title: 'The Hunger Games', image: '/images/setup/books/hunger-games.jpg' },
  ],
};

const FACTS_BY_AGE: Record<string, { label: string; image: string }[]> = {
  '5-7': [
    { label: 'I love animals', image: '/images/setup/facts/animals.png' },
    { label: 'I like drawing', image: '/images/setup/facts/drawing.png' },
    { label: 'I love Lego', image: '/images/setup/facts/lego.png' },
    { label: 'I love dinosaurs', image: '/images/setup/facts/dinosaurs.png' },
    { label: 'I like to dance', image: '/images/setup/facts/dance.png' },
    { label: 'I love music', image: '/images/setup/facts/music.png' },
  ],
  '8-10': [
    { label: 'I play sports', image: '/images/setup/facts/sports.png' },
    { label: 'I love video games', image: '/images/setup/facts/videogames.png' },
    { label: 'I love animals', image: '/images/setup/facts/animals.png' },
    { label: 'I like building things', image: '/images/setup/facts/building.png' },
    { label: 'I love outer space', image: '/images/setup/facts/space.png' },
    { label: 'I like drawing', image: '/images/setup/facts/drawing.png' },
  ],
  '11-13': [
    { label: 'I love music', image: '/images/setup/facts/music.png' },
    { label: 'I love video games', image: '/images/setup/facts/videogames.png' },
    { label: 'I play sports', image: '/images/setup/facts/sports.png' },
    { label: 'I like coding', image: '/images/setup/facts/coding.png' },
    { label: 'I love making up stories', image: '/images/setup/facts/stories.png' },
    { label: 'I love outer space', image: '/images/setup/facts/space.png' },
  ],
  '13+': [
    { label: 'I love music', image: '/images/setup/facts/music.png' },
    { label: 'I love video games', image: '/images/setup/facts/videogames.png' },
    { label: 'I play sports', image: '/images/setup/facts/sports.png' },
    { label: 'I like coding', image: '/images/setup/facts/coding.png' },
    { label: 'I love movies', image: '/images/setup/facts/movies.png' },
    { label: 'I love making up stories', image: '/images/setup/facts/stories.png' },
  ],
};

type ProfileSubstep = 'age' | 'name' | 'book' | 'facts';
const PROFILE_SUBSTEPS: ProfileSubstep[] = ['age', 'name', 'book', 'facts'];

/** Shared container style for every setup substep — responsive, single-page layout. */
const SETUP_PAGE_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  width: '100%',
};

/** Image-based option card for book and fun-fact choices. */
function optionCardStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    borderRadius: 16,
    border: active ? '2.5px solid rgba(90,130,255,0.95)' : '1.5px solid rgba(255,255,255,0.14)',
    background: active ? 'rgba(90,130,255,0.14)' : 'rgba(255,255,255,0.04)',
    cursor: 'pointer',
    color: 'var(--v2-text)',
    fontSize: 15,
    fontWeight: 700,
    textAlign: 'left' as const,
    transition: 'all 150ms ease',
    WebkitTapHighlightColor: 'transparent',
    transform: active ? 'scale(1.02)' : 'scale(1)',
  };
}

/** Letter-to-image mapping for the photo keyboard. */
const LETTER_IMAGES: Record<string, { word: string; image: string }> = {
  A: { word: 'Apple', image: '/images/setup/keys/a.png' },
  B: { word: 'Bear', image: '/images/setup/keys/b.png' },
  C: { word: 'Cat', image: '/images/setup/keys/c.png' },
  D: { word: 'Dog', image: '/images/setup/keys/d.png' },
  E: { word: 'Elephant', image: '/images/setup/keys/e.png' },
  F: { word: 'Fish', image: '/images/setup/keys/f.png' },
  G: { word: 'Giraffe', image: '/images/setup/keys/g.png' },
  H: { word: 'Horse', image: '/images/setup/keys/h.png' },
  I: { word: 'Ice cream', image: '/images/setup/keys/i.png' },
  J: { word: 'Jellyfish', image: '/images/setup/keys/j.png' },
  K: { word: 'Koala', image: '/images/setup/keys/k.png' },
  L: { word: 'Lion', image: '/images/setup/keys/l.png' },
  M: { word: 'Moon', image: '/images/setup/keys/m.png' },
  N: { word: 'Narwhal', image: '/images/setup/keys/n.png' },
  O: { word: 'Owl', image: '/images/setup/keys/o.png' },
  P: { word: 'Penguin', image: '/images/setup/keys/p.png' },
  Q: { word: 'Queen', image: '/images/setup/keys/q.png' },
  R: { word: 'Rabbit', image: '/images/setup/keys/r.png' },
  S: { word: 'Star', image: '/images/setup/keys/s.png' },
  T: { word: 'Turtle', image: '/images/setup/keys/t.png' },
  U: { word: 'Umbrella', image: '/images/setup/keys/u.png' },
  V: { word: 'Violin', image: '/images/setup/keys/v.png' },
  W: { word: 'Whale', image: '/images/setup/keys/w.png' },
  X: { word: 'Xylophone', image: '/images/setup/keys/x.png' },
  Y: { word: 'Yak', image: '/images/setup/keys/y.png' },
  Z: { word: 'Zebra', image: '/images/setup/keys/z.png' },
};

/** Kid-friendly photo keyboard — each key is a card with the photo as background. */
function KidKeyboard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(min(72px, 20%), 1fr))',
      gap: 8,
      width: '100%',
    }}>
      {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => {
        const info = LETTER_IMAGES[letter];
        return (
          <button
            key={letter}
            type="button"
            onClick={() => onChange(value + letter)}
            title={`${letter} for ${info?.word}`}
            style={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: 14,
              border: '1.5px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.04)',
              cursor: 'pointer',
              overflow: 'hidden',
              transition: 'transform 100ms, border-color 100ms',
              WebkitTapHighlightColor: 'transparent',
              padding: 0,
            }}
            onPointerDown={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = 'scale(0.92)'; el.style.borderColor = 'rgba(90,130,255,0.8)'; }}
            onPointerUp={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.borderColor = ''; }}
            onPointerLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.transform = ''; el.style.borderColor = ''; }}
          >
            <img
              src={info?.image}
              alt={info?.word}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: 0.85,
              }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(10,12,30,0.85) 0%, rgba(10,12,30,0.15) 55%)',
            }} />
            <div style={{
              position: 'absolute',
              bottom: 3,
              left: 0,
              right: 0,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 'clamp(14px, 3.5vw, 18px)',
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1.1,
                textShadow: '0 1px 4px rgba(0,0,0,0.6)',
              }}>
                {letter}
              </div>
              <div style={{
                fontSize: 'clamp(7px, 1.8vw, 9px)',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.7)',
                lineHeight: 1,
              }}>
                {info?.word}
              </div>
            </div>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onChange(value.slice(0, -1))}
        style={{
          aspectRatio: '1',
          borderRadius: 14,
          border: '1.5px solid rgba(255,255,255,0.14)',
          background: 'rgba(255,255,255,0.06)',
          cursor: 'pointer',
          color: 'var(--v2-text)',
          fontSize: 'clamp(10px, 2.5vw, 13px)',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
          transition: 'transform 100ms',
        }}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.92)'; }}
        onPointerUp={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; }}
        onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; }}
      >
        Delete
      </button>
    </div>
  );
}

function ChildProfileWizard(props: {
  name: string | null;
  ageGroup: DemoSession['ageGroup'] | undefined;
  favoriteBook: string;
  funFacts: string[];
  onChangeName: (name: string) => void;
  onChangeAgeGroup: (ageGroup: DemoSession['ageGroup']) => void;
  onChangeFavoriteBook: (book: string) => void;
  onChangeFunFacts: (facts: string[]) => void;
  newFunFact?: string;
  onChangeNewFunFact?: (value: string) => void;
  onBack?: () => void;
  onComplete: () => void;
  initialSubstep?: ProfileSubstep;
  onSubstepChange?: (substep: ProfileSubstep) => void;
}) {
  const [substep, setSubstepRaw] = useState<ProfileSubstep>(props.initialSubstep ?? 'name');

  const setSubstep = (next: ProfileSubstep) => {
    setSubstepRaw(next);
    props.onSubstepChange?.(next);
  };

  const substepIdx = PROFILE_SUBSTEPS.indexOf(substep);
  const hasPrev = substepIdx > 0;
  const hasNext = substepIdx < PROFILE_SUBSTEPS.length - 1;

  const goPrev = () => {
    if (hasPrev) setSubstep(PROFILE_SUBSTEPS[substepIdx - 1]);
    else props.onBack?.();
  };
  const goNext = () => {
    if (hasNext) setSubstep(PROFILE_SUBSTEPS[substepIdx + 1]);
    else props.onComplete();
  };

  const ageChoice: ChildAgeChoice =
    props.ageGroup === '5-7' ? 'fiveToSeven'
    : props.ageGroup === '8-10' ? 'eightToTen'
    : props.ageGroup === '11-13' ? 'elevenToThirteen'
    : props.ageGroup === '13+' ? 'thirteenPlus'
    : 'noShare';

  const ageKey = props.ageGroup && props.ageGroup !== 'unknown' && props.ageGroup !== 'other'
    ? props.ageGroup
    : '8-10'; // default to 8-10 if unknown
  const ageBooks = BOOKS_BY_AGE[ageKey] ?? BOOKS_BY_AGE['8-10'];
  const ageFacts = FACTS_BY_AGE[ageKey] ?? FACTS_BY_AGE['8-10'];

  const toggleFact = (label: string) => {
    if (props.funFacts.includes(label)) {
      props.onChangeFunFacts(props.funFacts.filter((f) => f !== label));
    } else {
      props.onChangeFunFacts([...props.funFacts, label]);
    }
  };

  const pillStyle = (active: boolean): React.CSSProperties => ({
    flex: '1 1 140px',
    minWidth: 0,
    padding: 'clamp(10px, 2.5vw, 14px) 16px',
    borderRadius: 999,
    border: active ? '2.5px solid rgba(90,130,255,0.95)' : '1.5px solid rgba(255,255,255,0.20)',
    background: active ? 'rgba(90,130,255,0.18)' : 'rgba(255,255,255,0.04)',
    cursor: 'pointer',
    color: 'var(--v2-text)',
    fontSize: 'clamp(14px, 3.5vw, 16px)',
    fontWeight: 700,
    textAlign: 'center',
    transition: 'border-color 120ms, background 120ms',
  });

  return (
    <div style={{ display: 'grid', gap: 12, width: '100%', maxWidth: 520, margin: '0 auto', padding: '0 8px', boxSizing: 'border-box' }}>
      {/* Sub-step progress dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        {PROFILE_SUBSTEPS.map((s, i) => (
          <div
            key={s}
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background:
                i === substepIdx
                  ? 'rgba(90,130,255,0.95)'
                  : i < substepIdx
                    ? 'rgba(90,130,255,0.45)'
                    : 'rgba(255,255,255,0.18)',
              transition: 'background 200ms',
            }}
          />
        ))}
      </div>

      {/* ---- Name ---- */}
      {substep === 'name' && (
        <Card title="What should Tammy call you?">
          <div style={SETUP_PAGE_STYLE}>
            <input
              autoFocus
              value={props.name ?? ''}
              onChange={(e) => props.onChangeName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (props.name ?? '').trim()) goNext(); }}
              placeholder="Type your name"
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: 16,
                border: '1.5px solid rgba(255,255,255,0.18)',
                background: 'rgba(0,0,0,0.35)',
                color: 'var(--v2-text)',
                fontSize: 'clamp(18px, 4.5vw, 24px)',
                fontWeight: 800,
                letterSpacing: 1,
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <InfoHint text="Use your keyboard or tap the pictures below!" />
            <KidKeyboard value={props.name ?? ''} onChange={props.onChangeName} />
          </div>
        </Card>
      )}

      {/* ---- Age ---- */}
      {substep === 'age' && (
        <Card title="How old are you?">
          <div style={{ ...SETUP_PAGE_STYLE, gap: 10 }}>
            {[
              { id: 'fiveToSeven' as ChildAgeChoice, label: '5 to 7' },
              { id: 'eightToTen' as ChildAgeChoice, label: '8 to 10' },
              { id: 'elevenToThirteen' as ChildAgeChoice, label: '11 to 13' },
              { id: 'thirteenPlus' as ChildAgeChoice, label: '13+' },
              { id: 'noShare' as ChildAgeChoice, label: "I don\u2019t wanna share" },
            ].map((opt) => {
              const active = ageChoice === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    props.onChangeAgeGroup(mapChildAgeChoiceToAgeGroup(opt.id));
                  }}
                  style={pillStyle(active)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* ---- Favorite Book (pick from 3 age-appropriate choices) ---- */}
      {substep === 'book' && (
        <Card title="Pick a book you love!">
          <div style={{ ...SETUP_PAGE_STYLE, gap: 10 }}>
            {ageBooks.map((book) => {
              const active = props.favoriteBook === book.title;
              return (
                <button
                  key={book.title}
                  type="button"
                  onClick={() => props.onChangeFavoriteBook(active ? '' : book.title)}
                  style={optionCardStyle(active)}
                >
                  <img
                    src={book.image}
                    alt={book.title}
                    style={{
                      width: 52,
                      height: 72,
                      objectFit: 'cover',
                      borderRadius: 8,
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                  />
                  <span style={{ fontSize: 'clamp(14px, 3.5vw, 16px)' }}>{book.title}</span>
                </button>
              );
            })}
            <InfoHint text="You can skip this one if you want!" />
          </div>
        </Card>
      )}

      {/* ---- Fun Facts (5 age-appropriate choices with photos) ---- */}
      {substep === 'facts' && (
        <Card title="What are you into?">
          <div style={{ ...SETUP_PAGE_STYLE, gap: 8 }}>
            <InfoHint text="Tap any that sound like you!" />
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              width: '100%',
            }}>
              {ageFacts.map((fact) => {
                const active = props.funFacts.includes(fact.label);
                return (
                  <button
                    key={fact.label}
                    type="button"
                    onClick={() => toggleFact(fact.label)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 8px',
                      borderRadius: 16,
                      border: active ? '2.5px solid rgba(90,130,255,0.95)' : '1.5px solid rgba(255,255,255,0.14)',
                      background: active ? 'rgba(90,130,255,0.14)' : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      color: 'var(--v2-text)',
                      fontSize: 'clamp(12px, 3vw, 14px)',
                      fontWeight: 700,
                      textAlign: 'center',
                      transition: 'all 150ms ease',
                      WebkitTapHighlightColor: 'transparent',
                      transform: active ? 'scale(1.04)' : 'scale(1)',
                    }}
                  >
                    <img
                      src={fact.image}
                      alt={fact.label}
                      style={{
                        width: 'clamp(48px, 12vw, 72px)',
                        height: 'clamp(48px, 12vw, 72px)',
                        objectFit: 'cover',
                        borderRadius: 12,
                        boxShadow: active ? '0 0 12px rgba(90,130,255,0.4)' : '0 2px 6px rgba(0,0,0,0.2)',
                      }}
                    />
                    <span>{fact.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <StepNavigation
        onPrevious={hasPrev || props.onBack ? goPrev : undefined}
        onNext={goNext}
        nextLabel={substep === 'facts' ? 'Continue to Tammy' : 'Next'}
      />
    </div>
  );
}

function DemoParentDashboard(props: {
  parentPriority: DemoParentPriority;
  childName: string | null;
  ageGroup: string | undefined;
  topics: string[];
  messages: Message[];
  completedCount: number;
  activeCount: number;
  onChangePriority: (p: DemoParentPriority) => void;
  onEndDemo: () => void;
  onHelp: () => void;
}) {
  const recommendedBooks = useMemo(() => {
    const safeBooks = (books as Book[]) ?? [];
    const ageGroup = props.ageGroup;
    if (ageGroup) {
      const byAge = safeBooks.filter((b) => b.ageGroup === ageGroup);
      if (byAge.length > 0) return byAge;
    }
    return safeBooks.filter((b) => b.ageGroup === '5-7');
  }, [props.ageGroup]);

  const highlights = useMemo(() => {
    const lastUser = [...props.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const lastAssistant = [...props.messages].reverse().find((m) => m.role === 'assistant')?.content ?? '';
    return [
      lastUser ? `Child said: "${lastUser.slice(0, 120)}${lastUser.length > 120 ? '\u2026' : ''}"` : null,
      lastAssistant ? `Tammy responded: "${lastAssistant.slice(0, 120)}${lastAssistant.length > 120 ? '\u2026' : ''}"` : null,
    ].filter(Boolean) as string[];
  }, [props.messages]);

  return (
    <div
      style={{
        display: 'grid',
        gap: 14,
        gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
        alignItems: 'start',
      }}
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <Card
          title="Parent dashboard"
          right={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <HelpIconButton aria-label="What is in this parent view?" onClick={props.onHelp} />
              <PrimaryButton tone="ghost" onClick={props.onEndDemo}>
                End session
              </PrimaryButton>
            </div>
          }
        >
          <InfoHint text={`Here's what Tammy learned about ${props.childName ?? 'your child'} today.`} />
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--v2-text-secondary)' }}>Missions</div>
                <div style={{ fontWeight: 800 }}>
                  {props.completedCount} completed \u00B7 {props.activeCount} active
                </div>
              </div>
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 12,
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--v2-text-secondary)' }}>Topics</div>
                <div style={{ fontWeight: 800 }}>{props.topics.length ? props.topics.slice(0, 3).join(', ') : '\u2014'}</div>
              </div>
            </div>

            {highlights.length > 0 && (
              <div style={{ borderLeft: '3px solid rgba(140,120,255,0.6)', paddingLeft: 10, display: 'grid', gap: 6 }}>
                {highlights.map((h) => (
                  <div key={h} style={{ color: 'var(--v2-text-secondary)', lineHeight: 1.35 }}>
                    {h}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              marginTop: 14,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {[
              { value: 'weeklySummary' as DemoParentPriority, label: 'Summary' },
              { value: 'dinnerQuestions' as DemoParentPriority, label: 'Dinner questions' },
              { value: 'books' as DemoParentPriority, label: 'Books' },
              { value: 'wishList' as DemoParentPriority, label: 'Wish list' },
            ].map((opt) => {
              const isActive = props.parentPriority === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => props.onChangePriority(opt.value)}
                  style={{
                    appearance: 'none',
                    cursor: 'pointer',
                    borderRadius: 999,
                    padding: '6px 10px',
                    border: isActive ? '2px solid rgba(140,120,255,0.9)' : '1px solid rgba(255,255,255,0.18)',
                    background: isActive ? 'rgba(140,120,255,0.22)' : 'rgba(255,255,255,0.06)',
                    color: 'var(--v2-text)',
                    fontSize: 12,
                    fontWeight: 650,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <div>
        {props.parentPriority === 'weeklySummary' && (
          <Card title="Weekly-style summary">
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--v2-text-secondary)', lineHeight: 1.5 }}>
              <li>Confidence-building: {props.completedCount ? 'showing progress' : 'getting started'}</li>
              <li>Curiosity topics: {props.topics.length ? props.topics.slice(0, 5).join(', ') : 'not enough data yet'}</li>
              <li>Next step: choose a small mission and celebrate completion</li>
            </ul>
          </Card>
        )}

        {props.parentPriority === 'dinnerQuestions' && (
          <Card title="Dinner questions">
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--v2-text-secondary)', lineHeight: 1.55 }}>
              <li>What was the bravest tiny thing you did today?</li>
              <li>What's something you want to get better at this week?</li>
              <li>If Tammy could join dinner, what would you teach her?</li>
            </ul>
          </Card>
        )}

        {props.parentPriority === 'books' && (
          <Card title="Recommended books">
            <div style={{ display: 'grid', gap: 12 }}>
              {recommendedBooks.map((b) => (
                <div
                  key={b.id}
                  style={{
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: 'rgba(0,0,0,0.16)',
                  }}
                >
                  {b.coverUrl && (
                    <img
                      src={b.coverUrl}
                      alt={b.title}
                      style={{
                        width: '100%',
                        height: 140,
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  )}
                  <div style={{ padding: 12, display: 'grid', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontWeight: 800 }}>{b.title}</div>
                      {b.goodreadsRating != null && (
                        <div style={{ fontSize: 12, color: 'var(--v2-text-secondary)', whiteSpace: 'nowrap' }}>
                          {'\u2B50'} {b.goodreadsRating}
                        </div>
                      )}
                    </div>
                    <div style={{ color: 'var(--v2-text-secondary)', fontSize: 13 }}>
                      {b.author}{b.ageRange ? ` · Ages ${b.ageRange}` : ''}
                    </div>
                    {b.whyKidsChoose && b.whyKidsChoose.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: 16, color: 'var(--v2-text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
                        {b.whyKidsChoose.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    )}
                    {b.tammySays && (
                      <div style={{
                        fontSize: 12,
                        color: 'var(--v2-text-secondary)',
                        fontStyle: 'italic',
                        borderLeft: '2px solid rgba(140,120,255,0.5)',
                        paddingLeft: 8,
                        marginTop: 2,
                      }}>
                        &ldquo;{b.tammySays}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {props.parentPriority === 'wishList' && (
          <Card title="Wish list">
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, color: 'var(--v2-text-secondary)', lineHeight: 1.55 }}>
              <li>Plant a tiny "bravery seed" (sticker chart)</li>
              <li>Pick a weekend adventure together</li>
              <li>Write a proud note and save it</li>
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main DemoFlow component                                            */
/* ------------------------------------------------------------------ */

export default function DemoFlow() {
  useWakeLock();
  const { status, requestPermission } = useMicPermission();

  const [session, setSession] = useState<DemoSession>(() => {
    const loaded = loadDemoSession();
    if (loaded.step === 'introParentSetup') {
      return { ...loaded, step: getFirstStep(SKIPPED_STEPS) };
    }
    return loaded;
  });
  const step: DemoStep = session.step;

  const [showConsent, setShowConsent] = useState<boolean>(() => !session.hasConsented);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !session.hasSeenOnboarding);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [helpSection, setHelpSection] = useState<'voice' | 'missions' | 'parentDashboard' | 'survey' | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const updateSession = useCallback((patch: Partial<DemoSession>) => {
    setSession((prev) => {
      const next: DemoSession = {
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      saveDemoSession(next);
      return next;
    });
  }, []);

  const goToStep = useCallback(
    (target: DemoStep) => updateSession({ step: target }),
    [updateSession],
  );

  const goForward = useCallback(() => {
    const next = getNextStep(step, SKIPPED_STEPS);
    if (next) updateSession({ step: next });
  }, [step, updateSession]);

  const goBack = useCallback(() => {
    const prev = getPreviousStep(step, SKIPPED_STEPS);
    if (prev) updateSession({ step: prev });
  }, [step, updateSession]);

  const { childName, messages: savedMessages, topics, saveChildName, saveTopic, saveMessages, clearAll } =
    usePersonalMemory(undefined);

  const { activeMissions, completedMissions, addMission, completeMission, deleteMission } =
    useMissions(undefined);

  const guestWishes = useGuestWishes();

  const [voiceProvider, setVoiceProvider] = useState(() => createVoiceProvider());
  /** After "Start over", force empty initialMessages for the new provider so conversation is cleared. */
  const resetJustHappenedRef = useRef(false);

  const PENDING_MISSIONS_KEY = 'turtle-talk-demo-pending-missions';
  const [pendingMissionChoices, setPendingMissionChoicesRaw] = useState<MissionSuggestion[] | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(PENDING_MISSIONS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const updatePendingMissions = useCallback((choices: MissionSuggestion[] | null) => {
    setPendingMissionChoicesRaw(choices);
    try {
      if (choices) window.localStorage.setItem(PENDING_MISSIONS_KEY, JSON.stringify(choices));
      else window.localStorage.removeItem(PENDING_MISSIONS_KEY);
    } catch {}
  }, []);
  const pendingChoices: DemoMissionChoice[] = useMemo(
    () => (pendingMissionChoices ?? []).map((c, i) => ({ ...c, __index: i })),
    [pendingMissionChoices],
  );

  const difficultyProfile: 'beginner' | 'intermediate' | 'confident' =
    completedMissions.length >= 5 ? 'confident' : completedMissions.length >= 2 ? 'intermediate' : 'beginner';

  const activeMission = activeMissions[0] ?? null;

  const voice = useVoiceSession(voiceProvider, {
    autoConnect: step === 'childCourageConversation' && status === 'granted',
    initialMessages: resetJustHappenedRef.current ? [] : savedMessages,
    childName,
    topics,
    difficultyProfile,
    activeMission,
    ageGroup: session.ageGroup ?? null,
    favoriteBook: session.favoriteBook ?? null,
    funFacts: session.funFacts ?? [],
    onChildName: saveChildName,
    onTopic: saveTopic,
    onMessagesChange: saveMessages,
    onMissionChoices: (choices) => {
      updatePendingMissions(choices);
    },
  });

  const hasError = !!voice.error;
  const statusBadge = hasError ? 'error' : voice.state === 'connecting' ? 'warning' : 'ok';
  const callActive = ACTIVE_STATES.has(voice.state);

  useEffect(() => {
    resetJustHappenedRef.current = false;
  }, [voiceProvider]);

  useEffect(() => {
    if (!session.demoId && typeof window !== 'undefined') {
      const randomId = `TT-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      updateSession({ demoId: randomId });
    }
  }, [session.demoId, updateSession]);

  // Persist a session row immediately so the parent page can find it even before
  // the child has entered any data. Subsequent upserts add richer fields.
  const earlyPersistDone = useRef(false);
  useEffect(() => {
    if (earlyPersistDone.current) return;
    if (!session.demoId) return;
    earlyPersistDone.current = true;
    void fetch('/api/demo/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        demoId: session.demoId,
        childName: childName ?? null,
        ageGroup: session.ageGroup ?? null,
        favoriteBook: session.favoriteBook ?? '',
        funFacts: session.funFacts ?? [],
        consentedAt: session.consentedAt ?? null,
      }),
    }).catch(() => {});
  }, [childName, session.ageGroup, session.consentedAt, session.demoId, session.favoriteBook, session.funFacts]);

  useEffect(() => {
    if (step !== 'survey' || !session.demoId) return;
    const payload = {
      demoId: session.demoId,
      childName,
      ageGroup: session.ageGroup ?? null,
      favoriteBook: session.favoriteBook ?? '',
      funFacts: session.funFacts ?? [],
      completedMissionsCount: completedMissions.length,
      wishChoice: session.wishChoice ?? null,
      topics,
      messagesSummary: (voice.messages ?? []).slice(-6),
      consentedAt: session.consentedAt ?? null,
    };
    void fetch('/api/demo/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, [
    childName,
    completedMissions.length,
    session.ageGroup,
    session.demoId,
    session.favoriteBook,
    session.funFacts,
    session.wishChoice,
    step,
    topics,
    voice.messages,
  ]);

  const [newFunFact, setNewFunFact] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const typedBusyRef = useRef(false);

  const submitTyped = useCallback(async () => {
    const text = typedInput.trim();
    if (!text) return;
    if (typedBusyRef.current) return;
    typedBusyRef.current = true;
    try {
      const res = await fetch('/api/demo/talk-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userText: text,
          context: {
            messages: (voice.messages ?? []).slice(-20),
            childName,
            topics,
            difficultyProfile,
            activeMission,
          },
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        userText: string;
        responseText: string;
        mood?: string;
        missionChoices?: MissionSuggestion[];
        childName?: string;
        topic?: string;
      };
      const nextMessages: Message[] = [
        ...(voice.messages ?? []),
        { role: 'user', content: data.userText },
        ...(data.responseText ? [{ role: 'assistant', content: data.responseText } as const] : []),
      ];
      saveMessages(nextMessages);
      if (data.childName) saveChildName(data.childName);
      if (data.topic) saveTopic(data.topic);
      if (data.missionChoices?.length) {
        updatePendingMissions(data.missionChoices);
        updateSession({ step: 'missionsPick' });
      }
      setTypedInput('');
    } finally {
      typedBusyRef.current = false;
    }
  }, [activeMission, childName, difficultyProfile, saveChildName, saveMessages, saveTopic, topics, typedInput, updateSession, voice.messages]);

  const goNext = useCallback((next: DemoStep) => updateSession({ step: next }), [updateSession]);

  const resetAll = useCallback(() => {
    resetJustHappenedRef.current = true;
    voice.resetSession();
    setVoiceProvider(createFreshVoiceProvider());
    clearDemoSession();
    const fresh = createFreshDemoSession();
    fresh.step = getFirstStep(SKIPPED_STEPS);
    setSession(fresh);
    updatePendingMissions(null);
    clearAll();
    resetGuestWishes();
    guestWishes.regenerate();
    earlyPersistDone.current = false;
    try {
      const db = getGuestDb();
      const id = typeof window !== 'undefined' ? getDeviceId() : 'default';
      void db.clearMissions?.(id);
    } catch {
      // ignore
    }
  }, [clearAll, voice, guestWishes]);

  // Auto-advance past skipped steps
  useEffect(() => {
    if (SKIPPED_STEPS.has(step)) {
      const next = getNextStep(step, SKIPPED_STEPS);
      if (next) {
        updateSession({ step: next });
      }
    }
  }, [step, updateSession]);

  useEffect(() => {
    if (step === 'tattleCard' && !session.hasSeenOnboarding && !showOnboarding) {
      setShowOnboarding(true);
    }
  }, [session.hasSeenOnboarding, showOnboarding, step]);

  useEffect(() => {
    if (!callActive && pendingMissionChoices != null && step === 'childCourageConversation') {
      updateSession({ step: 'missionsPick' });
    }
  }, [callActive, pendingMissionChoices, step, updateSession]);

  useEffect(() => {
    if (step === 'missionsPick' && pendingMissionChoices == null && activeMissions.length === 0) {
      updateSession({ step: 'childCourageConversation' });
    }
  }, [pendingMissionChoices, activeMissions.length, step, updateSession]);

  // Navigation helpers that respect the step ordering
  const previousStep = getPreviousStep(step, SKIPPED_STEPS);
  const nextStep = getNextStep(step, SKIPPED_STEPS);

  if (status === 'checking') {
    return (
      <DemoShell onResetAll={resetAll} theme={session.demoTheme ?? 'dark'}>
        <main style={{ maxWidth: 980, margin: '0 auto', padding: 24 }}>
          <p style={{ color: 'var(--v2-text-secondary)' }}>Loading\u2026</p>
        </main>
      </DemoShell>
    );
  }

  if (status === 'denied' || status === 'prompt') {
    return (
      <DemoShell onResetAll={resetAll} theme={session.demoTheme ?? 'dark'}>
        <MicPermissionV2 onGranted={requestPermission} onDenied={() => {}} />
      </DemoShell>
    );
  }

  return (
    <DemoShell onResetAll={() => setConfirmResetOpen(true)} theme={session.demoTheme ?? 'dark'}>
      <ConsentModal
        open={showConsent}
        onAgree={() => {
          setShowConsent(false);
          updateSession({ hasConsented: true, consentedAt: new Date().toISOString() });
        }}
        onDecline={() => {
          window.location.href = '/';
        }}
      />
      <OnboardingModal
        open={!showConsent && showOnboarding && step === 'tattleCard' && status === 'granted'}
        onClose={() => {
          setShowOnboarding(false);
          updateSession({ hasSeenOnboarding: true });
        }}
      />
      <DemoSettingsModal open={showSettings} onClose={() => setShowSettings(false)} session={session} onUpdate={updateSession} />
      <ConfirmModal
        open={confirmResetOpen}
        title="Start over?"
        body="This clears the current missions, notes, and local progress on this device so you can start fresh."
        confirmLabel="Yes, start over"
        cancelLabel="Keep current run"
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          setConfirmResetOpen(false);
          resetAll();
        }}
      />
      <ConfirmModal
        open={confirmEndOpen}
        title="End this walkthrough?"
        body="You'll jump to the quick feedback page. You can always start another session afterwards."
        confirmLabel="Go to feedback"
        onCancel={() => setConfirmEndOpen(false)}
        onConfirm={() => {
          setConfirmEndOpen(false);
          goNext('survey');
        }}
      />
      {helpSection && <HelpModal section={helpSection} onClose={() => setHelpSection(null)} />}

      {showQrModal && (
        <ModalBackdrop onClose={() => setShowQrModal(false)}>
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 17,
                fontWeight: 750,
                letterSpacing: 0.2,
                color: '#0E1020',
                textAlign: 'center',
              }}
            >
              Parent, scan here to check progress
            </h2>
            <div
              style={{
                padding: 12,
                borderRadius: 16,
                border: '1px solid rgba(0,0,40,0.08)',
                background: '#fff',
                display: 'inline-flex',
              }}
            >
              <ParentQrCode demoId={session.demoId ?? ''} />
            </div>
            <div
              style={{
                fontSize: 13,
                color: '#384165',
                textAlign: 'center',
              }}
            >
              Session ID:{' '}
              <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
                {session.demoId || '\u2026'}
              </span>
            </div>
          </div>
          <div
            style={{
              padding: 16,
              borderTop: '1px solid rgba(0,0,40,0.06)',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <PrimaryButton tone="ghost" onClick={() => setShowQrModal(false)}>
              Close
            </PrimaryButton>
          </div>
        </ModalBackdrop>
      )}

      <div
        style={{
          position: 'fixed',
          top: 'max(74px, env(safe-area-inset-top))',
          right: 'max(16px, env(safe-area-inset-right))',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <TalkStatusIndicator status={statusBadge} hasError={hasError} />
      </div>

      <main
        style={{
          maxWidth: 980,
          margin: '0 auto',
          padding: 24,
          display: 'grid',
          gap: 16,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 20,
            alignContent: 'center',
            minHeight: 'calc(100vh - 160px)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <StepMap step={step} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'rgba(215,222,255,0.7)',
                  letterSpacing: 0.5,
                }}
              >
                {session.demoId || '\u2026'}
              </span>
              <button
                type="button"
                aria-label="Show QR code for parent"
                onClick={() => setShowQrModal(true)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  padding: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(215,222,255,0.8)',
                  transition: 'background 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.16)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="8" height="8" rx="1" />
                  <rect x="14" y="2" width="8" height="8" rx="1" />
                  <rect x="2" y="14" width="8" height="8" rx="1" />
                  <rect x="14" y="14" width="4" height="4" rx="0.5" />
                  <line x1="22" y1="14" x2="22" y2="18" />
                  <line x1="18" y1="22" x2="22" y2="22" />
                  <rect x="5" y="5" width="2" height="2" rx="0.25" fill="currentColor" stroke="none" />
                  <rect x="17" y="5" width="2" height="2" rx="0.25" fill="currentColor" stroke="none" />
                  <rect x="5" y="17" width="2" height="2" rx="0.25" fill="currentColor" stroke="none" />
                </svg>
              </button>
            </div>
          </div>

          {/* ---- tattleCard ---- */}
          {step === 'tattleCard' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <TattleCardPicker
                selectedId={session.tattleCardId ?? null}
                onSelect={(id) => {
                  updateSession({ tattleCardId: id });
                }}
              />
              <StepNavigation
                onPrevious={previousStep ? goBack : undefined}
                onNext={() => {
                  if (!session.tattleCardId) {
                    updateSession({ tattleCardId: 'physical' });
                  }
                  goForward();
                }}
                nextLabel="Next"
              />
            </div>
          )}

          {/* ---- childWarmupName ---- */}
          {step === 'childWarmupName' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <ChildProfileWizard
                name={childName}
                ageGroup={session.ageGroup}
                favoriteBook={session.favoriteBook ?? ''}
                funFacts={session.funFacts ?? []}
                onChangeName={saveChildName}
                onChangeAgeGroup={(ageGroup) => updateSession({ ageGroup })}
                onChangeFavoriteBook={(favoriteBook) => updateSession({ favoriteBook })}
                onChangeFunFacts={(funFacts) => updateSession({ funFacts })}
                newFunFact={newFunFact}
                onChangeNewFunFact={setNewFunFact}
                onBack={previousStep ? goBack : undefined}
                onComplete={goForward}
                initialSubstep={session.profileSubstep}
                onSubstepChange={(s) => updateSession({ profileSubstep: s })}
              />
            </div>
          )}

          {/* ---- childCourageConversation (centered single-column) ---- */}
          {(step === 'childCourageConversation' || (step === 'missionsPick' && callActive)) && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                maxWidth: 500,
                margin: '0 auto',
                width: '100%',
                paddingBottom: 120,
              }}
            >
              <TammyLogoPlaceholder animate={voice.state === 'connecting'} compact={voice.state !== 'idle'} />
              <TalkConversationCard
                messages={voice.messages}
                pendingUserTranscript={voice.pendingUserTranscript}
                isThinking={voice.state === 'processing'}
                state={voice.state}
                hideIntroCopy
              />
            </div>
          )}

          {/* ---- missionsPick modal ---- */}
          {step === 'missionsPick' && pendingChoices.length > 0 && !callActive && (
            <ModalBackdrop onClose={() => {
              updatePendingMissions(null);
              updateSession({ step: 'wish', missionStatus: 'dismissed' });
            }}>
              <div style={{ padding: 20, maxHeight: '80vh', overflowY: 'auto' }}>
                <MissionChoicesCard
                  choices={pendingChoices}
                  onDismiss={() => {
                    updatePendingMissions(null);
                    updateSession({ step: 'wish', missionStatus: 'dismissed' });
                  }}
                  onTalkMore={() => {
                    updatePendingMissions(null);
                    updateSession({ step: 'childCourageConversation' });
                    void voice.startListening();
                  }}
                  onHelp={() => setHelpSection('missions')}
                  onAccept={(choice) => {
                    addMission(choice);
                    updatePendingMissions(null);
                    updateSession({ step: 'missionDo', missionStatus: 'active' });
                  }}
                />
                <div style={{ marginTop: 12 }}>
                  <StepNavigation
                    onPrevious={() => goToStep('childCourageConversation')}
                    onNext={() => goToStep('wish')}
                    nextLabel="Skip missions"
                  />
                </div>
              </div>
            </ModalBackdrop>
          )}

          <section
            style={{
              display: 'grid',
              gap: 20,
              justifyItems: 'center',
            }}
          >
              {/* ---- missionDo ---- */}
              {step === 'missionDo' && (
                <div style={{ display: 'grid', gap: 12, width: '100%' }}>
                  <Card
                    title={activeMissions[0]?.title ?? 'Your brave mission'}
                    right={<HelpIconButton aria-label="What does this mission do?" onClick={() => setHelpSection('missions')} />}
                  >
                    {activeMissions[0]?.description && (
                      <p style={{ margin: '0 0 8px', color: 'var(--v2-text-secondary)', lineHeight: 1.4 }}>
                        {activeMissions[0].description}
                      </p>
                    )}
                    <InfoHint text="Complete it or skip for now!" />
                    <div style={{ marginTop: 12, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <PrimaryButton
                        tone="ghost"
                        onClick={() => {
                          const m = activeMissions[0];
                          if (m) deleteMission(m.id);
                          updateSession({ step: 'wish', missionStatus: 'dismissed' });
                        }}
                      >
                        Dismiss
                      </PrimaryButton>
                      <PrimaryButton
                        onClick={() => {
                          const m = activeMissions[0];
                          if (m) completeMission(m.id);
                          updateSession({ step: 'wish', missionStatus: 'completed' });
                        }}
                      >
                        Mark complete
                      </PrimaryButton>
                    </div>
                  </Card>
                  <StepNavigation
                    onPrevious={() => goToStep('missionsPick')}
                    onNext={() => goToStep('wish')}
                  />
                </div>
              )}

              {/* ---- wish ---- */}
              {step === 'wish' && (
                <div style={{ display: 'grid', gap: 12, width: '100%', maxWidth: 500, justifySelf: 'center' }}>
                  {guestWishes.completed ? (
                    <>
                      <Card title="Your wishes are in!">
                        <div style={{ display: 'grid', gap: 10 }}>
                          <InfoHint text="Nice picks! Your grown-up will see these and choose one to make come true." />
                          <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                            {guestWishes.options
                              .filter((o) => guestWishes.selectedIds.has(o.id))
                              .map((o) => (
                                <div
                                  key={o.id}
                                  style={{
                                    padding: '10px 14px',
                                    borderRadius: 14,
                                    border: '2px solid rgba(140,120,255,0.7)',
                                    background: 'rgba(140,120,255,0.14)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                  }}
                                >
                                  <span style={{ fontWeight: 700, fontSize: 14 }}>{o.label}</span>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: 'rgba(200,210,255,0.85)',
                                      fontWeight: 600,
                                      padding: '2px 7px',
                                      background: 'rgba(255,255,255,0.10)',
                                      borderRadius: 6,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {getThemeLabel(o.theme_slug)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </Card>
                      <StepNavigation
                        onPrevious={previousStep ? goBack : undefined}
                        onNext={goForward}
                      />
                    </>
                  ) : (
                    <>
                      <Card
                        title="Make a wish!"
                        right={
                          <button
                            type="button"
                            onClick={guestWishes.regenerate}
                            style={{
                              appearance: 'none',
                              border: 'none',
                              background: 'transparent',
                              color: 'var(--v2-text-secondary)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: 12,
                              textDecoration: 'underline',
                            }}
                          >
                            New wishes
                          </button>
                        }
                      >
                        <div style={{ display: 'grid', gap: 10 }}>
                          <InfoHint text="Tap your 3 favourites, then submit!" />
                          <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                            {guestWishes.options.map((opt) => {
                              const sel = guestWishes.selectedIds.has(opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => guestWishes.toggle(opt.id)}
                                  style={{
                                    appearance: 'none',
                                    width: '100%',
                                    padding: '12px 14px',
                                    borderRadius: 14,
                                    border: sel
                                      ? '2px solid rgba(140,120,255,0.95)'
                                      : '1px solid rgba(255,255,255,0.16)',
                                    background: sel ? 'rgba(140,120,255,0.18)' : 'rgba(255,255,255,0.04)',
                                    cursor: 'pointer',
                                    color: 'var(--v2-text)',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 10,
                                    transition: 'border-color 120ms, background 120ms',
                                  }}
                                >
                                  <span style={{ fontWeight: sel ? 750 : 600, fontSize: 14 }}>
                                    {opt.label}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: 'rgba(200,210,255,0.75)',
                                      fontWeight: 600,
                                      padding: '2px 7px',
                                      background: 'rgba(255,255,255,0.08)',
                                      borderRadius: 6,
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {getThemeLabel(opt.theme_slug)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <PrimaryButton
                            disabled={guestWishes.selectedIds.size !== 3}
                            onClick={() => {
                              guestWishes.submit();
                              if (typeof window !== 'undefined') {
                                void confetti({
                                  particleCount: 80,
                                  spread: 70,
                                  startVelocity: 35,
                                  gravity: 0.9,
                                  origin: { y: 0.85 },
                                });
                              }
                            }}
                            style={{
                              marginTop: 4,
                              opacity: guestWishes.selectedIds.size === 3 ? 1 : 0.5,
                            }}
                          >
                            {`Submit ${guestWishes.selectedIds.size}/3`}
                          </PrimaryButton>
                        </div>
                      </Card>
                      <StepNavigation
                        onPrevious={previousStep ? goBack : undefined}
                        onNext={goForward}
                      />
                    </>
                  )}
                </div>
              )}

              {/* ---- parentDashboard (kept for direct navigation / parent flow) ---- */}
              {step === 'parentDashboard' && (
                <DemoParentDashboard
                  parentPriority={session.parentPriority}
                  childName={childName}
                  ageGroup={session.ageGroup}
                  topics={topics}
                  messages={voice.messages}
                  completedCount={completedMissions.length}
                  activeCount={activeMissions.length}
                  onChangePriority={(p) => updateSession({ parentPriority: p })}
                  onEndDemo={() => setConfirmEndOpen(true)}
                  onHelp={() => setHelpSection('parentDashboard')}
                />
              )}

              {/* ---- survey ---- */}
              {step === 'survey' && (
                <div style={{ display: 'grid', gap: 12, width: '100%', maxWidth: 360, justifySelf: 'center' }}>
                  <Card>
                    <div style={{ display: 'grid', gap: 16, textAlign: 'center' }}>
                      <div style={{ color: 'var(--v2-text-secondary)', fontSize: 15 }}>Did you enjoy talking to Tammy?</div>
                      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                        {[
                          { value: 1 as const, label: '\u{1F615}', title: 'Not quite right' },
                          { value: 3 as const, label: '\u{1F642}', title: 'Nice start' },
                          { value: 5 as const, label: '\u{1F929}', title: 'Loved it' },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => updateSession({ survey: { ...session.survey, rating: opt.value } })}
                            style={{
                              appearance: 'none',
                              cursor: 'pointer',
                              borderRadius: 999,
                              width: 64,
                              height: 64,
                              padding: 0,
                              border: session.survey.rating === opt.value
                                ? '2.5px solid rgba(140,120,255,0.95)'
                                : '1px solid rgba(255,255,255,0.14)',
                              background:
                                session.survey.rating === opt.value ? 'rgba(140,120,255,0.22)' : 'rgba(255,255,255,0.05)',
                              fontSize: 36,
                              lineHeight: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'transform 0.15s, border-color 0.15s',
                              transform: session.survey.rating === opt.value ? 'scale(1.1)' : 'scale(1)',
                            }}
                            aria-pressed={session.survey.rating === opt.value}
                            title={opt.title}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>
                  <StepNavigation
                    onPrevious={previousStep ? goBack : undefined}
                    onNext={() => resetAll()}
                    nextLabel="Start over"
                  />
                </div>
              )}
          </section>
        </div>
      </main>

      {/* Bottom bar with voice controls -- vertical column layout */}
      {(step === 'childCourageConversation' || (step === 'missionsPick' && callActive)) && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 45,
            padding: 'max(16px, env(safe-area-inset-bottom)) 20px',
            background: 'linear-gradient(to top, rgba(10,10,14,0.92) 60%, transparent)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {/* Primary row: mute + call button -- prominent green */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <TalkMuteToggle isMuted={voice.isMuted} onToggle={voice.toggleMute} callActive={callActive} />
            <TalkEndCallButton
              state={voice.state}
              hasError={hasError}
              missionGenerated={!!pendingMissionChoices && callActive}
              label="Tap to talk to Tammy"
              onEnd={() => {
                voice.endConversation();
                const dest: DemoStep = pendingChoices.length > 0 ? 'missionsPick' : 'wish';
                updateSession({ step: dest });
              }}
              onRetry={voice.startListening}
              onStart={voice.startListening}
            />
          </div>

          {/* Secondary row: back / next navigation (smaller, below call button) */}
          {!callActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: 0.85 }}>
              {previousStep && (
                <PrimaryButton
                  tone="ghost"
                  onClick={goBack}
                  style={{ fontSize: 12, padding: '6px 10px' }}
                >
                  Back
                </PrimaryButton>
              )}
              <PrimaryButton
                tone="ghost"
                onClick={() => {
                  const dest = pendingChoices.length > 0 ? 'missionsPick' : 'wish';
                  updateSession({ step: dest as DemoStep });
                }}
                style={{ fontSize: 12, padding: '6px 10px' }}
              >
                Skip &rarr;
              </PrimaryButton>
            </div>
          )}
        </div>
      )}
    </DemoShell>
  );
}
