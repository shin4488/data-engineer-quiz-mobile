/// <reference lib="dom" />
// 使い方: npm run render:diagrams [-- --all]
// 問題の図（Mermaid）を、ライト用とダーク用の SVG 画像に書き出す。
// 図を追加・変更したら実行し、書き出したファイルもコミットする。
// --all を付けると、変更のない図も書き出し直す。
//
// 端末では Mermaid を動かさず、この画像を表示する。
// Mermaid は図を表示するたびに分割された大きなファイルを取得し、そのファイル名はアプリの新しい版を公開するたびに変わる。
// そのため端末で動かすと、新しい版の公開後に更新前の版で図を開いたときや、オフラインでファイルをまだ取得していないときに、図を表示できない。
//
// Playwright の Chromium を使う（未導入なら `npx playwright install chromium`）。
// 別の Chromium を使うときは、環境変数 CHROMIUM_PATH に実行ファイルのパスを指定する。
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Mermaid } from 'mermaid';
import { chromium } from 'playwright';
import { parse } from 'yaml';
import { diagramHash } from '../src/data/diagram-hash.ts';
import type { Question } from '../src/data/types.ts';
import { parseQuestionFile } from '../src/data/validate.ts';

declare const mermaid: Mermaid;

const root = join(import.meta.dirname, '..');
const questionDir = join(root, 'src/data/questions');
const outDir = join(root, 'src/data/diagrams');
const manifestPath = join(outDir, 'manifest.json');

// 表示する端末のフォント（iPhone なら SF と ヒラギノ）を先に並べる。
// 書き出す環境には端末のフォントがないため、文字の幅は Liberation Sans（英数字）と Noto Sans CJK JP（日本語）で測る。
const MEASURE_FONTS = [
  { family: 'Liberation Sans', sample: 'BigQuery' },
  { family: 'Noto Sans CJK JP', sample: 'データ' },
];
const FONT_FAMILY = [
  '-apple-system',
  'BlinkMacSystemFont',
  '"Hiragino Sans"',
  '"Hiragino Kaku Gothic ProN"',
  '"Noto Sans JP"',
  '"Yu Gothic UI"',
  ...MEASURE_FONTS.map((f) => `"${f.family}"`),
  'sans-serif',
].join(', ');

// Mermaid の既定（120px）では、日本語のラベルが語の途中で折り返されるため広げる
const WRAPPING_WIDTH = 240;

const THEMES = [
  { suffix: '', theme: 'neutral' },
  { suffix: '.dark', theme: 'dark' },
] as const;

interface ManifestEntry {
  hash: string;
  width: number;
  height: number;
}

function loadQuestions(): Question[] {
  const all: Question[] = [];
  for (const file of readdirSync(questionDir).filter((f) => f.endsWith('.yaml'))) {
    const base = file.replace(/\.yaml$/, '');
    const { questions, errors } = parseQuestionFile(
      base,
      parse(readFileSync(join(questionDir, file), 'utf8')),
    );
    if (errors.length) throw new Error(`問題データにエラーがある\n${errors.join('\n')}`);
    all.push(...questions);
  }
  return all;
}

function loadManifest(): Record<string, ManifestEntry> {
  if (!existsSync(manifestPath)) return {};
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

const all = process.argv.includes('--all');
const diagrams = loadQuestions().flatMap((q) => (q.diagram ? [{ id: q.id, code: q.diagram }] : []));
const previous = loadManifest();
const fileName = (id: string, suffix: string) => `${id}${suffix}.svg`;
const targets = diagrams.filter(
  ({ id, code }) =>
    all ||
    previous[id]?.hash !== diagramHash(code) ||
    THEMES.some(({ suffix }) => !existsSync(join(outDir, fileName(id, suffix)))),
);

const manifest: Record<string, ManifestEntry> = {};
for (const { id } of diagrams) {
  const entry = previous[id];
  if (entry) manifest[id] = entry;
}

if (targets.length) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html lang="ja"><body></body></html>');
    await page.addScriptTag({ path: join(root, 'node_modules/mermaid/dist/mermaid.min.js') });

    const missing = await page.evaluate((fonts) => {
      const ctx = document.createElement('canvas').getContext('2d');
      // フォントがあれば、代わりのフォントの指定に関係なく同じ幅になる
      const width = (font: string, text: string) => {
        if (!ctx) return 0;
        ctx.font = `16px ${font}`;
        return ctx.measureText(text).width;
      };
      return fonts
        .filter(
          (f) =>
            width(`"${f.family}", serif`, f.sample) !== width(`"${f.family}", monospace`, f.sample),
        )
        .map((f) => f.family);
    }, MEASURE_FONTS);
    if (missing.length) throw new Error(`文字の幅を測るフォントがない: ${missing.join(', ')}`);

    mkdirSync(outDir, { recursive: true });
    for (const { id, code } of targets) {
      let size = { width: 0, height: 0 };
      for (const { suffix, theme } of THEMES) {
        const result = await page.evaluate(
          async ({ id, code, theme, fontFamily, wrappingWidth }) => {
            mermaid.initialize({
              startOnLoad: false,
              securityLevel: 'strict',
              theme,
              fontFamily,
              flowchart: { wrappingWidth },
            });
            const { svg } = await mermaid.render(id, code);
            const holder = document.createElement('div');
            holder.innerHTML = svg;
            const el = holder.querySelector('svg');
            if (!el) throw new Error('SVG が出力されなかった');
            const width = Math.ceil(el.viewBox.baseVal.width);
            const height = Math.ceil(el.viewBox.baseVal.height);
            // 画像として表示するため、大きさを固定する
            el.setAttribute('width', String(width));
            el.setAttribute('height', String(height));
            el.removeAttribute('style');
            // 端末のフォントの幅が測ったときより広くても、文字が欠けないようにする
            el.querySelector('style')?.prepend(`#${id} foreignObject{overflow:visible}`);
            return { svg: new XMLSerializer().serializeToString(el), width, height };
          },
          { id, code, theme, fontFamily: FONT_FAMILY, wrappingWidth: WRAPPING_WIDTH },
        );
        writeFileSync(join(outDir, fileName(id, suffix)), `${result.svg}\n`);
        size = { width: result.width, height: result.height };
      }
      manifest[id] = { hash: diagramHash(code), ...size };
      console.log(`${id}: ${size.width}×${size.height}`);
    }
  } finally {
    await browser.close();
  }
}

// 図がなくなった問題の画像を消す
const keep = new Set(
  diagrams.flatMap(({ id }) => THEMES.map(({ suffix }) => fileName(id, suffix))),
);
for (const file of existsSync(outDir) ? readdirSync(outDir) : []) {
  if (file.endsWith('.svg') && !keep.has(file)) {
    rmSync(join(outDir, file));
    console.log(`削除: ${file}`);
  }
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`図 ${diagrams.length}件（書き出し ${targets.length}件）`);
