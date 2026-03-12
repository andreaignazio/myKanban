import { SignIn, useAuth } from "@clerk/react"
import { useEffect, useState } from "react"
import { Navigate, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { BoardBackgroundTransition, type BoardBackgroundSpec } from "@/components/BoardView/BoardBackgroundTransition"
import { useUiStore } from "@/stores/uiStore"

export default function SignInPage() {
    const { isLoaded, isSignedIn } = useAuth()
    const [searchParams] = useSearchParams()
    const redirectUrl = searchParams.get("redirect_url") ?? import.meta.env.VITE_CLERK_AFTER_SIGN_IN_URL ?? "/"

    const targetBg: BoardBackgroundSpec = {
        kind: "image",
        url: useUiStore.getState().sessionLandingBgUrl,
    }

    if (isLoaded && isSignedIn) {
        return <Navigate to={redirectUrl} replace />
    }

    const [isReallyLoaded, setIsReallyLoaded] = useState(false)

    useEffect(() => {
        if (isLoaded) {
            setTimeout(() => {
                setIsReallyLoaded(true)
            }, 1000)
        } else {
            setIsReallyLoaded(false)
        }
    }, [isLoaded])

    return (
        <div className="min-h-screen bg-main flex items-center justify-center px-4 py-8">
            <div className="absolute inset-0 w-full h-full -z-0">
                <BoardBackgroundTransition target={targetBg} />
            </div>

            <AnimatePresence mode="sync">
                {isReallyLoaded ? (
                    <motion.div
                        key="signin"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="absolute inset-0 w-full h-full flex items-center justify-center"
                    >
                        <SignIn
                            routing="path"
                            path="/sign-in"
                            signUpUrl={import.meta.env.VITE_CLERK_SIGN_UP_URL ?? "/sign-up"}
                            fallbackRedirectUrl={redirectUrl}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="skeleton"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                        className="absolute inset-0 w-full h-full flex items-center justify-center"
                    >
                        <SignSkeleton />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const SignSkeleton = () => {
    return (
        <div className="w-[400px] h-[550px] bg-zinc-700/50 flex flex-col gap-12 items-center justify-center rounded-[48px] backdrop-blur-md shadow-lg shadow-black/10 animate-pulse">
            <div className="flex flex-col gap-4 items-center w-full px-8">
                <div className="h-9 w-48 bg-zinc-500/60 rounded-xl" />
                <div className="h-4 w-64 bg-zinc-500/40 rounded-lg" />
                <div className="h-4 w-52 bg-zinc-500/40 rounded-lg" />
            </div>
            <div className="w-24 h-24 bg-zinc-500/50 rounded-[38px]" />
        </div>
    )
}