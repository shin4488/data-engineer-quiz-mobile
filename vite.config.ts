/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { parse } from 'yaml';

// 問題データは YAML で管理し、ビルド時に JSON へ変換して取り込む。
const yaml = (): Plugin => ({
  name: 'yaml',
  transform(code, id) {
    if (!id.endsWith('.yaml')) return null;
    return { code: `export default ${JSON.stringify(parse(code))};`, map: null };
  },
});

const buildDate = new Date().toISOString().slice(0, 10);

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(`${process.env.npm_package_version ?? 'dev'} (${buildDate})`),
  },
  // GitHub Pages のプロジェクトサイトは /<リポジトリ名>/ で配信される
  base: '/data-engineer-quiz-mobile/',
  plugins: [
    yaml(),
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'PDE 対策問題集',
        short_name: 'PDE問題集',
        description: 'Google Cloud Professional Data Engineer 試験の非公式の練習問題集',
        lang: 'ja',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#f6f7f9',
        theme_color: '#f6f7f9',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 起動に必要なファイルだけを事前にキャッシュする。Mermaid は図の種類ごとに分割されて
        // 合計が数 MB になるため、表示したときに取得したファイルだけをキャッシュする。
        globPatterns: ['**/*.{html,css,svg,png}', 'assets/index-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 180 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    // Mermaid は図を表示するときだけ読み込むため、大きなチャンクの警告は対象外にする
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'jsdom',
  },
});
