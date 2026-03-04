import { CardActivityFeed } from "./CardActivityFeed"
import { CardActivityWrapper } from "./CardActivityWrapper"
import { useFetchFeedsForCard } from "@/hooks/useFetchFeedsForCard"
import { useEffect, useState } from "react"

type CardActivityProps = {
    cardID?: string | null
    workspaceId?: string
}

export const CardActivity = ({ cardID, workspaceId }: CardActivityProps) => {
    const { loadMore, hasMore, isLoading } = useFetchFeedsForCard(cardID ?? null, workspaceId);
    const [showNoMore, setShowNoMore] = useState(false);

    useEffect(() => {
        if (isLoading || hasMore) {
            setShowNoMore(false);
            return;
        }

        setShowNoMore(true);
        const id = setTimeout(() => {
            setShowNoMore(false);
        }, 1000);

        return () => clearTimeout(id);
    }, [hasMore, isLoading]);

    const onScrollEnd = () => {
        if (!hasMore || isLoading) return;
        void loadMore();
    }

    return (
        <CardActivityWrapper
            label="Activity"
            onScrollEnd={onScrollEnd}
            bottomOverlay={isLoading ? (
                <div className="rounded-md bg-[rgba(24,25,26,0.9)] px-2 py-2 backdrop-blur-sm">
                    <span className="text-xs text-neutral-300 animate-pulse">Loading more activity...</span>
                </div>
            ) : showNoMore ? (
                <div className="rounded-md bg-[rgba(24,25,26,0.9)] px-2 py-2 backdrop-blur-sm">
                    <span className="text-xs text-neutral-400 italic">No more activity</span>
                </div>
            ) : null}
        >
            <div className="relative mt-2 flex min-h-0 flex-col pr-6 ps-2">
                <CardActivityFeed filterFn={() => true} cardID={cardID ?? null} workspaceId={workspaceId} />
            </div>

        </CardActivityWrapper>
    )
}