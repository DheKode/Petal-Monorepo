import { applyIntake, evaluateGuidance, localDateIn, IdSchema, type Evidence, type IntakeEvent, type ScheduledDose } from '@petal/domain';
import { buildContext, planResponse, promptContext, outputSchema, renderResponse, SYSTEM, type ResponsePlan } from '../../../../scripts/ai-evaluation/context.mjs';
import { parseRagCorpus, planRag, ragPrompt, renderRag, scopeReason } from '../../../../scripts/ai-evaluation/rag.mjs';
import corpusData from '../../../../scripts/ai-evaluation/rag/corpus.json';
import type { AiAnswer, AiCorrection, AiPreview, AiQuestion, AiSaved } from '../shared/ai';
import type { PetalState, Result } from '../shared/ipc';

/* Ask Petal (#9, A05-A11/W03). Personal facts always come from a fresh storage snapshot; the model may only choose among
   statements and evidence IDs supplied to it, and its output is validated before display. Chat never writes records:
   corrections go through an explicit preview that storage holds until the user confirms it. */

export interface AiStore {
  load(): Promise<PetalState>;
  previewChatCorrection(event: IntakeEvent): Promise<string>;
  confirmChatCorrection(token: string): Promise<PetalState>;
  cancelChatCorrection(token: string): void;
}

export interface AiGenerator {
  generate(question: string, system: string, schema: Record<string, unknown>, signal: AbortSignal): Promise<string>;
}

type Rendered = { text: string; mode: string; fallback: boolean; citations: Evidence[] };

const corpus = parseRagCorpus(JSON.stringify(corpusData));
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (message: string): Result<never> => ({ ok: false, message });

const KNOWN_FAILURES = /^(model-unavailable|generation-timeout|worker-exited|worker-(import|artifact|runtime|model|context|session|grammar|prompt))$/;
const URGENT_SCOPES = ['urgent-symptom', 'time-sensitive', 'instruction-override'];
const EDUCATIONAL = /what (?:does|is|are)|mean|difference|how (?:do|does|can)/i;
const PERSONAL_HINT = /my |did i|have i|yesterday|last night|friday|\d{4}-\d{2}-\d{2}/i;
const PERSONAL = /did i|have i|my (?:record|history|pill|tablet|dose)|record|history|yesterday|last night|friday|took|taken|fix|correct|log|cancel|confirm|save it|time.?zone|travel|tablet \d|pill \d|\d{4}-\d{2}-\d{2}/i;

/** Replace internal dose IDs with what the user sees on the pack. Statements already state the scheduled date after "dose <id>". */
function readableDoses(text: string, doses: ScheduledDose[]): string {
  for (const dose of [...doses].sort((a, b) => b.id.length - a.id.length)) {
    text = text
      .split(`Dose ${dose.id}`).join(`Tablet ${dose.position}`)
      .split(`dose ${dose.id}`).join(`tablet ${dose.position}`)
      .split(dose.id).join(`tablet ${dose.position} (${dose.localDate})`);
  }
  return text;
}

export class AiService {
  private active: AbortController | null = null;
  private pending: AiPreview | null = null;
  /** Bounded and transient: never persisted, never treated as a confirmed fact. */
  private turns: { role: string; text: string }[] = [];
  private changing = false;

  constructor(private store: AiStore, private generator: AiGenerator, private now = () => new Date()) {}

  cancel(): void {
    this.active?.abort();
  }

  async ask(input: AiQuestion): Promise<Result<AiAnswer>> {
    if (!input || typeof input.question !== 'string' || !input.question.trim() || input.question.length > 4000) return fail('Enter a question of at most 4000 characters.');
    if (this.active) return fail('Wait for the current answer or cancel it first.');
    const controller = new AbortController();
    this.active = controller;
    const started = performance.now();
    try {
      const state = await this.store.load();
      if (controller.signal.aborted) return fail('Cancelled. Your records were not changed.');
      if (input.discussedDoseId != null && (!IdSchema.safeParse(input.discussedDoseId).success || !state.doses.some(d => d.id === input.discussedDoseId))) return fail('Choose a tablet from the current pack.');
      const question = input.question.trim();
      const position = question.match(/\b(?:pill|tablet)\s+(\d{1,2})\b/i)?.[1];
      const positioned = position ? state.doses.find(d => d.position === Number(position)) : undefined;
      if (position && !positioned) return fail('No matching tablet is in the current pack.');
      if (positioned && input.discussedDoseId && positioned.id !== input.discussedDoseId) return fail('The selected tablet and the question refer to different tablets. Choose the intended tablet.');
      const discussedDoseId = input.discussedDoseId ?? positioned?.id ?? null;
      const baseline = JSON.stringify(state);

      const urgent = URGENT_SCOPES.includes(scopeReason(question) ?? '');
      const educational = EDUCATIONAL.test(question) && !PERSONAL_HINT.test(question);
      const personal = !urgent && !educational && PERSONAL.test(question);
      let plan: ResponsePlan;
      let system: string;
      let render: (raw: unknown) => Rendered;
      if (personal && state.profile && state.settings && state.pack) {
        const guidance = evaluateGuidance({ profile: state.profile, doses: state.doses, events: state.events });
        const context = buildContext({ ...state, packs: [state.pack], guidance }, question, {
          currentLocalDate: localDateIn(this.now(), state.settings.timeZone),
          session: { discussedDoseId, recentTurns: this.turns, pendingProposal: this.pending, actionResult: { status: 'no-action' } },
        });
        plan = planResponse(context);
        system = SYSTEM + '\nPETAL CONTEXT:\n' + promptContext(context, plan);
        render = raw => renderResponse(context, plan, raw);
      } else {
        // FAQ and safety routing: no personal records reach the model context.
        const ragPlan = planRag(question, corpus, { profileId: state.profile?.id ?? corpus.supportedProfileId });
        plan = ragPlan;
        system = SYSTEM + '\nPETAL CONTEXT:\n' + JSON.stringify(ragPrompt(ragPlan));
        render = raw => renderRag(ragPlan, raw);
      }

      let raw: unknown = null;
      let fallbackReason: string | null = null;
      try {
        raw = await this.generator.generate(question, system, outputSchema(plan), controller.signal);
      } catch (error) {
        fallbackReason = error instanceof Error && KNOWN_FAILURES.test(error.message) ? error.message : 'local-generation-failed';
      }
      if (controller.signal.aborted) return fail('Cancelled. Your records were not changed.');
      if (JSON.stringify(await this.store.load()) !== baseline) return fail('Your records changed while this answer was being prepared. Ask again to use the updated history.');

      const answer = render(raw);
      answer.text = readableDoses(answer.text, state.doses);
      this.turns = [...this.turns, { role: 'user', text: question.slice(0, 500) }, { role: 'assistant', text: answer.text.slice(0, 500) }].slice(-4);
      return ok({
        ...answer,
        fallbackReason: answer.fallback ? (fallbackReason ?? 'invalid-output') : null,
        recordsChanged: false,
        generationMs: Math.round(performance.now() - started),
      });
    } catch {
      return fail('This question could not be answered from the current records. Nothing was changed.');
    } finally {
      if (this.active === controller) this.active = null;
    }
  }

  async preview(input: AiCorrection): Promise<Result<AiPreview>> {
    if (this.changing) return fail('Wait for the current change to finish.');
    this.changing = true;
    try {
      if (!input || !IdSchema.safeParse(input.doseId).success || !['taken', 'confirmed-missed', 'unsure'].includes(input.status)) return fail('Choose a specific tablet and a supported record state.');
      if (input.timePrecision !== undefined && !['approximate', 'unknown'].includes(input.timePrecision)) return fail('Remembered times must remain approximate or unknown.');
      const state = await this.store.load();
      const dose = state.doses.find(d => d.id === input.doseId);
      if (!dose) return fail('That tablet is not in the current pack.');
      const before = state.events.find(e => e.doseId === dose.id) ?? null;
      const { event: after, change } = applyIntake(dose, before ?? undefined, {
        status: input.status,
        actualAt: input.actualAt ?? null,
        timePrecision: input.actualAt ? 'approximate' : 'unknown',
      }, this.now());
      if (change === 'unchanged') return fail('That entry already matches your records.');
      const token = await this.store.previewChatCorrection(after);
      if (this.pending) this.store.cancelChatCorrection(this.pending.token);
      this.pending = { token, doseId: dose.id, position: dose.position, date: dose.localDate, before, after };
      return ok(structuredClone(this.pending));
    } catch {
      return fail('This correction could not be previewed. Check the date, time and state. Nothing was changed.');
    } finally {
      this.changing = false;
    }
  }

  async confirm(token: string): Promise<Result<AiSaved>> {
    if (this.changing) return fail('Wait for the current change to finish.');
    if (typeof token !== 'string' || !this.pending || this.pending.token !== token) return fail('Review a new correction before confirming.');
    this.changing = true;
    const pending = this.pending;
    this.pending = null;
    try {
      const state = await this.store.confirmChatCorrection(token);
      this.turns = [];
      return ok({ state, doseId: pending.doseId });
    } catch {
      return fail('The preview expired or your records changed. Review a new correction; this preview was not saved.');
    } finally {
      this.changing = false;
    }
  }

  discard(token: string): Result<null> {
    if (this.changing) return fail('Wait for the current change to finish.');
    if (typeof token !== 'string' || !this.pending || this.pending.token !== token) return fail('That preview is no longer pending.');
    this.store.cancelChatCorrection(token);
    this.pending = null;
    this.turns = [];
    return ok(null);
  }

  close(): void {
    this.cancel();
    if (this.pending) this.store.cancelChatCorrection(this.pending.token);
    this.pending = null;
    this.turns = [];
  }
}
