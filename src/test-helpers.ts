import type { DomainId, ServiceId } from './data/categories.ts';
import type { Question } from './data/types.ts';

export function makeQuestion(
  id: string,
  opts: {
    domain?: DomainId;
    services?: ServiceId[];
    type?: 'single' | 'multiple';
    answer?: string[];
    keys?: string[];
  } = {},
): Question {
  const keys = opts.keys ?? ['a', 'b', 'c', 'd'];
  return {
    id,
    domain: opts.domain ?? 'design',
    services: opts.services ?? ['bigquery'],
    type: opts.type ?? 'single',
    question: `${id} の問題文`,
    choices: keys.map((key) => ({ key, text: `選択肢 ${key}`, note: `理由 ${key}` })),
    answer: opts.answer ?? ['a'],
    explanation: '解説',
    references: [{ title: '参考', url: 'https://docs.cloud.google.com/bigquery/docs' }],
  };
}
