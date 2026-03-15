import { NavLink, useMatch, useNavigate, useParams } from "react-router-dom"
import { useClerk } from "@clerk/react"
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
import { useResolveSubscriptionPlan } from "@/hooks/useResolveSubscriptionPlan"
import { SearchWorkspaceOverlay } from "../modals/searchWorkspaceOverlay"
import { CardFilterMenu, type CardFilterShowCategory, type CardFilterState } from "../cardMenus/cardFilterMenu"
import { useWorkspaceFilter } from "@/hooks/useWorkspaceFilter"
import { ShareOfferDetails } from "../modals/shareOfferDetails"
import { NoAccessibleWorkspaceState } from "./NoAccessibleWorkspaceState"



type SidebarProps = {
    isSingleMode?: boolean;

}

//const PADDING_ASIDE = 16
export default function Sidebar({ isSingleMode }: SidebarProps) {

    //const isSingleMode = useMatch("/workspaces/:workspaceId/members/*")
    const isUserSet = useAuthStore((state) => !!state.userID)

    return (
        <aside className={`flex flex-col min-w-[300px] h-full p-0 py-4 transition-colors duration-1000
         ${isSingleMode ? "!bg-[#18191a]" : "bg-main"}`}>

            <div className="flex flex-col flex-1 min-h-0 [overflow-x:clip] [overflow-clip-margin:8px] overflow-y-auto scrollbar-hidden">
                <WorkspaceList isSingleMode={isSingleMode} />
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

            <div className={`flex flex-col px-4 overflow-x-visible  overflow-y-hidden transition-all duration-300 ease-in-out 
                            ${isMembersView ? "max-h-[220px] opacity-100" : "max-h-0 opacity-0"}`}>

                <div className="text-[13px] font-semibold text-neutral-400 px-2 mb-2">{acitivityLabel}</div>
                <SidebarPersonalActivities isMembersView={isMembersView} />

                <div className="w-full h-px bg-neutral-700 mb-2" />
            </div>
            <div className="flex flex-row items-center justify-between ps-6 pe-4">
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
            <div className=" bg-slate-200/5 h-px mb-1 ms-8 me-[24px]" />
            <div className={`flex flex-col gap-0 transition-all duration-300 ease-in-out`}>
                {workspaceIds.map((id) => {
                    const isFilteredOut = !filteredIds.includes(id)
                    const status = getStatus(id)
                    const notAvailableToUser = status === "none"
                    const shouldHideRow = !!(isMembersView && activeWorkspaceId && activeWorkspaceId !== id) || (isFilteredOut && activeWorkspaceId !== id) || notAvailableToUser

                    const isActive = activeWorkspaceId === id
                    const disableRowMenuClick = status === "accessible" && !isMembersView
                    const isOffered = status === "offered"
                    return (
                        <div className=" relative w-full h-fit">

                            <div
                                key={`workspace-row-${id}`}
                                className={`relative flex flex-col transition-all duration-300 ease-in-out overflow-visible
                            mx-4
                                ${shouldHideRow
                                        ? "max-h-0 opacity-0 -translate-y-1 pointer-events-none"
                                        : "max-h-[250px] opacity-100 translate-y-0"
                                    }
                           ${isActive ? "bg-gradient-to-tr  from-slate-500/10 to-slate-500/20 rounded-[18px] mb-2 mt-1 shadow-lg shadow-black/10 p-2" : ""}`}
                            >
                                <div className={` ${(isActive) ? "opacity-100" : "opacity-0"}
                            absolute -left-2 top-0  h-full  w-1 rounded flex flex-row items-center `} >
                                    <div className="bg-gray-300 h-[90%] w-full rounded-full" />
                                </div>
                                <div className={` ${(isOffered) ? "opacity-100" : "opacity-0"}
                            absolute -left-2 top-0  h-full  w-1 rounded flex flex-row items-center `} >
                                    <div className="bg-amber-500 h-1 w-full rounded-full" />
                                </div>


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
                                        className={` ${isMembersView ? "!border border-neutral-300/20 !p-2 gap-1 !h-[62px] !grid-cols-[46px_1fr_1fr_1fr]" : ""}`}
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


function SidebarFooter() {

    const { signOut } = useClerk()
    const isAuthenticated = useAuthStore((state) => !!state.userID)
    const clearAuthSession = useAuthStore((state) => state.clearAuthSession)

    const { subscription, nextPlan } = useResolveSubscriptionPlan()

    async function handleLogout() {
        clearAuthSession()
        await signOut({ redirectUrl: "/" })
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

}

const SidebarPersonalActivities = ({ isMembersView }: SidebarPersonalActivitiesProps) => {
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
