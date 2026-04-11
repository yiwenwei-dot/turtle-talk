'use client';

import { useState } from 'react';
import { useMissions } from '@/app/hooks/useMissions';
import { useChildSession } from '@/app/hooks/useChildSession';
import MenuButton from '../components/MenuButton';
import MissionListCard from '../components/MissionListCard';
import MissionDetailModalV2 from '../components/MissionDetailModalV2';
import type { Mission } from '@/lib/speech/types';

function EmptyStateToday() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '32px 20px',
        color: 'var(--v2-text-secondary)',
        fontSize: '0.9375rem',
        lineHeight: 1.5,
      }}
    >
      No missions yet — talk to Tammy to get one!
    </div>
  );
}

function EmptyStateCompleted() {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '24px 20px',
        color: 'var(--v2-text-muted)',
        fontSize: '0.9rem',
        lineHeight: 1.5,
      }}
    >
      No completed missions yet.
    </div>
  );
}

export default function V2MissionsPage() {
  const { child } = useChildSession();
  const { activeMissions, completedMissions, completeMission } = useMissions(child?.childId);
  const [detailMission, setDetailMission] = useState<Mission | null>(null);

  const openDetail = (mission: Mission) => setDetailMission(mission);
  const closeDetail = () => setDetailMission(null);

  const handleDone = () => {
    if (detailMission?.status === 'active') {
      completeMission(detailMission.id);
      if (child?.childId) {
        fetch('/api/missions/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ missionId: detailMission.id }),
        }).catch((e) => console.error('[missions] complete API', e));
      }
    }
    closeDetail();
  };

  return (
    <>
      <MenuButton />

      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 'max(80px, env(safe-area-inset-top)) 24px max(120px, calc(24px + env(safe-area-inset-bottom)))',
          gap: 24,
          maxWidth: 500,
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--v2-text-primary)',
            textAlign: 'center',
          }}
        >
          Mission checking
        </h1>

        <section
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--v2-text-secondary)',
              letterSpacing: '0.02em',
            }}
          >
            Today&apos;s mission
          </h2>
          {activeMissions.length === 0 ? (
            <EmptyStateToday />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeMissions.map((mission) => (
                <MissionListCard
                  key={mission.id}
                  mission={mission}
                  completed={false}
                  onClick={() => openDetail(mission)}
                />
              ))}
            </div>
          )}
        </section>

        <section
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--v2-text-secondary)',
              letterSpacing: '0.02em',
            }}
          >
            Completed
          </h2>
          {completedMissions.length === 0 ? (
            <EmptyStateCompleted />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {completedMissions.map((mission) => (
                <MissionListCard
                  key={mission.id}
                  mission={mission}
                  completed
                  onClick={() => openDetail(mission)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {detailMission && (
        <MissionDetailModalV2
          mission={detailMission}
          onDone={handleDone}
          onDoItLater={closeDetail}
          onDismiss={closeDetail}
        />
      )}
    </>
  );
}
