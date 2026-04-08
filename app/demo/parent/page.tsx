'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import booksData from '@/app/placeholders/books.json';
import moviesData from '@/app/placeholders/movies.json';
import { useWakeLock } from '@/app/hooks/useWakeLock';

type ParentPreference = 'books' | 'movies' | 'garden' | 'dinner';

type DemoSessionSummary = {
  demoId: string;
  childName: string | null;
  ageGroup: string | null;
  favoriteBook: string | null;
  funFacts: string[] | null;
  completedMissionsCount: number | null;
  wishChoice: string | null;
  topics: string[] | null;
  createdAt: string | null;
  lastSeenAt: string | null;
};

type Book = {
  id: string;
  title: string;
  author: string;
  shortDescription: string;
  coverEmoji: string;
  coverUrl?: string;
  ageRange: string;
  ageGroup?: string;
  goodreadsRating?: number;
  whyKidsChoose?: string[];
  shellySays?: string;
  recommendedFor: string[];
  whyRecommended: string;
  fullDescription: string;
};

type Movie = {
  id: string;
  title: string;
  director: string;
  shortDescription: string;
  coverEmoji: string;
  ageRange: string;
  imdbRating: number;
  recommendedFor: string[];
  whyRecommended: string;
  fullDescription: string;
};

const POLL_INTERVAL_MS = 12_000;

const PREFERENCE_CARDS: {
  value: ParentPreference;
  emoji: string;
  title: string;
  description: string;
}[] = [
  { value: 'books', emoji: '\u{1F4DA}', title: 'Book recommendations', description: 'A story that helps your child grow' },
  { value: 'movies', emoji: '\u{1F3AC}', title: 'Movie recommendations', description: 'A family movie your child might love' },
  { value: 'garden', emoji: '\u{1F331}', title: 'Encouragement garden', description: 'Celebrate their brave mission' },
  { value: 'dinner', emoji: '\u{1F37D}\uFE0F', title: 'Dinner conversations', description: 'Start a meaningful family conversation' },
];

function hasChildData(s: DemoSessionSummary): boolean {
  return !!(s.childName || s.completedMissionsCount || s.wishChoice || (s.topics && s.topics.length > 0));
}

// ---------------------------------------------------------------------------
// QR Scanner Modal
// ---------------------------------------------------------------------------

function QrScannerModal({ onScan, onClose }: { onScan: (id: string) => void; onClose: () => void }) {
  const viewfinderRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [camError, setCamError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewfinderRef.current) return;
    const scannerId = 'qr-viewfinder';
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          const match = decodedText.match(/[?&]session=([^&]+)/);
          if (match) {
            onScan(decodeURIComponent(match[1]));
          } else if (/^TT-[A-Z0-9]{4,}$/i.test(decodedText.trim())) {
            onScan(decodedText.trim().toUpperCase());
          }
        },
        () => {},
      )
      .catch(() => {
        setCamError('Could not access the camera. Please allow camera access or type the code manually.');
      });

    return () => {
      scanner.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'calc(100% - 32px)',
          maxWidth: 380,
          background: 'var(--pd-card)',
          border: '1px solid var(--pd-card-border)',
          borderRadius: 'var(--pd-radius-lg)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 20,
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--pd-text-primary)' }}>
            Scan QR Code
          </span>
          <button
            onClick={onClose}
            style={{
              appearance: 'none',
              border: 'none',
              background: 'var(--pd-accent-soft)',
              color: 'var(--pd-accent)',
              width: 32,
              height: 32,
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            &times;
          </button>
        </div>

        {camError ? (
          <div style={{ color: 'var(--pd-error)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>
            {camError}
          </div>
        ) : (
          <div
            id="qr-viewfinder"
            ref={viewfinderRef}
            style={{ width: '100%', borderRadius: 12, overflow: 'hidden' }}
          />
        )}

        <p style={{ margin: 0, fontSize: 13, color: 'var(--pd-text-tertiary)', textAlign: 'center' }}>
          Point your camera at the QR code on the child{"'"}s screen.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preference Cards Picker
// ---------------------------------------------------------------------------

function PreferenceCardsPicker({ onSelect }: { onSelect: (p: ParentPreference) => void }) {
  const [hoveredCard, setHoveredCard] = useState<ParentPreference | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, paddingTop: 40 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: 'var(--pd-accent-soft)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            marginBottom: 14,
          }}
        >
          {'\u{1F422}'}
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: 'var(--pd-text-primary)' }}>
          How would you like Shelly to help your family?
        </h2>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--pd-text-tertiary)', lineHeight: 1.5 }}>
          Choose one card. We{"'"}ll show you something helpful based on your child{"'"}s conversation.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 14,
          width: '100%',
          maxWidth: 440,
        }}
      >
        {PREFERENCE_CARDS.map((card) => {
          const isHovered = hoveredCard === card.value;
          return (
            <button
              key={card.value}
              type="button"
              onClick={() => onSelect(card.value)}
              onMouseEnter={() => setHoveredCard(card.value)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                appearance: 'none',
                cursor: 'pointer',
                border: '1px solid var(--pd-card-border)',
                borderRadius: 18,
                background: isHovered ? 'var(--pd-accent-soft)' : 'var(--pd-card)',
                boxShadow: isHovered
                  ? '0 8px 28px rgba(0,0,0,0.12)'
                  : '0 2px 8px rgba(0,0,0,0.06)',
                padding: '22px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                textAlign: 'center',
                transition: 'all 0.18s ease-out',
                transform: isHovered ? 'translateY(-2px)' : 'none',
              }}
            >
              <span style={{ fontSize: 36, lineHeight: 1 }}>{card.emoji}</span>
              <span style={{ fontWeight: 750, fontSize: 15, color: 'var(--pd-text-primary)' }}>
                {card.title}
              </span>
              <span style={{ fontSize: 13, color: 'var(--pd-text-tertiary)', lineHeight: 1.35 }}>
                {card.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Star rating display
// ---------------------------------------------------------------------------

function StarRating({ rating, source }: { rating: number; source: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--pd-text-tertiary)' }}>
      <span style={{ color: '#F59E0B', fontSize: 15 }}>{'\u2B50'}</span>
      <span style={{ fontWeight: 700, color: 'var(--pd-text-primary)' }}>{rating}</span>
      <span>{source}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recommendation Card (shared layout for book/movie)
// ---------------------------------------------------------------------------

function RecommendationCard({
  emoji,
  title,
  subtitle,
  rating,
  ratingSource,
  whyText,
  childContext,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  rating?: number;
  ratingSource?: string;
  whyText: string;
  childContext: string | null;
}) {
  return (
    <div
      className="pd-card-elevated"
      style={{
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: 'var(--pd-accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            flexShrink: 0,
          }}
        >
          {emoji}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--pd-text-primary)', marginBottom: 2 }}>
            {title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--pd-text-tertiary)' }}>{subtitle}</div>
          {rating != null && ratingSource && (
            <div style={{ marginTop: 4 }}>
              <StarRating rating={rating} source={ratingSource} />
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          background: 'var(--pd-surface-soft)',
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--pd-accent)' }}>
          Why Shelly recommends it:
        </div>
        <div style={{ fontSize: 14, color: 'var(--pd-text-secondary)', lineHeight: 1.55 }}>
          {whyText}
        </div>
        {childContext && (
          <div style={{ fontSize: 13, color: 'var(--pd-text-tertiary)', fontStyle: 'italic', lineHeight: 1.45 }}>
            {childContext}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Book detail view
// ---------------------------------------------------------------------------

function BookCoverImage({ src, alt, emoji }: { src?: string; alt: string; emoji: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '2 / 3',
          borderRadius: 12,
          background: 'linear-gradient(165deg, #ebebed 0%, #e0e0e8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
        }}
      >
        {emoji}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{
        width: '100%',
        aspectRatio: '2 / 3',
        objectFit: 'cover',
        borderRadius: 12,
        display: 'block',
      }}
    />
  );
}

function BookRecommendationCard({ book }: { book: Book }) {
  return (
    <div
      className="pd-card-elevated"
      style={{
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ width: '100%', maxHeight: 260, overflow: 'hidden' }}>
        <BookCoverImage src={book.coverUrl} alt={book.title} emoji={book.coverEmoji} />
      </div>
      <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--pd-text-primary)', marginBottom: 2 }}>
            {book.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--pd-text-tertiary)' }}>
            {book.author} · Ages {book.ageRange}
          </div>
          {book.goodreadsRating != null && (
            <div style={{ marginTop: 4 }}>
              <StarRating rating={book.goodreadsRating} source="Goodreads" />
            </div>
          )}
        </div>

        {book.whyKidsChoose && book.whyKidsChoose.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--pd-accent)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
              Why kids choose it
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 14, color: 'var(--pd-text-secondary)', lineHeight: 1.55 }}>
              {book.whyKidsChoose.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {book.shellySays && (
          <div
            style={{
              background: 'var(--pd-surface-soft)',
              borderRadius: 10,
              padding: '12px 14px',
              borderLeft: '3px solid var(--pd-accent)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--pd-accent)', marginBottom: 4 }}>
              Shelly says
            </div>
            <div style={{ fontSize: 14, color: 'var(--pd-text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>
              &ldquo;{book.shellySays}&rdquo;
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BookDetailView({ session }: { session: DemoSessionSummary }) {
  const books = booksData as Book[];

  const recommended = useMemo(() => {
    const ageGroup = session.ageGroup;
    if (ageGroup) {
      const matched = books.filter((b) => b.ageGroup === ageGroup);
      if (matched.length > 0) return matched;
    }
    return books.filter((b) => b.ageGroup === '5-7');
  }, [session.ageGroup, books]);

  const ageLabel =
    session.ageGroup === '5-7' ? 'Ages 5\u20137'
    : session.ageGroup === '8-10' ? 'Ages 8\u201310'
    : session.ageGroup === '11-13' ? 'Ages 11\u201313'
    : null;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pd-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          {'\u{1F4DA}'} Book recommendations{ageLabel ? ` \u00B7 ${ageLabel}` : ''}
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--pd-text-primary)', lineHeight: 1.4 }}>
          Which book would Shelly send from her secret library?
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {recommended.map((book) => (
          <BookRecommendationCard key={book.id} book={book} />
        ))}
      </div>

      {!hasChildData(session) && (
        <div className="pd-card" style={{ padding: 16, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--pd-text-tertiary)', lineHeight: 1.5 }}>
            Once your child tells Shelly their age, we{"'"}ll show books matched to their age group.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Movie detail view
// ---------------------------------------------------------------------------

function MovieDetailView({ session }: { session: DemoSessionSummary }) {
  const movies = moviesData as Movie[];

  const recommended = useMemo(() => {
    const topics = session.topics ?? [];
    if (topics.length === 0) return movies[0];
    const lowerTopics = new Set(topics.map((t) => t.toLowerCase()));
    const match = movies.find((m) =>
      m.recommendedFor.some((tag) => lowerTopics.has(tag.toLowerCase())),
    );
    return match ?? movies[0];
  }, [session.topics, movies]);

  const childContext = useMemo(() => {
    if (!session.topics?.length) return null;
    return `Your child talked about ${session.topics.slice(0, 2).join(' and ')} today.`;
  }, [session.topics]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pd-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {'\u{1F3AC}'} A family movie your child might love
      </div>
      <RecommendationCard
        emoji={recommended.coverEmoji}
        title={recommended.title}
        subtitle={recommended.director}
        rating={recommended.imdbRating}
        ratingSource="IMDb"
        whyText={recommended.whyRecommended}
        childContext={childContext}
      />
      {!hasChildData(session) && (
        <div className="pd-card" style={{ padding: 16, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--pd-text-tertiary)', lineHeight: 1.5 }}>
            Once your child starts chatting with Shelly, we{"'"}ll match a movie to their interests.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Garden detail view
// ---------------------------------------------------------------------------

function GardenDetailView({ session }: { session: DemoSessionSummary }) {
  const [message, setMessage] = useState('');
  const [planted, setPlanted] = useState(false);
  const missionCount = session.completedMissionsCount ?? 0;
  const hasMissions = missionCount > 0;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pd-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {'\u{1F331}'} Encourage Your Child
      </div>

      <div className="pd-card-elevated" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>
            {hasMissions ? '\u{1F33B}' : '\u{1F331}'}
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 800, color: 'var(--pd-text-primary)' }}>
            Shelly{"'"}s Garden
          </h3>
          {hasMissions ? (
            <p style={{ margin: 0, fontSize: 14, color: 'var(--pd-text-secondary)', lineHeight: 1.5 }}>
              Your child completed {missionCount} brave mission{missionCount > 1 ? 's' : ''} today.
              <br />Add a flower to their garden and write a short encouragement.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: 'var(--pd-text-tertiary)', lineHeight: 1.5 }}>
              Your child hasn{"'"}t completed a mission yet. This will update once they do!
              <br />In the meantime, you can still plant an encouragement.
            </p>
          )}
        </div>

        {!planted ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={'I\'m proud of you for being brave today.'}
              rows={2}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--pd-card-border)',
                background: 'var(--pd-input-bg)',
                color: 'var(--pd-text-primary)',
                fontSize: 14,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={() => setPlanted(true)}
              style={{
                appearance: 'none',
                border: 'none',
                background: 'var(--pd-accent)',
                color: '#fff',
                padding: '12px 20px',
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {'\u{1F33C}'} Plant a flower
            </button>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--pd-success-soft)',
              border: '1px solid var(--pd-success-border)',
              borderRadius: 12,
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>{'\u{1F33C}'}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--pd-success)', marginBottom: 4 }}>
              Flower planted!
            </div>
            {message.trim() && (
              <div style={{ fontSize: 13, color: 'var(--pd-text-secondary)', fontStyle: 'italic' }}>
                &ldquo;{message.trim()}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dinner detail view
// ---------------------------------------------------------------------------

const GENERIC_QUESTIONS = [
  { topic: 'Bravery', question: 'What is one thing you did today that felt a little brave?', parentLine: 'When I was your age, I was nervous about trying new things too.', childLine: 'What happened?', parentFollowUp: 'I tried anyway and it felt good. Now ask your child: What would you do?' },
  { topic: 'Kindness', question: 'Did you notice someone being kind today? What did they do?', parentLine: 'I saw something kind today too — someone held the door open for a stranger.', childLine: 'That\'s nice!', parentFollowUp: 'Small acts of kindness make a big difference. What kindness could you do tomorrow?' },
  { topic: 'Friends', question: 'What is one way someone could fix a mistake with a friend?', parentLine: 'When I was your age, I once argued with my friend too.', childLine: 'What happened?', parentFollowUp: 'We talked about it and said sorry. Now ask your child: What would you do?' },
];

function DinnerDetailView({ session }: { session: DemoSessionSummary }) {
  const question = useMemo(() => {
    const topics = session.topics ?? [];
    if (topics.length > 0) {
      const topicLower = topics[0].toLowerCase();
      if (topicLower.includes('friend') || topicLower.includes('social')) return GENERIC_QUESTIONS[2];
      if (topicLower.includes('brave') || topicLower.includes('courage') || topicLower.includes('fear')) return GENERIC_QUESTIONS[0];
    }
    return GENERIC_QUESTIONS[2];
  }, [session.topics]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pd-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {'\u{1F37D}\uFE0F'} Shelly{"'"}s Dinner Question
      </div>

      <div className="pd-card-elevated" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pd-accent)', marginBottom: 6 }}>
            Topic: {question.topic}
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--pd-text-primary)', lineHeight: 1.4 }}>
            Ask your child:
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--pd-text-primary)',
              fontStyle: 'italic',
              lineHeight: 1.45,
              background: 'var(--pd-accent-soft)',
              borderRadius: 12,
              padding: '14px 16px',
            }}
          >
            &ldquo;{question.question}&rdquo;
          </div>
        </div>

        <div
          style={{
            background: 'var(--pd-surface-soft)',
            borderRadius: 12,
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pd-text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Example dialogue
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pd-accent)', whiteSpace: 'nowrap' }}>Parent:</span>
              <span style={{ fontSize: 13, color: 'var(--pd-text-secondary)', lineHeight: 1.4 }}>
                &ldquo;{question.parentLine}&rdquo;
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pd-success)', whiteSpace: 'nowrap' }}>Child:</span>
              <span style={{ fontSize: 13, color: 'var(--pd-text-secondary)', lineHeight: 1.4 }}>
                &ldquo;{question.childLine}&rdquo;
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--pd-accent)', whiteSpace: 'nowrap' }}>Parent:</span>
              <span style={{ fontSize: 13, color: 'var(--pd-text-secondary)', lineHeight: 1.4 }}>
                &ldquo;{question.parentFollowUp}&rdquo;
              </span>
            </div>
          </div>
        </div>

        {!hasChildData(session) && (
          <div style={{ fontSize: 13, color: 'var(--pd-text-tertiary)', textAlign: 'center', lineHeight: 1.45 }}>
            Once your child chats with Shelly, we{"'"}ll tailor conversation starters to their topics.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mission Progress Bar
// ---------------------------------------------------------------------------

function MissionProgress({ session }: { session: DemoSessionSummary }) {
  const count = session.completedMissionsCount ?? 0;
  const name = session.childName || 'Your child';

  return (
    <div className="pd-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--pd-text-primary)' }}>
          Missions
        </div>
        {session.ageGroup && (
          <span style={{ fontSize: 12, color: 'var(--pd-text-tertiary)', background: 'var(--pd-surface-soft)', borderRadius: 999, padding: '3px 10px' }}>
            {session.ageGroup}
          </span>
        )}
      </div>
      {count > 0 ? (
        <div style={{ fontSize: 14, color: 'var(--pd-text-secondary)', lineHeight: 1.5 }}>
          {name} completed <strong style={{ color: 'var(--pd-text-primary)' }}>{count}</strong> brave mission{count > 1 ? 's' : ''}.
          {session.wishChoice && (
            <span>
              {' '}Wish: <strong style={{ color: 'var(--pd-text-primary)' }}>
                {session.wishChoice === 'solo' ? 'Solo' : session.wishChoice === 'withParent' ? 'With you' : 'With a friend'}
              </strong>
            </span>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--pd-text-tertiary)', lineHeight: 1.5 }}>
          Missions will appear once {name.toLowerCase() === 'your child' ? 'your child starts' : `${session.childName} starts`} exploring with Shelly.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parent Feedback
// ---------------------------------------------------------------------------

function ParentFeedback({
  feedback,
  setFeedback,
  wantsFullVersion,
  setWantsFullVersion,
  saved,
  onSubmit,
}: {
  feedback: string;
  setFeedback: (v: string) => void;
  wantsFullVersion: boolean | null;
  setWantsFullVersion: (v: boolean | null) => void;
  saved: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="pd-card" style={{ padding: 20 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: 'var(--pd-text-primary)' }}>
        Your feedback
      </h3>
      <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--pd-text-tertiary)', lineHeight: 1.5 }}>
        Help us make Turtle Talk better for your family.
      </p>

      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--pd-text-secondary)', marginBottom: 6, fontWeight: 600 }}>
            What should we improve?
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your thoughts..."
            rows={3}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid var(--pd-card-border)',
              background: 'var(--pd-input-bg)',
              color: 'var(--pd-text-primary)',
              fontSize: 14,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: 13, color: 'var(--pd-text-secondary)', marginBottom: 6, fontWeight: 600 }}>
            Try the full version when it{"'"}s ready?
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {([
              { value: true, label: 'Yes' },
              { value: false, label: 'No' },
              { value: null, label: 'Not sure' },
            ] as const).map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => setWantsFullVersion(opt.value)}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  borderRadius: 10,
                  border: wantsFullVersion === opt.value
                    ? '1.5px solid var(--pd-accent)'
                    : '1px solid var(--pd-card-border)',
                  background: wantsFullVersion === opt.value ? 'var(--pd-accent-soft)' : 'transparent',
                  color: wantsFullVersion === opt.value ? 'var(--pd-accent)' : 'var(--pd-text-secondary)',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {saved ? (
          <div
            style={{
              fontSize: 13,
              color: 'var(--pd-success, #22c55e)',
              background: 'var(--pd-success-soft, rgba(34,197,94,0.08))',
              border: '1px solid var(--pd-success-border, rgba(34,197,94,0.2))',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            Thanks for your feedback!
          </div>
        ) : (
          <button
            onClick={onSubmit}
            style={{
              appearance: 'none',
              border: 'none',
              background: 'var(--pd-accent)',
              color: '#fff',
              padding: '11px 20px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              justifySelf: 'start',
            }}
          >
            Submit feedback
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversion CTA
// ---------------------------------------------------------------------------

function ConversionCTA({
  session,
  waitlistEmail,
  setWaitlistEmail,
  waitlistMessage,
  waitlistError,
  onJoin,
}: {
  session: DemoSessionSummary;
  waitlistEmail: string;
  setWaitlistEmail: (v: string) => void;
  waitlistMessage: string | null;
  waitlistError: string | null;
  onJoin: () => void;
}) {
  const missionCount = session.completedMissionsCount ?? 0;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {missionCount > 0 && (
        <div
          className="pd-card-elevated"
          style={{
            padding: 20,
            textAlign: 'center',
            background: 'var(--pd-accent-soft)',
            border: '1.5px solid var(--pd-accent)',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>{'\u{1F3AF}'}</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--pd-text-primary)', marginBottom: 6 }}>
            {session.childName || 'Your child'} just completed Mission #{missionCount}!
          </div>
          <div style={{ fontSize: 14, color: 'var(--pd-text-secondary)', lineHeight: 1.5 }}>
            Continue their missions at home and unlock book recommendations, dinner questions, and the encouragement garden.
          </div>
        </div>
      )}

      <div className="pd-card" style={{ padding: 20 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: 'var(--pd-text-primary)' }}>
          Join the waitlist
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: 14, color: 'var(--pd-text-tertiary)', lineHeight: 1.5 }}>
          Get a 3-month free trial and early access when Turtle Talk launches. We{"'"}ll send an invite to your email.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            value={waitlistEmail}
            onChange={(e) => setWaitlistEmail(e.target.value)}
            placeholder="you@example.com"
            type="email"
            style={{
              flex: '1 1 200px',
              minWidth: 0,
              padding: '11px 14px',
              borderRadius: 12,
              border: '1px solid var(--pd-card-border)',
              background: 'var(--pd-input-bg)',
              color: 'var(--pd-text-primary)',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            onClick={onJoin}
            style={{
              appearance: 'none',
              border: 'none',
              background: 'var(--pd-accent)',
              color: '#fff',
              padding: '11px 20px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Join the waitlist
          </button>
        </div>
        {waitlistMessage && (
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: 'var(--pd-success)',
              background: 'var(--pd-success-soft)',
              border: '1px solid var(--pd-success-border)',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            {waitlistMessage}
          </div>
        )}
        {waitlistError && (
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: 'var(--pd-error)',
              background: 'rgba(220,38,38,0.06)',
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            {waitlistError}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DemoParentPage() {
  return (
    <Suspense>
      <DemoParentPageInner />
    </Suspense>
  );
}

function DemoParentPageInner() {
  useWakeLock();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [sessionIdInput, setSessionIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [waitlistError, setWaitlistError] = useState<string | null>(null);
  const [session, setSession] = useState<DemoSessionSummary | null>(null);
  const [preference, setPreference] = useState<ParentPreference | null>(null);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistMessage, setWaitlistMessage] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [parentFeedback, setParentFeedback] = useState('');
  const [parentWantsFullVersion, setParentWantsFullVersion] = useState<boolean | null>(null);
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  // ---- load session ----
  const loadSession = useCallback(
    async (rawId: string) => {
      const id = rawId.trim();
      if (!id) return;
      setLoading(true);
      setSessionError(null);
      try {
        const res = await fetch(`/api/demo/session/${encodeURIComponent(id)}`);
        if (!res.ok) {
          if (res.status === 404) {
            setSessionError(
              'We couldn\u2019t find that session yet. If your child is still getting started, try again in a moment.',
            );
          } else {
            setSessionError('Something went wrong loading this demo.');
          }
          setSession(null);
          return;
        }
        const data = (await res.json()) as { session: DemoSessionSummary };
        setSession(data.session);
        router.replace(`/demo/parent?session=${encodeURIComponent(id)}`);
      } catch {
        setSessionError('Could not reach the server. Please try again.');
        setSession(null);
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  // auto-load from URL param
  useEffect(() => {
    const param = searchParams.get('session');
    if (param && !sessionIdInput) {
      setSessionIdInput(param.toUpperCase());
      void loadSession(param);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // auto-refresh session data while viewing
  useEffect(() => {
    if (!session) return;
    const id = session.demoId;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/demo/session/${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = (await res.json()) as { session: DemoSessionSummary };
          setSession(data.session);
        }
      } catch {
        /* silent */
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [session?.demoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- waitlist ----
  const handleJoinWaitlist = async () => {
    setWaitlistMessage(null);
    setWaitlistError(null);
    const email = waitlistEmail.trim().toLowerCase();
    if (!email) {
      setWaitlistError('Please add an email address to join the waitlist.');
      return;
    }
    try {
      const res = await fetch('/api/waiting-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, demoId: session?.demoId ?? null }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok || data.error) {
        setWaitlistError(data.error ?? 'Could not add you to the waitlist.');
        return;
      }
      setWaitlistMessage(
        data.message ?? 'You\u2019re on the list! You\u2019ll get a 3-month trial and early previews.',
      );
    } catch {
      setWaitlistError('Could not add you to the waitlist.');
    }
  };

  // ---- submit parent feedback ----
  const handleSubmitFeedback = async () => {
    if (!session) return;
    try {
      await fetch('/api/demo/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demoId: session.demoId,
          parentFeedback: parentFeedback.trim() || null,
          parentWantsFullVersion: parentWantsFullVersion,
        }),
      });
      setFeedbackSaved(true);
    } catch {
      /* silent */
    }
  };

  // ---- QR scan handler ----
  const handleQrScan = (id: string) => {
    setShowScanner(false);
    setSessionIdInput(id.toUpperCase());
    void loadSession(id);
  };

  // ---- reset ----
  const handleReset = () => {
    setSession(null);
    setPreference(null);
    setSessionError(null);
    setWaitlistError(null);
    setWaitlistMessage(null);
    setSessionIdInput('');
    setParentFeedback('');
    setParentWantsFullVersion(null);
    setFeedbackSaved(false);
    router.replace('/demo/parent');
  };

  // ---- derived ----
  const childLabel = session?.childName || 'Your child';

  return (
    <div className="parent-dashboard" style={{ minHeight: '100vh', background: 'var(--pd-bg-gradient)' }}>
      {/* ---- Header ---- */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 60,
          background: 'var(--pd-header-bg)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--pd-card-border)',
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--pd-text-primary)', letterSpacing: 0.2 }}>
              Shelly
            </span>
            <span style={{ fontSize: 13, color: 'var(--pd-text-tertiary)' }}>
              Voice companion for brave kids
            </span>
          </div>
          {session && (
            <button
              onClick={handleReset}
              style={{
                appearance: 'none',
                border: '1px solid var(--pd-card-border)',
                background: 'var(--pd-surface-soft)',
                color: 'var(--pd-text-secondary)',
                padding: '7px 14px',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Start over
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 48px' }}>
        {/* ---- Step 1: Connect Card ---- */}
        {!session && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, paddingTop: 48 }}>
            <div style={{ textAlign: 'center', maxWidth: 420 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: 'var(--pd-accent-soft)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 32,
                  marginBottom: 16,
                }}
              >
                {'\u{1F422}'}
              </div>
              <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, color: 'var(--pd-text-primary)' }}>
                Connect to your child{"'"}s demo
              </h1>
              <p style={{ margin: 0, fontSize: 15, color: 'var(--pd-text-tertiary)', lineHeight: 1.5 }}>
                Scan the QR code on the child{"'"}s screen or type the session code below.
              </p>
            </div>

            <div className="pd-card-elevated" style={{ width: '100%', maxWidth: 420, padding: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <button
                  onClick={() => setShowScanner(true)}
                  style={{
                    appearance: 'none',
                    border: '2px dashed var(--pd-card-border)',
                    background: 'var(--pd-accent-soft)',
                    color: 'var(--pd-accent)',
                    borderRadius: 'var(--pd-radius)',
                    padding: '18px 16px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 15,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Open Camera to Scan Code
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--pd-card-border)' }} />
                  <span style={{ fontSize: 12, color: 'var(--pd-text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    or type code
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'var(--pd-card-border)' }} />
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    value={sessionIdInput}
                    onChange={(e) => setSessionIdInput(e.target.value.toUpperCase())}
                    placeholder="e.g. TT-7F2A"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1px solid var(--pd-card-border)',
                      background: 'var(--pd-input-bg)',
                      color: 'var(--pd-text-primary)',
                      fontFamily: 'ui-monospace, "Cascadia Code", monospace',
                      fontSize: 15,
                      fontWeight: 600,
                      letterSpacing: 1,
                      outline: 'none',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void loadSession(sessionIdInput);
                    }}
                  />
                  <button
                    disabled={loading || !sessionIdInput.trim()}
                    onClick={() => loadSession(sessionIdInput)}
                    style={{
                      appearance: 'none',
                      border: 'none',
                      background: 'var(--pd-accent)',
                      color: '#fff',
                      padding: '12px 20px',
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: loading || !sessionIdInput.trim() ? 'not-allowed' : 'pointer',
                      opacity: loading || !sessionIdInput.trim() ? 0.5 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {loading ? 'Loading\u2026' : 'View session'}
                  </button>
                </div>

                {sessionError && (
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--pd-error)',
                      background: 'rgba(220,38,38,0.06)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      lineHeight: 1.45,
                    }}
                  >
                    {sessionError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- Step 2: Preference Cards ---- */}
        {session && !preference && (
          <PreferenceCardsPicker onSelect={setPreference} />
        )}

        {/* ---- Step 3: Dashboard ---- */}
        {session && preference && (
          <div style={{ display: 'grid', gap: 16 }}>
            {/* Child status bar */}
            <div className="pd-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: hasChildData(session) ? 'var(--pd-accent-soft)' : 'var(--pd-surface-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                  }}
                >
                  {hasChildData(session) ? '\u{1F422}' : '\u{23F3}'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--pd-text-primary)' }}>
                    {session.childName
                      ? `${session.childName}${session.ageGroup ? ` (${session.ageGroup})` : ''}`
                      : 'Waiting for your child to introduce themselves'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--pd-text-tertiary)' }}>
                    {hasChildData(session)
                      ? 'This page updates automatically as your child talks with Shelly.'
                      : 'Data will appear once your child has a conversation!'}
                  </div>
                </div>
              </div>
            </div>

            {/* Preference change strip */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PREFERENCE_CARDS.map((card) => {
                const isActive = preference === card.value;
                return (
                  <button
                    key={card.value}
                    type="button"
                    onClick={() => setPreference(card.value)}
                    style={{
                      appearance: 'none',
                      cursor: 'pointer',
                      borderRadius: 999,
                      padding: '7px 14px',
                      border: isActive ? '1.5px solid var(--pd-accent)' : '1px solid var(--pd-card-border)',
                      background: isActive ? 'var(--pd-accent-soft)' : 'transparent',
                      color: isActive ? 'var(--pd-accent)' : 'var(--pd-text-secondary)',
                      fontWeight: 600,
                      fontSize: 13,
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span style={{ fontSize: 15 }}>{card.emoji}</span> {card.title}
                  </button>
                );
              })}
            </div>

            {/* Primary content */}
            {preference === 'books' && <BookDetailView session={session} />}
            {preference === 'movies' && <MovieDetailView session={session} />}
            {preference === 'garden' && <GardenDetailView session={session} />}
            {preference === 'dinner' && <DinnerDetailView session={session} />}

            {/* Mission progress */}
            <MissionProgress session={session} />

            {/* Summary (when there is data) */}
            {hasChildData(session) && (
              <div className="pd-card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--pd-text-primary)', marginBottom: 6 }}>
                  Which one would you want most based on {childLabel.toLowerCase() === 'your child' ? 'your kid' : `${session.childName}`}{"'"}s conversation?
                </div>
                <div style={{ fontSize: 13, color: 'var(--pd-text-tertiary)', lineHeight: 1.5 }}>
                  Tap the cards above to explore all four features Shelly offers families.
                </div>
              </div>
            )}

            {/* Parent Feedback */}
            <ParentFeedback
              feedback={parentFeedback}
              setFeedback={setParentFeedback}
              wantsFullVersion={parentWantsFullVersion}
              setWantsFullVersion={setParentWantsFullVersion}
              saved={feedbackSaved}
              onSubmit={handleSubmitFeedback}
            />

            {/* Conversion CTA */}
            <ConversionCTA
              session={session}
              waitlistEmail={waitlistEmail}
              setWaitlistEmail={setWaitlistEmail}
              waitlistMessage={waitlistMessage}
              waitlistError={waitlistError}
              onJoin={handleJoinWaitlist}
            />
          </div>
        )}
      </main>

      {/* ---- QR Scanner Modal ---- */}
      {showScanner && <QrScannerModal onScan={handleQrScan} onClose={() => setShowScanner(false)} />}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.6); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
