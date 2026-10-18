import type { DomainId, ServiceId } from '../data/categories.ts';
import type { Question } from '../data/types.ts';
import type { Progress } from './progress.ts';

export interface QuestionFilter {
  /** 空なら全分野 */
  domains: DomainId[];
  /** 空なら全サービス */
  services: ServiceId[];
  markedOnly: boolean;
  /** 0 なら条件なし。1以上なら、累計でその回数以上間違えた問題 */
  minWrong: number;
  unansweredOnly: boolean;
}

export const EMPTY_FILTER: QuestionFilter = {
  domains: [],
  services: [],
  markedOnly: false,
  minWrong: 0,
  unansweredOnly: false,
};

/**
 * 同じ種類のカテゴリの中は「または」、種類の違う条件同士は「かつ」で絞り込む。
 * 例: 分野「保存」「分析」とサービス「BigQuery」なら、保存または分析の分野のうち BigQuery の問題。
 */
export function matchesFilter(q: Question, filter: QuestionFilter, progress: Progress): boolean {
  if (filter.domains.length > 0 && !filter.domains.includes(q.domain)) return false;
  if (filter.services.length > 0 && !q.services.some((s) => filter.services.includes(s))) {
    return false;
  }
  if (filter.markedOnly && !progress.marked.includes(q.id)) return false;
  const stat = progress.stats[q.id];
  if (filter.minWrong > 0 && (stat?.wrong ?? 0) < filter.minWrong) return false;
  if (filter.unansweredOnly && stat) return false;
  return true;
}

export function filterQuestions(
  questions: readonly Question[],
  filter: QuestionFilter,
  progress: Progress,
): Question[] {
  return questions.filter((q) => matchesFilter(q, filter, progress));
}
