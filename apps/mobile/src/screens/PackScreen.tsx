import React, { useMemo, useState } from 'react';
import { petalNativeTheme as theme } from '@petal/ui/theme/native';
import { Button, Card, SelectionButton } from '@petal/ui/components';
import { Icon } from '@petal/ui/icons';
import { getIntakeState, localDateIn, selectTakenNowTarget, type ScheduledDose } from '@petal/domain';
import { BlisterTablet } from '../components/BlisterTablet.js';
import { DoseBadge } from '../components/DoseBadge.js';
import type { PetalMobileState, RecordIntakeInput } from '../types/state.js';

interface PackScreenProps {
  state: PetalMobileState;
  onRecordIntake: (input: RecordIntakeInput) => void;
}

export function PackScreen({ state, onRecordIntake }: PackScreenProps) {
  const [selectedDose, setSelectedDose] = useState<ScheduledDose | null>(null);

  const now = useMemo(() => new Date(), []);
  const todayTarget = useMemo(() => selectTakenNowTarget(state.doses, state.events, now), [state.doses, state.events, now]);
  const activeDose = selectedDose || todayTarget.dose || (state.doses[0] ?? null);

  const activeStatus = activeDose ? getIntakeState(activeDose.id, state.events) : 'no-entry';

  // Group 28 tablets into 4 weeks of 7 tablets
  const weeks = useMemo(() => {
    const rows: ScheduledDose[][] = [[], [], [], []];
    for (const dose of state.doses) {
      const weekIndex = Math.floor((dose.position - 1) / 7);
      if (weekIndex >= 0 && weekIndex < 4) {
        rows[weekIndex].push(dose);
      }
    }
    return rows;
  }, [state.doses]);

  // Statistics
  const takenCount = state.events.filter(e => e.status === 'taken').length;
  const missedCount = state.events.filter(e => e.status === 'confirmed-missed').length;
  const unsureCount = state.events.filter(e => e.status === 'unsure').length;

  function updateStatus(status: 'taken' | 'confirmed-missed' | 'unsure') {
    if (!activeDose) return;
    onRecordIntake({
      doseId: activeDose.id,
      status,
      actualAt: status === 'taken' ? new Date().toISOString() : null,
      timePrecision: status === 'taken' ? 'exact' : 'unknown',
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '16px 16px 16px',
        maxWidth: 520,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div>
        <span
          style={{
            fontSize: 12,
            fontFamily: theme.primitive.font.family,
            color: theme.primitive.color.mutedPlum,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Trust 28 Regimen
        </span>
        <h1
          style={{
            margin: '2px 0 0',
            fontSize: 22,
            fontWeight: 700,
            fontFamily: theme.primitive.font.family,
            color: theme.primitive.color.plum,
          }}
        >
          Blister Pack
        </h1>
      </div>

      {/* Pack Progress Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          borderRadius: theme.primitive.radius.control,
          backgroundColor: theme.primitive.color.softWhite,
          border: `1px solid ${theme.primitive.color.borderSubtle}`,
          fontSize: 12,
          fontFamily: theme.primitive.font.family,
        }}
      >
        <span style={{ color: theme.primitive.color.plum, fontWeight: 600 }}>
          {takenCount} of 28 tablets taken
        </span>
        <span style={{ color: theme.primitive.color.mutedPlum }}>
          {missedCount > 0 ? `${missedCount} missed · ` : ''}
          {unsureCount > 0 ? `${unsureCount} unsure` : 'Pack in progress'}
        </span>
      </div>

      {/* Authentic Blister Pack Card */}
      <Card title="Trust 28 Tablet Map">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            backgroundColor: '#FCF9FA',
            padding: 12,
            borderRadius: theme.primitive.radius.control,
            border: `1px solid ${theme.primitive.color.borderSubtle}`,
          }}
        >
          {weeks.map((weekDoses, idx) => {
            const isBrownWeek = idx === 3;
            const weekLabel = isBrownWeek ? 'Week 4: 7 Brown reminder tablets (Non-hormonal iron)' : `Week ${idx + 1}: 7 Active white tablets`;

            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: theme.primitive.font.family,
                    fontWeight: 600,
                    color: isBrownWeek ? '#8B6A56' : theme.primitive.color.rose,
                    textTransform: 'uppercase',
                    letterSpacing: 0.3,
                  }}
                >
                  {weekLabel}
                </span>

                {/* 7 tablets grid for this week */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: 4,
                    justifyItems: 'center',
                  }}
                >
                  {weekDoses.map(dose => {
                    const status = getIntakeState(dose.id, state.events);
                    const isToday = todayTarget.dose?.id === dose.id;
                    const isSelected = activeDose?.id === dose.id;

                    return (
                      <BlisterTablet
                        key={dose.id}
                        dose={dose}
                        status={status}
                        isToday={isToday}
                        isSelected={isSelected}
                        onSelect={setSelectedDose}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Selected Tablet Inspector Sheet */}
      {activeDose && (
        <Card title={`Tablet ${activeDose.position} Details`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: theme.primitive.font.family,
                    fontWeight: 600,
                    color: activeDose.position <= 21 ? theme.primitive.color.rose : '#8B6A56',
                    textTransform: 'uppercase',
                  }}
                >
                  {activeDose.position <= 21 ? 'Active hormonal tablet' : 'Brown non-hormonal tablet'}
                </span>
                <div
                  style={{
                    fontSize: 13,
                    fontFamily: theme.primitive.font.family,
                    color: theme.primitive.color.mutedPlum,
                    marginTop: 2,
                  }}
                >
                  Scheduled: {activeDose.localDate} at {state.settings.usualTime}
                </div>
              </div>
              <DoseBadge status={activeStatus} />
            </div>

            {/* Change Status Buttons for Selected Dose */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 6 }}>
              <SelectionButton
                label="Taken"
                selected={activeStatus === 'taken'}
                onPress={() => updateStatus('taken')}
              />
              <SelectionButton
                label="Missed"
                selected={activeStatus === 'confirmed-missed'}
                onPress={() => updateStatus('confirmed-missed')}
              />
              <SelectionButton
                label="Unsure"
                selected={activeStatus === 'unsure'}
                onPress={() => updateStatus('unsure')}
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
