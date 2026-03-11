export type SessionTokenGetter = () => Promise<string | null>

let sessionTokenGetter: SessionTokenGetter | null = null

export function setSessionTokenGetter(getter: SessionTokenGetter | null) {
    sessionTokenGetter = getter
}

export async function getSessionToken(): Promise<string | null> {
    if (!sessionTokenGetter) {
        return null
    }

    try {
        return await sessionTokenGetter()
    } catch (error) {
        console.warn("[auth] failed to resolve Clerk session token", error)
        return null
    }
}