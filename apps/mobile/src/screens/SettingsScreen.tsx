import React, { useState } from 'react';
import { petalNativeTheme as theme } from '@petal/ui/theme/native';
import { Button, Card, ConfirmDialog, Feedback, SelectionButton, TextField } from '@petal/ui/components';
import { Icon } from '@petal/ui/icons';
import type { PetalMobileState } from '../types/state.js';

interface SettingsScreenProps {
  state: PetalMobileState;
  onUpdateUsualTime: (time: string) => void;
  onToggleReminders: () => void;
  onExportBackup: () => string;
  onImportBackup: (jsonStr: string) => { ok: boolean; message?: string };
  onResetData: () => void;
  onRerunSetup: () => void;
}

export function SettingsScreen({
  state,
  onUpdateUsualTime,
  onToggleReminders,
  onExportBackup,
  onImportBackup,
  onResetData,
  onRerunSetup,
}: SettingsScreenProps) {
  const [time, setTime] = useState(state.settings.usualTime);
  const [backupJson, setBackupJson] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importText, setImportText] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  function handleSaveTime() {
    if (!time.match(/^([01]\d|2[0-3]):[0-5]\d$/)) {
      setFeedback({ kind: 'error', message: 'Time must be in 24h HH:mm format (e.g. 21:00).' });
      return;
    }
    onUpdateUsualTime(time);
    setFeedback({ kind: 'success', message: 'Usual intake time updated.' });
    setTimeout(() => setFeedback(null), 3000);
  }

  function handleExport() {
    const json = onExportBackup();
    setBackupJson(json);
    setShowExportModal(true);
  }

  function handleImportSubmit() {
    if (!importText.trim()) {
      setFeedback({ kind: 'error', message: 'Please paste backup JSON data.' });
      return;
    }
    const res = onImportBackup(importText);
    if (res.ok) {
      setShowImportModal(false);
      setImportText('');
      setFeedback({ kind: 'success', message: 'Backup successfully restored.' });
    } else {
      setFeedback({ kind: 'error', message: res.message || 'Invalid backup file.' });
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '16px 16px 20px',
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
          Preferences & Security
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
          Settings
        </h1>
      </div>

      {feedback && <Feedback kind={feedback.kind} message={feedback.message} />}

      {/* Routine & Reminder Settings */}
      <Card title="Daily Reminders">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextField
            label="Usual Intake Time (24h HH:mm)"
            value={time}
            onValueChange={setTime}
            placeholder="21:00"
            helperText="Changing your reminder time will never rewrite past historical records."
          />

          <Button
            label="Update Usual Time"
            variant="secondary"
            onPress={handleSaveTime}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
            <span style={{ fontSize: 13, fontFamily: theme.primitive.font.family, color: theme.primitive.color.plum }}>
              Discreet Notifications
            </span>
            <SelectionButton
              label={state.settings.notificationPreference === 'enabled' ? 'Enabled' : 'Disabled'}
              selected={state.settings.notificationPreference === 'enabled'}
              onPress={onToggleReminders}
            />
          </div>

          <div
            style={{
              padding: 10,
              borderRadius: theme.primitive.radius.control,
              backgroundColor: theme.primitive.color.softWhite,
              border: `1px solid ${theme.primitive.color.borderSubtle}`,
              fontSize: 12,
              fontFamily: theme.primitive.font.family,
              color: theme.primitive.color.mutedPlum,
            }}
          >
            <strong>Discreet reminder copy:</strong>
            <br />
            "Petal: Daily self-care check-in" (preserves privacy on lock screen).
          </div>
        </div>
      </Card>

      {/* Product & Regimen Details */}
      <Card title="Verified Product Details">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, fontFamily: theme.primitive.font.family }}>
          <div>
            <span style={{ color: theme.primitive.color.mutedPlum }}>Product: </span>
            <strong style={{ color: theme.primitive.color.plum }}>Trust 28 Oral Contraceptive</strong>
          </div>
          <div>
            <span style={{ color: theme.primitive.color.mutedPlum }}>Active Formulation: </span>
            <span style={{ color: theme.primitive.color.plum }}>
              21 tablets: Ethinylestradiol 30 mcg + Levonorgestrel 125 mcg
            </span>
          </div>
          <div>
            <span style={{ color: theme.primitive.color.mutedPlum }}>Non-hormonal Reminder: </span>
            <span style={{ color: theme.primitive.color.plum }}>
              7 brown tablets: Ferrous Fumarate 75 mg (iron)
            </span>
          </div>
          <div>
            <span style={{ color: theme.primitive.color.mutedPlum }}>Leaflet Specification: </span>
            <span style={{ color: theme.primitive.color.plum }}>2026.1-ph (Verified Leaflet)</span>
          </div>
        </div>
      </Card>

      {/* Local AI Engine (DEC3 / Gemma 4) */}
      <Card title="Local AI Model (Gemma 4)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, fontFamily: theme.primitive.font.family }}>
          <div>
            <span style={{ color: theme.primitive.color.mutedPlum }}>Configured Model: </span>
            <strong style={{ color: theme.primitive.color.plum }}>Gemma 4 1B IT (Q4_K_M)</strong>
          </div>
          <div>
            <span style={{ color: theme.primitive.color.mutedPlum }}>Quantization: </span>
            <span style={{ color: theme.primitive.color.plum }}>4-bit (Q4_K_M, 806 MB GGUF)</span>
          </div>
          <div>
            <span style={{ color: theme.primitive.color.mutedPlum }}>Artifact SHA-256: </span>
            <span style={{ color: theme.primitive.color.mutedPlum, fontSize: 11, wordBreak: 'break-all' }}>
              8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135
            </span>
          </div>
          <div>
            <span style={{ color: theme.primitive.color.mutedPlum }}>Runtime Engine: </span>
            <span style={{ color: theme.primitive.color.plum }}>llama.rn-android (Local On-Device)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.primitive.color.success }} />
            <span style={{ color: theme.primitive.color.plum, fontWeight: 600 }}>Active & Ready (100% Offline)</span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: theme.primitive.color.mutedPlum, lineHeight: '16px' }}>
            Gemma is provided under and subject to the Gemma Terms of Use (ai.google.dev/gemma/terms). Petal executes model weights locally on device without cloud telemetry.
          </p>
        </div>
      </Card>

      {/* Privacy & Storage Safeguards */}
      <Card title="Privacy & Data Storage">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, fontFamily: theme.primitive.font.family }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="check" size="small" color={theme.primitive.color.success} decorative />
            <span style={{ color: theme.primitive.color.plum }}>Local on-device SQLite storage only.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="check" size="small" color={theme.primitive.color.success} decorative />
            <span style={{ color: theme.primitive.color.plum }}>0 bytes uploaded. No cloud tracking or telemetry.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="check" size="small" color={theme.primitive.color.success} decorative />
            <span style={{ color: theme.primitive.color.plum }}>Local AI engine: Gemma 4 1B IT Q4_K_M (llama.rn).</span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: theme.primitive.color.mutedPlum, lineHeight: '16px' }}>
            <strong>Notice:</strong> Records are stored unencrypted in the application directory on this device. Anyone with full access to this device user profile can read the plaintext records.
          </p>
        </div>
      </Card>

      {/* Backup and Portability */}
      <Card title="Backup & Portability">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 13, fontFamily: theme.primitive.font.family, color: theme.primitive.color.mutedPlum }}>
            Export your entire dose history, bleeding journal, settings, and audit log as a versioned JSON backup.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Button
              label="Export Backup"
              variant="secondary"
              onPress={handleExport}
            />
            <Button
              label="Import Backup"
              variant="secondary"
              onPress={() => setShowImportModal(true)}
            />
          </div>
        </div>
      </Card>

      {/* Pack Actions */}
      <Card title="Pack Management">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Button
            label="Re-run Setup Wizard"
            variant="secondary"
            onPress={onRerunSetup}
          />
          <Button
            label="Reset All Data"
            variant="danger"
            onPress={() => setShowResetConfirm(true)}
          />
        </div>
      </Card>

      {/* Footer Info */}
      <footer style={{ textAlign: 'center', paddingTop: 16 }}>
        <span style={{ fontSize: 11, fontFamily: theme.primitive.font.family, color: theme.primitive.color.mutedPlum }}>
          Petal v0.1.0 · Prototype · Educational Companion · Not a medical device
        </span>
      </footer>

      {/* Export Modal / Viewer */}
      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(51, 37, 45, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: theme.primitive.radius.container,
              padding: 20,
              maxWidth: 480,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontFamily: theme.primitive.font.family, color: theme.primitive.color.plum }}>
              Version-1 JSON Backup
            </h2>
            <textarea
              readOnly
              value={backupJson}
              style={{
                width: '100%',
                height: 200,
                fontSize: 11,
                fontFamily: theme.primitive.font.family,
                padding: 10,
                borderRadius: theme.primitive.radius.control,
                border: `1px solid ${theme.primitive.color.borderControl}`,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                label="Copy to Clipboard"
                variant="secondary"
                onPress={() => {
                  navigator.clipboard?.writeText(backupJson);
                  setFeedback({ kind: 'success', message: 'Backup JSON copied to clipboard.' });
                }}
              />
              <Button
                label="Close"
                variant="primary"
                onPress={() => setShowExportModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(51, 37, 45, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: theme.primitive.radius.container,
              padding: 20,
              maxWidth: 480,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18, fontFamily: theme.primitive.font.family, color: theme.primitive.color.plum }}>
              Import Backup
            </h2>
            <p style={{ margin: 0, fontSize: 12, fontFamily: theme.primitive.font.family, color: theme.primitive.color.mutedPlum }}>
              Paste your Petal JSON backup below. Importing replaces current records in a single validated transaction.
            </p>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder='Paste {"schemaVersion": 1, ...}'
              style={{
                width: '100%',
                height: 160,
                fontSize: 11,
                fontFamily: theme.primitive.font.family,
                padding: 10,
                borderRadius: theme.primitive.radius.control,
                border: `1px solid ${theme.primitive.color.borderControl}`,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => {
                  setShowImportModal(false);
                  setImportText('');
                }}
              />
              <Button
                label="Validate & Import"
                variant="primary"
                onPress={handleImportSubmit}
              />
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={showResetConfirm}
        title="Reset All Data?"
        description="This will clear your schedule, recorded pill doses, bleeding journal, and audit log. This action cannot be undone."
        confirmLabel="Reset Everything"
        cancelLabel="Cancel"
        onConfirm={() => {
          onResetData();
          setShowResetConfirm(false);
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
