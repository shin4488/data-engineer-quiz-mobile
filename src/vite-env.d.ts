/// <reference types="vite/client" />

declare module '*.yaml' {
  const data: unknown;
  export default data;
}

declare const __APP_VERSION__: string;
