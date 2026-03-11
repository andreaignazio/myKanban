import { useAuth } from "@clerk/react"
import type { PropsWithChildren } from "react"
import { Navigate, useLocation } from "react-router-dom"

export function RequireAuth({ children }: PropsWithChildren) {
    const { isLoaded, isSignedIn } = useAuth()
    const location = useLocation()

    if (!isLoaded) {
        return null
    }

    if (!isSignedIn) {
        const redirectUrl = `${location.pathname}${location.search}`
        return <Navigate to={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`} replace />
    }

    return children
}