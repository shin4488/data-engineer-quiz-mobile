import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { DOMAINS } from './categories.ts';
import type { Question } from './types.ts';
import { findDuplicateIds, parseQuestionFile } from './validate.ts';

const dir = join(import.meta.dirname, 'questions');
const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'));

const all: Question[] = [];
const errors: string[] = [];
for (const file of files) {
  const base = file.replace(/\.yaml$/, '');
  try {
    const result = parseQuestionFile(base, parse(readFileSync(join(dir, file), 'utf8')));
    all.push(...result.questions);
    errors.push(...result.errors);
  } catch (e) {
    errors.push(`${base}: ${(e as Error).message}`);
  }
}

describe('問題データ', () => {
  it('すべての問題が形式どおりに書かれている', () => {
    expect(errors).toEqual([]);
  });

  it('問題IDが重複していない', () => {
    expect(findDuplicateIds(all)).toEqual([]);
  });

  it('200問以上ある', () => {
    expect(all.length).toBeGreaterThanOrEqual(200);
  });

  it('試験ガイドの5分野すべてから、全体の10%以上ずつ出題する', () => {
    for (const d of DOMAINS) {
      const n = all.filter((q) => q.domain === d.id).length;
      expect(n, d.label).toBeGreaterThanOrEqual(all.length * 0.1);
    }
  });

  it('本番と同じく、複数選択の問題を含む', () => {
    expect(all.some((q) => q.type === 'multiple')).toBe(true);
  });
});
