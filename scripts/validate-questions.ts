// 使い方: node scripts/validate-questions.ts [ファイル名 ...]
// 引数を省略すると src/data/questions 以下の全ファイルを検証する。
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parse } from 'yaml';
import type { Question } from '../src/data/types.ts';
import { findDuplicateIds, parseQuestionFile } from '../src/data/validate.ts';

const dir = join(import.meta.dirname, '../src/data/questions');
const args = process.argv.slice(2);
const files = args.length
  ? args.map((a) => (a.endsWith('.yaml') ? basename(a) : `${a}.yaml`))
  : readdirSync(dir).filter((f) => f.endsWith('.yaml'));

const all: Question[] = [];
let errorCount = 0;
for (const file of files) {
  const base = file.replace(/\.yaml$/, '');
  let data: unknown;
  try {
    data = parse(readFileSync(join(dir, file), 'utf8'));
  } catch (e) {
    console.error(`${base}: YAML の構文エラー\n${(e as Error).message}`);
    errorCount++;
    continue;
  }
  const { questions, errors } = parseQuestionFile(base, data);
  for (const e of errors) console.error(e);
  errorCount += errors.length;
  all.push(...questions);
  const multiple = questions.filter((q) => q.type === 'multiple').length;
  const diagrams = questions.filter((q) => q.diagram).length;
  console.log(`${base}: ${questions.length}問（複数選択 ${multiple}、図 ${diagrams}）`);
}
for (const id of findDuplicateIds(all)) {
  console.error(`問題IDが重複: ${id}`);
  errorCount++;
}
console.log(`合計 ${all.length}問、エラー ${errorCount}件`);
process.exit(errorCount ? 1 : 0);
