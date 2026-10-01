/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_LOGIN_ORIGIN?: string
  readonly VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
