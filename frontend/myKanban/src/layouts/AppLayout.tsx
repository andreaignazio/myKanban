import { Outlet, useMatch, useNavigate, useParams } from "react-router";
import { useLocation } from "react-router-dom";
import Topbar from "@/components/Topbar"
import Sidebar from "@/components/sidebar/Sidebar"
import { useAuthStore } from "@/stores/auth";
import { useEffect, useRef, useState } from "react"
import { useBoardsStore } from "@/stores/boardsStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useWsMembersStore } from "@/stores/wsMembersStore";
import { OverlayRoot } from "@/overlays/OverlayRoot";
import { createPortal } from "react-dom";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { useUiStore } from "@/stores/uiStore";
import { ToastNotification } from "@/components/modals/ToastNotification";
import { useAuditStore } from "@/stores/auditStore";
import { DomainModalWrapper } from "@/components/modals/DomainModalWrapper";
import { useShallow } from "zustand/shallow";
import { useBuildPublicURL } from "@/hooks/useBuildPublicURL";
import { useBoardWebSocket } from "@/hooks/ws/useBoardWS";
import { useUserActivityOverlay } from "@/hooks/useUserActivityOverlay";
import { useUserWatchStore } from "@/stores/userWatchStore";
import { AsyncRequestToasterController } from "@/components/asyncRequestHandlers/asyncRequestToaster";
import { useAuth } from "@clerk/react";


export default function AppLayout() {

    const navigate = useNavigate()

    const userId = useAuthStore((state) => state.userID)

    const hydrateWorkspaces = useWorkspaceStore((state) => state.hydrateWorkspaces)
    const hasHydratedWorkspaces = useWorkspaceStore((state) => state.hasHydratedWorkspaces)
    const getWorkspaceStatus = useWorkspaceStore((state) => state.getWorkspaceStatus)
    const fetchBoardsForWorkspace = useBoardsStore((state) => state.fetchBoardsForWorkspace)
    const fetchWorkspaceMembers = useWsMembersStore((state) => state.fetchWorkspaceMembers)
    const fetchedWorkspaceBoardsRef = useRef<Set<string>>(new Set())
    const fetchedWorkspaceMembersRef = useRef<Set<string>>(new Set())
    const [showBackdrop, setShowBackdrop] = useState(false)
    const [backdropVisible, setBackdropVisible] = useState(false)
    const isOverlayLocked = useOverlayStore((state) => state.isOverlayBackdropLocked)
    const overlayStack = useOverlayStore((state) => state.stack)
    //const [isSidebarHidden, setIsSidebarHidden] = useState(false)
    const isSidebarHidden = useUiStore((state) => state.sidebarHidden)
    const setIsSidebarHidden = useUiStore((state) => state.setSidebarHidden)
    const location = useLocation()
    const isBoardView =
        /^\/workspaces\/[^/]+\/boards\/[^/]+(?:\/cards\/[^/]+)?\/?$/.test(location.pathname)
    const layoutBgClass = isBoardView ? "bg-transparent" : "bg-main"
    const fetchUserWatches = useUserWatchStore((state) => state.fetchUserWatches)

    const isSignedIn = useAuth().isSignedIn
    useEffect(() => {
        if (!isSignedIn) {
            navigate("/", { replace: true })
        }
    }, [isSignedIn, navigate])

    useEffect(() => {
        const locked = isOverlayLocked()
        if (locked) {
            setShowBackdrop(true)
            requestAnimationFrame(() => setBackdropVisible(true))
            return
        }
        setBackdropVisible(false)
        const timeoutId = setTimeout(() => setShowBackdrop(false), 180)
        return () => clearTimeout(timeoutId)
    }, [isOverlayLocked, overlayStack])


    useEffect(() => {
        if (!userId) {
            return
        }
        fetchUserWatches()
        hydrateWorkspaces()
    }, [userId, fetchUserWatches, hydrateWorkspaces])

    const shouldHideSidebar = isBoardView || !isSignedIn
    useEffect(() => {
        if (shouldHideSidebar) {
            setIsSidebarHidden(true)
        } else {
            setIsSidebarHidden(false)
        }
    }, [shouldHideSidebar, location.pathname, setIsSidebarHidden])

    const routeWorkspaceID = useParams().workspaceId as string | undefined
    useEffect(() => {
        if (!hasHydratedWorkspaces || !routeWorkspaceID) {
            return
        }
        if (getWorkspaceStatus(routeWorkspaceID) !== "accessible") {
            navigate("/workspaces", { replace: true })
        }
    }, [hasHydratedWorkspaces, routeWorkspaceID, getWorkspaceStatus, navigate])

    useEffect(() => {
        if (!hasHydratedWorkspaces || !routeWorkspaceID) {
            return
        }
        if (getWorkspaceStatus(routeWorkspaceID) !== "accessible") {
            return
        }
        if (fetchedWorkspaceBoardsRef.current.has(routeWorkspaceID)) {
            return
        }
        fetchedWorkspaceBoardsRef.current.add(routeWorkspaceID)
        void fetchBoardsForWorkspace(routeWorkspaceID).catch(() => {
            fetchedWorkspaceBoardsRef.current.delete(routeWorkspaceID)
        })
    }, [hasHydratedWorkspaces, routeWorkspaceID, getWorkspaceStatus, fetchBoardsForWorkspace])

    useEffect(() => {
        if (!hasHydratedWorkspaces || !routeWorkspaceID) {
            return
        }
        if (getWorkspaceStatus(routeWorkspaceID) !== "accessible") {
            return
        }
        if (fetchedWorkspaceMembersRef.current.has(routeWorkspaceID)) {
            return
        }
        fetchedWorkspaceMembersRef.current.add(routeWorkspaceID)
        void fetchWorkspaceMembers(routeWorkspaceID).catch(() => {
            fetchedWorkspaceMembersRef.current.delete(routeWorkspaceID)
        })
    }, [hasHydratedWorkspaces, routeWorkspaceID, getWorkspaceStatus, fetchWorkspaceMembers])


    const openOverlay = useOverlayStore((state) => state.open)
    const closeOverlay = useOverlayStore((state) => state.close)
    const feed = useAuditStore((state) => state.toastFeed)
    const openToast = useAuditStore((state) => state.openToast)
    const setOpenToast = (value: boolean) => useAuditStore.setState(() => ({ openToast: value }))


    const toastNotificationRef = useRef<HTMLDivElement>(null)
    const toastNotificationId = "toast-notification";
    function handleOpenToastNotification() {
        // console.log("Opening respond modal for share offer");

        const descriptor: OverlayDescriptor = {
            id: toastNotificationId,
            render: () => <ToastNotification feed={feed} />,
            panelRef: toastNotificationRef,
            type: "modal",
            renderType: "virtual",
            exclusiveGroup: "toast-notifications",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: false,
                closeOnEscape: false,
                lockBackdrop: false,
                passthrough: true,
            },
            position: {
                virtual: "viewport-bottom-right",
                offset: [-16, -8],
            }
        }
        openOverlay(descriptor);

    }
    useEffect(() => {
        if (feed && openToast) {
            handleOpenToastNotification()
            handleCloseToastAfterDelay()
        } else {
            closeOverlay(toastNotificationId)
        }
    }, [feed, openToast])

    function handleCloseToastAfterDelay() {
        setTimeout(() => {
            setOpenToast(false)
        }, 3000)
    }


    const boardID = useParams().boardId as string
    const workspaceID = useParams().workspaceId as string
    const cardID = useParams().cardId as string
    const setCurrentRouteParams = useUiStore((state) => state.setCurrentRouteParams)
    useEffect(() => {
        setCurrentRouteParams({ route: location.pathname, workspaceId: workspaceID, boardId: boardID, cardId: cardID })
    }, [location.pathname, workspaceID, boardID, cardID, setCurrentRouteParams])


    const deletedBoardModalOpen = useUiStore((state) => state.deletedBoardModalOpen)
    const setDeletedBoardModalOpen = useUiStore((state) => state.setDeletedBoardModalOpen)
    const deletedCardModalOpen = useUiStore((state) => state.deletedCardModalOpen)
    const setDeletedCardModalOpen = useUiStore((state) => state.setDeletedCardModalOpen)
    const lostWorkspaceAccessModalOpen = useUiStore((state) => state.lostWorkspaceAccessModalOpen)
    const setLostWorkspaceAccessModalOpen = useUiStore((state) => state.setLostWorkspaceAccessModalOpen)
    const lostBoardAccessModalOpen = useUiStore((state) => state.lostBoardAccessModalOpen)
    const lostBoardAccessWorkspaceId = useUiStore((state) => state.lostBoardAccessWorkspaceId)
    const setLostBoardAccessModalOpen = useUiStore((state) => state.setLostBoardAccessModalOpen)
    const setDomainModalOpen = useUiStore((state) => state.setDomainModalOpen)


    const buildUrl = useBuildPublicURL()
    const workspaceRoute = buildUrl.buildPublicURLFromWorkspaceID(workspaceID)
    const boardRoute = workspaceID && boardID ? buildUrl.buildPublicURLFromBoardID(workspaceID, boardID) : workspaceRoute

    useEffect(() => {
        if (!deletedBoardModalOpen) return

        const redirectToWorkspace = () => {
            setDomainModalOpen(false)
            setDeletedBoardModalOpen(false)
            navigate(workspaceRoute)
        }

        setDomainModalOpen(true, {
            componentent: () => (
                <HeadlessTimedNoticeMenu
                    title="Board deleted"
                    description="This board is no longer available. You will be redirected to the workspace."
                    actionLabel="Go now"
                    onAction={redirectToWorkspace}
                />
            ),
            anchorRef: null,
            renderType: "virtual",
            virtual: "viewport-center",
            closeOnClickOutside: false,
            closeOnEscape: false,
            autoCloseMs: 10000,
            onAutoClose: redirectToWorkspace,
        })
    }, [deletedBoardModalOpen, setDomainModalOpen, setDeletedBoardModalOpen, navigate, workspaceRoute])

    useEffect(() => {
        if (!deletedCardModalOpen) return

        const redirectToBoard = () => {
            setDomainModalOpen(false)
            setDeletedCardModalOpen(false)
            navigate(boardRoute)
        }

        setDomainModalOpen(true, {
            componentent: () => (
                <HeadlessTimedNoticeMenu
                    title="Card deleted"
                    description="This card is no longer available. You will be redirected to the board."
                    actionLabel="Go now"
                    onAction={redirectToBoard}
                />
            ),
            anchorRef: null,
            renderType: "virtual",
            virtual: "viewport-center",
            closeOnClickOutside: false,
            closeOnEscape: false,
            autoCloseMs: 6000,
            onAutoClose: redirectToBoard,
        })
    }, [deletedCardModalOpen, setDomainModalOpen, setDeletedCardModalOpen, navigate, boardRoute])

    useEffect(() => {
        if (!lostWorkspaceAccessModalOpen) return

        const redirectToWorkspaces = () => {
            setDomainModalOpen(false)
            setLostWorkspaceAccessModalOpen(false)
            navigate("/workspaces", { replace: true })
        }

        setDomainModalOpen(true, {
            componentent: () => (
                <HeadlessTimedNoticeMenu
                    title="Access revoked"
                    description="You have lost access to this resource. Admins of the workspace have removed your membership."
                    actionLabel="Go now"
                    onAction={redirectToWorkspaces}
                />
            ),
            anchorRef: null,
            renderType: "virtual",
            virtual: "viewport-center",
            closeOnClickOutside: false,
            closeOnEscape: false,
            autoCloseMs: 7000,
            onAutoClose: redirectToWorkspaces,
        })
    }, [lostWorkspaceAccessModalOpen, setDomainModalOpen, setLostWorkspaceAccessModalOpen, navigate])

    useEffect(() => {
        if (!lostBoardAccessModalOpen) return

        const targetWorkspaceID = lostBoardAccessWorkspaceId ?? workspaceID
        const fallbackRoute = "/workspaces"
        const targetRoute = targetWorkspaceID ? `/workspaces/${targetWorkspaceID}/boards` : fallbackRoute

        const redirectToWorkspaceBoards = () => {
            setDomainModalOpen(false)
            setLostBoardAccessModalOpen(false)
            navigate(targetRoute, { replace: true })
        }

        setDomainModalOpen(true, {
            componentent: () => (
                <HeadlessTimedNoticeMenu
                    title="Access revoked"
                    description="You have lost access to this board. You will be redirected to the workspace boards."
                    actionLabel="Go now"
                    onAction={redirectToWorkspaceBoards}
                />
            ),
            anchorRef: null,
            renderType: "virtual",
            virtual: "viewport-center",
            closeOnClickOutside: false,
            closeOnEscape: false,
            autoCloseMs: 7000,
            onAutoClose: redirectToWorkspaceBoards,
        })
    }, [lostBoardAccessModalOpen, lostBoardAccessWorkspaceId, workspaceID, setDomainModalOpen, setLostBoardAccessModalOpen, navigate])

    const isBoardViewV2 = useMatch("/workspaces/:workspaceId/boards/*")
    const isSingleMode = !isBoardViewV2
    const workspaceId = useParams().workspaceId as string
    const boardId = useParams().boardId as string
    useBoardWebSocket(workspaceId ?? "", boardId ?? null)

    useUserActivityOverlay();



    return (
        <>
            <div className="theme-dark">
                <div className={`h-screen flex flex-col text-text overflow-hidden ${layoutBgClass}`}>


                    <Topbar isHidden={isSingleMode} />


                    <div className="flex flex-1 min-h-0 overflow-hidden">

                        <div className={isSidebarHidden ? "hidden" : ""}>
                            <Sidebar isSingleMode={isSingleMode} />
                        </div>

                        <main className=" relative overflow-hidden h-full min-h-0 w-full">
                            <Outlet />
                        </main>
                    </div>
                </div>
            </div>
            <OverlayRoot />
            {showBackdrop && (<BackdropLock visible={backdropVisible} />)}
            <DomainModal />
            <AsyncRequestToasterController />
        </>
    )
}

function BackdropLock({ visible }: { visible: boolean }) {
    const backdropOpacity = useOverlayStore((state) => state.backdropOpacity)
    // console.log("Rendering BackdropLock with opacity", backdropOpacity, "visible?", visible)
    return (createPortal(
        <div
            style={{
                backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})`,


            }}
            className={`absolute top-0 left-0 w-full h-full flex items-center justify-center z-50 transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0 "
                }`}
        >
        </div>,
        document.body
    ))

}


export const DomainModal = () => {
    const domainModalOpen = useUiStore((state) => state.domainModalOpen)
    const setDomainModalOpen = useUiStore((state) => state.setDomainModalOpen)
    const domainModalData = useUiStore((state) => state.domainModalData)
    const openOverlay = useOverlayStore((state) => state.open)
    const closeOverlay = useOverlayStore((state) => state.close)
    const stack = useOverlayStore(useShallow((state) => state.stack))
    const isActive = useOverlayStore((state) => state.isActive)


    const modalRef = useRef<HTMLDivElement>(null)
    const modalId = "domain-modal";
    function handleOpenDomainModal() {
        const descriptor: OverlayDescriptor = {
            id: modalId,
            render: () => <DomainModalWrapper ref={modalRef} onClose={() => setDomainModalOpen(false)} theme={domainModalData?.theme}>
                {() => domainModalData?.componentent?.(() => setDomainModalOpen(false))}
            </DomainModalWrapper>,
            anchorRef: domainModalData?.anchorRef ?? undefined,
            panelRef: modalRef,
            type: "modal",
            renderType: domainModalData?.renderType || "virtual",
            exclusiveGroup: "modals",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: domainModalData?.closeOnClickOutside ?? true,
                closeOnEscape: domainModalData?.closeOnEscape ?? true,
                lockBackdrop: domainModalData?.lockBackdrop ?? true,
            },
            position: {
                placement: domainModalData?.placement || "top",
                virtual: domainModalData?.virtual || "viewport-center",
                offset: [0, 0],
            }
        }
        openOverlay(descriptor);

    }
    useEffect(() => {
        if (domainModalOpen) {
            handleOpenDomainModal()
        } else {
            closeOverlay(modalId)
        }
    }, [domainModalOpen])

    useEffect(() => {
        if (!isActive(modalId) && domainModalOpen) {
            setDomainModalOpen(false)
        }
    }, [stack, isActive, domainModalOpen, setDomainModalOpen])

    useEffect(() => {
        if (!domainModalOpen || !domainModalData?.autoCloseMs) return
        const timeoutId = setTimeout(() => {
            domainModalData.onAutoClose?.()
            setDomainModalOpen(false)
        }, domainModalData.autoCloseMs)

        return () => clearTimeout(timeoutId)
    }, [domainModalOpen, domainModalData, setDomainModalOpen])

    return (null)
}

function HeadlessTimedNoticeMenu({
    title,
    description,
    actionLabel,
    onAction
}: {
    title: string,
    description: string,
    actionLabel?: string,
    onAction?: () => void
}) {
    return (
        <div className="flex flex-col justify-start items-start w-full h-full p-4 gap-3 min-w-[360px]">
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="text-sm opacity-90">{description}</p>
            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-2 px-3 py-2 rounded-md border border-neutral-300/20 text-sm font-medium text-neutral-100 bg-white/10 hover:bg-white/15 transition-colors"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    )
}
