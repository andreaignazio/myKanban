import { useEffect, useLayoutEffect, useState, useRef, type RefObject, type ReactNode } from "react";
import { useBoardMembersStore, boardMemberKey } from "@/stores/boardMembersStore";
import { useUserStore } from "@/stores/userStore";
import { useShallow } from "zustand/shallow";
import { UserAvatar } from "../badges/UserAvatar";
import { useAuthStore } from "@/stores/auth";
import { FunnelIcon } from "@heroicons/react/24/outline";
import { useCurrentBoardRole } from "@/hooks/useCurrentBoardRole";
import { useUiStore } from "@/stores/uiStore";

type BoardMembersSubMenuProps = {
    boardID: string;
    defaultTabId?: string;
    extraTabs?: BoardMembersSubMenuTab[];
    dynamicHeight?: boolean;
    maxDynamicContentHeight?: number;
}

type BoardMembersSubMenuTab = {
    id: string;
    label: string;
    component?: ReactNode;
    content: ReactNode;
}

export const BoardMembersSubMenu = ({ boardID, defaultTabId, extraTabs, dynamicHeight = false, maxDynamicContentHeight = 460 }: BoardMembersSubMenuProps) => {
    const [showInactiveLinks, setShowInactiveLinks] = useState(false);
    const getBoardMembersCount =
        useBoardMembersStore((state) => state.getBoardMembersCount);

    const membersCount = getBoardMembersCount(boardID);
    const tabs = [
        ...(extraTabs ?? []),
        { id: "members", label: `Board Members`, component: <Counter count={membersCount} /> },
        { id: "links", label: "Links" },
    ]

    const [activeTab, setActiveTab] = useState(defaultTabId ?? tabs[0]?.id ?? "members")
    const headerRef = useRef<HTMLDivElement | null>(null);
    const activePanelRef = useRef<HTMLDivElement | null>(null);
    const [animatedHeight, setAnimatedHeight] = useState<number | null>(null);

    useEffect(() => {
        const availableIds = tabs.map((tab) => tab.id);
        if (!availableIds.includes(activeTab)) {
            setActiveTab(defaultTabId ?? tabs[0]?.id ?? "members");
        }
    }, [activeTab, defaultTabId, tabs]);

    const { isAdminOrOwner } = useCurrentBoardRole(boardID);
    const activeExtraTab = (extraTabs ?? []).find((tab) => tab.id === activeTab);

    useLayoutEffect(() => {
        if (!dynamicHeight) return;

        const headerEl = headerRef.current;
        const panelEl = activePanelRef.current;
        if (!headerEl || !panelEl) return;

        const recalc = () => {
            const headerHeight = headerEl.getBoundingClientRect().height;
            const panelHeight = Math.min(panelEl.scrollHeight, maxDynamicContentHeight);
            setAnimatedHeight(headerHeight + panelHeight);
        };

        recalc();

        const observer = new ResizeObserver(() => recalc());
        observer.observe(headerEl);
        observer.observe(panelEl);
        window.addEventListener("resize", recalc);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", recalc);
        };
    }, [activeTab, activeExtraTab, boardID, dynamicHeight, maxDynamicContentHeight]);

    return (
        <div
            className={`w-full min-h-0 flex bg-transparent flex-col gap-0 overflow-hidden relative ${dynamicHeight ? "" : "h-full"}`}
            style={dynamicHeight
                ? {
                    height: animatedHeight ? `${animatedHeight}px` : undefined,
                    transition: "height 220ms ease",
                }
                : undefined}
        >
            <div ref={headerRef} className="w-full flex flex-col">
                <div className="w-full cursor-default flex flex-row items-center justify-between pt-4 pb-0">
                    <div className="flex flex-row items-center justify-start gap-6">
                        {tabs.map((tab) => (
                            <div
                                key={tab.id}
                                className={`relative flex flex-row
                                    cursor-pointer
                                     h-[28px] text-sm text-text/70 hover:text-text 
                                     transition-colors 
                                     ${activeTab === tab.id
                                        ? "text-[#6297e7] font-bold"
                                        : ""}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                                {tab.component && <span className="ml-1">{tab.component}</span>}
                                <div className={`${activeTab === tab.id ? "absolute mt-2 bottom-0 w-full h-[3px] bg-[#6297e7]" : "hidden"}`} />
                            </div>
                        ))}
                    </div>

                    {activeTab === "links" && (
                        <div className="-translate-y-1">
                            <LabeledButtonPresetA
                                className="!h-7 !px-2 text-xs"
                                label={showInactiveLinks ? "Hide inactive" : "Show inactive"}
                                onClick={() => setShowInactiveLinks((prev) => !prev)}
                            >
                                <FunnelIcon className="w-4 h-4" />
                            </LabeledButtonPresetA>
                        </div>
                    )}
                </div>
                <div className="flex w-full h-[0.5px] bg-neutral-600" />
            </div>

            <div className={dynamicHeight ? "overflow-hidden" : "flex-1 min-h-0 overflow-hidden"}>
                {activeTab === "members" && (
                    <div ref={activePanelRef} className={dynamicHeight ? "w-full overflow-y-auto scrollbar-hidden" : "w-full h-full min-h-0 overflow-hidden"}>
                        <BoardMembersTab boardID={boardID} isAdminOrOwner={isAdminOrOwner} dynamicHeight={dynamicHeight} />
                    </div>
                )}

                {activeTab === "links" && (
                    <div ref={activePanelRef} className={dynamicHeight ? "w-full overflow-y-auto scrollbar-hidden" : "w-full h-full min-h-0 overflow-hidden"}>
                        <BoardLinksTab showInactive={showInactiveLinks} dynamicHeight={dynamicHeight} />
                    </div>
                )}

                {activeExtraTab && (
                    <div ref={activePanelRef} className={dynamicHeight ? "w-full overflow-y-auto scrollbar-hidden" : "w-full h-full min-h-0 overflow-hidden"}>
                        {activeExtraTab.content}
                    </div>
                )}


            </div>
        </div>

    )
}

const Counter = ({ count }: { count: number }) => {
    return (
        <div className="min-w-[22px] h-5 px-1 rounded-full bg-[#6297e7]/20 text-[#6297e7] text-xs font-medium flex items-center justify-center">
            {count}
        </div>
    )
}

type BoardMembersTabProps = {
    boardID: string;
    isAdminOrOwner: boolean;
    dynamicHeight?: boolean;
}

export const BoardMembersTab = ({ boardID, isAdminOrOwner, dynamicHeight = false }: BoardMembersTabProps) => {
    const fetchBoardMembers = useBoardMembersStore((state) => state.fetchBoardMembers);
    const membersIds = useBoardMembersStore(useShallow((state) => state.membersIdsByBoardId[boardID] ?? []));

    useEffect(() => {
        fetchBoardMembers(boardID);
    }, [boardID, fetchBoardMembers])

    return (
        <>

            <div className={`w-full min-h-0 flex flex-col gap-2 py-2 overflow-y-auto overflow-x-hidden scrollbar-hidden ${dynamicHeight ? "max-h-[460px]" : "h-full"}`}>
                {membersIds.map((userId) => (
                    <BoardMemberRow key={userId} userId={userId} isAdminOrOwner={isAdminOrOwner} />
                ))}
            </div>
        </>
    )

}
import { useBoardActionRegistry } from "@/actionRegistry/boardActionRegistry";
import { useParams } from "react-router";
import { BoardMembersDropdown } from "../menuElements/MembersDropdown/BoardMembersDropdown";
import { LabeledButtonCustom, LabeledButtonPresetA } from "../buttons/labeledButton";
import { useShareLinksStore } from "@/stores/shareLinksStore";
import type { PublicShareLink, User } from "@/stores/types";
import { CircleAlert, Link, ShieldCheckIcon, ShieldXIcon } from "lucide-react";
import { UserRoleBadge, type Role } from "../badges/UserRoleBadge";
import { DateStatusBadge } from "../cardRowElements/DateStatusBadge";
import { LeaveRemoveMember } from "../common/leaveRemoveMember";
import { AsyncRequestOverlayA, FetchOverlay } from "../asyncRequestHandlers/asyncRequestOverlayA";
import { useAsyncKey } from "@/stores/asyncRequestStore";
import { useAsyncRequest } from "@/hooks/useAsyncRequest";
type BoardMemberRowProps = {
    userId: string;
    isAdminOrOwner: boolean;
}


export const BoardMemberRow = ({ userId, isAdminOrOwner }: BoardMemberRowProps) => {
    const user = useUserStore((state) => state.usersById[userId]);
    const boardID = useParams().boardId as string;
    const workspaceMember = useBoardMembersStore((state) => state.membersById[boardMemberKey(boardID, userId)]);
    const currentUserId = useAuthStore((state) => state.userID);
    const isCurrentUser = userId === currentUserId;
    const boardActions = useBoardActionRegistry();

    const roleStr = workspaceMember?.Role ?? "member"
    const roleLabel = roleStr.charAt(0).toUpperCase() + roleStr.slice(1);
    const canLeave = isCurrentUser && roleStr !== "owner";

    const handleLeaveBoard = async () => {
        if (!currentUserId) return;
        await boardActions.leaveBoard(boardID, currentUserId);
    }

    const handleRemoveMember = async () => {
        await boardActions.deleteBoardMember(boardID, userId);
    }

    const { isLoading } = useAsyncRequest(useAsyncKey("board:member:fetch", boardID));

    return (

        <div className={`relative w-full h-fit rounded-lg overflow-hidden py-1`}>
            <FetchOverlay
                variant="banner"
                minLoadingMs={0}
                show={["loading"]}
                requestKey={useAsyncKey("board:member:fetch", boardID)} />

            <div className={`${isLoading ? "opacity-0" : "opacity-100"} w-full h-10 flex flex-row items-center justify-between gap-4 rounded-md overflow relative`}>




                <div className="flex flex-row items-center gap-4">
                    <UserAvatar user={user} />
                    <div className="flex flex-col">
                        <span className={`text-sm ${isCurrentUser ? "font-bold" : ""}`}>{user?.Name + (isCurrentUser ? " (You)" : "")}</span>
                        <div className="text-xs text-neutral-500 flex flex-row items-center gap-1">
                            <span className="text-xs text-neutral-400">@{user?.Username}</span>
                            <span className="text-xs text-neutral-600 whitespace-pre-wrap"> • Workspace {roleLabel}</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-[160px_120px] gap-2 h-10 justify-end">
                    <LeaveRemoveMember

                        className="!h-10 !px-0 flex flex-row items-center justify-center gap-2 "
                        canRemove={isAdminOrOwner && !isCurrentUser}
                        canLeave={canLeave}
                        isCurrentUser={isCurrentUser}
                        onLeave={() => void handleLeaveBoard()}
                        onRemove={() => void handleRemoveMember()}
                    />
                    <BoardMembersDropdown
                        className="!rounded-md !text-sm font-semibold"
                        userId={userId} boardID={boardID}
                        isAdminOrOwner={isAdminOrOwner}
                        isCurrentUser={isCurrentUser} />
                </div>
            </div>
        </div>

    )

}


export const BoardLinksTab = ({ showInactive, dynamicHeight = false }: { showInactive: boolean; dynamicHeight?: boolean }) => {
    const boardID = useParams().boardId as string;
    const fetchLinksByTargetId = useShareLinksStore((state) => state.fetchShareLinksByTargetId);
    const revokeShareLink = useShareLinksStore((state) => state.revokeShareLink);
    const buildUrlFromToken = useShareLinksStore((state) => state.buildUrlFromToken);
    const setDomainModalOpen = useUiStore((state) => state.setDomainModalOpen);
    const shareLinksIdsByTargetId = useShareLinksStore(useShallow((state) => state.shareLinkIdsByTargetId[boardID] ?? []));
    const userById = useUserStore((state) => state.usersById);
    const linksbyId = useShareLinksStore((state) => state.shareLinksById);

    const handleFetchLinks = async () => {
        await fetchLinksByTargetId(boardID);
    }

    useEffect(() => {
        handleFetchLinks();
    }, [boardID, fetchLinksByTargetId])

    const handleRevokeLink = async (linkId: string) => {
        await revokeShareLink(linkId);
        await fetchLinksByTargetId(boardID);
    }

    const handleCopyLink = async (link: PublicShareLink, anchorRef: RefObject<HTMLElement | null>) => {
        const shareUrl = buildUrlFromToken(link.Token);
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(shareUrl);
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = shareUrl;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
        }

        setDomainModalOpen(true, {
            componentent: () => <CopyLinkHeadlessMenu />,
            anchorRef,
            renderType: anchorRef.current ? "anchored" : "virtual",
            placement: "top",
            virtual: "viewport-bottom-right",
            autoCloseMs: 1400,
            closeOnClickOutside: false,
            closeOnEscape: true,
            lockBackdrop: false,
        });
    }

    const linkIds = [...shareLinksIdsByTargetId].sort((leftId, rightId) => {
        const leftLink = linksbyId[leftId];
        const rightLink = linksbyId[rightId];

        const leftExpiresAt = leftLink?.ExpiresAt ? new Date(leftLink.ExpiresAt).getTime() : Number.NEGATIVE_INFINITY;
        const rightExpiresAt = rightLink?.ExpiresAt ? new Date(rightLink.ExpiresAt).getTime() : Number.NEGATIVE_INFINITY;

        return rightExpiresAt - leftExpiresAt;
    });

    const visibleLinkIds = linkIds.filter((linkId) => {
        if (showInactive) return true;
        const link = linksbyId[linkId];
        const expiryDate = link?.ExpiresAt ? new Date(link.ExpiresAt) : undefined;
        const isExpired = expiryDate ? expiryDate.getTime() < Date.now() : false;
        const isRevoked = Boolean(link?.RevokedAt);
        return !isExpired && !isRevoked;
    });

    return (
        <div className={`w-full min-h-0 flex flex-col gap-2 py-2 overflow-y-auto overflow-x-hidden scrollbar-hidden ${dynamicHeight ? "max-h-[460px]" : "h-full"}`}>
            {visibleLinkIds.map((linkId) => {
                const link = linksbyId[linkId];
                const creatorUser = userById[link.CreatedByUserID];
                return <BoardLinkRow key={linkId} link={link} creatorUser={creatorUser as User} onRevoke={handleRevokeLink} onCopyLink={handleCopyLink} />;
            })}
        </div>
    )
}

type BoardLinkRowProps = {
    link: PublicShareLink;
    creatorUser: User;
    onRevoke: (linkId: string) => Promise<void>;
    onCopyLink: (link: PublicShareLink, anchorRef: RefObject<HTMLElement | null>) => Promise<void>;
}

const BoardLinkRow = ({ link, creatorUser, onRevoke, onCopyLink }: BoardLinkRowProps) => {
    const copyButtonRef = useRef<HTMLDivElement>(null);
    const asyncKey = useAsyncKey("board:sharelink:revoke", link.ID);

    const expiryDate = link.ExpiresAt ? new Date(link.ExpiresAt) : undefined;
    const now = Date.now();
    const isExpired = expiryDate ? expiryDate.getTime() < now : false;
    const isDueSoon = expiryDate
        ? expiryDate.getTime() > now && expiryDate.getTime() - now < 24 * 60 * 60 * 1000
        : false;

    const isRevoked = link.RevokedAt ? true : false;
    const isActive = !isExpired && !isRevoked;

    const expiryLabel = expiryDate
        ? new Intl.DateTimeFormat("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(expiryDate)
        : "No expiry";

    const expiryTone = isExpired ? "overdue" : isDueSoon ? "dueSoon" : "default";
    const modeLabel = link.Mode === "sendrequest" ? "Request" : "Auto-join";

    return (
        <div className=" relative w-full min-h-10 grid grid-cols-[42px_minmax(120px,1fr)_96px_80px_24px_124px_92px] items-center gap-0 rounded-md overflow-hidden">

            <AsyncRequestOverlayA requestKey={asyncKey}
                show={["error", "loading"]}
                variant="banner" />


            <div className="flex items-center justify-center">
                <UserAvatar user={creatorUser} />
            </div>

            <div className="flex items-center justify-center">
                <DateStatusBadge
                    label={expiryLabel}
                    tone={expiryTone}
                    rowHeight={24}
                />
            </div>

            <div className="flex items-center justify-center">
                <span className="w-fit flex items-center justify-center rounded-full border border-indigo-500/40 bg-indigo-500/15 text-indigo-200 px-2 py-1 pb-1.5 max-h-6 text-xs font-medium">
                    {modeLabel}
                </span>
            </div>

            <div className="flex items-center justify-center">
                <UserRoleBadge role={link.Role as Role} />
            </div>

            <div className="flex items-center justify-center">
                {isActive ? (
                    <ShieldCheckIcon className="w-4 h-4 text-green-500" />
                ) : (
                    <ShieldXIcon className="w-4 h-4 text-red-500" />
                )}
            </div>

            <div className="flex items-center justify-center">
                <LabeledButtonCustom ref={copyButtonRef} label="Copy Link" onClick={() => void onCopyLink(link, copyButtonRef)}
                    disabled={!isActive}
                    className="bg-menubtn rounded-md h-9 justify-center text-sm
                            font-medium tracking-wide" >
                    <Link className="w-4 h-4 " />
                </LabeledButtonCustom>
            </div>

            <div className="flex items-center justify-center">
                <LabeledButtonPresetA className="!rounded-[4px]" label="Revoke" onClick={() => void onRevoke(link.ID)} >
                    <CircleAlert className="w-4 h-4 " />
                </LabeledButtonPresetA>
            </div>
        </div>


    )
}

function CopyLinkHeadlessMenu() {
    return (
        <div className="flex flex-col items-start gap-1 px-3 py-2 min-w-[180px]">
            <span className="text-sm font-medium">Link copiato</span>
            <span className="text-xs text-neutral-400">Il link è negli appunti.</span>
        </div>
    )
}