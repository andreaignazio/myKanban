import { useEffect, useRef, useState } from "react";

export function useObservedHeight(initialHeight = 0) {
    const elementRef = useRef<HTMLDivElement | null>(null);
    const [height, setHeight] = useState(initialHeight);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        const updateHeight = () => {
            setHeight(Math.ceil(element.scrollHeight));
        };

        updateHeight();
        const observer = new ResizeObserver(() => updateHeight());
        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return { elementRef, height };
}
