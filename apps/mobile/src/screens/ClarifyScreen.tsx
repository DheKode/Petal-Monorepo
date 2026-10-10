import React, { useEffect, useMemo, useRef, useState } from 'react';
import { petalNativeTheme as theme } from '@petal/ui/theme/native';
import { Feedback } from '@petal/ui/components';
import { listUnresolvedDoses } from '@petal/domain';
import { companionAi } from '../services/ai.js';
import { ProposalCard } from '../components/ProposalCard.js';
import { PetalCircleIcon } from '../components/PetalBrand.js';
import companionHelloImg from '../assets/companion-hello.png';
import type { ChatMessage, PetalMobileState, RecordIntakeInput } from '../types/state.js';

interface ClarifyScreenProps {
  state: PetalMobileState;
  onRecordIntake: (input: RecordIntakeInput) => void;
}

// Module-level cache so switching tabs or remounting preserves user chat history
let cachedClarifyMessages: ChatMessage[] | null = null;

export function ClarifyScreen({ state, onRecordIntake }: ClarifyScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => cachedClarifyMessages ?? []);
  const [inputText, setInputText] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'warning' | 'error'; text: string } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync cache whenever messages change
  const updateMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessages(prev => {
      const next = updater(prev);
      cachedClarifyMessages = next;
      return next;
    });
  };

  // Initialize companion conversation on load if no cached messages
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (cachedClarifyMessages && cachedClarifyMessages.length > 0) {
        return;
      }
      setBusy(true);
      const greeting = await companionAi.clarifyHistory(state);
      if (!cancelled) {
        updateMessages(() => [greeting]);
        setBusy(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages.length]);

  const unresolved = useMemo(() => {
    return listUnresolvedDoses(state.doses, state.events, new Date());
  }, [state.doses, state.events]);

  const nextTarget = unresolved.length > 0 ? unresolved[unresolved.length - 1] : null;

  async function handleReset() {
    setFeedback(null);
    setBusy(true);
    cachedClarifyMessages = null;
    const greeting = await companionAi.clarifyHistory(state);
    updateMessages(() => [greeting]);
    setBusy(false);
  }

  async function handleSend(textToSend?: string) {
    const text = textToSend ?? inputText.trim();
    if (!text || busy) return;

    setFeedback(null);
    setInputText('');

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    updateMessages(prev => [...prev, userMsg]);
    setBusy(true);

    try {
      // Check if it's an FAQ question
      const q = text.toLowerCase();
      let reply: ChatMessage;

      if (
        q.includes('what') ||
        q.includes('how') ||
        q.includes('faq') ||
        q.includes('brown') ||
        q.includes('miss') ||
        q.includes('two') ||
        q.includes('regimen') ||
        q.includes('order') ||
        q.includes('take')
      ) {
        // If there's an unresolved dose and user confirms intake
        if (
          unresolved.length > 0 &&
          (q.includes('took') || q.includes('on time') || q.includes('missed it'))
        ) {
          reply = await companionAi.clarifyHistory(state, text);
        } else if (
          q.includes('what') ||
          q.includes('how') ||
          q.includes('brown') ||
          q.includes('iron') ||
          q.includes('inactive') ||
          q.includes('two')
        ) {
          reply = await companionAi.answerFaq(text);
        } else {
          reply = await companionAi.clarifyHistory(state, text);
        }
      } else {
        reply = await companionAi.clarifyHistory(state, text);
      }

      updateMessages(prev => [...prev, reply]);
    } catch {
      setFeedback({ kind: 'error', text: 'Could not process message. Using offline fallback.' });
    } finally {
      setBusy(false);
    }
  }

  function handleConfirmProposal(msgId: string, proposal: NonNullable<ChatMessage['proposal']>) {
    setBusy(true);
    onRecordIntake({
      doseId: proposal.doseId,
      status: proposal.afterStatus,
      actualAt: proposal.actualAt,
      timePrecision: proposal.timePrecision,
      origin: 'chat',
    });

    // Mark proposal card as confirmed and add confirmation message
    updateMessages(prev =>
      prev
        .map(m =>
          m.id === msgId && m.proposal
            ? { ...m, proposal: { ...m.proposal, status: 'confirmed' as const } }
            : m,
        )
        .concat({
          id: `sys-${Date.now()}`,
          sender: 'petal',
          text: `Confirmed! Tablet ${proposal.tabletNumber} is now recorded as ${proposal.afterStatus}. Your history has been safely updated with an audit log.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }),
    );

    setFeedback({
      kind: 'success',
      text: `Updated Tablet ${proposal.tabletNumber} as ${proposal.afterStatus}.`,
    });
    setBusy(false);
  }

  function handleCancelProposal(msgId: string) {
    updateMessages(prev =>
      prev
        .map(m =>
          m.id === msgId && m.proposal
            ? { ...m, proposal: { ...m.proposal, status: 'cancelled' as const } }
            : m,
        )
        .concat({
          id: `sys-${Date.now()}`,
          sender: 'petal',
          text: 'Proposal cancelled. Your records remain completely unchanged.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }),
    );
  }

  const hasPendingProposal = useMemo(() => {
    return messages.some(m => m.proposal && m.proposal.status === 'pending');
  }, [messages]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flex: 1,
        minHeight: 0,
        maxWidth: 520,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Sleek Companion Header */}
      <div
        style={{
          flexShrink: 0,
          padding: '8px 16px',
          borderBottom: `1px solid ${theme.primitive.color.borderSubtle}`,
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              backgroundColor: theme.primitive.color.blush,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: `1px solid ${theme.primitive.color.borderSubtle}`,
            }}
          >
            <img
              src={companionHelloImg}
              alt="Petal Companion"
              style={{ width: 26, height: 26, objectFit: 'contain' }}
            />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: theme.primitive.font.family,
                  color: theme.primitive.color.plum,
                  whiteSpace: 'nowrap',
                }}
              >
                Petal Companion
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: theme.primitive.font.family,
                  color: theme.primitive.color.success,
                  backgroundColor: theme.primitive.color.successSurface,
                  padding: '1px 6px',
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: theme.primitive.color.success,
                  }}
                />
                Gemma 4 · Local AI
              </span>
            </div>
            <span
              style={{
                fontSize: 10.5,
                fontFamily: theme.primitive.font.family,
                color: theme.primitive.color.mutedPlum,
                display: 'block',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Private conversational history clarification
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={busy}
          style={{
            flexShrink: 0,
            padding: '4px 10px',
            borderRadius: theme.primitive.radius.round,
            backgroundColor: theme.primitive.color.softWhite,
            border: `1px solid ${theme.primitive.color.borderControl}`,
            color: theme.primitive.color.mutedPlum,
            cursor: busy ? 'default' : 'pointer',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: theme.primitive.font.family,
            minHeight: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          Reset
        </button>
      </div>

      {feedback && (
        <div style={{ flexShrink: 0, padding: '8px 16px 0' }}>
          <Feedback kind={feedback.kind} message={feedback.text} />
        </div>
      )}

      {/* Messages Stream */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '12px 14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          backgroundColor: '#FAF6F8',
        }}
      >
        {messages.map(msg => {
          const isPetal = msg.sender === 'petal';

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isPetal ? 'flex-start' : 'flex-end',
                maxWidth: msg.proposal ? '100%' : '88%',
                width: msg.proposal ? '100%' : undefined,
                alignSelf: isPetal ? 'flex-start' : 'flex-end',
              }}
            >
              {/* Petal Identity Avatar */}
              {isPetal && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 2 }}>
                  <PetalCircleIcon size={16} />
                  <span style={{ fontSize: 10.5, fontFamily: theme.primitive.font.family, color: theme.primitive.color.mutedPlum }}>
                    Petal · {msg.timestamp}
                  </span>
                </div>
              )}

              {/* Message Bubble */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: isPetal ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                  backgroundColor: isPetal ? '#FFFFFF' : theme.primitive.color.rose,
                  color: isPetal ? theme.primitive.color.plum : '#FFFFFF',
                  border: isPetal ? `1px solid ${theme.primitive.color.borderSubtle}` : 'none',
                  fontSize: 13,
                  lineHeight: '19px',
                  fontFamily: theme.primitive.font.family,
                  wordBreak: 'break-word',
                  boxShadow: isPetal
                    ? '0 1px 3px rgba(51, 37, 45, 0.04)'
                    : '0 1px 4px rgba(184, 61, 112, 0.15)',
                  width: msg.proposal ? '100%' : undefined,
                  boxSizing: 'border-box',
                }}
              >
                {msg.text}

                {/* Sourced Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 10px',
                      borderRadius: theme.primitive.radius.control,
                      backgroundColor: '#FFF7FA',
                      border: `1px solid ${theme.primitive.color.borderSubtle}`,
                      fontSize: 11,
                      color: theme.primitive.color.mutedPlum,
                    }}
                  >
                    <strong style={{ display: 'block', color: theme.primitive.color.plum, marginBottom: 4 }}>
                      Verified Evidence (Trust 28):
                    </strong>
                    {msg.citations.map(c => (
                      <div key={c.id} style={{ marginTop: 4 }}>
                        <span style={{ fontWeight: 600, color: theme.primitive.color.rose }}>• {c.source}</span>: "{c.text}"
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timestamp for user message */}
              {!isPetal && (
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: theme.primitive.font.family,
                    color: theme.primitive.color.mutedPlum,
                    marginTop: 3,
                    paddingRight: 4,
                  }}
                >
                  {msg.timestamp}
                </span>
              )}

              {/* Mutation Proposal Card (F08) */}
              {msg.proposal && (
                <div style={{ marginTop: 8, width: '100%' }}>
                  <ProposalCard
                    doseId={msg.proposal.doseId}
                    tabletNumber={msg.proposal.tabletNumber}
                    scheduledDate={msg.proposal.scheduledDate}
                    beforeStatus={msg.proposal.beforeStatus}
                    afterStatus={msg.proposal.afterStatus}
                    timePrecision={msg.proposal.timePrecision}
                    proposalState={msg.proposal.status ?? 'pending'}
                    busy={busy}
                    onConfirm={() => handleConfirmProposal(msg.id, msg.proposal!)}
                    onCancel={() => handleCancelProposal(msg.id)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Suggested Quick Action Chips */}
      <div
        style={{
          flexShrink: 0,
          padding: '6px 12px',
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          whiteSpace: 'nowrap',
          borderTop: `1px solid ${theme.primitive.color.borderSubtle}`,
          backgroundColor: '#FCF9FA',
        }}
      >
        {nextTarget && !hasPendingProposal ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleSend(`I took Tablet ${nextTarget.position} on time`)}
              style={{
                padding: '5px 12px',
                borderRadius: theme.primitive.radius.round,
                backgroundColor: '#FFFFFF',
                border: `1px solid ${theme.primitive.color.borderControl}`,
                fontSize: 11.5,
                fontWeight: 600,
                fontFamily: theme.primitive.font.family,
                color: theme.primitive.color.plum,
                cursor: busy ? 'default' : 'pointer',
                flexShrink: 0,
              }}
            >
              I took Tablet {nextTarget.position} on time
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => handleSend(`I missed Tablet ${nextTarget.position}`)}
              style={{
                padding: '5px 12px',
                borderRadius: theme.primitive.radius.round,
                backgroundColor: '#FFFFFF',
                border: `1px solid ${theme.primitive.color.borderControl}`,
                fontSize: 11.5,
                fontWeight: 600,
                fontFamily: theme.primitive.font.family,
                color: theme.primitive.color.plum,
                cursor: busy ? 'default' : 'pointer',
                flexShrink: 0,
              }}
            >
              I missed Tablet {nextTarget.position}
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => handleSend(`I am not sure about Tablet ${nextTarget.position}`)}
              style={{
                padding: '5px 12px',
                borderRadius: theme.primitive.radius.round,
                backgroundColor: '#FFFFFF',
                border: `1px solid ${theme.primitive.color.borderControl}`,
                fontSize: 11.5,
                fontWeight: 600,
                fontFamily: theme.primitive.font.family,
                color: theme.primitive.color.plum,
                cursor: busy ? 'default' : 'pointer',
                flexShrink: 0,
              }}
            >
              Unsure about Tablet {nextTarget.position}
            </button>
          </>
        ) : null}

        <button
          type="button"
          disabled={busy}
          onClick={() => handleSend('What if I miss an active pill?')}
          style={{
            padding: '5px 12px',
            borderRadius: theme.primitive.radius.round,
            backgroundColor: '#FFFFFF',
            border: `1px solid ${theme.primitive.color.borderControl}`,
            fontSize: 11.5,
            fontWeight: 500,
            fontFamily: theme.primitive.font.family,
            color: theme.primitive.color.plum,
            cursor: busy ? 'default' : 'pointer',
            flexShrink: 0,
          }}
        >
          What if I miss a pill?
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => handleSend('What are the brown pills for?')}
          style={{
            padding: '5px 12px',
            borderRadius: theme.primitive.radius.round,
            backgroundColor: '#FFFFFF',
            border: `1px solid ${theme.primitive.color.borderControl}`,
            fontSize: 11.5,
            fontWeight: 500,
            fontFamily: theme.primitive.font.family,
            color: theme.primitive.color.plum,
            cursor: busy ? 'default' : 'pointer',
            flexShrink: 0,
          }}
        >
          What are brown pills?
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => handleSend('Can I take two pills on the same day?')}
          style={{
            padding: '5px 12px',
            borderRadius: theme.primitive.radius.round,
            backgroundColor: '#FFFFFF',
            border: `1px solid ${theme.primitive.color.borderControl}`,
            fontSize: 11.5,
            fontWeight: 500,
            fontFamily: theme.primitive.font.family,
            color: theme.primitive.color.plum,
            cursor: busy ? 'default' : 'pointer',
            flexShrink: 0,
          }}
        >
          Can I take 2 pills same day?
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => handleSend('What if I vomit after taking a pill?')}
          style={{
            padding: '5px 12px',
            borderRadius: theme.primitive.radius.round,
            backgroundColor: '#FFFFFF',
            border: `1px solid ${theme.primitive.color.borderControl}`,
            fontSize: 11.5,
            fontWeight: 500,
            fontFamily: theme.primitive.font.family,
            color: theme.primitive.color.plum,
            cursor: busy ? 'default' : 'pointer',
            flexShrink: 0,
          }}
        >
          Vomiting or stomach upset?
        </button>

        <div style={{ width: 8, flexShrink: 0 }} />
      </div>

      {/* Pill Chat Input Bar */}
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
        style={{
          flexShrink: 0,
          padding: '8px 12px 10px',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderTop: `1px solid ${theme.primitive.color.borderSubtle}`,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#FFF7FA',
            borderRadius: 22,
            border: `1px solid ${theme.primitive.color.borderControl}`,
            padding: '2px 4px 2px 14px',
            minHeight: 42,
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Ask Petal or clarify dose memory…"
            disabled={busy}
            style={{
              flex: 1,
              height: 38,
              border: 'none',
              backgroundColor: 'transparent',
              outline: 'none',
              fontSize: 13,
              fontFamily: theme.primitive.font.family,
              color: theme.primitive.color.plum,
            }}
          />

          <button
            type="submit"
            disabled={!inputText.trim() || busy}
            aria-label="Send message"
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: !inputText.trim() || busy ? '#F5E8EE' : theme.primitive.color.rose,
              color: !inputText.trim() || busy ? '#C0AAB6' : '#FFFFFF',
              border: 'none',
              cursor: !inputText.trim() || busy ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background-color 0.15s ease',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
