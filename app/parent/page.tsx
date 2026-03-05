'use client';

import { useState, useEffect, useCallback } from 'react';
import { ParentHeader } from '@/app/components/parent/ParentHeader';
import { WeeklySummary } from '@/app/components/parent/WeeklySummary';
import { DinnerQuestions } from '@/app/components/parent/DinnerQuestions';
import { BookCard } from '@/app/components/parent/BookCard';
import type { Child } from '@/app/components/parent/ChildSwitcher';
import type { WeeklySummaryData } from '@/app/components/parent/WeeklySummary';
import type { DinnerQuestion } from '@/app/components/parent/DinnerQuestions';
import type { Book } from '@/app/components/parent/BookCard';
import { getWeekStart } from '@/lib/reports/weekly';
import { useWishList } from '@/app/hooks/useWishList';
import { useWishListMutations } from '@/app/hooks/useWishListMutations';
import { useSendEncouragement } from '@/app/hooks/useSendEncouragement';

import booksData from '@/app/placeholders/books.json';

const books = booksData as Book[];

function getWeekOptions(): { value: string; label: string }[] {
  const options = [];
  const today = new Date();
  for (let i = 0; i < 4; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - 7 * i);
    const weekStart = getWeekStart(d);
    const label = i === 0 ? 'This week' : `Week of ${weekStart}`;
    options.push({ value: weekStart, label });
  }
  return options;
}

export default function ParentPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [activeChild, setActiveChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [weeklyReport, setWeeklyReport] = useState<WeeklySummaryData | null>(null);
  const [weeklyReportLoading, setWeeklyReportLoading] = useState(false);
  const [dinnerQuestions, setDinnerQuestions] = useState<DinnerQuestion[]>([]);
  const [dinnerQuestionsLoading, setDinnerQuestionsLoading] = useState(false);
  const [dinnerQuestionsGenerating, setDinnerQuestionsGenerating] = useState(false);
  const [childrenModalOpen, setChildrenModalOpen] = useState(false);
  const [newWishLabel, setNewWishLabel] = useState('');
  const [wishListError, setWishListError] = useState<string | null>(null);
  const [confirmWishId, setConfirmWishId] = useState<string | null>(null);
  const [encouragementSending, setEncouragementSending] = useState(false);

  const { items: wishListItems, isLoading: wishListLoading, refetch: refetchWishList } = useWishList(activeChild?.id ?? null);
  const { addItem: addWishItem, deleteItem: deleteWishItem } = useWishListMutations(activeChild?.id, refetchWishList);
  const { send: sendEncouragement } = useSendEncouragement(activeChild?.id);

  const fetchChildren = useCallback(async () => {
    try {
      const res = await fetch('/api/parent/children', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.children ?? []) as Child[];
      setChildren(list);
      setActiveChild((prev) => {
        if (list.length === 0) return null;
        if (prev && list.some((c) => c.id === prev.id)) return prev;
        return list[0] ?? null;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  useEffect(() => {
    if (!activeChild?.id) {
      setWeeklyReport(null);
      return;
    }
    setWeeklyReportLoading(true);
    fetch(
      `/api/parent/weekly-report?childId=${encodeURIComponent(activeChild.id)}&weekStart=${encodeURIComponent(weekStart)}`,
      { credentials: 'include' }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setWeeklyReport(data ?? null))
      .catch(() => setWeeklyReport(null))
      .finally(() => setWeeklyReportLoading(false));
  }, [activeChild?.id, weekStart]);

  const fetchDinnerQuestions = useCallback(async () => {
    if (!activeChild?.id) {
      setDinnerQuestions([]);
      return;
    }
    setDinnerQuestionsLoading(true);
    try {
      const res = await fetch(
        `/api/parent/dinner-questions?childId=${encodeURIComponent(activeChild.id)}`,
        { credentials: 'include' }
      );
      const data = res.ok ? await res.json() : null;
      setDinnerQuestions((data?.questions ?? []) as DinnerQuestion[]);
    } catch {
      setDinnerQuestions([]);
    } finally {
      setDinnerQuestionsLoading(false);
    }
  }, [activeChild?.id]);

  useEffect(() => {
    fetchDinnerQuestions();
  }, [fetchDinnerQuestions]);

  const weeklySummary = weeklyReport ?? undefined;
  const practicedAreaIds = weeklySummary?.areas?.map((a: { id: string }) => a.id) ?? [];

  async function handleMarkDinnerComplete(id: string) {
    const res = await fetch('/api/parent/dinner-questions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id }),
    });
    if (res.ok) await fetchDinnerQuestions();
  }

  async function handleGenerateDinnerQuestions() {
    if (!activeChild?.id) return;
    setDinnerQuestionsGenerating(true);
    try {
      const res = await fetch('/api/parent/dinner-questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ childId: activeChild.id }),
      });
      if (res.ok) await fetchDinnerQuestions();
    } finally {
      setDinnerQuestionsGenerating(false);
    }
  }
  const relevantBooks = books.filter((b) =>
    b.recommendedFor.some((r) => practicedAreaIds.includes(r))
  );
  const displayBooks = relevantBooks.length > 0 ? relevantBooks : books;

  if (loading) {
    return (
      <div className="parent-dashboard" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pd-bg-gradient)' }}>
        <p style={{ color: 'var(--pd-text-tertiary)', fontSize: 15 }}>Loading…</p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="parent-dashboard" style={{ minHeight: '100dvh', background: 'var(--pd-bg-gradient)', display: 'flex', flexDirection: 'column' }}>
        <ParentHeader
          children={[]}
          activeChild={null}
          onSelectChild={() => {}}
          onChildrenChange={fetchChildren}
          childrenModalOpen={childrenModalOpen}
          onOpenChildrenModal={() => setChildrenModalOpen(true)}
          onCloseChildrenModal={() => setChildrenModalOpen(false)}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="pd-card-elevated" style={{ padding: 32, borderRadius: 20, textAlign: 'center', maxWidth: 360 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--pd-text-primary)', marginBottom: 8 }}>
              Add your first child
            </h1>
            <p style={{ color: 'var(--pd-text-secondary)', marginBottom: 24, fontSize: 15 }}>
              Create a profile so they can log in and use TurtleTalk.
            </p>
            <button
              onClick={() => setChildrenModalOpen(true)}
              style={{
                padding: '14px 24px',
                borderRadius: 12,
                border: 'none',
                background: 'var(--pd-accent)',
                color: 'white',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Add child
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="parent-dashboard" style={{ minHeight: '100dvh', background: 'var(--pd-bg-gradient)' }}>
      <ParentHeader
        children={children}
        activeChild={activeChild}
        onSelectChild={setActiveChild}
        onChildrenChange={fetchChildren}
        childrenModalOpen={childrenModalOpen}
        onOpenChildrenModal={() => setChildrenModalOpen(true)}
        onCloseChildrenModal={() => setChildrenModalOpen(false)}
      />

      {activeChild && (
        <main style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 60px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Hero card: child + progress */}
          <div className="pd-card-elevated" style={{ padding: '24px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 48 }} aria-hidden>{activeChild.avatar}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--pd-text-primary)', letterSpacing: '-0.02em' }}>
                {activeChild.name}&apos;s Progress
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--pd-text-secondary)' }}>
                {activeChild.completedMissions} missions completed
              </p>
            </div>
          </div>

          {/* Week + Weekly summary card */}
          <div className="pd-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <label htmlFor="week-picker" style={{ fontSize: 13, fontWeight: 500, color: 'var(--pd-text-tertiary)' }}>
                Week
              </label>
              <select
                id="week-picker"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--pd-card-border)',
                  fontSize: 14,
                  background: 'var(--pd-input-bg)',
                  color: 'var(--pd-text-primary)',
                }}
              >
                {getWeekOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {weeklyReportLoading && <p style={{ color: 'var(--pd-text-tertiary)', fontSize: 15 }}>Loading…</p>}
            {!weeklyReportLoading && weeklySummary && <WeeklySummary data={weeklySummary} />}
            {!weeklyReportLoading && !weeklySummary && (
              <p style={{ color: 'var(--pd-text-secondary)', fontSize: 15 }}>
                No summary for this week yet. Completed missions will appear here.
              </p>
            )}
          </div>

          <div className="pd-card" style={{ padding: 24 }}>
            <DinnerQuestions
            questions={dinnerQuestions}
            loading={dinnerQuestionsLoading}
            onMarkComplete={handleMarkDinnerComplete}
            onGenerate={handleGenerateDinnerQuestions}
            generating={dinnerQuestionsGenerating}
          />
          {!weeklySummary && dinnerQuestions.length === 0 && !dinnerQuestionsLoading && (
            <p style={{ color: '#6b7280', fontSize: 14 }}>
              No summary or dinner questions yet. When {activeChild.name} completes missions and you have reports, they’ll appear here.
            </p>
          )}
          </div>

          <div className="pd-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--pd-text-primary)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              Wish list
            </h2>
            <p style={{ fontSize: 15, color: 'var(--pd-text-secondary)', margin: '0 0 14px' }}>
              Items for {activeChild.name} (e.g. for Christmas). They see these on their tree page; a full tree unlocks one wish.
            </p>
            {wishListError && (
              <p style={{ fontSize: 14, color: 'var(--pd-error)', margin: '0 0 8px' }}>{wishListError}</p>
            )}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <input
                type="text"
                placeholder="e.g. LEGO set"
                value={newWishLabel}
                onChange={(e) => { setNewWishLabel(e.target.value); setWishListError(null); }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--pd-card-border)',
                  fontSize: 15,
                  background: 'var(--pd-input-bg)',
                  color: 'var(--pd-text-primary)',
                }}
              />
              <button
                type="button"
                onClick={async () => {
                  const label = newWishLabel.trim();
                  if (!label) return;
                  setWishListError(null);
                  try {
                    await addWishItem(label);
                    setNewWishLabel('');
                  } catch (e) {
                    setWishListError(e instanceof Error ? e.message : 'Failed to add');
                  }
                }}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--pd-accent)',
                  color: 'white',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Add
              </button>
            </div>
            {wishListLoading ? (
              <p style={{ color: 'var(--pd-text-tertiary)', fontSize: 15 }}>Loading wish list…</p>
            ) : wishListItems.length === 0 ? (
              <p style={{ color: 'var(--pd-text-tertiary)', fontSize: 15 }}>No items yet. Add one above.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {wishListItems.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: item.unlocked_at ? 'var(--pd-success-soft)' : 'var(--pd-surface-soft)',
                      border: `1px solid ${item.unlocked_at ? 'var(--pd-success-border)' : 'var(--pd-card-border)'}`,
                    }}
                  >
                    <span style={{ fontSize: 15, color: 'var(--pd-text-primary)' }}>
                      {item.unlocked_at ? '🎉 ' : ''}{item.label}
                    </span>
                    {confirmWishId === item.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => setConfirmWishId(null)}
                          style={{
                            padding: '6px 8px', fontSize: 12,
                            border: '1px solid var(--pd-card-border)',
                            borderRadius: 8, background: 'var(--pd-surface-overlay)',
                            cursor: 'pointer', color: 'var(--pd-text-secondary)',
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setConfirmWishId(null);
                            setWishListError(null);
                            try { await deleteWishItem(item.id); }
                            catch (e) { setWishListError(e instanceof Error ? e.message : 'Failed to delete'); }
                          }}
                          style={{
                            padding: '6px 8px', fontSize: 12,
                            border: '1px solid rgba(220,38,38,0.3)',
                            borderRadius: 8, background: 'var(--pd-surface-overlay)',
                            color: 'var(--pd-error)', cursor: 'pointer',
                          }}
                        >
                          Sure?
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmWishId(item.id)}
                        style={{
                          padding: '6px 12px', borderRadius: 8,
                          border: '1px solid var(--pd-card-border)',
                          background: 'var(--pd-surface-overlay)',
                          fontSize: 13, color: 'var(--pd-text-secondary)', cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pd-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--pd-text-primary)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              Send a cheer
            </h2>
            <p style={{ fontSize: 15, color: 'var(--pd-text-secondary)', margin: '0 0 14px' }}>
              Send {activeChild.name} an emoji. They can use it to decorate their tree and grow it.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {['🌟', '💪', '❤️', '🎉', '⭐', '🌈', '🦸', '👏'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  disabled={encouragementSending}
                  onClick={async () => {
                    setEncouragementSending(true);
                    try {
                      await sendEncouragement(emoji);
                    } finally {
                      setEncouragementSending(false);
                    }
                  }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    border: '1px solid var(--pd-card-border)',
                    background: 'var(--pd-surface-soft)',
                    fontSize: 24,
                    cursor: encouragementSending ? 'wait' : 'pointer',
                    boxShadow: 'var(--pd-shadow-sm)',
                  }}
                  aria-label={`Send ${emoji} to ${activeChild.name}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="pd-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--pd-text-primary)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              Recommended Books
            </h2>
            <p style={{ fontSize: 15, color: 'var(--pd-text-secondary)', margin: '0 0 18px' }}>
              Based on what {activeChild.name} practised
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {displayBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
