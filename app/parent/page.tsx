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
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <p style={{ color: '#6b7280' }}>Loading…</p>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: '#f9fafb',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ParentHeader
          children={[]}
          activeChild={null}
          onSelectChild={() => {}}
          onChildrenChange={fetchChildren}
          childrenModalOpen={childrenModalOpen}
          onOpenChildrenModal={() => setChildrenModalOpen(true)}
          onCloseChildrenModal={() => setChildrenModalOpen(false)}
        />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            Add your first child
          </h1>
          <p style={{ color: '#6b7280', marginBottom: 24, textAlign: 'center' }}>
            Create a profile so they can log in and use TurtleTalk.
          </p>
          <button
            onClick={() => setChildrenModalOpen(true)}
            style={{
              padding: '14px 24px',
              borderRadius: 12,
              border: 'none',
              background: '#0f766e',
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Add child
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#f9fafb',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
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
        <main
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '32px 20px 60px',
            display: 'flex',
            flexDirection: 'column',
            gap: 48,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 44 }}>{activeChild.avatar}</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>
                {activeChild.name}&apos;s Progress
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>
                {activeChild.completedMissions} missions completed
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <label htmlFor="week-picker" style={{ fontSize: 14, color: '#6b7280' }}>
                Week:
              </label>
              <select
                id="week-picker"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                  background: '#fff',
                }}
              >
                {getWeekOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {weeklyReportLoading && <p style={{ color: '#6b7280', fontSize: 14 }}>Loading…</p>}
            {!weeklyReportLoading && weeklySummary && <WeeklySummary data={weeklySummary} />}
            {!weeklyReportLoading && !weeklySummary && (
              <p style={{ color: '#6b7280', fontSize: 14 }}>
                No summary for this week yet. Completed missions will appear here.
              </p>
            )}
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

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
              Wish list
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 12px' }}>
              Items for {activeChild.name} (e.g. for Christmas). They see these on their tree page; a full tree unlocks one wish.
            </p>
            {wishListError && (
              <p style={{ fontSize: 14, color: '#dc2626', margin: '0 0 8px' }}>{wishListError}</p>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input
                type="text"
                placeholder="e.g. LEGO set"
                value={newWishLabel}
                onChange={(e) => { setNewWishLabel(e.target.value); setWishListError(null); }}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
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
                  borderRadius: 8,
                  border: 'none',
                  background: '#0f766e',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Add
              </button>
            </div>
            {wishListLoading ? (
              <p style={{ color: '#6b7280', fontSize: 14 }}>Loading wish list…</p>
            ) : wishListItems.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 14 }}>No items yet. Add one above.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {wishListItems.map((item) => (
                  <li
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: item.unlocked_at ? '#dcfce7' : '#f9fafb',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <span style={{ fontSize: 14, color: '#111827' }}>
                      {item.unlocked_at ? '🎉 ' : ''}{item.label}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteWishItem(item.id);
                        } catch (e) {
                          setWishListError(e instanceof Error ? e.message : 'Failed to delete');
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        fontSize: 12,
                        color: '#6b7280',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
              Send a cheer
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 12px' }}>
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
                    border: '2px solid #e5e7eb',
                    background: '#fff',
                    fontSize: 24,
                    cursor: encouragementSending ? 'wait' : 'pointer',
                  }}
                  aria-label={`Send ${emoji} to ${activeChild.name}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
              Recommended Books
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px' }}>
              Based on what {activeChild.name} practised
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {displayBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        </main>
      )}
    </div>
  );
}
