import { DOMAIN_IDS, SERVICE_IDS } from './categories.ts';
import type { Question } from './types.ts';

const CHOICE_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'];
const QUESTION_KEYS = new Set([
  'id',
  'domain',
  'services',
  'type',
  'question',
  'choices',
  'answer',
  'explanation',
  'choiceNotes',
  'diagram',
  'references',
]);
const DIAGRAM_PREFIXES = ['flowchart ', 'sequenceDiagram'];

export interface FileResult {
  questions: Question[];
  errors: string[];
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/**
 * YAML から読み込んだ1ファイル分のデータを検証し、アプリで使う形に変換する。
 * 問題IDはファイル名を接頭辞にして、ファイルをまたいだ重複を防ぐ。
 */
export function parseQuestionFile(fileBase: string, data: unknown): FileResult {
  const errors: string[] = [];
  const questions: Question[] = [];
  if (!Array.isArray(data)) {
    return { questions, errors: [`${fileBase}: ファイルの最上位は配列にする`] };
  }
  const idPattern = new RegExp(`^${fileBase}-\\d{3}$`);

  data.forEach((raw, index) => {
    const where = `${fileBase}[${index}]`;
    const err = (msg: string) => errors.push(`${where}: ${msg}`);
    if (!isRecord(raw)) {
      err('問題はオブジェクトにする');
      return;
    }
    const at = typeof raw.id === 'string' ? `${where} (${raw.id})` : where;
    const fail = (msg: string) => errors.push(`${at}: ${msg}`);
    const before = errors.length;

    for (const key of Object.keys(raw)) {
      if (!QUESTION_KEYS.has(key)) fail(`未知のキー "${key}"`);
    }
    if (typeof raw.id !== 'string' || !idPattern.test(raw.id)) {
      fail(`id は "${fileBase}-001" の形式にする`);
    }
    if (typeof raw.domain !== 'string' || !DOMAIN_IDS.includes(raw.domain)) {
      fail(`domain は ${DOMAIN_IDS.join(' / ')} のいずれか`);
    }
    const services = raw.services;
    if (!Array.isArray(services) || services.length === 0) {
      fail('services は1件以上の配列にする');
    } else {
      for (const s of services) {
        if (typeof s !== 'string' || !SERVICE_IDS.includes(s)) fail(`未定義のサービス "${s}"`);
      }
      if (new Set(services).size !== services.length) fail('services が重複している');
    }
    if (raw.type !== 'single' && raw.type !== 'multiple') {
      fail('type は single か multiple');
    }
    if (!isText(raw.question)) fail('question が空');
    if (!isText(raw.explanation)) fail('explanation が空');

    const choices = raw.choices;
    const notes = raw.choiceNotes;
    let keys: string[] = [];
    if (!isRecord(choices)) {
      fail('choices は a, b, c ... をキーにしたオブジェクトにする');
    } else {
      keys = Object.keys(choices);
      const expected = CHOICE_KEYS.slice(0, keys.length);
      if (keys.length < 4 || keys.length > 6 || keys.join() !== expected.join()) {
        fail('choices のキーは a から順に4〜6個並べる');
      }
      const texts = Object.values(choices);
      if (!texts.every(isText)) fail('空の選択肢がある');
      if (new Set(texts).size !== texts.length) fail('同じ文の選択肢がある');
    }
    if (!isRecord(notes)) {
      fail('choiceNotes は choices と同じキーのオブジェクトにする');
    } else {
      const noteKeys = Object.keys(notes);
      if (noteKeys.sort().join() !== [...keys].sort().join()) {
        fail('choiceNotes のキーを choices とそろえる');
      }
      if (!Object.values(notes).every(isText)) fail('空の choiceNotes がある');
    }

    const answer = raw.answer;
    if (!Array.isArray(answer) || answer.length === 0) {
      fail('answer は選択肢キーの配列にする');
    } else {
      if (!answer.every((a) => typeof a === 'string' && keys.includes(a))) {
        fail('answer に choices にないキーがある');
      }
      if (new Set(answer).size !== answer.length) fail('answer が重複している');
      if (raw.type === 'single' && answer.length !== 1) fail('single の answer は1つ');
      if (raw.type === 'multiple' && (answer.length < 2 || answer.length >= keys.length - 1)) {
        fail('multiple の answer は2つ以上、かつ不正解の選択肢を2つ以上残す');
      }
    }

    if (raw.diagram !== undefined) {
      if (!isText(raw.diagram)) {
        fail('diagram が空');
      } else if (!DIAGRAM_PREFIXES.some((p) => (raw.diagram as string).trimStart().startsWith(p))) {
        fail(`diagram は ${DIAGRAM_PREFIXES.join(' / ')} で始める`);
      }
    }

    const refs = raw.references;
    if (!Array.isArray(refs) || refs.length === 0) {
      fail('references は1件以上');
    } else {
      for (const ref of refs) {
        if (!isRecord(ref) || !isText(ref.title) || !isText(ref.url)) {
          fail('references の各要素に title と url を書く');
        } else if (!/^https:\/\/docs\.cloud\.google\.com\/[^\s]*$/.test(ref.url)) {
          fail(`公式ドキュメント以外の URL "${ref.url}"`);
        }
      }
    }

    if (errors.length > before) return;
    const choiceMap = choices as Record<string, string>;
    const noteMap = notes as Record<string, string>;
    questions.push({
      id: raw.id as string,
      domain: raw.domain as Question['domain'],
      services: services as Question['services'],
      type: raw.type as Question['type'],
      question: (raw.question as string).trim(),
      choices: keys.map((key) => ({
        key,
        text: (choiceMap[key] as string).trim(),
        note: (noteMap[key] as string).trim(),
      })),
      answer: answer as string[],
      explanation: (raw.explanation as string).trim(),
      ...(raw.diagram ? { diagram: (raw.diagram as string).trim() } : {}),
      references: (refs as { title: string; url: string }[]).map((r) => ({
        title: r.title.trim(),
        url: r.url.trim(),
      })),
    });
  });

  return { questions, errors };
}

/** 全ファイルを通した検証。問題IDの重複を検出する。 */
export function findDuplicateIds(questions: Question[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const q of questions) {
    if (seen.has(q.id)) dups.add(q.id);
    seen.add(q.id);
  }
  return [...dups];
}
