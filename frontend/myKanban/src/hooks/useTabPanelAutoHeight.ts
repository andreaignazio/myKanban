import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type UseTabPanelAutoHeightParams<TTab extends string> = {
    activeTab: TTab
    minHeightByTab: Record<TTab, number>
    maxHeight?: number
}

type UseTabPanelAutoHeightResult<TTab extends string> = {
    resolvedPanelHeight: number
    getPanelRef: (tab: TTab) => (el: HTMLDivElement | null) => void
}

export function useTabPanelAutoHeight<TTab extends string>({
    activeTab,
    minHeightByTab,
    maxHeight = Number.POSITIVE_INFINITY,
}: UseTabPanelAutoHeightParams<TTab>): UseTabPanelAutoHeightResult<TTab> {
    const elementsRef = useRef<Partial<Record<TTab, HTMLDivElement | null>>>({})
    const observersRef = useRef<Partial<Record<TTab, ResizeObserver>>>({})

    const [observedHeightByTab, setObservedHeightByTab] = useState<Record<TTab, number>>(minHeightByTab)

    const observeTabElement = useCallback((tab: TTab, el: HTMLDivElement | null) => {
        const currentObserver = observersRef.current[tab]
        if (currentObserver) {
            currentObserver.disconnect()
            delete observersRef.current[tab]
        }

        elementsRef.current[tab] = el

        if (!el) {
            return
        }

        const updateHeight = () => {
            const nextHeight = Math.ceil(el.scrollHeight)
            setObservedHeightByTab((prev) => {
                if (prev[tab] === nextHeight) {
                    return prev
                }
                return { ...prev, [tab]: nextHeight }
            })
        }

        updateHeight()
        const observer = new ResizeObserver(() => updateHeight())
        observer.observe(el)
        observersRef.current[tab] = observer
    }, [])

    const getPanelRef = useCallback((tab: TTab) => {
        return (el: HTMLDivElement | null) => {
            observeTabElement(tab, el)
        }
    }, [observeTabElement])

    useEffect(() => {
        return () => {
            for (const key in observersRef.current) {
                const observer = observersRef.current[key as TTab]
                observer?.disconnect()
            }
        }
    }, [])

    const resolvedPanelHeight = useMemo(() => {
        const minHeight = minHeightByTab[activeTab]
        const observedHeight = observedHeightByTab[activeTab] ?? minHeight
        return Math.min(maxHeight, Math.max(minHeight, observedHeight))
    }, [activeTab, minHeightByTab, observedHeightByTab, maxHeight])

    return {
        resolvedPanelHeight,
        getPanelRef,
    }
}
