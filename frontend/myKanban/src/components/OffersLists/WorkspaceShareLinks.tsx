
import { GridBuilder, type ColumnDefinition } from "./UserBoardOutgoingRequests"
import { forwardRef, useEffect, useState } from "react"

import { useShallow } from "zustand/shallow"
import { useParams } from "react-router-dom"
import type { PublicShareLink } from "@/stores/types"
import { useShareLinksStore } from "@/stores/shareLinksStore"
import { ExclamationCircleIcon, XCircleIcon } from "@heroicons/react/24/outline"

function RevokeLinkCell({ shareId, isRevoked }: { shareId: string; isRevoked: boolean }) {
    const revokeWorkspaceShareLink = useShareLinksStore((state) => state.revokeWorkspaceShareLink);

    if (isRevoked) {
        return (
            <div className="flex items-center justify-center h-16 w-16">
                <XCircleIcon className="w-5 h-5 text-red-500 opacity-50" />
            </div>
        );
    }

    return (
        <div
            onClick={() => revokeWorkspaceShareLink(shareId)}
            className="flex flex-row items-center justify-center gap-1 h-16 w-16 hover:brightness-110 hover:cursor-pointer rounded-md py-1 px-2"
        >
            <span className="hidden lg:block text-nowrap text-sm">Revoke</span>
            <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
        </div>
    );
}

export const WorkspaceShareLinks = forwardRef<HTMLDivElement, { showOnlyActive?: boolean }>(({ showOnlyActive }, ref) => {


    //const fetchUserBoardAccessSentRequests = useShareOffersStore((state) => state.fetchUserBoardAccessSentRequests)
    const fetchShareLinksByTargetId = useShareLinksStore((state) => state.fetchShareLinksByTargetId)
    const idsByWorkspaceId = useShareLinksStore(useShallow((state) => state.shareLinkIdsByTargetId))
    const [offersIds, setOffersIds] = useState<string[]>([])

    const shareLinksById = useShareLinksStore((state) => state.shareLinksById)

    const workspaceId = useParams().workspaceId as string
    useEffect(() => {

        fetchShareLinksByTargetId(workspaceId);

    }, [fetchShareLinksByTargetId, workspaceId])


    useEffect(() => {
        const all = idsByWorkspaceId[workspaceId] || [];
        setOffersIds(showOnlyActive ? all.filter(id => !shareLinksById[id]?.RevokedAt) : all);
    }, [idsByWorkspaceId, workspaceId, showOnlyActive, shareLinksById])



    function getActionForLink(link: PublicShareLink) {
        return link.RevokedAt ? "rejected" : "revoke";
    }

    const columns: ColumnDefinition<PublicShareLink>[] = [
        { name: "Link", key: "link", width: "1fr", align: "start", getValue: (link: PublicShareLink) => link.Token },
        { name: "Creator", key: "sender", width: "2fr", getValue: (link: PublicShareLink) => link.CreatedByUserID },
        { name: "Stato", key: "linkstatus", width: "0.5fr", align: "center", getValue: (link: PublicShareLink) => link.RevokedAt ? "revoked" : "active" },
        { name: "Ruolo", key: "role", width: "0.5fr", align: "center", getValue: (link: PublicShareLink) => link.Role },
        { name: "Data", key: "date", width: "1.2fr", align: "center", getValue: (link: PublicShareLink) => link.CreatedAt },
        {
            name: "Azione", key: "action", width: "90px", align: "center",
            getValue: (link: PublicShareLink) => getActionForLink(link),
            renderCell: ({ shareId, row }) => (
                <RevokeLinkCell shareId={shareId} isRevoked={Boolean((row as PublicShareLink)?.RevokedAt)} />
            ),
        },
    ]

    return (
        <div
            ref={ref}
            className="theme-dark w-full flex bg-main flex-col
            items-center justify-start  
            font-grotesk text-neutral-200"
        >
            <div className="w-full max-w-5xl flex flex-col gap-2 mb-4">
                <p className="text-2xl font-semibold tracking-tight text-text">Public Links</p>
                <p className="text-sm text-zinc-400 max-w-xl">Shareable links let anyone with the URL join this workspace — no invitation required. Each link can be scoped to a specific role and optionally set to expire. Revoke a link at any time to block future access.</p>
            </div>

            <div className="w-full max-w-5xl flex flex-col gap-3 animate-rise-in">


                <GridBuilder columns={columns} data={offersIds} CustomLookup={(id) => shareLinksById[id]} />
            </div>
        </div>
    )
})