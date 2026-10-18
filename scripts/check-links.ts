// 使い方: node scripts/check-links.ts
// 問題の references にある URL を開き、ページが存在するか確かめる。
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const dir = join(import.meta.dirname, '../src/data/questions');
const CONCURRENCY = 6;
const RETRIES = 2;

const usedBy = new Map<string, string[]>();
for (const file of readdirSync(dir).filter((f) => f.endsWith('.yaml'))) {
  const questions = parse(readFileSync(join(dir, file), 'utf8')) as {
    id: string;
    references?: { url: string }[];
  }[];
  for (const q of questions) {
    for (const ref of q.references ?? []) {
      usedBy.set(ref.url, [...(usedBy.get(ref.url) ?? []), q.id]);
    }
  }
}

async function check(url: string): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
      if (res.ok) return null;
      // 一時的な制限やサーバーエラーは、少し待って再試行する
      if ((res.status === 429 || res.status >= 500) && attempt < RETRIES) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return `HTTP ${res.status}`;
    } catch (e) {
      if (attempt < RETRIES) continue;
      return (e as Error).message;
    }
  }
}

const urls = [...usedBy.keys()];
const failures: string[] = [];
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < urls.length) {
      const url = urls[next++] as string;
      const error = await check(url);
      if (error) failures.push(`${error}  ${url}  (${usedBy.get(url)?.join(', ')})`);
    }
  }),
);

console.log(`${urls.length}件の URL を確認し、${failures.length}件を開けませんでした。`);
for (const f of failures.sort()) console.error(f);
process.exit(failures.length ? 1 : 0);
