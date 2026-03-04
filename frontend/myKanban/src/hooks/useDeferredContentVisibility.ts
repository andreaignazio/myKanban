import { useCallback, useEffect, useState, type TransitionEvent } from "react";

type UseDeferredContentVisibilityOptions = {
    isCollapsed: boolean;
    collapseStartDelayMs?: number;
    revealFallbackDelayMs?: number;
    transitionProperty?: string;
};

export const useDeferredContentVisibility = ({
    isCollapsed,
    collapseStartDelayMs = 70,
    revealFallbackDelayMs = 380,
    transitionProperty = "transform",
}: UseDeferredContentVisibilityOptions) => {
    const [isCollapsedAnimated, setIsCollapsedAnimated] = useState(isCollapsed);
    const [isContentHidden, setIsContentHidden] = useState(isCollapsed);
    const [isWaitingReveal, setIsWaitingReveal] = useState(false);

    useEffect(() => {
        let timerId: ReturnType<typeof setTimeout> | null = null;

        if (isCollapsed) {
            setIsWaitingReveal(false);
            setIsContentHidden(true);
            timerId = setTimeout(() => {
                setIsCollapsedAnimated(true);
            }, collapseStartDelayMs);
        } else {
            setIsCollapsedAnimated(false);
            setIsContentHidden(true);
            setIsWaitingReveal(true);
            timerId = setTimeout(() => {
                setIsContentHidden(false);
                setIsWaitingReveal(false);
            }, revealFallbackDelayMs);
        }

        return () => {
            if (timerId) {
                clearTimeout(timerId);
            }
        };
    }, [collapseStartDelayMs, isCollapsed, revealFallbackDelayMs]);

    const handleTransitionEnd = useCallback((event: TransitionEvent<Element>) => {
        if (event.propertyName !== transitionProperty) return;
        if (!isWaitingReveal) return;
        setIsContentHidden(false);
        setIsWaitingReveal(false);
    }, [isWaitingReveal, transitionProperty]);

    return {
        isCollapsedAnimated,
        isContentHidden,
        isWaitingReveal,
        handleTransitionEnd,
    };
};
