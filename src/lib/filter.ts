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

/**
 * 分野・サービスの選択肢ごとに、いまの条件で出題の対象になる問題数を数える。
 * 同じ種類の選択は「または」で足し合わさるため、その種類の選択だけを外した条件で数える。
 * 例: 分野「保存」を選んでいても、分野「分析」の数は、ほかの条件に合う分析の問題数になる。
 */
export function countByCategory(
  questions: readonly Question[],
  filter: QuestionFilter,
  progress: Progress,
): { domains: Map<DomainId, number>; services: Map<ServiceId, number> } {
  const domains = new Map<DomainId, number>();
  const services = new Map<ServiceId, number>();
  const withoutDomains = { ...filter, domains: [] };
  const withoutServices = { ...filter, services: [] };
  for (const q of questions) {
    if (matchesFilter(q, withoutDomains, progress)) {
      domains.set(q.domain, (domains.get(q.domain) ?? 0) + 1);
    }
    if (matchesFilter(q, withoutServices, progress)) {
      for (const s of q.services) services.set(s, (services.get(s) ?? 0) + 1);
    }
  }
  return { domains, services };
}

export function filterQuestions(
  questions: readonly Question[],
  filter: QuestionFilter,
  progress: Progress,
): Question[] {
  return questions.filter((q) => matchesFilter(q, filter, progress));
}
