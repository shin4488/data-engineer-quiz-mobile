import { describe, expect, it } from 'vitest';
import { makeQuestion } from '../test-helpers.ts';
import { countByCategory, EMPTY_FILTER, filterQuestions } from './filter.ts';
import type { Progress } from './progress.ts';

const questions = [
  makeQuestion('q1', { domain: 'design', services: ['bigquery'] }),
  makeQuestion('q2', { domain: 'design', services: ['dataflow', 'pubsub'] }),
  makeQuestion('q3', { domain: 'store', services: ['bigquery', 'bigtable'] }),
  makeQuestion('q4', { domain: 'analyze', services: ['looker'] }),
];

const stat = (correct: number, wrong: number) => ({
  correct,
  wrong,
  lastResult: 'wrong' as const,
  lastAnsweredAt: 0,
});

const progress: Progress = {
  stats: { q1: stat(3, 0), q2: stat(0, 1), q3: stat(1, 2) },
  marked: ['q2', 'q4'],
};

const ids = (filter: Partial<typeof EMPTY_FILTER>) =>
  filterQuestions(questions, { ...EMPTY_FILTER, ...filter }, progress).map((q) => q.id);

describe('filterQuestions', () => {
  it('条件を指定しなければ全問を対象にする', () => {
    expect(ids({})).toEqual(['q1', 'q2', 'q3', 'q4']);
  });

  it('複数の分野を選ぶと、どれかの分野に属する問題を対象にする', () => {
    expect(ids({ domains: ['design', 'analyze'] })).toEqual(['q1', 'q2', 'q4']);
  });

  it('複数のサービスを選ぶと、どれかのサービスに関係する問題を対象にする', () => {
    expect(ids({ services: ['pubsub', 'bigtable'] })).toEqual(['q2', 'q3']);
  });

  it('分野とサービスの両方を選ぶと、両方に当てはまる問題だけを対象にする', () => {
    expect(ids({ domains: ['design'], services: ['bigquery'] })).toEqual(['q1']);
  });

  it('見直しの印を付けた問題だけに絞り込める', () => {
    expect(ids({ markedOnly: true })).toEqual(['q2', 'q4']);
  });

  it('間違えた回数が指定以上の問題だけに絞り込む', () => {
    expect(ids({ minWrong: 1 })).toEqual(['q2', 'q3']);
    expect(ids({ minWrong: 2 })).toEqual(['q3']);
    expect(ids({ minWrong: 3 })).toEqual([]);
  });

  it('まだ解いていない問題だけに絞り込める', () => {
    expect(ids({ unansweredOnly: true })).toEqual(['q4']);
  });

  it('種類の違う条件は、すべてを満たす問題だけを対象にする', () => {
    expect(ids({ domains: ['design', 'store'], markedOnly: true, minWrong: 1 })).toEqual(['q2']);
  });
});

describe('countByCategory', () => {
  const counts = (filter: Partial<typeof EMPTY_FILTER>) => {
    const c = countByCategory(questions, { ...EMPTY_FILTER, ...filter }, progress);
    return { domains: Object.fromEntries(c.domains), services: Object.fromEntries(c.services) };
  };

  it('条件がなければ、分野・サービスごとの全問題数を数える', () => {
    expect(counts({})).toEqual({
      domains: { design: 2, store: 1, analyze: 1 },
      services: { bigquery: 2, dataflow: 1, pubsub: 1, bigtable: 1, looker: 1 },
    });
  });

  it('見直しの印や間違えた回数の条件に合う問題だけを数える', () => {
    expect(counts({ markedOnly: true })).toEqual({
      domains: { design: 1, analyze: 1 },
      services: { dataflow: 1, pubsub: 1, looker: 1 },
    });
    expect(counts({ minWrong: 2 }).domains).toEqual({ store: 1 });
  });

  it('分野を選ぶと、サービスの数はその分野の問題だけになる', () => {
    expect(counts({ domains: ['design'] }).services).toEqual({
      bigquery: 1,
      dataflow: 1,
      pubsub: 1,
    });
  });

  it('選んだ分野以外の分野の数は、選び足したときに増える問題数のまま表示する', () => {
    expect(counts({ domains: ['design'] }).domains).toEqual({ design: 2, store: 1, analyze: 1 });
  });

  it('サービスを選ぶと、分野の数はそのサービスに関係する問題だけになる', () => {
    expect(counts({ services: ['bigquery'] }).domains).toEqual({ design: 1, store: 1 });
  });
});
