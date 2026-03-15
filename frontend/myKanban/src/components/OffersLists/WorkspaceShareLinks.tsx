
import { GridBuilder, type ColumnDefinition } from "./UserBoardOutgoingRequests"
import { forwardRef, useEffect, useMemo, useState } from "react"

import { useShallow } from "zustand/shallow"
import { useParams } from "react-router-dom"
import type { PublicShareLink } from "@/stores/types"
import { useShareLinksStore } from "@/stores/shareLinksStore"
import { ExclamationCircleIcon, XCircleIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline"
import { LabeledButtonPresetA } from "@/components/buttons/labeledButton"

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
    const [sortAsc, setSortAsc] = useState(false)

    const shareLinksById = useShareLinksStore((state) => state.shareLinksById)

    const workspaceId = useParams().workspaceId as string
    useEffect(() => {

        fetchShareLinksByTargetId(workspaceId);

    }, [fetchShareLinksByTargetId, workspaceId])


    useEffect(() => {
        const all = idsByWorkspaceId[workspaceId] || [];
        setOffersIds(showOnlyActive ? all.filter(id => !shareLinksById[id]?.RevokedAt) : all);
    }, [idsByWorkspaceId, workspaceId, showOnlyActive, shareLinksById])

    const sortedIds = useMemo(() => {
        return [...offersIds].sort((a, b) => {
            const ta = new Date(shareLinksById[a]?.CreatedAt ?? 0).getTime();
            const tb = new Date(shareLinksById[b]?.CreatedAt ?? 0).getTime();
            return sortAsc ? ta - tb : tb - ta;
        });
    }, [offersIds, sortAsc, shareLinksById])

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


            <div className="w-full max-w-5xl flex flex-col gap-3 animate-rise-in">
                <div className="flex justify-end">
                    <LabeledButtonPresetA
                        label={sortAsc ? "Oldest first" : "Newest first"}
                        onClick={() => setSortAsc(v => !v)}
                    >
                        {sortAsc
                            ? <ArrowUpIcon className="w-4 h-4" />
                            : <ArrowDownIcon className="w-4 h-4" />}
                    </LabeledButtonPresetA>
                </div>

                <GridBuilder columns={columns} data={sortedIds} CustomLookup={(id) => shareLinksById[id]} />
            </div>
        </div>
    )
})