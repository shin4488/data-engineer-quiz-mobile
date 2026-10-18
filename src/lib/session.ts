import { DOMAINS, type DomainId } from '../data/categories.ts';
import type { Question } from '../data/types.ts';
import { isCorrectAnswer, type Progress, recordAnswer } from './progress.ts';
import { type Rng, shuffle } from './random.ts';

export type Mode = 'practice' | 'exam';

/** 本番に合わせた模擬試験の条件。合格ラインは公表されていないため目安。 */
export const EXAM_QUESTION_COUNT = 50;
export const EXAM_DURATION_MS = 120 * 60 * 1000;
export const PASS_RATE = 0.7;

export const COUNT_OPTIONS = [5, 10, 20, 30, 50, 'all'] as const;
export type CountOption = (typeof COUNT_OPTIONS)[number];

export interface QuizSession {
  mode: Mode;
  questionIds: string[];
  /** 問題ごとの選択肢の表示順 */
  choiceOrder: Record<string, string[]>;
  /** 練習では回答を確定した選択、模擬試験では現在の選択 */
  answers: Record<string, string[]>;
  /** 採点済みの問題の正誤。練習では回答ごと、模擬試験では最後にまとめて入る */
  results: Record<string, boolean>;
  index: number;
  startedAt: number;
  deadline?: number;
  finishedAt?: number;
}

export interface SessionSummary {
  mode: Mode;
  startedAt: number;
  finishedAt: number;
  total: number;
  correct: number;
}

export function createSession(
  mode: Mode,
  pool: readonly Question[],
  count: CountOption,
  now: number,
  rng: Rng = Math.random,
): QuizSession {
  const picked = shuffle(pool, rng).slice(0, count === 'all' ? pool.length : count);
  return {
    mode,
    questionIds: picked.map((q) => q.id),
    choiceOrder: Object.fromEntries(
      picked.map((q) => [
        q.id,
        shuffle(
          q.choices.map((c) => c.key),
          rng,
        ),
      ]),
    ),
    answers: {},
    results: {},
    index: 0,
    startedAt: now,
    ...(mode === 'exam' ? { deadline: now + EXAM_DURATION_MS } : {}),
  };
}

/** 練習モードで1問の回答を確定し、累計の成績にも記録する。 */
export function submitPracticeAnswer(
  session: QuizSession,
  progress: Progress,
  question: Question,
  selected: string[],
  now: number,
): { session: QuizSession; progress: Progress } {
  if (question.id in session.results) return { session, progress };
  const correct = isCorrectAnswer(question, selected);
  return {
    session: {
      ...session,
      answers: { ...session.answers, [question.id]: selected },
      results: { ...session.results, [question.id]: correct },
    },
    progress: recordAnswer(progress, question.id, correct, now),
  };
}

export function selectExamAnswer(
  session: QuizSession,
  questionId: string,
  selected: string[],
): QuizSession {
  return { ...session, answers: { ...session.answers, [questionId]: selected } };
}

/**
 * 模擬試験をまとめて採点する。未回答は不正解として採点するが、
 * 解いていない問題を「間違えた回数」に数えないよう、成績には回答した問題だけを記録する。
 */
export function gradeExam(
  session: QuizSession,
  progress: Progress,
  questions: ReadonlyMap<string, Question>,
  now: number,
): { session: QuizSession; progress: Progress } {
  let next = progress;
  const results: Record<string, boolean> = {};
  for (const id of session.questionIds) {
    const question = questions.get(id);
    if (!question) continue;
    const selected = session.answers[id] ?? [];
    const correct = isCorrectAnswer(question, selected);
    results[id] = correct;
    if (selected.length > 0) next = recordAnswer(next, id, correct, now);
  }
  return { session: { ...session, results, finishedAt: now }, progress: next };
}

export function isFinished(session: QuizSession): boolean {
  return session.finishedAt !== undefined;
}

export function summarize(session: QuizSession, questions: ReadonlyMap<string, Question>) {
  const byDomain = Object.fromEntries(
    DOMAINS.map((d) => [d.id, { total: 0, correct: 0 }]),
  ) as Record<DomainId, { total: number; correct: number }>;
  let correct = 0;
  let total = 0;
  for (const id of session.questionIds) {
    const question = questions.get(id);
    if (!question || !(id in session.results)) continue;
    total++;
    byDomain[question.domain].total++;
    if (session.results[id]) {
      correct++;
      byDomain[question.domain].correct++;
    }
  }
  return { total, correct, byDomain };
}
