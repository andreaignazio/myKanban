import { forwardRef, useState } from "react"
import { UserBoardOutgoingRequests } from "./UserBoardOutgoingRequests"
import { UserWorkspaceReceivedInvites } from "./UserWorkspaceReceivedInvites"
import { UserWorkspaceOutgoingRequests } from "./UserWorkspaceOutgoingRequests"
import { UserBoardReceivedInvites } from "./UserBoardReceivedInvites"

type UserOfferManagerProps = {
}

export const UserOfferManager = forwardRef<HTMLDivElement, UserOfferManagerProps>(({ }: UserOfferManagerProps, ref) => {

    const userTabs = [

        { id: "ub-requests-sent", label: "Sent Requests", render: () => <UserBoardOutgoingRequests /> },
        { id: "ub-invites-received", label: "Received Invites", render: () => <UserBoardReceivedInvites /> },
        { id: "ws-invites-received", label: "Workspace Invites", render: () => <UserWorkspaceReceivedInvites /> },
        { id: "ws-requests-sent", label: "Workspace Requests", render: () => <UserWorkspaceOutgoingRequests /> }
    ]

    const [activeUserTabIdx, setActiveUserTabIdx] = useState(2)

    return (
        <>
            <div
                ref={ref}
                className="theme-dark w-full max-h-[80vh] min-h-0 flex bg-main flex-col
            overflow-hidden rounded-xl shadow-lg 
            items-center justify-start p-16 
            font-grotesk text-neutral-200"
            >
                <div className="w-full max-w-5xl flex flex-col gap-2 mb-4">
                    <div className="flex w-full flex-row items-center justify-center gap-6 ">
                        {userTabs.map((tab, idx) => (
                            <button key={tab.id} className={`text-sm text-text/70 hover:text-text transition-colors${activeUserTabIdx === idx ? " text-text font-bold" : ""}`} onClick={() => setActiveUserTabIdx(idx)}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="w-full flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
                    {userTabs[activeUserTabIdx].render && userTabs[activeUserTabIdx].render!()}
                </div>
            </div>





        </>
    )
})