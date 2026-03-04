import { NavLink, useMatch, useNavigate, useParams } from "react-router-dom"
import { WorkspaceRow } from "@/components/sidebar/WorkspaceRow"
import { useWorkspaceStore } from "@/stores/workspaceStore"
import { useShallow } from "zustand/shallow"
import { useEffect, useRef, useState } from "react"
import { SubscriptionBadge } from "../badges/subscriptionBadge"
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import { Filter, FolderSearch, Plus } from "lucide-react"
import { WorkspaceSubRows, type SidebarItem } from "@/components/sidebar/WorkspaceSubRows";
import { SimpleWorkspaceRow } from "./SimpleWorkspaceRow"
import { SidebarSubRow } from "./SidebarSubRow"
import { useAuthStore } from "@/stores/auth"
import { useUserStore } from "@/stores/userStore"
import { useResolveSubscriptionPlan } from "@/hooks/useResolveSubscriptionPlan"
import { SearchWorkspaceOverlay } from "../modals/searchWorkspaceOverlay"
import { CardFilterMenu, type CardFilterShowCategory, type CardFilterState } from "../cardMenus/cardFilterMenu"
import { useWorkspaceFilter } from "@/hooks/useWorkspaceFilter"
import { ShareOfferDetails } from "../modals/shareOfferDetails"
import { NoAccessibleWorkspaceState } from "./NoAccessibleWorkspaceState"



type SidebarProps = {
    isSingleMode?: boolean;

}

export default function Sidebar({ isSingleMode }: SidebarProps) {

    //const isSingleMode = useMatch("/workspaces/:workspaceId/members/*")
    const isUserSet = useAuthStore((state) => !!state.userID)

    return (
        <aside className={`flex flex-col min-w-[300px] h-full p-4 transition-colors duration-1000 overflow-hidden
         ${isSingleMode ? "!bg-[#18191a]" : "bg-main"}`}>

            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
                <WorkspaceList isSingleMode={isSingleMode} />
                {!isUserSet && <nav className="space-y-2 text-muted">
                    <NavLink to="/" className="block text-sm ">
                        Home
                    </NavLink>
                    <NavLink to="/boards" className="block text-sm ">
                        Boards
                    </NavLink>
                    <NavLink to="/login" className="block text-sm ">
                        Login
                    </NavLink>
                </nav>}
            </div>
            <div className="relative flex flex-col justify-end mt-2">
                <SidebarFooter />
            </div>
        </aside>
    )
}

export type WorkspaceFilterState = Partial<Pick<CardFilterState, "statusFilter" | "searchQuery">>

const WorkspaceList = ({ isSingleMode }: { isSingleMode?: boolean }) => {

    const [filterState, setFilterState] = useState<WorkspaceFilterState>({ statusFilter: null, searchQuery: "" })
    const workspaceIds = useWorkspaceStore(useShallow((state) => state.workspaceIds))
    const isWorkspaceAccessible = useWorkspaceStore((state) => state.isWorkspaceAccessible)
    const fetchWorkspaces = useWorkspaceStore((state) => state.fetchWorkspaces)
    // console.log("Sidebar Render", workspaceIds)
    const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null)
    const [hasRetriedAccessibleRefetch, setHasRetriedAccessibleRefetch] = useState(false)

    function handleSubRowToggle(workspaceId: string) {
        setActiveWorkspaceId((prev) => (prev === workspaceId ? prev : workspaceId))
        localStorage.setItem("lastWorkspaceId", workspaceId);
    }

    const membersMatch = useMatch("/workspaces/:workspaceId/members/*")
    const userMatch = useMatch("/users/:userID/*")

    const currentUserId = useAuthStore((state) => state.userID)
    const routeUserId = userMatch?.params.userID
    const isOthersProfile = userMatch && currentUserId !== routeUserId
    const isMembersView = !!(membersMatch || userMatch)

    const filteredIds = useWorkspaceFilter(workspaceIds, filterState)
    const accessibleWorkspaceIds = workspaceIds.filter((id) => isWorkspaceAccessible(id))


    const dropDown = (
        onClose: () => void,
        ref: React.RefObject<HTMLDivElement | null>,
        anchorRef?: React.RefObject<HTMLDivElement | null>
    ) => {
        const anchorWidth = anchorRef?.current?.offsetWidth ?? 280
        return (
            <CommonMenuWrapper style={{ width: `${anchorWidth}px` }}>
                <div className="flex flex-col w-full">
                    {filteredIds.map((id) => (
                        <SimpleWorkspaceRow key={`simple-row-${id}`} workspaceId={id} onClick={onClose} />
                    ))}
                </div>
            </CommonMenuWrapper>
        )
    }
    const rowRef = useRef<HTMLDivElement | null>(null);

    const currentWorkspaceId = useParams().workspaceId as string | undefined
    useEffect(() => {
        if (currentWorkspaceId) {
            setActiveWorkspaceId(currentWorkspaceId)
            localStorage.setItem("lastWorkspaceId", currentWorkspaceId)
            return
        }

        const lastWorkspaceId = localStorage.getItem("lastWorkspaceId");
        const isValidLastWorkspace = !!lastWorkspaceId && workspaceIds.includes(lastWorkspaceId);
        const isAccessibleLastWorkspace = isValidLastWorkspace && isWorkspaceAccessible(lastWorkspaceId);

        const firstAccessibleWorkspaceId = workspaceIds.find((id) => isWorkspaceAccessible(id)) ?? null;
        const fallbackWorkspaceId = isAccessibleLastWorkspace
            ? lastWorkspaceId
            : firstAccessibleWorkspaceId;

        setActiveWorkspaceId(fallbackWorkspaceId);
        if (fallbackWorkspaceId) {
            localStorage.setItem("lastWorkspaceId", fallbackWorkspaceId);
        }
    }, [currentWorkspaceId, workspaceIds, isWorkspaceAccessible])

    useEffect(() => {
        if (currentWorkspaceId) {
            setHasRetriedAccessibleRefetch(false)
            return
        }
        if (accessibleWorkspaceIds.length > 0) {
            setHasRetriedAccessibleRefetch(false)
            return
        }
        if (hasRetriedAccessibleRefetch) {
            return
        }

        setHasRetriedAccessibleRefetch(true)
        fetchWorkspaces().catch(() => {
            // noop: empty state handles no accessible workspaces after retry
        })
    }, [currentWorkspaceId, accessibleWorkspaceIds.length, hasRetriedAccessibleRefetch, fetchWorkspaces])

    const otherUserName = useUserStore((state) => {
        if (!routeUserId) return null;
        const user = state.usersById[routeUserId];
        return user ? user.Name : null;
    })

    const acitivityLabel = "Personal Activities"

    const createWorkspace = useWorkspaceStore((state) => state.createWorkspace)
    const handleCreateWorkspace = () => {
        createWorkspace(`New Workspace ${workspaceIds.length + 1}`)
    }

    const getStatus = useWorkspaceStore((state) => state.getWorkspaceStatus)
    const filterCategories: CardFilterShowCategory = {
        search: true,
        cardStatus: false,
        dueDate: false,
        board: false,
        activity: false,
        status: true,
    }
    const hasActiveFilters = !!filterState.statusFilter || !!filterState.searchQuery?.trim()

    return (
        <div className="flex flex-col gap-2 ">

            <div className={`flex flex-col  overflow-hidden transition-all duration-300 ease-in-out 
                            ${isMembersView ? "max-h-[220px] opacity-100" : "max-h-0 opacity-0"}`}>

                <div className="text-[13px] font-semibold text-neutral-400 px-2 mb-2">{acitivityLabel}</div>
                <SidebarPersonalActivities isMembersView={isMembersView} />

                <div className="w-full h-px bg-neutral-700 mb-2" />
            </div>
            <div className="flex flex-row items-center justify-between px-2">
                <div className="text-[13px] font-semibold text-neutral-400 px-2">Workspaces</div>
                <div className="flex flex-row items-center gap-1">
                    <CardRowMenuBtn
                        disableClick={!!isSingleMode}
                        offset={[0, 0]}
                        menuComponent={({ onClose }) => (
                            <CardFilterMenu
                                onClose={onClose}
                                filterState={filterState}
                                setFilterState={setFilterState}
                                boardMenuItems={[]}
                                showCategory={filterCategories}
                            />
                        )}
                        desiredBackdropOpacity={0}
                        renderType="anchored"
                    >
                        <div className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${isSingleMode ? "opacity-0 pointer-events-none" : "cursor-pointer"} ${hasActiveFilters ? "text-neutral-100 bg-white/15" : "text-neutral-400 hover:text-neutral-200 hover:bg-white/10"}`}>
                            <Filter className={`h-4 w-4 ${hasActiveFilters ? "fill-current" : ""}`} />
                        </div>
                    </CardRowMenuBtn>
                    <div className="h-7 w-7 rounded-md flex items-center justify-center text-neutral-400 cursor-pointer hover:text-neutral-200 hover:bg-white/10 transition-colors" onClick={handleCreateWorkspace}>
                        <Plus className="h-5 w-5" />
                    </div>
                </div>
            </div>

            {workspaceIds.map((id) => {
                const isFilteredOut = !filteredIds.includes(id)
                const status = getStatus(id)
                const notAvailableToUser = status === "none"
                const shouldHideRow = !!(isMembersView && activeWorkspaceId && activeWorkspaceId !== id) || (isFilteredOut && activeWorkspaceId !== id) || notAvailableToUser

                const isActive = activeWorkspaceId === id
                const disableRowMenuClick = status === "accessible" && !isMembersView

                return (
                    <div
                        key={`workspace-row-${id}`}
                        className={`flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${shouldHideRow
                            ? "max-h-0 opacity-0 -translate-y-1 pointer-events-none"
                            : "max-h-[250px] opacity-100 translate-y-0"
                            }
                           ${isActive ? "bg-slate-500/10 rounded-xl" : ""}`}
                    >


                        <CardRowMenuBtn
                            disableClick={disableRowMenuClick}
                            offset={[0, 0]}
                            key={`menu-btn-${id}`}
                            menuComponent={({ onClose, ref, anchorRef }) => {
                                if (status === "offered" || status === "requested") {
                                    return (
                                        <ShareOfferDetails onClose={onClose} ref={ref}
                                            workspaceId={id} />
                                    )
                                } else {
                                    return dropDown(onClose, ref, anchorRef)
                                }
                            }}
                            desiredBackdropOpacity={0}
                            renderType={status === "offered" || status === "requested" ? "virtual" : "anchored"}
                        >
                            < WorkspaceRow
                                ref={rowRef}
                                key={id} workspaceId={id}
                                onSubRowToggle={handleSubRowToggle}
                                activeSubRowId={activeWorkspaceId}
                                className={` ${isMembersView ? "!border border-neutral-300/20 !p-2 !h-16" : ""}`}
                                isActive={isActive}
                                status={status}
                            />
                        </CardRowMenuBtn>
                        <div
                            className={`mt-1  overflow-hidden transition-all duration-300 ease-in-out 
                            ${activeWorkspaceId === id ? "max-h-[250px] opacity-100" : "max-h-0 opacity-0"}`}>
                            <WorkspaceSubRows
                                className={` 
                                    ${isMembersView ? "ps-4" : "ps-8"}`}
                                workspaceId={id} />
                        </div>
                    </div>
                )
            })}

            {!currentWorkspaceId && accessibleWorkspaceIds.length === 0 && hasRetriedAccessibleRefetch && (
                <NoAccessibleWorkspaceState onCreateWorkspace={handleCreateWorkspace} />
            )}

        </div>
    )
}


function SidebarFooter() {


    const { subscription } = useResolveSubscriptionPlan()

    return (
        <div className="flex flex-row items-center justify-between px-2">
            <SubscriptionBadge plan={subscription} />
            <CardRowMenuBtn
                renderType="virtual"
                menuComponent={({ onClose, ref }) => <SearchWorkspaceOverlay onClose={onClose} ref={ref} />}
                offset={[0, 0]}>
                <FolderSearch className="h-5 w-5 text-neutral-400 cursor-pointer hover:text-neutral-200 transition-colors" />
            </CardRowMenuBtn>
        </div>
    )
}



type SidebarPersonalActivitiesProps = {
    isMembersView?: boolean

}

const SidebarPersonalActivities = ({ isMembersView }: SidebarPersonalActivitiesProps) => {

    const routeUserId = useMatch("/users/:userID/*")?.params.userID
    const routeParam = "users/me/"

    const items: SidebarItem[] = [
        { id: "profile", name: "Profile", iconId: "profile", route: `${routeParam}profile`, show: true },
        { id: "activities", name: "Activities", iconId: "activities", route: `${routeParam}activities`, show: true },
        { id: "cards", name: "Cards", iconId: "cards", route: `${routeParam}cards`, show: true },
        { id: "watched", name: "Watched", iconId: "watched", route: `${routeParam}watched`, show: true },
    ]

    const navigate = useNavigate()
    function handleItemClick(itemId: string) {
        navigate(items.find(item => item.id === itemId)?.route || "")
        // console.log("Clicked item", itemId)
    }

    return (
        <div className="flex flex-col mb-4">
            {items.map((item) => (
                item.show &&
                <SidebarSubRow
                    className={` !text-sm
                        ${isMembersView ? "ps-4" : "ps-8"}`}
                    key={item.id} item={item} isActive={false} onClick={() => handleItemClick(item.id)} />
            ))}
        </div>
    )
}
