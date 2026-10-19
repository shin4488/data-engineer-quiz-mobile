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
  // 公開先のパスに依存しないよう、相対パスで出力する
  base: './',
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
        // 図の画像を含め、すべてのファイルを事前にキャッシュし、オフラインでも使えるようにする
        globPatterns: ['**/*.{html,js,css,svg,png}'],
      },
    }),
  ],
  build: {
    // 問題データを含む本体は大きくなるため、警告の上限を上げる
    chunkSizeWarningLimit: 2000,
  },
  test: {
    environment: 'jsdom',
  },
});
