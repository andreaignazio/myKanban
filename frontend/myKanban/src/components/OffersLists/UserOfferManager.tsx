import { forwardRef } from "react"
import { UserBoardOutgoingRequests } from "./UserBoardOutgoingRequests"
import { UserWorkspaceReceivedInvites } from "./UserWorkspaceReceivedInvites"
import { UserWorkspaceOutgoingRequests } from "./UserWorkspaceOutgoingRequests"
import { UserBoardReceivedInvites } from "./UserBoardReceivedInvites"
import { useShareOffersStore } from "@/stores/shareOffersStore"
import { useShallow } from "zustand/shallow"
import { OfferManagerShell, type TabDef } from "./OfferManagerShell"
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes"

type UserOfferManagerProps = {
    onClose?: () => void;
    requestKey?: AsyncRequestKey | AsyncRequestKey[];
}


export const UserOfferManager = forwardRef<HTMLDivElement, UserOfferManagerProps>(({ onClose, requestKey }, ref) => {
    const pendingCounts = useShareOffersStore(useShallow((state) => state.getPendingIncomingCountUserInvitesByEntity()))


    const userTabs: TabDef[] = [
        {
            id: "ub-requests-sent",
            label: "Sent Requests",
            title: "Board Access Requests",
            description: "Track the board access requests you've sent and their current status.",
            render: (p) => <UserBoardOutgoingRequests showOnlyPending={p} />,
        },
        {
            id: "ub-invites-received",
            label: "Board Invites",
            title: "Received Board Invites",
            description: "Boards you've been invited to join. Accept or decline from here.",
            counter: pendingCounts.UserBoardInvites,
            render: (p) => <UserBoardReceivedInvites showOnlyPending={p} />,
        },
        {
            id: "ws-invites-received",
            label: "Workspace Invites",
            title: "Received Workspace Invites",
            description: "Workspace invitations waiting for your response.",
            counter: pendingCounts.UserWorkspaceInvites,
            render: (p) => <UserWorkspaceReceivedInvites showOnlyPending={p} />,
        },
        {
            id: "ws-requests-sent",
            label: "Workspace Requests",
            title: "Workspace Access Requests",
            description: "Workspace access requests you've submitted and their current status.",
            render: (p) => <UserWorkspaceOutgoingRequests showOnlyPending={p} />,
        },
    ]

    return <OfferManagerShell ref={ref} onClose={onClose} requestKey={requestKey} tabs={userTabs} defaultTabIdx={1} />
})