import { forwardRef, useEffect, useState } from "react";
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import { CustomInput } from "../menuElements/CustomInput";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useShallow } from "zustand/shallow";
import { EntityCoverCard } from "./entityCoverCard";
import { WorkspaceAvatar } from "@/pages/WorkspaceSettings/WorkspaceAvatar";
import { useWorkspaceDerivedProps } from "@/hooks/useWorkspaceDerivedProps";
import { SubscriptionBadge } from "../badges/subscriptionBadge";
import { useResolveSubscriptionPlan } from "@/hooks/useResolveSubscriptionPlan";
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus";
import { RequestAccessModal } from "./RequestAccessModal";

type SearchWorkspaceOverlayProps = {
    onClose: () => void;
}


const SEARCH_LIMIT = 10

export const SearchWorkspaceOverlay = forwardRef<HTMLDivElement, SearchWorkspaceOverlayProps>((props, ref) => {
    const searchPublicWorkspaces = useWorkspaceStore(useShallow((state) => state.searchPublicWorkspaces))
    const workspaceIds = useWorkspaceStore(useShallow((state) => state.searchedWorkspacesIds))
    const hasMore = useWorkspaceStore((state) => state.searchedWorkspacesHasMore)
    const [searchTerm, setSearchTerm] = useState("")
    const [page, setPage] = useState(1)

    useEffect(() => {
        setPage(1)
        void searchPublicWorkspaces({ query: searchTerm, limit: SEARCH_LIMIT, page: 1 })
    }, [searchPublicWorkspaces, searchTerm])

    const handleLoadMore = () => {
        const nextPage = page + 1
        setPage(nextPage)
        void searchPublicWorkspaces({ query: searchTerm, limit: SEARCH_LIMIT, page: nextPage })
    }

    return (
        <CommonMenuWrapper
            ref={ref}
            style={{
                width: "600px",
                height: "80vh",

            }}
            onClose={props.onClose}
        >
            <div className=" px-10 w-full  py-8 pb-12  justify-center items-start flex flex-col h-full min-h-0">
                <div className="flex flex-col w-full px-2">
                    <h2 className="text-sm font-semibold mb-6 mt-2">Search Workspaces</h2>
                    <CustomInput placeholder="Search..." className={"!h-9 px-0"}
                        onInputChange={(input) => setSearchTerm(input?.current?.value ?? "")}
                    />
                </div>
                <div className="min-h-0 mt-4 w-full   px-2 py-2 flex-1 overflow-y-auto scrollbar-hidden ">
                    <div className="grid grid-cols-2 gap-3 w-full">
                        {workspaceIds.map((id) => (
                            <RequestableWorkspaceCard key={id} workspaceId={id} />
                        ))}
                    </div>
                    {hasMore && (
                        <div className="flex justify-center mt-4">
                            <button
                                onClick={handleLoadMore}
                                className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors duration-150 px-4 py-2 rounded hover:bg-neutral-700/50"
                            >
                                Load more
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </CommonMenuWrapper >
    )
})


const RequestableWorkspaceCard = ({ workspaceId }: { workspaceId: string }) => {

    return (
        <CardRowMenuBtn
            renderType="virtual"
            menuComponent={({ onClose, ref }) => <RequestAccessModal onClose={onClose} targetType="workspace" targetID={workspaceId} ref={ref} />}
            customId="workspace-access-request"
        >
            <WorkspaceCard workspaceId={workspaceId} />
        </CardRowMenuBtn>
    )
}



const WorkspaceCard = ({ workspaceId }: { workspaceId: string }) => {

    const { workspaceName, headerProps } = useWorkspaceDerivedProps(workspaceId)

    const { coverType, coverColor, coverImage } = headerProps

    const heights = {
        coverHeight: "58%",
        footerHeight: "42%",
    }
    const badgePosition = {
        bottom: "-16px",
        left: "20px",
    }

    const { subscription } = useResolveSubscriptionPlan()
    return (
        <div className="hover:ring hover:ring-white rounded-xl overflow-hidden
        shadow-md shadow-black/20 cursor-pointer
         transition-all duration-200 ease-in-out w-full aspect-[11/6]">
            <EntityCoverCard
                className="h-full"
                heights={heights}
                coverType={coverType as "color" | "image" | undefined}
                coverColor={coverColor}
                coverImage={coverImage}
                footerBackgroundColorOverride={"rgba(0,0,0,0.5)"}
                badgeChildren={<WorkspaceAvatar
                    workspaceID={workspaceId} size={22} radius={18} padding={15} />}
                badgePosition={badgePosition}
                coverChilds={
                    <div className=" flex flex-col w-32 gap-0 items-end text-neutral-200">
                        <div className="text-xs tex-wrap 
                font-medium text-white text-right"
                            title={workspaceName}>{workspaceName}</div>
                    </div>
                }
                footerChilds={
                    <div className="w-full h-full  flex items-start mt-2 pb-2 justify-end pe-4">
                        <SubscriptionBadge plan={subscription} />
                    </div>
                }
            />
        </div>
    )
}