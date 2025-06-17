/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BREEZ_API_KEY: string;
  // add more environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}