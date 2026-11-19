import type { RiskLevel } from './questions';
import { QUICK_CHECK_SECTIONS } from './questions';

type AnswerMap = ReadonlyMap<string, boolean>;

const INVERTED_IDS = new Set<string>();
const QUESTION_SUMMARIES = new Map<string, string>();
for (const section of QUICK_CHECK_SECTIONS) {
  for (const q of section.questions) {
    if (q.inverted) INVERTED_IDS.add(q.id);
    QUESTION_SUMMARIES.set(q.id, q.summary);
  }
}

const RED_FLAG_IDS = new Set(QUICK_CHECK_SECTIONS.find((s) => s.id === 'red-flags')!.questions.map((q) => q.id));
const CROWD_MATH_IDS = new Set(QUICK_CHECK_SECTIONS.find((s) => s.id === 'crowd-math')!.questions.map((q) => q.id));
const LOGISTICS_IDS = new Set(QUICK_CHECK_SECTIONS.find((s) => s.id === 'logistics')!.questions.map((q) => q.id));
const GUT_CHECK_IDS = new Set(QUICK_CHECK_SECTIONS.find((s) => s.id === 'gut-check')!.questions.map((q) => q.id));

const ALL_NON_RED_IDS = new Set([...CROWD_MATH_IDS, ...LOGISTICS_IDS, ...GUT_CHECK_IDS]);

interface RiskAssessment {
  readonly level: RiskLevel;
  readonly reason: string;
  readonly redFlagsFound: number;
  readonly greenFlagsFound: number;
  readonly totalQuestions: number;
  readonly redFlagIds: readonly string[];
  readonly verifiedIds: readonly string[];
  readonly unverifiedIds: readonly string[];
}

function countInSet(answers: AnswerMap, ids: ReadonlySet<string>, checked: boolean): number {
  let count = 0;
  for (const id of ids) {
    const value = answers.get(id);
    if (checked ? value === true : value !== true) count++;
  }
  return count;
}

function isRedFlag(id: string, answers: AnswerMap): boolean {
  const value = answers.get(id);
  return INVERTED_IDS.has(id) ? value === false : value === true;
}

export function calculateRisk(answers: AnswerMap): RiskAssessment {
  const redFlagIds = [...RED_FLAG_IDS].filter((id) => isRedFlag(id, answers));
  const redFlagsFound = redFlagIds.length;
  const crowdMathVerified = countInSet(answers, CROWD_MATH_IDS, true);
  const crowdMathUnchecked = countInSet(answers, CROWD_MATH_IDS, false);
  const logisticsVerified = countInSet(answers, LOGISTICS_IDS, true);
  const logisticsUnchecked = countInSet(answers, LOGISTICS_IDS, false);
  const gutVerified = countInSet(answers, GUT_CHECK_IDS, true);
  const gutUnchecked = countInSet(answers, GUT_CHECK_IDS, false);

  const verifiedIds = [...ALL_NON_RED_IDS].filter((id) => answers.get(id) === true);
  const unverifiedIds = [...ALL_NON_RED_IDS].filter((id) => answers.get(id) !== true);

  const greenFlagsFound = crowdMathVerified + logisticsVerified + gutVerified;
  const totalQuestions = QUICK_CHECK_SECTIONS.reduce((sum, s) => sum + s.questions.length, 0);

  const base = { redFlagsFound, greenFlagsFound, totalQuestions, redFlagIds, verifiedIds, unverifiedIds };

  if (redFlagsFound > 0) {
    return {
      ...base,
      level: 'high',
      reason: redFlagsFound === 1
        ? '1 red flag found. This is a strong scam indicator. Do not commit payment until resolved.'
        : `${redFlagsFound} red flags found. Multiple fraud indicators detected. Avoid this event or verify everything before committing.`,
    };
  }

  const riskPoints = crowdMathUnchecked * 2 + logisticsUnchecked * 1 + gutUnchecked * 0.5;
  const maxPossiblePoints = CROWD_MATH_IDS.size * 2 + LOGISTICS_IDS.size * 1 + GUT_CHECK_IDS.size * 0.5;

  if (riskPoints <= maxPossiblePoints * 0.25) {
    return {
      ...base,
      level: 'low',
      reason: 'No red flags detected and most verification steps are complete. This event looks legitimate.',
    };
  }

  if (riskPoints <= maxPossiblePoints * 0.5) {
    return {
      ...base,
      level: 'medium',
      reason: 'No red flags, but several items are unverified. Consider verifying the crowd math and logistics before committing.',
    };
  }

  return {
    ...base,
    level: 'high',
    reason: 'No red flags found, but most verification steps are incomplete. Too many unknowns to assess risk. Verify before committing.',
  };
}

export function getQuestionSummary(questionId: string): string {
  return QUESTION_SUMMARIES.get(questionId) ?? questionId;
}
