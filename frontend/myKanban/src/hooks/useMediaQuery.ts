import { useEffect, useState } from "react";

export function useMediaQuery(query: string, defaultState = false) {
    const getMatches = () => {
        if (typeof window === "undefined") {
            return defaultState;
        }
        return window.matchMedia(query).matches;
    };

    const [matches, setMatches] = useState<boolean>(getMatches);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const mediaQueryList = window.matchMedia(query);
        const onChange = (event: MediaQueryListEvent) => {
            setMatches(event.matches);
        };

        setMatches(mediaQueryList.matches);
        mediaQueryList.addEventListener("change", onChange);
        return () => mediaQueryList.removeEventListener("change", onChange);
    }, [query]);

    return matches;
}
