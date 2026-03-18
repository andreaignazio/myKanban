import { NavLink, useMatch, useNavigate, useParams } from "react-router-dom"
import { useClerk } from "@clerk/react"
import { WorkspaceRow } from "@/components/sidebar/WorkspaceRow"
import { useWorkspaceStore } from "@/stores/workspaceStore"
import { useShallow } from "zustand/shallow"
import { useEffect, useRef, useState } from "react"
import { SubscriptionBadge } from "../badges/subscriptionBadge"
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import { Filter, FolderSearch, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react"
import { WorkspaceSubRows, type SidebarItem } from "@/components/sidebar/WorkspaceSubRows";
import { SimpleWorkspaceRow } from "./SimpleWorkspaceRow"
import { SidebarSubRow } from "./SidebarSubRow"
import { useAuthStore } from "@/stores/auth"
import { useResolveSubscriptionPlan } from "@/hooks/useResolveSubscriptionPlan"
import { SearchWorkspaceOverlay } from "../modals/searchWorkspaceOverlay"
import { CardFilterMenu, type CardFilterShowCategory, type CardFilterState } from "../cardMenus/cardFilterMenu"
import { useWorkspaceFilter } from "@/hooks/useWorkspaceFilter"
import { ShareOfferDetails } from "../modals/shareOfferDetails"
import { NoAccessibleWorkspaceState } from "./NoAccessibleWorkspaceState"
import { Separator } from "../common/Separator"



type SidebarProps = {
    isSingleMode?: boolean;

}

//const PADDING_ASIDE = 16
export default function Sidebar({ isSingleMode }: SidebarProps) {

    //const isSingleMode = useMatch("/workspaces/:workspaceId/members/*")
    const isUserSet = useAuthStore((state) => !!state.userID)
    const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem("sidebarCollapsed") === "true")

    const toggleCollapsed = () => {
        setIsCollapsed(prev => {
            const next = !prev
            localStorage.setItem("sidebarCollapsed", String(next))
            return next
        })
    }

    return (
        <aside className={`flex flex-col h-full p-0 py-4 transition-all duration-300 delay-[25ms] ease-in-out
         ${isCollapsed ? "w-[60px] min-w-[60px]" : "min-w-[300px]"}
         ${isSingleMode ? "!bg-[#18191a]" : "bg-main"}`}>

            {/* In-flow toggle — visible only when collapsed, collapses to h-0 when expanded */}
            <div className={`flex-shrink-0 flex justify-center overflow-hidden transition-all duration-100 ease-in-out
                ${isCollapsed ? "h-8 mb-1 opacity-100" : "h-0 opacity-0"}`}>
                <button
                    onClick={toggleCollapsed}
                    title="Expand sidebar"
                    className="h-7 w-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-200 hover:bg-white/10 transition-colors"
                >
                    <PanelLeftOpen className="h-4 w-4" />
                </button>
            </div>

            <div className="flex flex-col flex-1 min-h-0 [overflow-x:clip] [overflow-clip-margin:8px] overflow-y-auto scrollbar-hidden">
                <WorkspaceList isSingleMode={isSingleMode} isCollapsed={isCollapsed} toggleCollapsed={toggleCollapsed} />
                {!isUserSet && <nav className="space-y-2 text-muted">
                    <NavLink to="/" className="block text-sm ">
                        Home
                    </NavLink>
                    <NavLink to="/sign-in" className="block text-sm ">
                        Login
                    </NavLink>
                </nav>}
            </div>
            <div className="relative flex flex-col justify-end mt-2">
                <SidebarFooter isCollapsed={isCollapsed} />
            </div>
        </aside>
    )
}

export type WorkspaceFilterState = Partial<Pick<CardFilterState, "statusFilter" | "searchQuery">>


type WorkspaceDropDownProps = {
    onClose: () => void;
    ref: React.RefObject<HTMLDivElement | null>;
    anchorRef?: React.RefObject<HTMLDivElement | null>;
    ids: string[];
}
const WorkspaceDropDown = ({
    onClose,
    ref,
    anchorRef,
    ids = []
}: WorkspaceDropDownProps) => {
    const anchorWidth = anchorRef?.current?.offsetWidth ?? 280

    const radius = 10
    const padding = 4
    const innerRadius = radius - padding
    return (
        <CommonMenuWrapper

            className="!bg-[rgba(36,40,45,1)] backdrop-blur-md
                  p-2 shadow-lg shadow-black/30"
            style={{ width: `${anchorWidth}px`, padding: padding, borderRadius: radius }}>
            <div className="flex flex-col gap-0 w-full">
                {ids.map((id) => {
                    const isLastOfList = id === ids[ids.length - 1]
                    return (
                        <div className="flex flex-col w-full" key={`simple-row-${id}`}>
                            <SimpleWorkspaceRow
                                radius={innerRadius}
                                workspaceId={id} onClick={onClose} />
                            {!isLastOfList && <Separator className="my-1 w-[95%] place-self-center" />}
                        </div>
                    )
                })}
            </div>
        </CommonMenuWrapper>
    )
}


const WorkspaceList = ({ isSingleMode, isCollapsed, toggleCollapsed }: { isSingleMode?: boolean, isCollapsed?: boolean, toggleCollapsed?: () => void }) => {

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

    const isMembersView = !!(membersMatch || userMatch)

    const filteredIds = useWorkspaceFilter(workspaceIds, filterState)
    const accessibleWorkspaceIds = workspaceIds.filter((id) => isWorkspaceAccessible(id))



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

    const acitivityLabel = "Personal Activities"

    const createWorkspace = useWorkspaceStore((state) => state.createWorkspace)
    const handleCreateWorkspace = () => {
        createWorkspace({ Name: `New Workspace ${workspaceIds.length + 1}` })
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
        <div className="flex flex-col gap-2  ">

            <div className={`flex flex-col overflow-x-visible overflow-y-hidden transition-all duration-300 ease-in-out
                            ${(isMembersView || isCollapsed) ? "max-h-[220px] opacity-100" : "max-h-0 opacity-0"}
                            ${isCollapsed ? "px-1" : "px-4"}`}>

                <div className={`${isCollapsed ? "opacity-0 hidden" : "opacity-100 h-12 "} transition-all duration-[0] ease-in-out
                    text-[13px] font-semibold text-neutral-400 px-2 mb-2`}>{acitivityLabel}</div>
                <SidebarPersonalActivities isMembersView={isMembersView} isCollapsed={isCollapsed} />
                <div className={`${isCollapsed ? "mt-2 mb-0" : "mb-2 "} w-full h-px bg-neutral-700 `} />
            </div>
            <div className={`flex flex-row items-center justify-between ps-6 pe-4 transition-all duration-100 ease-in-out
                ${isCollapsed ? "max-h-0 opacity-0 pointer-events-none overflow-hidden" : "max-h-10 opacity-100"}`}>
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
                    <div className="h-7 w-7 rounded-md flex items-center justify-center
                     text-neutral-400 cursor-pointer hover:text-neutral-200
                      hover:bg-white/10 transition-colors" onClick={handleCreateWorkspace}>
                        <Plus className="h-5 w-5" />
                    </div>
                </div>
            </div>
            <div className="relative">
                <div className={`bg-slate-200/5 h-px mb-1 ms-8 me-[24px] transition-all duration-300 ${isCollapsed ? "opacity-0" : "opacity-100"}`} />
                {/* Out-of-flow toggle — absolutely positioned on the divider, visible only when expanded */}
                <button
                    onClick={toggleCollapsed}
                    title="Collapse sidebar"
                    className={`absolute right-[16px] top-0 -translate-y-1/2 h-[18px] w-[18px] rounded-full
                        bg-neutral-800 border border-neutral-600/40
                        flex items-center justify-center
                        text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700
                        transition-all duration-300
                        ${isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                >
                    <PanelLeftClose className="h-3 w-3" />
                </button>
            </div>
            <div className={`flex flex-col gap-0 transition-all duration-300 ease-in-out`}>
                {workspaceIds.map((id) => {
                    const isFilteredOut = !filteredIds.includes(id)
                    const status = getStatus(id)
                    const notAvailableToUser = status === "none"
                    const shouldHideRow = isCollapsed
                        ? (isFilteredOut && activeWorkspaceId !== id) || notAvailableToUser
                        : !!(isMembersView && activeWorkspaceId && activeWorkspaceId !== id) || (isFilteredOut && activeWorkspaceId !== id) || notAvailableToUser

                    const isActive = activeWorkspaceId === id
                    const disableRowMenuClick = isCollapsed || (status === "accessible" && !isMembersView)
                    const isOffered = status === "offered"
                    return (
                        <div className=" relative w-full h-fit">

                            <div
                                key={`workspace-row-${id}`}
                                className={`relative flex flex-col transition-all duration-300 ease-in-out overflow-visible delay-200 rounded-[18px]
                            ${isCollapsed ? "mx-1" : "mx-4"}
                                ${shouldHideRow
                                        ? "max-h-0 opacity-0 -translate-y-1 pointer-events-none"
                                        : "max-h-[250px] opacity-100 translate-y-0"
                                    }
                           ${isActive && !isCollapsed
                                        ? "bg-gradient-to-tr  from-slate-500/10 to-slate-500/20 rounded-[18px] mb-2 mt-1 shadow-lg shadow-black/10 p-2"
                                        : ""}
                                        ${isActive && isCollapsed
                                        ? "bg-gradient-to-tr  from-slate-500/10 to-slate-500/20 rounded-[16px] mb-2 mt-1 shadow-lg shadow-black/10 p-1"
                                        : ""}
                                        
                                        `}
                            >
                                <div className={`${(isActive && !isCollapsed) ? "opacity-100" : "opacity-0"}
                            absolute -left-2 top-0  h-full  w-1 rounded flex flex-row items-center `} >
                                    <div className="bg-gray-300 h-[90%] w-full rounded-full" />
                                </div>
                                {false && <div className={`${(isActive && isCollapsed) ? "opacity-100" : "opacity-0"}
                                pointer-events-none
                            absolute left-2 top-10  h-[75%]  w-[2px] rounded flex flex-row items-center `} >
                                    <div className="bg-gray-500 h-[90%] w-full rounded-full" />
                                </div>}


                                <div className={`${(isOffered && !isCollapsed) ? "opacity-100" : "opacity-0"}
                            absolute -left-2 top-0  h-full  w-1 rounded flex flex-row items-center `} >
                                    <div className="bg-amber-500 h-1 w-full rounded-full" />
                                </div>


                                <CardRowMenuBtn
                                    disableClick={disableRowMenuClick}
                                    offset={status === "offered" || status === "requested" ? [0, 0] : [4, 0]}
                                    key={`menu-btn-${id}`}
                                    menuComponent={({ onClose, ref, anchorRef }) => {
                                        if (status === "offered" || status === "requested") {
                                            return (
                                                <ShareOfferDetails onClose={onClose} ref={ref}
                                                    workspaceId={id} />
                                            )
                                        } else {
                                            return <WorkspaceDropDown onClose={onClose} ref={ref} anchorRef={anchorRef} ids={accessibleWorkspaceIds} />
                                        }
                                    }}
                                    desiredBackdropOpacity={0}
                                    renderType={status === "offered" || status === "requested" ? "virtual" : "anchored"}
                                >
                                    <div className={`${!isActive && isCollapsed ? "opacity-0 h-0 pointer-events-none" : ""} transition-all duration-50 ease-in-out`} >
                                        <WorkspaceRow
                                            ref={rowRef}
                                            key={id} workspaceId={id}
                                            onSubRowToggle={handleSubRowToggle}
                                            activeSubRowId={activeWorkspaceId}
                                            className={`
                                            ${isMembersView && !isCollapsed ? "!border border-neutral-300/20 !p-2 gap-1 !h-[62px] !grid-cols-[46px_1fr_1fr_1fr]" : ""}`}
                                            isActive={isActive}
                                            status={status}
                                            isCollapsed={isCollapsed}
                                        />
                                    </div>
                                    <div className={`${!isActive && isCollapsed ? "opacity-100" : "opacity-0 h-0 pointer-events-none"} transition-all duration-50 ease-in-out`} >
                                        <WorkspaceRow
                                            ref={rowRef}
                                            key={id} workspaceId={id}
                                            onSubRowToggle={handleSubRowToggle}
                                            activeSubRowId={activeWorkspaceId}
                                            className={`
                                            ${isMembersView && !isCollapsed ? "!border border-neutral-300/20 !p-2 gap-1 !h-[62px] !grid-cols-[46px_1fr_1fr_1fr]" : ""}`}
                                            isActive={isActive}
                                            status={status}
                                            isCollapsed={isCollapsed}
                                        />
                                    </div>
                                </CardRowMenuBtn>
                                <div
                                    className={`
                                        ${isCollapsed ? " opacity-80" : "w-50"}
                                        mt-1  overflow-hidden transition-all duration-300 ease-in-out
                            ${activeWorkspaceId === id ? "max-h-[250px] opacity-100" : "max-h-0 opacity-0"}`}>
                                    <WorkspaceSubRows
                                        className={`${isMembersView && !isCollapsed ? "ps-4" : isCollapsed ? "" : "ps-8"}`}
                                        workspaceId={id}
                                        isCollapsed={isCollapsed} />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>


            {!currentWorkspaceId && accessibleWorkspaceIds.length === 0 && hasRetriedAccessibleRefetch && (
                <NoAccessibleWorkspaceState onCreateWorkspace={handleCreateWorkspace} />
            )}

        </div>
    )
}


function SidebarFooter({ isCollapsed }: { isCollapsed?: boolean }) {

    const { signOut } = useClerk()
    const isAuthenticated = useAuthStore((state) => !!state.userID)
    const clearAuthSession = useAuthStore((state) => state.clearAuthSession)

    const { subscription, nextPlan } = useResolveSubscriptionPlan()

    async function handleLogout() {
        clearAuthSession()
        await signOut({ redirectUrl: "/" })
    }

    if (isCollapsed) {
        return (
            <div className="flex flex-col items-center gap-2 px-1">
                <CardRowMenuBtn
                    renderType="virtual"
                    menuComponent={({ onClose, ref }) => <SearchWorkspaceOverlay onClose={onClose} ref={ref} />}
                    offset={[0, 0]}>
                    <FolderSearch className="h-5 w-5 text-neutral-400 cursor-pointer hover:text-neutral-200 transition-colors" />
                </CardRowMenuBtn>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3 px-2">
            {isAuthenticated && (
                <button
                    type="button"
                    onClick={() => { void handleLogout() }}
                    className="w-full rounded-md bg-white/8 px-3 py-2 text-left text-sm text-neutral-200 transition-colors hover:bg-white/12"
                >
                    Logout
                </button>
            )}
            <div className="flex flex-row items-center justify-between">
                <SubscriptionBadge
                    showNextPlan={true}
                    plan={subscription}
                    nextPlan={nextPlan}
                />
                <CardRowMenuBtn
                    renderType="virtual"
                    menuComponent={({ onClose, ref }) => <SearchWorkspaceOverlay onClose={onClose} ref={ref} />}
                    offset={[0, 0]}>
                    <FolderSearch className="h-5 w-5 text-neutral-400 cursor-pointer hover:text-neutral-200 transition-colors" />
                </CardRowMenuBtn>
            </div>
        </div>
    )
}



type SidebarPersonalActivitiesProps = {
    isMembersView?: boolean
    isCollapsed?: boolean
}

const SidebarPersonalActivities = ({ isMembersView, isCollapsed }: SidebarPersonalActivitiesProps) => {
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
        <div className={`flex flex-col ${isCollapsed ? "gap-1" : "mb-4"}`}>
            {items.map((item) => (
                item.show &&
                <SidebarSubRow
                    className={isCollapsed ? "" : `!text-sm ${isMembersView ? "ps-4" : "ps-8"}`}
                    key={item.id} item={item} isActive={false} onClick={() => handleItemClick(item.id)}
                    isCollapsed={isCollapsed} />
            ))}
        </div>
    )
}
