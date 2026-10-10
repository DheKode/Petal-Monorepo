import React, { useState } from 'react';
import { petalNativeTheme as theme } from '@petal/ui/theme/native';
import { Button, Card, Feedback, SelectionButton, TextField } from '@petal/ui/components';
import { Icon } from '@petal/ui/icons';
import { localDateIn } from '@petal/domain';
import type { BleedingInput, PetalMobileState } from '../types/state.js';

import journalingImg from '../assets/character-journaling.png';

interface BleedingScreenProps {
  state: PetalMobileState;
  onAddBleeding: (input: BleedingInput) => void;
  onDeleteBleeding: (id: string) => void;
}

export function BleedingScreen({ state, onAddBleeding, onDeleteBleeding }: BleedingScreenProps) {
  const [date, setDate] = useState(() => localDateIn(new Date(), state.settings.timeZone));
  const [category, setCategory] = useState<'spotting' | 'bleeding'>('spotting');
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'heavy'>('light');
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Compute pack phase educational context (PRD F11 - leaflet information, not a medical prediction)
  const currentDoseIndex = state.events.length;
  const isBrownPhase = currentDoseIndex >= 21;
  const phaseTitle = isBrownPhase ? 'Inactive Phase (Brown Tablets 22–28)' : 'Active Hormone Phase (Tablets 1–21)';
  const phaseDescription = isBrownPhase
    ? 'Withdrawal bleeding typically occurs during the 7 brown non-hormonal reminder tablets as hormone levels drop.'
    : 'You are currently taking active hormonal tablets. Breakthrough bleeding or spotting is common, especially during the first few packs.';

  function handleSave() {
    setError(null);
    setSuccess(null);
    const todayStr = localDateIn(new Date(), state.settings.timeZone);
    if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      setError('Please enter a valid date in YYYY-MM-DD format.');
      return;
    }
    if (date > todayStr) {
      setError('Dates cannot be in the future.');
      return;
    }

    onAddBleeding({
      date,
      category,
      intensity,
      note: note.trim() || null,
    });
    setSuccess('Bleeding journal entry recorded.');
    setNote('');
    setTimeout(() => setSuccess(null), 3000);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
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
            Daily Tracking
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
            Bleeding Journal
          </h1>
        </div>
        <img
          src={journalingImg}
          alt="Room to write"
          style={{ width: 64, height: 64, objectFit: 'contain' }}
        />
      </div>

      {success && <Feedback kind="success" message={success} />}
      {error && <Feedback kind="error" message={error} />}

      {/* Log Bleeding / Spotting Card */}
      <Card title="Log Bleeding / Spotting">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextField
            label="Date (YYYY-MM-DD)"
            value={date}
            onValueChange={setDate}
            placeholder="2026-10-10"
          />

          <div>
            <span style={{ fontSize: 13, fontFamily: theme.primitive.font.family, color: theme.primitive.color.plum, fontWeight: 500, display: 'block', marginBottom: 8 }}>
              Type
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <SelectionButton
                label="Spotting"
                selected={category === 'spotting'}
                onPress={() => setCategory('spotting')}
              />
              <SelectionButton
                label="Bleeding"
                selected={category === 'bleeding'}
                onPress={() => setCategory('bleeding')}
              />
            </div>
          </div>

          <div>
            <span style={{ fontSize: 13, fontFamily: theme.primitive.font.family, color: theme.primitive.color.plum, fontWeight: 500, display: 'block', marginBottom: 8 }}>
              Intensity
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <SelectionButton
                label="Light"
                selected={intensity === 'light'}
                onPress={() => setIntensity('light')}
              />
              <SelectionButton
                label="Moderate"
                selected={intensity === 'moderate'}
                onPress={() => setIntensity('moderate')}
              />
              <SelectionButton
                label="Heavy"
                selected={intensity === 'heavy'}
                onPress={() => setIntensity('heavy')}
              />
            </div>
          </div>

          <TextField
            label="Optional Notes (Symptoms, cramps)"
            value={note}
            onValueChange={setNote}
            placeholder="e.g. Mild cramping, light brown spotting"
            multiline
          />

          <Button
            label="Save Journal Entry"
            variant="primary"
            onPress={handleSave}
          />
        </div>
      </Card>

      {/* Pack Phase Display (PRD F11) */}
      <Card title="Current Pack Phase">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <strong style={{ fontSize: 14, fontFamily: theme.primitive.font.family, color: theme.primitive.color.rose }}>
            {phaseTitle}
          </strong>
          <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', fontFamily: theme.primitive.font.family, color: theme.primitive.color.plum }}>
            {phaseDescription}
          </p>
          <div
            style={{
              marginTop: 6,
              padding: 8,
              borderRadius: theme.primitive.radius.small,
              backgroundColor: theme.primitive.color.softWhite,
              border: `1px solid ${theme.primitive.color.borderSubtle}`,
              fontSize: 11,
              fontFamily: theme.primitive.font.family,
              color: theme.primitive.color.mutedPlum,
            }}
          >
            <strong>Note:</strong> Pack-based phase only. Petal never provides personalized fertility windows, ovulation predictions, or diagnoses.
          </div>
        </div>
      </Card>

      {/* History Timeline */}
      <Card title="Recorded Bleeding History">
        {state.bleeding.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, fontFamily: theme.primitive.font.family, color: theme.primitive.color.mutedPlum }}>
            No bleeding or spotting entries recorded yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {state.bleeding.map(entry => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: theme.primitive.radius.control,
                  backgroundColor: theme.primitive.color.softWhite,
                  border: `1px solid ${theme.primitive.color.borderSubtle}`,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: 13, fontFamily: theme.primitive.font.family, color: theme.primitive.color.plum }}>
                      {entry.startDate}
                    </strong>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: theme.primitive.radius.round,
                        backgroundColor: theme.primitive.color.blush,
                        color: theme.primitive.color.rose,
                        fontSize: 11,
                        fontFamily: theme.primitive.font.family,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {entry.category} {entry.intensity ? `(${entry.intensity})` : ''}
                    </span>
                  </div>
                  {entry.note && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, fontFamily: theme.primitive.font.family, color: theme.primitive.color.mutedPlum }}>
                      {entry.note}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteBleeding(entry.id)}
                  aria-label="Delete entry"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: theme.primitive.color.mutedPlum,
                    cursor: 'pointer',
                    padding: 4,
                  }}
                >
                  <Icon name="delete" size="small" color={theme.primitive.color.mutedPlum} decorative />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
