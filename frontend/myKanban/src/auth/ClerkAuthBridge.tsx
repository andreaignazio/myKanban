import { useAuth, useUser } from "@clerk/react"
import { useEffect } from "react"
import { setSessionTokenGetter } from "@/auth/session"
import { useAuthStore } from "@/stores/auth"

export function ClerkAuthBridge() {
    const { getToken, isLoaded, isSignedIn } = useAuth()
    const { user } = useUser()

    useEffect(() => {
        setSessionTokenGetter(async () => {
            if (!isSignedIn) {
                return null
            }

            return (await getToken()) ?? null
        })

        return () => {
            setSessionTokenGetter(null)
        }
    }, [getToken, isSignedIn])

    useEffect(() => {
        if (!isLoaded) {
            return
        }

        if (!isSignedIn) {
            useAuthStore.getState().clearAuthSession()
            return
        }

        void useAuthStore.getState().hydrate()
    }, [isLoaded, isSignedIn, user?.id])

    return null
}