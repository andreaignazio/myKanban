
import { GridBuilder, type ColumnDefinition } from "./UserBoardOutgoingRequests"
import { forwardRef, useEffect, useState } from "react"

import { useShallow } from "zustand/shallow"
import { useParams } from "react-router-dom"
import type { PublicShareLink } from "@/stores/types"
import { useShareLinksStore } from "@/stores/shareLinksStore"

export const WorkspaceShareLinks = forwardRef<HTMLDivElement, {}>((props, ref) => {


    //const fetchUserBoardAccessSentRequests = useShareOffersStore((state) => state.fetchUserBoardAccessSentRequests)
    const fetchShareLinksByTargetId = useShareLinksStore((state) => state.fetchShareLinksByTargetId)
    const idsByWorkspaceId = useShareLinksStore(useShallow((state) => state.shareLinkIdsByTargetId))
    const [offersIds, setOffersIds] = useState<string[]>([])



    const workspaceId = useParams().workspaceId as string
    useEffect(() => {

        fetchShareLinksByTargetId(workspaceId);

    }, [fetchShareLinksByTargetId, workspaceId])


    useEffect(() => {
        setOffersIds(idsByWorkspaceId[workspaceId] || [])
    }, [idsByWorkspaceId, workspaceId])



    function getActionForLink(link: PublicShareLink) {
        if (link.RevokedAt) {
            return "revoked";
        } else if (link.RevokedAt === null) {
            return "revoke";
        }
        return null;
    }



    const columns: ColumnDefinition<PublicShareLink>[] = [
        { name: "Link", key: "link", width: "1fr", align: "start", getValue: (link: PublicShareLink) => link.Token },
        //{ name: "Workspace", key: "workspace", width: "1.5fr", align: "center", getValue: (offer: ShareOffer) => getWorkspaceIdFromOffer(offer) },
        { name: "Creator", key: "sender", width: "2fr", getValue: (link: PublicShareLink) => link.CreatedByUserID },
        //{ name: "Stato", key: "status", width: "0.5fr", align: "center", getValue: (offer: ShareOffer) => offer.Status },
        { name: "Stato", key: "linkstatus", width: "0.5fr", align: "center", getValue: (link: PublicShareLink) => link.RevokedAt ? "revoked" : "active" },
        { name: "Ruolo", key: "role", width: "0.5fr", align: "center", getValue: (link: PublicShareLink) => link.Role },
        { name: "Data", key: "date", width: "1.2fr", align: "center", getValue: (link: PublicShareLink) => link.CreatedAt },

        { name: "Azione", key: "action", width: "90px", align: "center", getValue: (link: PublicShareLink) => getActionForLink(link) },
    ]

    return (
        <div
            ref={ref}
            className="theme-dark w-fit h-60vh flex bg-main flex-col
            overflow-hidden 
            items-center justify-start  
            font-grotesk text-neutral-200"
        >
            <div className="w-full max-w-5xl flex flex-col gap-2 mb-4">
                <p className="text-2xl font-semibold tracking-tight text-text">Inbox</p>
                <p className="text-sm text-text/70">Condivisioni ricevute, stato e mittenti in un colpo d'occhio.</p>
            </div>

            <div className="w-full max-w-5xl flex flex-col gap-3 animate-rise-in">


                <GridBuilder columns={columns} data={offersIds} CustomLookup={(id) => useShareLinksStore((state) => state.shareLinksById[id])} />
            </div>
        </div>
    )
})