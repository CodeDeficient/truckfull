'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  ClipboardCheck,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  XCircle,
} from 'lucide-react';
import { QUICK_CHECK_SECTIONS, type RiskLevel } from '@/lib/quickCheck/questions';
import { calculateRisk, getQuestionSummary } from '@/lib/quickCheck/scoring';

const SECTION_ICONS = {
  AlertTriangle,
  Users,
  ClipboardCheck,
  MessageCircle,
} as const;

type WizardStep =
  | { readonly type: 'question'; readonly sectionIndex: number; readonly questionIndex: number }
  | { readonly type: 'result' };

export function EventQuickCheck() {
  const [currentStep, setCurrentStep] = useState<WizardStep>({ type: 'question', sectionIndex: 0, questionIndex: 0 });
  const [answers, setAnswers] = useState<Map<string, boolean>>(new Map());
  const [ratioTrucks, setRatioTrucks] = useState('');
  const [ratioAttendees, setRatioAttendees] = useState('');
  const [ratioResult, setRatioResult] = useState<string | null>(null);

  const flatQuestions = useMemo(() => {
    const result: { sectionIndex: number; questionIndex: number }[] = [];
    for (const [si, section] of QUICK_CHECK_SECTIONS.entries()) {
      for (let qi = 0; qi < section.questions.length; qi++) {
        result.push({ sectionIndex: si, questionIndex: qi });
      }
    }
    return result;
  }, []);

  const flatIndex = useMemo(() => {
    if (currentStep.type === 'result') return flatQuestions.length;
    return flatQuestions.findIndex(
      (f) => f.sectionIndex === currentStep.sectionIndex && f.questionIndex === currentStep.questionIndex,
    );
  }, [currentStep, flatQuestions]);

  const isFirst = flatIndex === 0;
  const isLast = flatIndex === flatQuestions.length - 1;
  const totalSteps = flatQuestions.length;

  const currentSection = currentStep.type === 'question' ? QUICK_CHECK_SECTIONS[currentStep.sectionIndex] : null;
  const currentQuestion = currentStep.type === 'question' ? currentSection!.questions[currentStep.questionIndex] : null;

  const answerAndAdvance = useCallback(
    (questionId: string, value: boolean) => {
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(questionId, value);
        return next;
      });

      if (isLast) {
        setCurrentStep({ type: 'result' });
      } else {
        const nextQ = flatQuestions[flatIndex + 1];
        setCurrentStep({ type: 'question', sectionIndex: nextQ.sectionIndex, questionIndex: nextQ.questionIndex });
      }
    },
    [isLast, flatIndex, flatQuestions],
  );

  const goNext = useCallback(() => {
    if (isLast) {
      setCurrentStep({ type: 'result' });
    } else {
      const next = flatQuestions[flatIndex + 1];
      setCurrentStep({ type: 'question', sectionIndex: next.sectionIndex, questionIndex: next.questionIndex });
    }
  }, [isLast, flatIndex, flatQuestions]);

  const goBack = useCallback(() => {
    if (flatIndex > 0) {
      const prev = flatQuestions[flatIndex - 1];
      setCurrentStep({ type: 'question', sectionIndex: prev.sectionIndex, questionIndex: prev.questionIndex });
    }
  }, [flatIndex, flatQuestions]);

  const reset = useCallback(() => {
    setCurrentStep({ type: 'question', sectionIndex: 0, questionIndex: 0 });
    setAnswers(new Map());
    setRatioTrucks('');
    setRatioAttendees('');
    setRatioResult(null);
  }, []);

  const computeRatio = useCallback((trucks: string, attendees: string): { pass: boolean; label: string } | null => {
    const t = Number(trucks);
    const a = Number(attendees);
    if (!Number.isFinite(t) || !Number.isFinite(a) || t <= 0 || a <= 0) return null;
    const ratio = a / t;
    if (ratio >= 400) return { pass: true, label: `1 truck per ~${Math.round(ratio)} attendees — good ratio` };
    if (ratio >= 250) return { pass: false, label: `1 truck per ~${Math.round(ratio)} attendees — tight, profits will be slim` };
    return { pass: false, label: `1 truck per ~${Math.round(ratio)} attendees — too many trucks, nobody profits` };
  }, []);

  const submitRatio = useCallback(
    (trucks: string, attendees: string) => {
      const result = computeRatio(trucks, attendees);
      if (result) {
        setRatioResult(result.label);
        answerAndAdvance('ratio-check', result.pass);
      }
    },
    [computeRatio, answerAndAdvance],
  );

  const result = useMemo(() => {
    if (currentStep.type !== 'result') return null;
    return calculateRisk(answers);
  }, [currentStep, answers]);

  useEffect(() => {
    if (currentStep.type !== 'result') return;
    const el = document.querySelector<HTMLElement>('#quick-check-card');
    if (el) el.focus({ preventScroll: true });
  }, [currentStep]);

  if (currentStep.type !== 'question' || !currentSection || !currentQuestion) {
    if (currentStep.type === 'result' && result) {
      return <ResultView result={result} answers={answers} onReset={reset} onGoBack={() => goBack()} />;
    }
    return null;
  }

  const currentAnswer = answers.get(currentQuestion.id);

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 mb-4">
        <p className="text-sm text-muted-foreground mb-1">Use this ~5-minute check before committing fees, gas, or prep time.</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-red-600 rounded-full transition-all duration-300"
              style={{ width: `${((flatIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {flatIndex + 1}/{totalSteps}
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex items-start justify-center">
        <Card id="quick-check-card" className="w-full max-w-lg h-[420px] flex flex-col" tabIndex={-1}>
          <CardContent className="pt-6 flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2 mb-1">
              {(() => {
                const Icon = SECTION_ICONS[currentSection.icon as keyof typeof SECTION_ICONS] ?? ClipboardCheck;
                return <Icon className="w-5 h-5 text-red-500 shrink-0" />;
              })()}
              <h3 className="font-semibold">{currentSection.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">{currentSection.description}</p>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <p className="text-base font-medium mb-4 leading-relaxed">{currentQuestion.text}</p>
              <p className="text-sm text-muted-foreground">{currentQuestion.detail}</p>
            </div>

            {currentQuestion.inputType === 'ratio' ? (
              <RatioInput
                trucks={ratioTrucks}
                attendees={ratioAttendees}
                result={ratioResult}
                answer={currentAnswer}
                isFirst={isFirst}
                onTrucksChange={setRatioTrucks}
                onAttendeesChange={setRatioAttendees}
                onCalculate={() => submitRatio(ratioTrucks, ratioAttendees)}
                onNext={goNext}
                onBack={goBack}
              />
            ) : (
              <div className="flex items-center justify-between mt-auto pt-6 shrink-0">
                <Button variant="outline" size="sm" onClick={goBack} disabled={isFirst}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => answerAndAdvance(currentQuestion.id, true)}
                    className={`rounded-lg border-2 px-8 py-2.5 text-sm font-medium transition-colors ${
                      currentAnswer === true
                        ? 'border-green-600 bg-green-600/10 text-green-600'
                        : 'border-border hover:border-green-600/50 hover:bg-green-600/5'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => answerAndAdvance(currentQuestion.id, false)}
                    className={`rounded-lg border-2 px-8 py-2.5 text-sm font-medium transition-colors ${
                      currentAnswer === false
                        ? 'border-red-600 bg-red-600/10 text-red-600'
                        : 'border-border hover:border-red-600/50 hover:bg-red-600/5'
                    }`}
                  >
                    No
                  </button>
                </div>
                <Button variant="outline" size="sm" onClick={goNext} disabled={currentAnswer === undefined}>
                  Skip
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ResultView({
  result,
  answers,
  onReset,
  onGoBack,
}: {
  readonly result: {
    readonly level: RiskLevel;
    readonly reason: string;
    readonly redFlagsFound: number;
    readonly greenFlagsFound: number;
    readonly totalQuestions: number;
    readonly redFlagIds: readonly string[];
    readonly verifiedIds: readonly string[];
    readonly unverifiedIds: readonly string[];
  };
  readonly answers: ReadonlyMap<string, boolean>;
  readonly onReset: () => void;
  readonly onGoBack: () => void;
}) {
  const config = {
    low: {
      icon: ShieldCheck,
      color: 'text-green-500',
      bg: 'bg-green-500/10 border-green-500/30',
      label: 'Low Risk',
    },
    medium: {
      icon: ShieldAlert,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10 border-yellow-500/30',
      label: 'Medium Risk',
    },
    high: {
      icon: ShieldX,
      color: 'text-red-500',
      bg: 'bg-red-500/10 border-red-500/30',
      label: 'High Risk',
    },
  }[result.level];

  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className={`flex flex-col items-center gap-3 p-8 rounded-xl border ${config.bg} w-full max-w-md`}>
        <Icon className={`w-16 h-16 ${config.color}`} />
        <h2 className={`text-2xl font-bold ${config.color}`}>{config.label}</h2>
        <p className="text-sm text-center text-muted-foreground">{result.reason}</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        {result.redFlagIds.length > 0 && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
            <h4 className="text-sm font-medium text-red-500 mb-2">Red Flags</h4>
            <ul className="space-y-2">
              {result.redFlagIds.map((id) => (
                <li key={id} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{getQuestionSummary(id)}</span>
                  <AnswerBadge value={answers.get(id)} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.verifiedIds.length > 0 && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
            <h4 className="text-sm font-medium text-green-500 mb-2">Verified</h4>
            <ul className="space-y-2">
              {result.verifiedIds.map((id) => (
                <li key={id} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{getQuestionSummary(id)}</span>
                  <AnswerBadge value={answers.get(id)} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.unverifiedIds.length > 0 && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
            <h4 className="text-sm font-medium text-yellow-500 mb-2">Not Yet Verified</h4>
            <ul className="space-y-2">
              {result.unverifiedIds.map((id) => (
                <li key={id} className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{getQuestionSummary(id)}</span>
                  <AnswerBadge value={answers.get(id)} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onGoBack}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-1" />
          Start Over
        </Button>
      </div>
    </div>
  );
}

function AnswerBadge({ value }: { readonly value: boolean | undefined }) {
  if (value === undefined) return <span className="ml-auto text-xs text-muted-foreground/60 italic">skipped</span>;
  return value ? (
    <span className="ml-auto text-xs font-medium text-green-500 shrink-0">Yes</span>
  ) : (
    <span className="ml-auto text-xs font-medium text-red-400 shrink-0">No</span>
  );
}

function RatioInput({
  trucks,
  attendees,
  result,
  answer,
  isFirst,
  onTrucksChange,
  onAttendeesChange,
  onCalculate,
  onNext,
  onBack,
}: {
  readonly trucks: string;
  readonly attendees: string;
  readonly result: string | null;
  readonly answer: boolean | undefined;
  readonly isFirst: boolean;
  readonly onTrucksChange: (v: string) => void;
  readonly onAttendeesChange: (v: string) => void;
  readonly onCalculate: () => void;
  readonly onNext: () => void;
  readonly onBack: () => void;
}) {
  return (
    <div className="mt-auto pt-6 shrink-0">
      {result ? (
        <div className={`text-sm font-medium p-3 rounded-lg border mb-4 ${
          answer === true ? 'border-green-500/30 bg-green-500/5 text-green-600' : 'border-red-500/30 bg-red-500/5 text-red-500'
        }`}>
          {result}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label htmlFor="ratio-trucks" className="text-xs font-medium text-muted-foreground block mb-1">Food trucks</label>
              <input
                id="ratio-trucks"
                type="number"
                min="1"
                value={trucks}
                onChange={(e) => onTrucksChange(e.target.value)}
                className="w-full rounded-lg border-2 border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label htmlFor="ratio-attendees" className="text-xs font-medium text-muted-foreground block mb-1">Estimated attendees</label>
              <input
                id="ratio-attendees"
                type="number"
                min="1"
                value={attendees}
                onChange={(e) => onAttendeesChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onCalculate(); }}
                className="w-full rounded-lg border-2 border-border px-3 py-2.5 text-sm focus:outline-none focus:border-primary"
                placeholder="e.g. 4000"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-4">A safe ratio is about 1 truck per 400+ attendees.</p>
        </>
      )}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack} disabled={isFirst}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        {result ? (
          <Button variant="outline" size="sm" onClick={onNext}>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onCalculate} disabled={!trucks || !attendees}>
            Calculate
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
