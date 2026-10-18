import type { Question } from '../data/types.ts';

export interface QuestionStat {
  correct: number;
  /** 累計の不正解回数。正解しても減らさない */
  wrong: number;
  lastResult: 'correct' | 'wrong';
  lastAnsweredAt: number;
}

export interface Progress {
  stats: Record<string, QuestionStat>;
  /** 「後で見直す」の印を付けた問題ID */
  marked: string[];
}

export const EMPTY_PROGRESS: Progress = { stats: {}, marked: [] };

export function isCorrectAnswer(question: Question, selected: readonly string[]): boolean {
  const answer = new Set(question.answer);
  return selected.length === answer.size && selected.every((key) => answer.has(key));
}

export function recordAnswer(
  progress: Progress,
  questionId: string,
  correct: boolean,
  now: number,
): Progress {
  const prev = progress.stats[questionId] ?? { correct: 0, wrong: 0 };
  return {
    ...progress,
    stats: {
      ...progress.stats,
      [questionId]: {
        correct: prev.correct + (correct ? 1 : 0),
        wrong: prev.wrong + (correct ? 0 : 1),
        lastResult: correct ? 'correct' : 'wrong',
        lastAnsweredAt: now,
      },
    },
  };
}

export function toggleMark(progress: Progress, questionId: string): Progress {
  const marked = progress.marked.includes(questionId)
    ? progress.marked.filter((id) => id !== questionId)
    : [...progress.marked, questionId];
  return { ...progress, marked };
}
