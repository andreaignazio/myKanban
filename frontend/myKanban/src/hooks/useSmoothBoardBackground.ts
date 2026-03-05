import { useEffect, useState } from "react"

export type BoardBackgroundSpec =
    | { kind: "color"; className: string; colorToken: string | null }
    | { kind: "image"; url: string }

type UseSmoothBoardBackgroundOptions = {
    transitionMs?: number
    frameDelayMs?: number
}

function isSameBoardBackground(a: BoardBackgroundSpec, b: BoardBackgroundSpec) {
    if (a.kind !== b.kind) return false
    if (a.kind === "color" && b.kind === "color") {
        return a.className === b.className && a.colorToken === b.colorToken
    }
    if (a.kind === "image" && b.kind === "image") {
        return a.url === b.url
    }
    return false
}

export function useSmoothBoardBackground(
    target: BoardBackgroundSpec,
    options: UseSmoothBoardBackgroundOptions = {}
) {
    const transitionMs = options.transitionMs ?? 320
    const frameDelayMs = options.frameDelayMs ?? 16

    const [activeBackground, setActiveBackground] = useState<BoardBackgroundSpec>(target)
    const [incomingBackground, setIncomingBackground] = useState<BoardBackgroundSpec | null>(null)
    const [incomingVisible, setIncomingVisible] = useState(false)

    useEffect(() => {
        if (isSameBoardBackground(activeBackground, target)) {
            return
        }

        let cancelled = false
        let commitTimer: ReturnType<typeof setTimeout> | null = null
        let showTimer: ReturnType<typeof setTimeout> | null = null

        const startTransition = (next: BoardBackgroundSpec) => {
            if (cancelled) return

            setIncomingBackground(next)
            showTimer = setTimeout(() => {
                if (!cancelled) {
                    setIncomingVisible(true)
                }
            }, frameDelayMs)

            commitTimer = setTimeout(() => {
                if (cancelled) return
                setActiveBackground(next)
                setIncomingBackground(null)
                setIncomingVisible(false)
            }, transitionMs)
        }

        if (target.kind === "image") {
            const img = new Image()
            img.src = target.url
            img.onload = () => startTransition(target)
            img.onerror = () => startTransition(target)
        } else {
            startTransition(target)
        }

        return () => {
            cancelled = true
            if (showTimer) clearTimeout(showTimer)
            if (commitTimer) clearTimeout(commitTimer)
        }
    }, [target, activeBackground, transitionMs, frameDelayMs])

    return {
        activeBackground,
        incomingBackground,
        incomingVisible,
    }
}
