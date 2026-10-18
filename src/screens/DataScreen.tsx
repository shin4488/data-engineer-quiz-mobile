import { useEffect, useRef, useState } from 'react';
import { QUESTIONS } from '../data/questions.ts';
import {
  type AppData,
  DEFAULT_DATA,
  exportData,
  importData,
  requestPersistence,
} from '../lib/storage.ts';

interface Props {
  data: AppData;
  saveFailed: boolean;
  onReplace: (data: AppData) => void;
}

export function DataScreen({ data, saveFailed, onReplace }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [pasted, setPasted] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestPersistence().then(setPersisted);
  }, []);

  const fileName = () => {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return `pde-quiz-backup-${ymd}.json`;
  };

  const exportToFile = async () => {
    const text = exportData(data, Date.now());
    const file = new File([text], fileName(), { type: 'application/json' });
    // iPhone では共有シートから「ファイルに保存」を選べる
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        setMessage('書き出しました。');
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setMessage('書き出しに失敗しました。');
      }
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('書き出しました。');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(exportData(data, Date.now()));
      setMessage('クリップボードにコピーしました。メモなどに貼り付けて保存してください。');
    } catch {
      setMessage('コピーできませんでした。ファイルへの書き出しを使ってください。');
    }
  };

  const applyImport = (text: string) => {
    const result = importData(text);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (!confirm('いまの成績・見直しの印・途中の問題を、読み込むデータで置き換えますか？')) return;
    onReplace(result.data);
    setPasted('');
    setMessage('読み込みました。');
  };

  const answered = Object.keys(data.progress.stats).length;

  return (
    <div className="screen">
      <header className="app-header">
        <h1>データ</h1>
      </header>

      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {saveFailed && (
        <p className="notice notice-error" role="alert">
          この端末に保存できませんでした。プライベートブラウズでは保存できません。
        </p>
      )}

      <section className="card">
        <h2>保存しているデータ</h2>
        <p>
          解いた問題 {answered}問・見直しの印 {data.progress.marked.length}問
        </p>
        <p className="muted small">
          データはこの端末のブラウザにだけ保存し、外部には送信しません。
          {persisted === true && 'ブラウザに自動削除しないよう設定済みです。'}
          {persisted === false && 'ホーム画面に追加して使うと、データが消えにくくなります。'}
        </p>
      </section>

      <section className="card">
        <h2>書き出し（バックアップ）</h2>
        <p className="hint">機種変更の前などに、成績と見直しの印をファイルに保存します。</p>
        <div className="column">
          <button type="button" className="button block" onClick={exportToFile}>
            ファイルに書き出す
          </button>
          <button type="button" className="button block" onClick={copyToClipboard}>
            クリップボードにコピー
          </button>
        </div>
      </section>

      <section className="card">
        <h2>読み込み（復元）</h2>
        <p className="hint">書き出したデータで、いまのデータを置き換えます。</p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) applyImport(await file.text());
            e.target.value = '';
          }}
        />
        <div className="column">
          <button type="button" className="button block" onClick={() => fileRef.current?.click()}>
            ファイルから読み込む
          </button>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="コピーしたデータを貼り付け"
            rows={3}
          />
          <button
            type="button"
            className="button block"
            disabled={!pasted.trim()}
            onClick={() => applyImport(pasted)}
          >
            貼り付けたデータを読み込む
          </button>
        </div>
      </section>

      <section className="card">
        <h2>リセット</h2>
        <button
          type="button"
          className="button danger block"
          onClick={() => {
            if (
              confirm('成績・見直しの印・途中の問題をすべて削除しますか？') &&
              confirm('元に戻せません。本当に削除しますか？')
            ) {
              onReplace(DEFAULT_DATA);
              setMessage('すべてのデータを削除しました。');
            }
          }}
        >
          すべてのデータを削除
        </button>
      </section>

      <section className="card about">
        <h2>このアプリについて</h2>
        <p className="small">
          Google Cloud Professional Data Engineer 試験の学習用に作成した、非公式の練習問題集です（全
          {QUESTIONS.length}
          問）。実際の試験問題ではありません。内容は公式ドキュメントで確認してください。
        </p>
        <p className="small muted">
          Google Cloud は Google LLC の商標です。このアプリは Google とは関係ありません。
        </p>
        <p className="small muted">バージョン {__APP_VERSION__}</p>
      </section>
    </div>
  );
}
