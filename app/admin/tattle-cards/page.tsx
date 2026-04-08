'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminPageHeader } from '@/app/components/admin/AdminPageHeader';
import { checkResponseForInvalidSession } from '@/lib/auth-client';

interface TattleCardRow {
  id: string;
  emoji: string;
  title: string;
  description: string;
  skill: string | null;
  scenario: string | null;
  category: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface DisplaySettings {
  showSkill: boolean;
  showScenario: boolean;
  showCategory: boolean;
}

const EMPTY_CARD: Omit<TattleCardRow, 'id'> & { id: string } = {
  id: '',
  emoji: '',
  title: '',
  description: '',
  skill: '',
  scenario: '',
  category: '',
  isActive: true,
  sortOrder: 0,
};

export default function AdminTattleCardsPage() {
  const [cards, setCards] = useState<TattleCardRow[]>([]);
  const [settings, setSettings] = useState<DisplaySettings>({
    showSkill: false,
    showScenario: false,
    showCategory: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingCard, setEditingCard] = useState<TattleCardRow | null>(null);
  const [isNewCard, setIsNewCard] = useState(false);
  const [cardSaving, setCardSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [cardsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/tattle-cards?all=true', { credentials: 'include' }),
        fetch('/api/admin/tattle-cards/display-settings', {
          credentials: 'include',
        }),
      ]);
      if (await checkResponseForInvalidSession(cardsRes)) return;
      if (await checkResponseForInvalidSession(settingsRes)) return;
      if (!cardsRes.ok || !settingsRes.ok) {
        throw new Error('Failed to load');
      }

      const cardsData = await cardsRes.json();
      const settingsData = await settingsRes.json();

      if (Array.isArray(cardsData)) {
        setCards(cardsData);
      }
      if (settingsData && !settingsData.error) {
        setSettings(settingsData);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleSetting = async (
    key: keyof DisplaySettings,
    value: boolean,
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/tattle-cards/display-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updated),
      });
      if (await checkResponseForInvalidSession(res)) {
        setSettings(settings);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save settings');
        setSettings(settings);
      }
    } catch {
      setSettings(settings);
      setError('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleActive = async (card: TattleCardRow) => {
    const newActive = !card.isActive;
    setCards((prev) =>
      prev.map((c) => (c.id === card.id ? { ...c, isActive: newActive } : c)),
    );
    try {
      const res = await fetch('/api/admin/tattle-cards', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: card.id, isActive: newActive }),
      });
      if (await checkResponseForInvalidSession(res)) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === card.id ? { ...c, isActive: card.isActive } : c,
          ),
        );
        return;
      }
      if (!res.ok) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === card.id ? { ...c, isActive: card.isActive } : c,
          ),
        );
      }
    } catch {
      setCards((prev) =>
        prev.map((c) =>
          c.id === card.id ? { ...c, isActive: card.isActive } : c,
        ),
      );
    }
  };

  const handleSaveCard = async () => {
    if (!editingCard) return;
    setCardSaving(true);
    try {
      const method = isNewCard ? 'POST' : 'PATCH';
      const res = await fetch('/api/admin/tattle-cards', {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingCard),
      });
      if (await checkResponseForInvalidSession(res)) return;
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save card');
      } else {
        setEditingCard(null);
        setIsNewCard(false);
        await loadData();
      }
    } catch {
      setError('Failed to save card');
    } finally {
      setCardSaving(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm('Delete this card permanently?')) return;
    try {
      const res = await fetch(`/api/admin/tattle-cards?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (await checkResponseForInvalidSession(res)) return;
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to delete');
      } else {
        await loadData();
      }
    } catch {
      setError('Failed to delete card');
    }
  };

  const backLink = (
    <Link
      href="/admin"
      style={{
        fontSize: 13,
        color: 'var(--pd-accent)',
        textDecoration: 'none',
      }}
    >
      ← Admin
    </Link>
  );

  return (
    <>
      <AdminPageHeader
        title="Tattle Cards"
        parentHref="/admin"
        right={backLink}
      />

      <main
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '24px 20px 60px',
        }}
      >
        {error && (
          <div
            style={{
              padding: 16,
              marginBottom: 20,
              background: 'rgba(220,38,38,0.08)',
              border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: 12,
              color: 'var(--pd-error)',
              fontSize: 14,
            }}
          >
            {error}
            <button
              type="button"
              onClick={() => setError(null)}
              style={{
                marginLeft: 12,
                background: 'none',
                border: 'none',
                color: 'var(--pd-error)',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 12,
              }}
            >
              Dismiss
            </button>
          </div>
        )}

        {loading && (
          <div
            style={{
              padding: 32,
              color: 'var(--pd-text-tertiary)',
              fontSize: 14,
            }}
          >
            Loading…
          </div>
        )}

        {!loading && (
          <>
            {/* ---- Section A: Display Settings ---- */}
            <div
              className="pd-card-elevated"
              style={{
                padding: 24,
                borderRadius: 16,
                border: '1px solid var(--pd-card-border)',
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--pd-text-primary)',
                  }}
                >
                  Display Settings
                </h2>
                {savingSettings && (
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--pd-text-tertiary)',
                    }}
                  >
                    Saving…
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: '0 0 16px',
                  fontSize: 13,
                  color: 'var(--pd-text-tertiary)',
                  lineHeight: 1.5,
                }}
              >
                Control which optional fields appear on the child-facing tattle
                cards. Emoji, title, and description are always shown.
              </p>

              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <ToggleRow
                  label="Show skill label"
                  description='e.g. "Social Repair", "Growth Mindset"'
                  checked={settings.showSkill}
                  onChange={(v) => handleToggleSetting('showSkill', v)}
                />
                <ToggleRow
                  label="Show scenario text"
                  description="Contextual description below the card description"
                  checked={settings.showScenario}
                  onChange={(v) => handleToggleSetting('showScenario', v)}
                />
                <ToggleRow
                  label="Show category badge"
                  description='e.g. "social", "emotions", "self"'
                  checked={settings.showCategory}
                  onChange={(v) => handleToggleSetting('showCategory', v)}
                />
              </div>

              {/* Live preview */}
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: 'var(--pd-text-tertiary)',
                    marginBottom: 8,
                  }}
                >
                  Preview
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    padding: '14px 18px',
                    borderRadius: 18,
                    background:
                      'linear-gradient(145deg, rgba(60,80,180,0.9), rgba(150,110,255,0.9))',
                    minWidth: 120,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 22, lineHeight: 1 }}>🧑‍🤝‍🧑</div>
                  <div
                    style={{
                      fontWeight: 750,
                      fontSize: 13,
                      color: '#F5F7FF',
                    }}
                  >
                    Friend problem
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'rgba(230,235,255,0.92)',
                      lineHeight: 1.3,
                    }}
                  >
                    I had trouble with a friend
                  </div>
                  {settings.showSkill && (
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
                      Social Repair
                    </div>
                  )}
                  {settings.showScenario && (
                    <div
                      style={{
                        fontSize: 9,
                        color: 'rgba(220,225,255,0.7)',
                        fontStyle: 'italic',
                        lineHeight: 1.3,
                        marginTop: 1,
                      }}
                    >
                      Sometimes friends argue, misunderstand each other, or say
                      something that hurts feelings.
                    </div>
                  )}
                  {settings.showCategory && (
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
                      social
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ---- Section B: Card Management ---- */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--pd-text-primary)',
                }}
              >
                Cards ({cards.length})
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingCard({ ...EMPTY_CARD, sortOrder: cards.length });
                  setIsNewCard(true);
                }}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  background: 'var(--pd-accent)',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                + Add card
              </button>
            </div>

            <div
              className="pd-card-elevated"
              style={{
                overflow: 'hidden',
                border: '1px solid var(--pd-card-border)',
                borderRadius: 16,
              }}
            >
              {cards.length === 0 ? (
                <div
                  style={{
                    padding: 32,
                    textAlign: 'center',
                    color: 'var(--pd-text-tertiary)',
                    fontSize: 14,
                  }}
                >
                  No tattle cards found. Add one above or run the migration to
                  seed defaults.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      minWidth: 700,
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          borderBottom: '1px solid var(--pd-card-border)',
                        }}
                      >
                        {[
                          '#',
                          'Emoji',
                          'Title',
                          'Description',
                          'Skill',
                          'Category',
                          'Active',
                          'Actions',
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: '10px 12px',
                              textAlign: 'left',
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              color: 'var(--pd-text-tertiary)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cards.map((card, i) => (
                        <tr
                          key={card.id}
                          style={{
                            borderBottom:
                              i < cards.length - 1
                                ? '1px solid var(--pd-card-border)'
                                : 'none',
                            opacity: card.isActive ? 1 : 0.5,
                          }}
                        >
                          <td style={tdStyle}>{card.sortOrder}</td>
                          <td style={{ ...tdStyle, fontSize: 20 }}>
                            {card.emoji}
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              fontWeight: 600,
                              color: 'var(--pd-text-primary)',
                            }}
                          >
                            {card.title}
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {card.description}
                          </td>
                          <td style={tdStyle}>{card.skill || '—'}</td>
                          <td style={tdStyle}>{card.category || '—'}</td>
                          <td style={tdStyle}>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(card)}
                              style={{
                                padding: '3px 10px',
                                fontSize: 11,
                                fontWeight: 600,
                                border: '1px solid var(--pd-card-border)',
                                borderRadius: 6,
                                cursor: 'pointer',
                                background: card.isActive
                                  ? 'rgba(22,163,74,0.12)'
                                  : 'rgba(220,38,38,0.08)',
                                color: card.isActive ? '#16a34a' : '#dc2626',
                              }}
                            >
                              {card.isActive ? 'Yes' : 'No'}
                            </button>
                          </td>
                          <td style={tdStyle}>
                            <div
                              style={{
                                display: 'flex',
                                gap: 6,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCard({ ...card });
                                  setIsNewCard(false);
                                }}
                                style={actionBtnStyle}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCard(card.id)}
                                style={{
                                  ...actionBtnStyle,
                                  color: '#dc2626',
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ---- Edit / New Card Modal ---- */}
        {editingCard && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: 20,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setEditingCard(null);
                setIsNewCard(false);
              }
            }}
          >
            <div
              style={{
                background: 'var(--pd-card, #1a1a2e)',
                border: '1px solid var(--pd-card-border)',
                borderRadius: 16,
                padding: 24,
                width: '100%',
                maxWidth: 520,
                maxHeight: '85vh',
                overflowY: 'auto',
              }}
            >
              <h3
                style={{
                  margin: '0 0 16px',
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--pd-text-primary)',
                }}
              >
                {isNewCard ? 'Add new card' : `Edit "${editingCard.title}"`}
              </h3>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {isNewCard && (
                  <FormField
                    label="ID (slug)"
                    value={editingCard.id}
                    onChange={(v) =>
                      setEditingCard({ ...editingCard, id: v })
                    }
                    placeholder="e.g. my-new-card"
                  />
                )}
                <FormField
                  label="Emoji"
                  value={editingCard.emoji}
                  onChange={(v) =>
                    setEditingCard({ ...editingCard, emoji: v })
                  }
                  placeholder="e.g. 🎉"
                />
                <FormField
                  label="Title"
                  value={editingCard.title}
                  onChange={(v) =>
                    setEditingCard({ ...editingCard, title: v })
                  }
                  placeholder="Card title"
                />
                <FormField
                  label="Description"
                  value={editingCard.description}
                  onChange={(v) =>
                    setEditingCard({ ...editingCard, description: v })
                  }
                  placeholder="Short description shown on card"
                />
                <FormField
                  label="Skill"
                  value={editingCard.skill || ''}
                  onChange={(v) =>
                    setEditingCard({ ...editingCard, skill: v || null })
                  }
                  placeholder="e.g. Social Repair"
                />
                <FormField
                  label="Scenario"
                  value={editingCard.scenario || ''}
                  onChange={(v) =>
                    setEditingCard({ ...editingCard, scenario: v || null })
                  }
                  placeholder="Scenario context"
                  multiline
                />
                <FormField
                  label="Category"
                  value={editingCard.category || ''}
                  onChange={(v) =>
                    setEditingCard({ ...editingCard, category: v || null })
                  }
                  placeholder="e.g. social, emotions, self"
                />
                <FormField
                  label="Sort order"
                  value={String(editingCard.sortOrder)}
                  onChange={(v) =>
                    setEditingCard({
                      ...editingCard,
                      sortOrder: parseInt(v, 10) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  marginTop: 20,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setEditingCard(null);
                    setIsNewCard(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    border: '1px solid var(--pd-card-border)',
                    borderRadius: 8,
                    background: 'transparent',
                    color: 'var(--pd-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCard}
                  disabled={
                    cardSaving ||
                    !editingCard.id ||
                    !editingCard.emoji ||
                    !editingCard.title
                  }
                  style={{
                    padding: '8px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 8,
                    background: 'var(--pd-accent)',
                    color: '#fff',
                    cursor: cardSaving ? 'wait' : 'pointer',
                    opacity:
                      cardSaving ||
                      !editingCard.id ||
                      !editingCard.emoji ||
                      !editingCard.title
                        ? 0.5
                        : 1,
                  }}
                >
                  {cardSaving
                    ? 'Saving…'
                    : isNewCard
                      ? 'Create'
                      : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

/* ---- Shared styles & small components ---- */

const tdStyle: React.CSSProperties = {
  padding: '12px 12px',
  fontSize: 13,
  color: 'var(--pd-text-secondary)',
  whiteSpace: 'nowrap',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '3px 10px',
  fontSize: 11,
  fontWeight: 600,
  border: '1px solid var(--pd-card-border)',
  borderRadius: 6,
  background: 'transparent',
  color: 'var(--pd-accent)',
  cursor: 'pointer',
};

function ToggleRow(props: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
      }}
    >
      <div
        onClick={(e) => {
          e.preventDefault();
          props.onChange(!props.checked);
        }}
        style={{
          width: 40,
          height: 22,
          borderRadius: 11,
          background: props.checked
            ? 'var(--pd-accent, #6366f1)'
            : 'rgba(128,128,128,0.3)',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: 2,
            left: props.checked ? 20 : 2,
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </div>
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--pd-text-primary)',
          }}
        >
          {props.label}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--pd-text-tertiary)',
            marginTop: 1,
          }}
        >
          {props.description}
        </div>
      </div>
    </label>
  );
}

function FormField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const shared: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    fontSize: 13,
    border: '1px solid var(--pd-card-border)',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.04)',
    color: 'var(--pd-text-primary)',
    outline: 'none',
  };

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--pd-text-tertiary)',
          marginBottom: 4,
        }}
      >
        {props.label}
      </div>
      {props.multiline ? (
        <textarea
          rows={3}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          style={{ ...shared, resize: 'vertical' }}
        />
      ) : (
        <input
          type="text"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          style={shared}
        />
      )}
    </div>
  );
}
