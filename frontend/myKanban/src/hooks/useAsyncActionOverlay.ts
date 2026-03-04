import { useEffect, useRef, useState } from "react"

export type AsyncActionStatus = "idle" | "loading" | "success" | "error"

type RunAsyncActionOptions = {
    settleDelayMs?: number
    successDurationMs?: number
    errorDurationMs?: number
    evaluateSuccess?: () => boolean
    onSuccess?: () => void
    onError?: () => void
}

type UseAsyncActionOverlayOptions = {
    defaultSettleDelayMs?: number
    defaultSuccessDurationMs?: number
    defaultErrorDurationMs?: number
}

export function useAsyncActionOverlay(options?: UseAsyncActionOverlayOptions) {
    const [status, setStatus] = useState<AsyncActionStatus>("idle")
    const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

    const defaultSettleDelayMs = options?.defaultSettleDelayMs ?? 0
    const defaultSuccessDurationMs = options?.defaultSuccessDurationMs ?? 1500
    const defaultErrorDurationMs = options?.defaultErrorDurationMs ?? 1000

    const clearTimers = () => {
        timersRef.current.forEach((timer) => clearTimeout(timer))
        timersRef.current = []
    }

    const queueTimer = (callback: () => void, delay: number) => {
        const timer = setTimeout(() => {
            callback()
        }, delay)
        timersRef.current.push(timer)
    }

    const reset = () => {
        clearTimers()
        setStatus("idle")
    }

    const runWithOverlay = async (
        action: () => Promise<unknown>,
        runOptions?: RunAsyncActionOptions
    ) => {
        if (status !== "idle") return false

        setStatus("loading")

        const settleDelayMs = runOptions?.settleDelayMs ?? defaultSettleDelayMs
        const successDurationMs = runOptions?.successDurationMs ?? defaultSuccessDurationMs
        const errorDurationMs = runOptions?.errorDurationMs ?? defaultErrorDurationMs

        try {
            await action()

            const finalizeRequest = () => {
                const isSuccess = runOptions?.evaluateSuccess ? runOptions.evaluateSuccess() : true

                if (isSuccess) {
                    setStatus("success")
                    queueTimer(() => {
                        setStatus("idle")
                        runOptions?.onSuccess?.()
                    }, successDurationMs)
                    return
                }

                setStatus("error")
                queueTimer(() => {
                    setStatus("idle")
                    runOptions?.onError?.()
                }, errorDurationMs)
            }

            if (settleDelayMs > 0) {
                queueTimer(finalizeRequest, settleDelayMs)
            } else {
                finalizeRequest()
            }
        } catch {
            setStatus("error")
            queueTimer(() => {
                setStatus("idle")
                runOptions?.onError?.()
            }, errorDurationMs)
        }

        return true
    }

    useEffect(() => {
        return () => {
            clearTimers()
        }
    }, [])

    return {
        status,
        isActive: status !== "idle",
        isLocked: status !== "idle",
        reset,
        runWithOverlay,
    }
}
