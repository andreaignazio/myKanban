import { forwardRef } from "react"
import { BoardReceivedRequests } from "./BoardReceivedRequests"
import { BoardSentInvites } from "./BoardSentInvites"
import { OfferManagerShell, type TabDef } from "./OfferManagerShell"
import { useShareOffersStore } from "@/stores/shareOffersStore"
import { useParams } from "react-router-dom"
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes"

type BoardOfferManagerProps = {
    onClose?: () => void;
    requestKey?: AsyncRequestKey | AsyncRequestKey[];
}

export const BoardOfferManager = forwardRef<HTMLDivElement, BoardOfferManagerProps>(({ onClose, requestKey }, ref) => {
    const boardId = useParams().boardId ?? ""
    const pendingCount = useShareOffersStore((state) => state.getBoardPendingIncomingRequests(boardId))

    const boardTabs: TabDef[] = [
        {
            id: "b-requests-received",
            label: "Received Requests",
            title: "Board Access Requests",
            description: "Manage access requests from users who want to join this board.",
            counter: pendingCount,
            render: (p) => <BoardReceivedRequests showOnlyPending={p} />,
        },
        {
            id: "b-invites-sent",
            label: "Sent Invites",
            title: "Sent Board Invites",
            description: "Invites you've sent to users to join this board and their current status.",
            render: (p) => <BoardSentInvites showOnlyPending={p} />,
        },
    ]

    return <OfferManagerShell
        className="!w-[clamp(300px,750px,80vw)]"
        ref={ref} onClose={onClose} requestKey={requestKey} tabs={boardTabs} />
})
