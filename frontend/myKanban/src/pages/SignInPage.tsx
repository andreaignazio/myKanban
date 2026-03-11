import { SignIn, useAuth } from "@clerk/react"
import { Navigate, useSearchParams } from "react-router-dom"

export default function SignInPage() {
    const { isLoaded, isSignedIn } = useAuth()
    const [searchParams] = useSearchParams()
    const redirectUrl = searchParams.get("redirect_url") ?? import.meta.env.VITE_CLERK_AFTER_SIGN_IN_URL ?? "/"

    if (isLoaded && isSignedIn) {
        return <Navigate to={redirectUrl} replace />
    }

    return (
        <div className="min-h-screen bg-main flex items-center justify-center px-4 py-8">
            <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl={import.meta.env.VITE_CLERK_SIGN_UP_URL ?? "/sign-up"}
                fallbackRedirectUrl={redirectUrl}
            />
        </div>
    )
}