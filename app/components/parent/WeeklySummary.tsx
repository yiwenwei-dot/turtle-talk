'use client';

export interface SummaryArea {
  id: string;
  label: string;
  description: string;
  score: number;
  maxScore: number;
  icon: string;
  highlights: string[];
}

export interface WeeklySummaryData {
  childId: string;
  weekOf: string;
  areas: SummaryArea[];
}

interface Props {
  data: WeeklySummaryData;
}

function ScoreDots({ score, max }: { score: number; max: number }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: i < score ? 'var(--pd-accent)' : 'rgba(0, 0, 0, 0.12)',
          }}
        />
      ))}
    </div>
  );
}

export function WeeklySummary({ data }: Props) {
  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--pd-text-primary)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
        Weekly Summary
      </h2>
      <p style={{ fontSize: 15, color: 'var(--pd-text-secondary)', margin: '0 0 18px' }}>
        This week your explorer practised:
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
        {data.areas.map((area) => (
          <div
            key={area.id}
            className="pd-card-elevated"
            style={{
              borderRadius: 16,
              padding: '18px 18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{area.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--pd-text-primary)' }}>{area.label}</div>
                <ScoreDots score={area.score} max={area.maxScore} />
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--pd-text-secondary)', margin: '0 0 10px', lineHeight: 1.4 }}>
              {area.description}
            </p>
            {area.highlights.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {area.highlights.map((h, i) => (
                  <li key={i} style={{ fontSize: 13, color: 'var(--pd-text-primary)', marginBottom: 2 }}>
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
