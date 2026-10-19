# 開発ガイド

Google Cloud Professional Data Engineer 試験の練習問題アプリ（React + TypeScript + Vite の PWA）。使い方とコマンドは [README](README.md) を読む。

## 構成

| 場所 | 内容 |
| --- | --- |
| `src/data/questions/*.yaml` | 問題データ。ファイル名が問題IDの接頭辞 |
| `src/data/diagrams/` | 問題の図（Mermaid）を書き出した SVG 画像。`npm run render:diagrams` で作る |
| `src/data/validate.ts` | 問題データの形式の定義と検証。テストと `scripts/validate-questions.ts` で共有する |
| `src/data/categories.ts` | 試験ガイドの5分野とサービスのタグ |
| `src/lib/` | 絞り込み・出題・採点・保存。画面に依存しない |
| `src/screens/`, `src/components/` | 画面 |

## 守ること

- 問題IDは利用者の成績の保存キーになる。公開後は変更・再利用しない。
- 保存データの形式（`src/lib/storage.ts`）を変えるときは、既存のデータと書き出したファイルを読み込めるようにする。
- 問題は実際の試験問題を使わず、公式ドキュメントで確かめたオリジナルの内容にする。参考リンクは `https://docs.cloud.google.com/` の公式ドキュメントに限る。
- 利用者のデータを外部に送信する機能を追加しない。

## 検証

変更に応じて `npm run lint`、`npm run typecheck`、`npm test`、`npm run build` を実行する。問題データを変えたら `npm run validate:questions` も実行する。図を変えたら `npm run render:diagrams` で画像を書き出す。CI（`.github/workflows/deploy.yml`）も同じ確認を行う。
