# engineer-quiz-mobile

Google Cloud Professional Data Engineer 試験の練習問題を、スマートフォンで解くための Web アプリ（PWA）です。iPhone のホーム画面に追加すると、アプリと同じように全画面で使えます。

非公式の問題集です。実際の試験問題ではありません。Google Cloud は Google LLC の商標です。

## 機能

| 機能 | 内容 |
| --- | --- |
| 練習 | 1問ごとに正誤、選択肢ごとの理由、解説、公式ドキュメントへのリンクを表示する。一部の問題には図も付く |
| 模擬試験 | 全範囲から50問・120分。最後にまとめて採点する |
| 出題の絞り込み | 試験ガイドの5分野、サービス、見直しの印、累計の間違えた回数（N回以上）、未回答。種類の違う条件は「かつ」、同じ種類の中は「または」で組み合わせる |
| 出題数 | 3／5／10／20／30／50／全部。範囲内からランダムに出題し、選択肢の順番も毎回入れ替える |
| 成績 | 分野別・サービス別の正答率、最近の結果 |
| コピー | 問題文と選択肢（画面と同じ記号と順番）をまとめてコピーする。AI チャットなどに貼り付けて質問する用途 |
| データ | 書き出し・読み込み・全削除 |

成績・見直しの印・途中の回答は、端末のブラウザ（localStorage）にだけ保存し、外部には送信しません。

## iPhone で使う

1. Safari で公開 URL（`https://shin4488.github.io/engineer-quiz-mobile/`）を開く
2. 共有ボタンから「ホーム画面に追加」を選ぶ（iOS 26 以降で表示される「Webアプリとして開く」はオンのまま）
3. 以降はホーム画面のアイコンから開く

Safari で直接開いたときと、ホーム画面のアイコンから開いたときでは、保存領域が別になります。

## 開発

Node.js のバージョンは `.nvmrc` に合わせます。

```bash
npm ci
npm run dev                 # 開発サーバー
npm test                    # テスト
npm run lint                # Biome
npm run typecheck           # 型チェック
npm run validate:questions  # 問題データの形式チェック
npm run render:diagrams     # 問題の図を SVG 画像に書き出す（Chromium が必要）
npm run check:links         # 参考リンクが開けるか確認（ネットワークが必要）
npm run build               # dist/ に出力
```

### 問題の追加・修正

問題は `src/data/questions/*.yaml` にあり、ファイル名が問題IDの接頭辞になります（例：`design-security-001`）。項目の定義と検証は `src/data/validate.ts`、分野とサービスの一覧は `src/data/categories.ts` を参照してください。

問題IDは成績の保存に使うため、公開後に変更・再利用しないでください。問題を削除した場合、その問題の成績は表示されなくなります。

図（`diagram` に Mermaid で書く）を追加・変更したら `npm run render:diagrams` を実行し、書き出した `src/data/diagrams/` もコミットしてください。アプリは書き出した SVG 画像を表示します。書き出しには Playwright の Chromium を使います（未導入なら `npx playwright install chromium`）。書き出し忘れはテストで検出します。

## 公開

`main` に push すると、GitHub Actions（`.github/workflows/deploy.yml`）が lint・型チェック・問題データの検証・テスト・ビルドを行い、GitHub Pages に公開します。
