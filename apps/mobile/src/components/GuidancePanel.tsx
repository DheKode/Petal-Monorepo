import React, { useMemo } from 'react';
import { petalNativeTheme as theme } from '@petal/ui/theme/native';
import { Card } from '@petal/ui/components';
import { Icon } from '@petal/ui/icons';
import {
  evaluateGuidance,
  DomainValidationError,
  type Evidence,
  type GuidanceResult,
  type IntakeEvent,
  type IntakeState,
  type PillProfile,
  type ScheduledDose,
} from '@petal/domain';

interface GuidancePanelProps {
  profile?: PillProfile | null;
  doses: readonly ScheduledDose[];
  events: readonly IntakeEvent[];
  todayDose: ScheduledDose | null;
  todayStatus: IntakeState;
  unresolvedCount: number;
}

const FIELD_LABEL: Record<GuidanceResult['missingFacts'][number]['field'], string> = {
  'profile-verification': 'Product verification',
  'intake-status': 'Intake status',
  'intake-time': 'Intake time',
  other: 'Other',
};

const REASON_TEXT: Record<string, string> = {
  'Product-specific clinical rules are not implemented or approved in this contract stub.':
    'Product-specific rules have not been reviewed and approved yet.',
  'History remains unknown until the user confirms it.':
    'History stays unknown until you confirm it. It is not counted as missed.',
  'Time is approximate or unknown; do not invent an exact timestamp.':
    'The time is approximate or unknown, so no exact time is assumed.',
};

const FLAG_LABEL: Record<string, string> = {
  'clinical-guidance-unverified': 'Clinical guidance has not been verified for this product.',
};

const HEADLINE: Record<GuidanceResult['status'], string> = {
  unsupported:
    'No guidance is available yet. Product-specific rules have not been reviewed and approved, so Petal can only track your tablets.',
  incomplete: 'Guidance needs more information from you before it can be shown.',
  supported: 'Guidance for your recorded tablets',
};

export function GuidancePanel({
  profile,
  doses,
  events,
  todayDose,
  todayStatus,
  unresolvedCount,
}: GuidancePanelProps) {
  const guidance = useMemo(() => {
    if (!profile || doses.length === 0) return null;
    try {
      const result = evaluateGuidance({
        profile,
        doses: doses as ScheduledDose[],
        events: events as IntakeEvent[],
      });
      return {
        ok: true as const,
        status: result.status,
        headline: HEADLINE[result.status],
        rule: `${result.ruleId} v${result.ruleVersion}`,
        relevantEventCount: result.relevantEventIds.length,
        fixedActions: result.fixedActions,
        missing: result.missingFacts.map((fact, index) => {
          const dose = fact.doseId ? doses.find(d => d.id === fact.doseId) : undefined;
          return {
            key: `${fact.doseId ?? 'general'}:${fact.field}:${index}`,
            subject: dose ? `Tablet ${dose.position} (${dose.localDate})` : 'Whole pack',
            field: FIELD_LABEL[fact.field] ?? fact.field,
            reason: REASON_TEXT[fact.reason] ?? fact.reason,
          };
        }),
        flags: result.flags.map(f => FLAG_LABEL[f] ?? f),
      };
    } catch (err) {
      return {
        ok: false as const,
        status: 'error' as const,
        headline: 'Guidance could not be worked out from these records. Tracking still works.',
        rule: err instanceof DomainValidationError ? 'records failed validation' : 'unavailable',
        relevantEventCount: 0,
        fixedActions: [],
        missing: [],
        flags: [],
      };
    }
  }, [profile, doses, events]);

  if (!guidance) return null;

  const isSupported = guidance.status === 'supported';

  return (
    <Card title="Intake Guidance">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Top Header Row: Subtitle label on left, Mode badge on right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Icon
              name={isSupported ? 'check' : 'info'}
              size="small"
              color={isSupported ? theme.primitive.color.success : theme.primitive.color.rose}
              decorative
            />
            <span
              style={{
                fontSize: 12,
                fontFamily: theme.primitive.font.family,
                fontWeight: 600,
                color: isSupported ? theme.primitive.color.success : theme.primitive.color.rose,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                whiteSpace: 'nowrap',
              }}
            >
              {isSupported ? 'Verified Regimen' : 'Tracking Mode'}
            </span>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 9px',
              borderRadius: theme.primitive.radius.round,
              backgroundColor: isSupported ? 'rgba(46, 125, 50, 0.1)' : theme.primitive.color.blush,
              border: `1px solid ${isSupported ? theme.primitive.color.success : theme.primitive.color.borderSubtle}`,
              fontSize: 11.5,
              fontFamily: theme.primitive.font.family,
              fontWeight: 600,
              color: isSupported ? theme.primitive.color.success : theme.primitive.color.rose,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {isSupported ? 'Active' : 'Tracking Only'}
          </span>
        </div>

        {/* Narrative Guidance / Status Explanation */}
        <p
          style={{
            margin: 0,
            fontSize: 13,
            lineHeight: '20px',
            fontFamily: theme.primitive.font.family,
            color: theme.primitive.color.plum,
          }}
        >
          {isSupported
            ? guidance.headline
            : 'Petal is actively tracking your daily tablet intake. Automated clinical advice is paused until medical leaflet protocols are reviewed.'}
        </p>

        {/* Verbatim Fixed Actions from Rule Engine (if any) */}
        {guidance.fixedActions.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '10px 12px',
              backgroundColor: theme.primitive.color.softWhite,
              borderRadius: theme.primitive.radius.control,
              border: `1px solid ${theme.primitive.color.borderSubtle}`,
            }}
          >
            <strong
              style={{
                fontSize: 12,
                fontFamily: theme.primitive.font.family,
                color: theme.primitive.color.plum,
              }}
            >
              Clinical Instructions:
            </strong>
            {guidance.fixedActions.map(action => (
              <div
                key={action.id}
                style={{
                  fontSize: 13,
                  fontFamily: theme.primitive.font.family,
                  color: theme.primitive.color.plum,
                  paddingLeft: 8,
                  borderLeft: `2px solid ${theme.primitive.color.rose}`,
                  lineHeight: '18px',
                }}
              >
                {action.text}
              </div>
            ))}
          </div>
        )}

        {/* Footer Details: How this was worked out (F05/F06 native disclosure) */}
        <details
          style={{
            paddingTop: 8,
            borderTop: `1px solid ${theme.primitive.color.borderSubtle}`,
          }}
        >
          <summary
            style={{
              color: theme.primitive.color.rose,
              fontFamily: theme.primitive.font.family,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              userSelect: 'none',
              padding: '4px 0',
            }}
          >
            How this was worked out
          </summary>

          <div
            style={{
              marginTop: 8,
              padding: '10px 12px',
              borderRadius: theme.primitive.radius.control,
              backgroundColor: theme.primitive.color.softWhite,
              border: `1px solid ${theme.primitive.color.borderSubtle}`,
              fontSize: 11.5,
              fontFamily: theme.primitive.font.family,
              color: theme.primitive.color.plum,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: theme.primitive.color.mutedPlum }}>Rule Engine:</span>
              <code
                style={{
                  fontSize: 11,
                  backgroundColor: '#FFFFFF',
                  padding: '2px 6px',
                  borderRadius: 4,
                  border: `1px solid ${theme.primitive.color.borderSubtle}`,
                }}
              >
                {guidance.rule}
              </code>
            </div>

            <div>
              <span style={{ color: theme.primitive.color.mutedPlum }}>Evaluated Events: </span>
              <strong>{guidance.relevantEventCount} recorded events</strong>
            </div>

            {guidance.flags.map((flag, idx) => (
              <div key={idx} style={{ color: '#B45309' }}>
                ⚠️ {flag}
              </div>
            ))}

            {guidance.missing.length > 0 && (
              <div style={{ marginTop: 2 }}>
                <span
                  style={{
                    color: theme.primitive.color.mutedPlum,
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  Facts Required Before Approved Guidance:
                </span>
                <ul style={{ margin: '0 0 0 16px', padding: 0 }}>
                  {guidance.missing.slice(0, 4).map(m => (
                    <li key={m.key} style={{ marginBottom: 3 }}>
                      <strong>{m.subject}</strong> ({m.field}): {m.reason}
                    </li>
                  ))}
                  {guidance.missing.length > 4 && (
                    <li style={{ color: theme.primitive.color.mutedPlum }}>
                      …and {guidance.missing.length - 4} more history requirements
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </details>
      </div>
    </Card>
  );
}
