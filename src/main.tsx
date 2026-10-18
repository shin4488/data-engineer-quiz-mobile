import { useRegisterSW } from 'virtual:pwa-register/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { requestPersistence } from './lib/storage.ts';
import './styles.css';

function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="status">
      <span>新しいバージョンがあります</span>
      <button type="button" className="button primary" onClick={() => updateServiceWorker(true)}>
        更新
      </button>
      <button type="button" className="button ghost" onClick={() => setNeedRefresh(false)}>
        あとで
      </button>
    </div>
  );
}

// 保存データがブラウザに自動削除されにくくなるよう、起動時に依頼する
void requestPersistence();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <UpdateBanner />
      <App />
    </StrictMode>,
  );
}
