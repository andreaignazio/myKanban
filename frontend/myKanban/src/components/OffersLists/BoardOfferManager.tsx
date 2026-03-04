import { forwardRef, useState } from "react"
import { BoardReceivedRequests } from "./BoardReceivedRequests"
import { BoardSentInvites } from "./BoardSentInvites"

type BoardOfferManagerProps = {}

export const BoardOfferManager = forwardRef<HTMLDivElement, BoardOfferManagerProps>(({ }: BoardOfferManagerProps, ref) => {
    const boardTabs = [
        { id: "b-requests-received", label: "Received Requests", render: () => <BoardReceivedRequests /> },
        { id: "b-invites-sent", label: "Sent Invites", render: () => <BoardSentInvites /> },
    ]

    const [activeBoardTabIdx, setActiveBoardTabIdx] = useState(0)

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
                        {boardTabs.map((tab, idx) => (
                            <button key={tab.id} className={`text-sm text-text/70 hover:text-text transition-colors${activeBoardTabIdx === idx ? " text-text font-bold" : ""}`} onClick={() => setActiveBoardTabIdx(idx)}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="w-full flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
                    {boardTabs[activeBoardTabIdx].render && boardTabs[activeBoardTabIdx].render!()}
                </div>
            </div>
        </>
    )
})
