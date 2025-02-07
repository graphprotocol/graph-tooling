/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID: string;
  readonly VITE_STUDIO_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
