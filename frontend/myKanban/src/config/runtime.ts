type RuntimeEnv = ImportMetaEnv & Record<string, string | boolean | undefined>

const runtimeEnv = import.meta.env as RuntimeEnv

function readRuntimeEnv(name: string): string | undefined {
    const value = runtimeEnv[name]
    if (typeof value !== "string") {
        return undefined
    }

    const trimmed = value.trim()
    if (trimmed === "") {
        return undefined
    }

    return trimmed.replace(/\/+$/, "")
}

function toWebSocketOrigin(origin: string): string {
    const url = new URL(origin)
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
    return url.origin
}

export function getAppOrigin(): string {
    return readRuntimeEnv("VITE_APP_ORIGIN") ?? window.location.origin
}

export function getApiBaseURL(): string {
    return readRuntimeEnv("VITE_API_BASE_URL") ?? "/api"
}

export function buildAppURL(pathname: string): string {
    const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`
    return `${getAppOrigin()}${normalizedPath}`
}

export function getWebSocketOrigin(): string {
    const configuredOrigin = readRuntimeEnv("VITE_WS_ORIGIN")
    if (configuredOrigin) {
        return toWebSocketOrigin(configuredOrigin)
    }

    return `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`
}