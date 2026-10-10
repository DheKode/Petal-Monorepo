import React, { useState } from 'react';
import { petalNativeTheme as theme } from '@petal/ui/theme/native';
import { Button, Card, Feedback, SelectionButton, TextField } from '@petal/ui/components';
import { Icon } from '@petal/ui/icons';
import { localDateIn } from '@petal/domain';
import { PetalCircleIcon } from '../components/PetalBrand.js';
import welcomeImg from '../assets/character-welcome.png';
import type { SetupPayload } from '../types/state.js';

interface SetupScreenProps {
  onComplete: (payload: SetupPayload) => void;
  initialTimeZone?: string;
}

export function SetupScreen({ onComplete, initialTimeZone = 'Asia/Manila' }: SetupScreenProps) {
  const [mode, setMode] = useState<'first-pack' | 'current-pack'>('current-pack');
  const [usualTime, setUsualTime] = useState('21:00');
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [startDate, setStartDate] = useState(() => localDateIn(new Date(), initialTimeZone));
  const [currentPosition, setCurrentPosition] = useState('14');
  const [currentDate, setCurrentDate] = useState(() => localDateIn(new Date(), initialTimeZone));
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const pos = parseInt(currentPosition, 10);

    if (mode === 'current-pack') {
      if (isNaN(pos) || pos < 1 || pos > 28) {
        setError('Tablet position must be between 1 and 28.');
        return;
      }
    }

    if (!usualTime.match(/^([01]\d|2[0-3]):[0-5]\d$/)) {
      setError('Please enter usual time in 24-hour format (e.g. 21:00).');
      return;
    }

    onComplete({
      mode,
      usualTime,
      timeZone,
      startDate: mode === 'first-pack' ? startDate : undefined,
      currentPosition: mode === 'current-pack' ? pos : undefined,
      currentDate: mode === 'current-pack' ? currentDate : undefined,
      remindersEnabled,
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        padding: '20px 16px 40px',
        maxWidth: 520,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Welcome & Brand Header */}
      <div style={{ textAlign: 'center', padding: '12px 0 4px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img
          src={welcomeImg}
          alt="A gentle hello"
          style={{ width: 100, height: 100, objectFit: 'contain', marginBottom: 8 }}
        />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <PetalCircleIcon size={28} />
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              fontFamily: theme.primitive.font.family,
              color: theme.primitive.color.plum,
            }}
          >
            Welcome to Petal
          </h1>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: '20px',
            fontFamily: theme.primitive.font.family,
            color: theme.primitive.color.mutedPlum,
          }}
        >
          Your private, offline companion for the Trust 28 pill regimen.
        </p>
      </div>

      {/* Product Verification Card */}
      <Card title="Supported Regimen">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, fontFamily: theme.primitive.font.family }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: theme.primitive.color.success,
              }}
            />
            <strong style={{ color: theme.primitive.color.plum }}>Trust 28 (Verified leaflet specifications)</strong>
          </div>
          <p style={{ margin: 0, color: theme.primitive.color.mutedPlum }}>
            • 21 Active white tablets (Ethinylestradiol 30mcg / Levonorgestrel 125mcg)
            <br />• 7 Inactive brown non-hormonal reminder tablets (Ferrous Fumarate 75mg)
          </p>
        </div>
      </Card>

      {/* Pack Starting Point */}
      <Card title="Pack Setup">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 500, fontFamily: theme.primitive.font.family, color: theme.primitive.color.plum }}>
            Where are you in your current pack?
          </span>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <SelectionButton
              label="Starting Day 1 (First Pack)"
              selected={mode === 'first-pack'}
              onPress={() => setMode('first-pack')}
            />
            <SelectionButton
              label="Currently Mid-Pack"
              selected={mode === 'current-pack'}
              onPress={() => setMode('current-pack')}
            />
          </div>

          {mode === 'first-pack' ? (
            <TextField
              label="Pack Start Date (YYYY-MM-DD)"
              value={startDate}
              onValueChange={setStartDate}
              placeholder="2026-10-10"
              helperText="The date you took (or will take) Tablet 1."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <TextField
                label="Today's Tablet Number (1 to 28)"
                value={currentPosition}
                onValueChange={setCurrentPosition}
                placeholder="14"
                helperText="1–21 are white active tablets; 22–28 are brown reminder tablets."
              />
              <TextField
                label="Today's Date (YYYY-MM-DD)"
                value={currentDate}
                onValueChange={setCurrentDate}
                placeholder="2026-10-10"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Routine & Reminders */}
      <Card title="Intake Routine">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextField
            label="Usual Intake Time (24h HH:mm)"
            value={usualTime}
            onValueChange={setUsualTime}
            placeholder="21:00"
            helperText="Trust 28 is most effective when taken at the same time every day."
          />

          <TextField
            label="Time Zone (IANA)"
            value={timeZone}
            onValueChange={setTimeZone}
            placeholder="Asia/Manila"
            helperText="Schedules remain anchored to your selected time zone."
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
            <span style={{ fontSize: 13, fontFamily: theme.primitive.font.family, color: theme.primitive.color.plum }}>
              Discreet Daily Reminders
            </span>
            <SelectionButton
              label={remindersEnabled ? 'Enabled' : 'Disabled'}
              selected={remindersEnabled}
              onPress={() => setRemindersEnabled(prev => !prev)}
            />
          </div>
          <span style={{ fontSize: 11, color: theme.primitive.color.mutedPlum, fontFamily: theme.primitive.font.family }}>
            Notifications are discreet: "Petal reminder: Daily self-care check-in".
          </span>
        </div>
      </Card>

      {error && <Feedback kind="error" message={error} />}

      <Button
        label="Start Tracking"
        variant="primary"
        onPress={handleSubmit}
      />
    </div>
  );
}
