import React from 'react';
import { petalNativeTheme as theme } from '@petal/ui/theme/native';
import { Button, Card } from '@petal/ui/components';
import { DoseBadge } from './DoseBadge.js';
import type { IntakeState } from '@petal/domain';

interface ProposalCardProps {
  doseId: string;
  tabletNumber: number;
  scheduledDate: string;
  beforeStatus: IntakeState | string;
  afterStatus: IntakeState;
  timePrecision: 'exact' | 'approximate' | 'unknown';
  proposalState?: 'pending' | 'confirmed' | 'cancelled';
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ProposalCard({
  tabletNumber,
  scheduledDate,
  beforeStatus,
  afterStatus,
  timePrecision,
  proposalState = 'pending',
  onConfirm,
  onCancel,
  busy = false,
}: ProposalCardProps) {
  const normBefore = (
    beforeStatus === 'taken' || beforeStatus === 'confirmed-missed' || beforeStatus === 'unsure'
      ? beforeStatus
      : 'no-entry'
  ) as IntakeState;

  return (
    <div
      style={{
        borderRadius: theme.primitive.radius.container,
        backgroundColor: '#FFF7FA',
        border: `1.5px solid ${theme.primitive.color.borderSubtle}`,
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 2px 8px rgba(184, 61, 112, 0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            color: theme.primitive.color.rose,
            fontFamily: theme.primitive.font.family,
          }}
        >
          Proposed History Update
        </span>
        <span
          style={{
            fontSize: 11,
            color: theme.primitive.color.mutedPlum,
            fontFamily: theme.primitive.font.family,
          }}
        >
          Tablet {tabletNumber}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 12,
          lineHeight: '17px',
          fontFamily: theme.primitive.font.family,
          color: theme.primitive.color.plum,
        }}
      >
        Confirming will update your dose history with an audit trail; cancelling changes nothing.
      </p>

      {/* Diff Table / Box */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: theme.primitive.radius.control,
          backgroundColor: '#FFFFFF',
          border: `1px solid ${theme.primitive.color.borderSubtle}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          fontSize: 12,
          fontFamily: theme.primitive.font.family,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: theme.primitive.color.mutedPlum }}>Scheduled:</span>
          <strong style={{ color: theme.primitive.color.plum }}>
            {scheduledDate}
          </strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: theme.primitive.color.mutedPlum }}>Before:</span>
          <DoseBadge status={normBefore} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: theme.primitive.color.mutedPlum }}>After:</span>
          <DoseBadge status={afterStatus} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: theme.primitive.color.mutedPlum }}>Precision:</span>
          <span style={{ color: theme.primitive.color.plum, fontStyle: 'italic', fontSize: 11 }}>
            {timePrecision === 'approximate' ? 'Approximate (memory)' : timePrecision}
          </span>
        </div>
      </div>

      {/* Status / Actions */}
      {proposalState === 'confirmed' ? (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: theme.primitive.radius.control,
            backgroundColor: theme.primitive.color.successSurface,
            border: `1px solid ${theme.primitive.color.success}`,
            fontSize: 12,
            fontFamily: theme.primitive.font.family,
            fontWeight: 600,
            color: theme.primitive.color.success,
            textAlign: 'center',
          }}
        >
          ✓ Applied to dose history · Audit entry saved
        </div>
      ) : proposalState === 'cancelled' ? (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: theme.primitive.radius.control,
            backgroundColor: theme.primitive.color.softWhite,
            border: `1px solid ${theme.primitive.color.borderSubtle}`,
            fontSize: 12,
            fontFamily: theme.primitive.font.family,
            color: theme.primitive.color.mutedPlum,
            textAlign: 'center',
          }}
        >
          ✕ Proposal cancelled · Records unchanged
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 8, marginTop: 2 }}>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            style={{
              padding: '10px 14px',
              borderRadius: theme.primitive.radius.control,
              backgroundColor: '#FFFFFF',
              border: `1px solid ${theme.primitive.color.borderControl}`,
              color: theme.primitive.color.plum,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: theme.primitive.font.family,
              cursor: busy ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            style={{
              padding: '10px 14px',
              borderRadius: theme.primitive.radius.control,
              backgroundColor: theme.primitive.color.rose,
              border: 'none',
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: theme.primitive.font.family,
              cursor: busy ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {busy ? 'Saving…' : 'Confirm & Save'}
          </button>
        </div>
      )}
    </div>
  );
}
