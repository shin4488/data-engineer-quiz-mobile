import { describe, expect, it } from 'vitest';
import { parseQuestionFile } from './validate.ts';

const valid = {
  id: 'sample-001',
  domain: 'design',
  services: ['bigquery'],
  type: 'single',
  question: '問題文',
  choices: { a: 'A', b: 'B', c: 'C', d: 'D' },
  answer: ['a'],
  choiceNotes: { a: '理由A', b: '理由B', c: '理由C', d: '理由D' },
  explanation: '解説',
  references: [{ title: '参考', url: 'https://docs.cloud.google.com/bigquery/docs' }],
};

const errorsOf = (patch: Record<string, unknown>) =>
  parseQuestionFile('sample', [{ ...valid, ...patch }]).errors;

describe('parseQuestionFile', () => {
  it('正しい問題を、選択肢と理由を組にした形に変換する', () => {
    const { questions, errors } = parseQuestionFile('sample', [valid]);
    expect(errors).toEqual([]);
    expect(questions[0]?.choices[1]).toEqual({ key: 'b', text: 'B', note: '理由B' });
  });

  it.each([
    ['ファイル名と合わない id', { id: 'other-001' }],
    ['未定義の分野', { domain: 'security' }],
    ['未定義のサービス', { services: ['redshift'] }],
    ['選択肢にない正解', { answer: ['e'] }],
    ['単一選択で正解が2つ', { answer: ['a', 'b'] }],
    ['理由が欠けた選択肢', { choiceNotes: { a: '理由A', b: '理由B', c: '理由C' } }],
    ['選択肢が3つ', { choices: { a: 'A', b: 'B', c: 'C' } }],
    ['公式ドキュメント以外の URL', { references: [{ title: 'x', url: 'https://example.com/' }] }],
    ['Mermaid でない図', { diagram: 'graph LR; A-->B' }],
    ['未知の項目', { hint: 'ヒント' }],
  ])('%s をエラーにする', (_label, patch) => {
    expect(errorsOf(patch)).not.toEqual([]);
  });

  it('複数選択では、正解を2つ以上にし、不正解を2つ以上残す', () => {
    const five = { a: 'A', b: 'B', c: 'C', d: 'D', e: 'E' };
    const notes = { a: '1', b: '2', c: '3', d: '4', e: '5' };
    const base = { type: 'multiple', choices: five, choiceNotes: notes };
    expect(errorsOf({ ...base, answer: ['a', 'b'] })).toEqual([]);
    expect(errorsOf({ ...base, answer: ['a'] })).not.toEqual([]);
    expect(errorsOf({ ...base, answer: ['a', 'b', 'c', 'd'] })).not.toEqual([]);
  });
});
