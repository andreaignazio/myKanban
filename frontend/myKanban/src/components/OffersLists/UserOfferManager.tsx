import { forwardRef, useState } from "react"
import { UserBoardOutgoingRequests } from "./UserBoardOutgoingRequests"
import { UserWorkspaceReceivedInvites } from "./UserWorkspaceReceivedInvites"
import { UserWorkspaceOutgoingRequests } from "./UserWorkspaceOutgoingRequests"
import { UserBoardReceivedInvites } from "./UserBoardReceivedInvites"
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline"
import type { JSX } from "react"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes"
import { useShareOffersStore } from "@/stores/shareOffersStore"
import { useShallow } from "zustand/shallow"

type UserOfferManagerProps = {
    onClose?: () => void;
    requestKey?: AsyncRequestKey | AsyncRequestKey[];
}

type TabDef = {
    id: string;
    label: string;
    title: string;
    description: string;
    counter?: number;
    render: (showOnlyPending: boolean) => JSX.Element;
}

const Switcher = ({ isOn, onToggle }: { isOn: boolean; onToggle: () => void }) => (
    <div
        className={`flex flex-row items-center justify-between cursor-pointer
            ${isOn ? "bg-lime-500" : "bg-gray-300"} rounded-full w-10 h-[20px] ps-[2px] pr-[2px] relative`}
        onClick={onToggle}
    >
        <div className={`w-4 h-4 bg-black/90 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isOn ? "translate-x-5" : "translate-x-0"}`} />
        <CheckIcon className={`w-3 h-3 absolute left-[6px] text-black/90 transition-opacity duration-200 ${isOn ? "opacity-100" : "opacity-0"}`} strokeWidth={3} />
        <XMarkIcon className={`w-3 h-3 absolute right-[6px] text-black/90 transition-opacity duration-200 ${isOn ? "opacity-0" : "opacity-100"}`} strokeWidth={3} />
    </div>
)

export const UserOfferManager = forwardRef<HTMLDivElement, UserOfferManagerProps>(({ onClose, requestKey }: UserOfferManagerProps, ref) => {

    const [showOnlyPending, setShowOnlyPending] = useState(false)
    const [activeUserTabIdx, setActiveUserTabIdx] = useState(1)
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

    const activeTab = userTabs[activeUserTabIdx]

    return (
        <CommonMenuWrapper
            ref={ref}
            onClose={onClose}
            requestKey={requestKey}
            classNameContainer="w-[90vw] max-w-5xl"
            className="w-full !bg-main h-[80vh] flex flex-col items-center justify-start p-16 font-grotesk text-neutral-200"
        >
            {/* Header: title + pending toggle */}
            <div className="w-full !h-22 max-w-5xl flex flex-row items-start justify-between gap-4 mb-1">
                <div className="flex flex-col  gap-1">
                    <p className="text-2xl font-semibold tracking-tight text-text">{activeTab.title}</p>
                    <p className="text-sm text-zinc-400">{activeTab.description}</p>
                </div>
                <div className="flex items-center gap-3 pt-1 shrink-0">
                    <span className="text-sm font-helvetica text-gray-400 whitespace-nowrap">Show only pending</span>
                    <Switcher isOn={showOnlyPending} onToggle={() => setShowOnlyPending(v => !v)} />
                </div>
            </div>

            {/* Tab nav */}
            <div className="w-full max-w-5xl flex flex-row items-center gap-6 mt-4 mb-2">
                {userTabs.map((tab, idx) => (
                    <button
                        key={tab.id}
                        className={`relative items-center justify-center flex text-sm text-text/70
                             hover:text-blue-400/80 hover:filter 
                            hover:brightness-105 transition-colors group
                            ${activeUserTabIdx === idx ? " text-blue-400 font-bold " : ""}`}
                        onClick={() => setActiveUserTabIdx(idx)}
                    >
                        {tab.label}
                        {tab.counter !== undefined && tab.counter > 0 && (
                            <span className="ms-1 text-xs text-zinc-900 bg-zinc-200 rounded-full px-2 py-0.5 font-medium">
                                {tab.counter}
                            </span>
                        )}
                        <div className={`absolute -bottom-[9px]  w-full h-0.5 bg-accent rounded-full transition-opacity 
                           
                            ${activeUserTabIdx === idx ? "opacity-100" : "opacity-0"}`} />
                    </button>
                ))}
            </div>

            <div className="h-px w-full max-w-5xl bg-zinc-400/20 mb-6" />

            {/* Content */}
            <div className="w-full flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
                {activeTab.render(showOnlyPending)}
            </div>
        </CommonMenuWrapper>
    )
})