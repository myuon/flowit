/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API URL (handles OAuth flow with client_secret on the server) */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
