import React, { useMemo, useState } from 'react';
import { petalNativeTheme as theme } from '@petal/ui/theme/native';
import { Button, Card, Feedback, SelectionButton, TextField } from '@petal/ui/components';
import { Icon } from '@petal/ui/icons';
import {
  getIntakeState,
  listUnresolvedDoses,
  localDateIn,
  selectTakenNowTarget,
  toZonedIso,
  utcOffsetMinutes,
  type ScheduledDose,
} from '@petal/domain';
import { DoseBadge } from '../components/DoseBadge.js';
import { GuidancePanel } from '../components/GuidancePanel.js';
import companionThinkingImg from '../assets/companion-thinking.png';
import type { PetalMobileState, RecordIntakeInput } from '../types/state.js';

interface TodayScreenProps {
  state: PetalMobileState;
  onRecordIntake: (input: RecordIntakeInput) => void;
  onUndo: (doseId: string) => void;
  onNavigateToClarify: () => void;
  notice?: { text: string; undoDoseId?: string } | null;
  error?: string | null;
}

export function TodayScreen({
  state,
  onRecordIntake,
  onUndo,
  onNavigateToClarify,
  notice,
  error,
}: TodayScreenProps) {
  const [earlierOpen, setEarlierOpen] = useState(false);
  const [earlierTime, setEarlierTime] = useState(() => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  });
  const [precision, setPrecision] = useState<'exact' | 'approximate'>('exact');

  const now = useMemo(() => new Date(), []);
  const todayDateStr = useMemo(() => localDateIn(now, state.settings.timeZone), [now, state.settings.timeZone]);

  // Target dose for taken now
  const target = useMemo(() => selectTakenNowTarget(state.doses, state.events, now), [state.doses, state.events, now]);
  const unresolved = useMemo(() => listUnresolvedDoses(state.doses, state.events, now), [state.doses, state.events, now]);

  // Primary active dose for today: prefer target dose (unresolved), or today's scheduled dose, or first dose
  const currentDose = useMemo(() => {
    if (!state.pack || state.doses.length === 0) return null;
    return target.dose ?? state.doses.find(d => d.localDate === todayDateStr) ?? state.doses[0] ?? null;
  }, [state.pack, state.doses, target.dose, todayDateStr]);

  const currentStatus = currentDose ? getIntakeState(currentDose.id, state.events) : 'no-entry';

  const isActiveTablet = currentDose ? currentDose.position <= 21 : true;
  const tabletTypeLabel = isActiveTablet ? 'Active hormonal tablet' : 'Brown non-hormonal tablet';

  // Format date display
  const dateFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(now);

  function handleTakenNow() {
    if (!currentDose) return;
    onRecordIntake({
      doseId: currentDose.id,
      status: 'taken',
      actualAt: new Date().toISOString(),
      timePrecision: 'exact',
    });
    setEarlierOpen(false);
  }

  function handleTakenEarlier() {
    if (!currentDose) return;
    const [hh, mm] = earlierTime.split(':').map(Number);
    const [y, mon, d] = currentDose.localDate.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, mon - 1, d, hh || 21, mm || 0, 0));
    const offsetMins = utcOffsetMinutes(dateObj, state.settings.timeZone);
    const exactInstant = new Date(dateObj.getTime() - offsetMins * 60_000);
    const actualAt = toZonedIso(exactInstant, state.settings.timeZone);

    onRecordIntake({
      doseId: currentDose.id,
      status: 'taken',
      actualAt,
      timePrecision: precision,
    });
    setEarlierOpen(false);
  }

  function handleMarkMissed() {
    if (!currentDose) return;
    onRecordIntake({
      doseId: currentDose.id,
      status: 'confirmed-missed',
      actualAt: null,
      timePrecision: 'unknown',
    });
    setEarlierOpen(false);
  }

  function handleMarkUnsure() {
    if (!currentDose) return;
    onRecordIntake({
      doseId: currentDose.id,
      status: 'unsure',
      actualAt: null,
      timePrecision: 'unknown',
    });
    setEarlierOpen(false);
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
      {/* Date & Subtitle */}
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
          {dateFormatted}
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
          Daily Companion
        </h1>
      </div>

      {/* Undo Notice Toast */}
      {notice && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: theme.primitive.radius.control,
            backgroundColor: theme.primitive.color.blush,
            border: `1px solid ${theme.primitive.color.borderSubtle}`,
            fontSize: 13,
            fontFamily: theme.primitive.font.family,
            color: theme.primitive.color.plum,
          }}
        >
          <span>{notice.text}</span>
          {notice.undoDoseId && (
            <button
              type="button"
              onClick={() => onUndo(notice.undoDoseId!)}
              style={{
                background: 'transparent',
                border: 'none',
                color: theme.primitive.color.rose,
                fontWeight: 700,
                fontSize: 13,
                fontFamily: theme.primitive.font.family,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      {error && <Feedback kind="error" message={error} />}

      {/* Unresolved earlier history warning notice */}
      {unresolved.length > 0 && unresolved[0].id !== currentDose?.id && (
        <div
          style={{
            padding: 12,
            borderRadius: theme.primitive.radius.control,
            backgroundColor: theme.primitive.color.warningSurface,
            border: `1px solid ${theme.primitive.color.warning}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="warning" size="small" color={theme.primitive.color.warning} decorative />
            <span
              style={{
                fontSize: 13,
                fontFamily: theme.primitive.font.family,
                color: theme.primitive.color.plum,
              }}
            >
              Tablet {unresolved[0].position} ({unresolved[0].localDate}) has no recorded entry.
            </span>
          </div>
          <button
            type="button"
            onClick={onNavigateToClarify}
            style={{
              background: 'transparent',
              border: 'none',
              color: theme.primitive.color.rose,
              fontFamily: theme.primitive.font.family,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Review &rarr;
          </button>
        </div>
      )}

      {/* Dominant Today's Dose Card */}
      {currentDose ? (
        <Card title={`Tablet ${currentDose.position}`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontFamily: theme.primitive.font.family,
                    fontWeight: 600,
                    color: isActiveTablet ? theme.primitive.color.rose : '#8B6A56',
                    textTransform: 'uppercase',
                  }}
                >
                  {tabletTypeLabel}
                </span>
                <div
                  style={{
                    fontSize: 14,
                    color: theme.primitive.color.mutedPlum,
                    fontFamily: theme.primitive.font.family,
                    marginTop: 2,
                  }}
                >
                  Scheduled: {state.settings.usualTime} ({state.settings.timeZone})
                </div>
              </div>
              <DoseBadge status={currentStatus} />
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6 }}>
              <Button
                label="Taken now"
                variant="primary"
                onPress={handleTakenNow}
              />

              <Button
                label={earlierOpen ? 'Close time picker' : 'Taken earlier'}
                variant="secondary"
                onPress={() => setEarlierOpen(prev => !prev)}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Button
                  label="Missed"
                  variant="secondary"
                  onPress={handleMarkMissed}
                />
                <Button
                  label="Unsure"
                  variant="secondary"
                  onPress={handleMarkUnsure}
                />
              </div>

              {/* Expandable Earlier Time Picker */}
              {earlierOpen && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: theme.primitive.radius.control,
                    backgroundColor: theme.primitive.color.softWhite,
                    border: `1px solid ${theme.primitive.color.borderSubtle}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <TextField
                    label="What time did you take it? (HH:mm)"
                    value={earlierTime}
                    onValueChange={setEarlierTime}
                    placeholder="21:00"
                  />

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontFamily: theme.primitive.font.family, color: theme.primitive.color.mutedPlum }}>
                      Precision:
                    </span>
                    <SelectionButton
                      label="Exact"
                      selected={precision === 'exact'}
                      onPress={() => setPrecision('exact')}
                    />
                    <SelectionButton
                      label="Approximate"
                      selected={precision === 'approximate'}
                      onPress={() => setPrecision('approximate')}
                    />
                  </div>

                  <Button
                    label="Save earlier intake"
                    variant="primary"
                    onPress={handleTakenEarlier}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card title="No Schedule Active">
          <p style={{ margin: 0, fontFamily: theme.primitive.font.family, color: theme.primitive.color.mutedPlum }}>
            No pack is currently active. Please set up your pack in Settings.
          </p>
        </Card>
      )}

      {/* Missed-Dose Guidance Panel */}
      <GuidancePanel
        profile={state.profile}
        doses={state.doses}
        events={state.events}
        todayDose={currentDose}
        todayStatus={currentStatus}
        unresolvedCount={unresolved.length}
      />

      {/* Companion Clarification Prompt Card */}
      <Card title="Ask Petal">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src={companionThinkingImg}
            alt="Petal Companion"
            style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <p
              style={{
                margin: '0 0 6px',
                fontSize: 13,
                fontFamily: theme.primitive.font.family,
                color: theme.primitive.color.plum,
                lineHeight: '18px',
              }}
            >
              Not sure about an earlier day or have questions about your pack?
            </p>
            <button
              type="button"
              onClick={onNavigateToClarify}
              style={{
                padding: 0,
                background: 'transparent',
                border: 'none',
                color: theme.primitive.color.rose,
                fontFamily: theme.primitive.font.family,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Clarify history with Petal &rarr;
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
