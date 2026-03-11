/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_ORIGIN?: string
    readonly VITE_API_BASE_URL?: string
    readonly VITE_DEV_API_TARGET?: string
    readonly VITE_WS_ORIGIN?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}