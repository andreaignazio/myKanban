import { useShareLinksStore } from "@/stores/shareLinksStore";
import { useEffect, useState } from "react";

export const useJoinByToken = (token: string, isAuthenticated: boolean) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fetchShareLinkPublicPreviewByToken = useShareLinksStore((state) => state.fetchShareLinkPublicPreviewByToken);
    const fetchAuthenticatedShareLinkByToken = useShareLinksStore((state) => state.fetchShareLinkAuthenticatedByToken);
    const setCurrentJoiningToken = useShareLinksStore((state) => state.setCurrentJoiningToken);
    const getPublicEntityDataByToken = useShareLinksStore((state) => state.getPublicEntityDataByToken);
    const currentJoiningToken = useShareLinksStore((state) => state.currentJoiningToken);

    const shareLinkByToken = useShareLinksStore((state) => state.getShareLinkByToken);



    useEffect(() => {
        let cancelled = false;

        if (!token) {
            setCurrentJoiningToken(null);
            return;
        }

        setCurrentJoiningToken(token);
        setIsLoading(true);
        setError(null);

        const fetchData = isAuthenticated ? fetchAuthenticatedShareLinkByToken : fetchShareLinkPublicPreviewByToken;

        fetchData(token).then((preview) => {
            if (cancelled) {
                return;
            }
            if (!preview) {
                setError("Invalid or expired share link");
            }
        })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [token, fetchShareLinkPublicPreviewByToken, fetchAuthenticatedShareLinkByToken, isAuthenticated]);

    const entityData = token ? getPublicEntityDataByToken(token) : null;
    const shareLink = token ? shareLinkByToken(token) : null;

    return {
        isLoading,
        token,
        currentJoiningToken,
        entityData,
        shareLink,
        error,
    }
}