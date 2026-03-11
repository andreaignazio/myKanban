import { forwardRef, useEffect, useRef, useState, type ComponentType, type MutableRefObject, type SVGProps } from "react";
import { useParams } from "react-router";
import { ActionMenuWrapper } from "./ListActionsMenu";
import type { MenuItemExtended } from "@/types/uiTypes";
import { DropDown } from "../menuElements/DropDown";
import { CheckIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/solid";
import {
    ArchiveBoxIcon,
    ArchiveBoxXMarkIcon,
    ArrowsPointingInIcon,
    DocumentDuplicateIcon,
    EnvelopeIcon,
    EyeIcon,
    InformationCircleIcon,
    PaintBrushIcon,
    ShareIcon,
    StarIcon,
    TagIcon,
    ClockIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { BaseBtn } from "@/pages/BoardView";
import type { Board } from "@/stores/types";
import { useBoardsStore } from "@/stores/boardsStore";
import { useAuditStore } from "@/stores/auditStore";
import { useBoardActionRegistry } from "@/actionRegistry/boardActionRegistry";
import { BoardAbout } from "./BoardActions/BoardAbout";
import { VisibilityDropDown } from "../common/VisibilityDropDown";
import { BoardChangeBg } from "./BoardActions/BoardChangeBg";
import { BoardColorsSection } from "../workspaceView/BoardColorsSection";
import { ImageSearchMenu } from "../cardMenus/imageSearchMenu";
import { CardLabelsSelector, CreateBoardLabelMenu } from "../cardMenus/cardLabelMenu";
import { LabeledButtonCustom } from "../buttons/labeledButton";
import { CustomInput } from "../menuElements/CustomInput";
import { useUserWatchStore } from "@/stores/userWatchStore";
import { BoardArchive } from "./BoardActions/BoardArchive";
import { ActivityFeedRenderer } from "@/pages/User/acitivityFeedRenderer";
import { useFetchFeedsForBoard } from "@/hooks/useFetchFeedsForBoard";
import { useShallow } from "zustand/shallow";
import { BoardShareModal } from "./BoardShareModal";
import { useCurrentBoardRole } from "@/hooks/useCurrentBoardRole";
import { useAuthStore } from "@/stores/auth";
import { useTabPanelAutoHeight } from "@/hooks/useTabPanelAutoHeight";


type BoardActionMenuBtnProps = {
    className?: string;
    active?: boolean;
    customId?: string;
}


export const BoardActionMenuBtn = forwardRef<HTMLButtonElement, BoardActionMenuBtnProps>(({ className, active, customId }, ref) => {
    const openOverlay = useOverlayStore((state) => state.open);
    const onMenuClose = useOverlayStore((state) => state.close);

    const listActionsMenuRef = useRef<HTMLDivElement>(null)
    const anchorRef = useRef<HTMLButtonElement | null>(null);
    const setAnchorRefs = (node: HTMLButtonElement | null) => {
        anchorRef.current = node;
        if (typeof ref === "function") {
            ref(node);
            return;
        }
        if (ref) {
            (ref as MutableRefObject<HTMLButtonElement | null>).current = node;
        }
    };
    function handleOpenListActionModal() {
        // console.log("Opening respond modal for share offer");
        const id = customId ?? "board-action-menu";
        const descriptor: OverlayDescriptor = {
            id: id,
            render: () => <BoardActionsMenu onClose={() => onMenuClose(id)} ref={listActionsMenuRef} />,
            anchorRef: anchorRef,
            panelRef: listActionsMenuRef,
            type: "modal",
            renderType: "anchored",
            exclusiveGroup: "share-action-modal",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            },
            position: {
                placement: "bottom-end",
                offset: [10, 8],
            }
        }
        openOverlay(descriptor);

    }

    return (
        <BaseBtn
            active={active}
            onClick={handleOpenListActionModal} ref={setAnchorRefs} className={className}>
            <EllipsisHorizontalIcon className="w-6 h-6 " />
        </BaseBtn>
    )
});


type BoardActionsMenuProps = {
    onClose: () => void;

}

export type BoardActionsMenuTabs = "menu" | "activity" | "about"
    | "changeBackground" | "colors" | "images" | "labels" | "labelEditor" | "archive";

export const BoardActionsMenu = forwardRef<HTMLDivElement, BoardActionsMenuProps>(({ onClose, }, ref) => {
    const boardID = useParams().boardId as string;
    const workspaceId = useParams().workspaceId as string;
    const boardsStore = useBoardsStore();
    const userBoardRelation = useBoardsStore((state) => state.userBoardsById[boardID]);
    const boardActiios = useBoardActionRegistry();
    const isWatched = useUserWatchStore((state) => state.isBoardWatched(boardID));
    const boardWatch = useUserWatchStore((state) => state.boardWatchByBoardId[boardID]);
    const addBoardWatch = useUserWatchStore((state) => state.addBoardWatch);
    const patchBoardWatchActive = useUserWatchStore((state) => state.patchBoardWatchActive);
    const currentUserID = useAuthStore((state) => state.userID);
    const { isAdminOrOwner, isOwner } = useCurrentBoardRole(boardID);
    const openOverlay = useOverlayStore((state) => state.open);
    const closeOverlay = useOverlayStore((state) => state.close);

    const [activeTab, setActiveTab] = useState<BoardActionsMenuTabs>("menu")
    const [activeLabelID, setActiveLabelID] = useState<string | undefined>(undefined)
    const [labelsSearchInput, setLabelsSearchInput] = useState("")
    const isStarred = !!userBoardRelation?.Props?.Starred;
    const canAccessArchiveTab = isAdminOrOwner;
    const canEditBoardSettings = isAdminOrOwner;

    useEffect(() => {
        if (activeTab === "archive" && !canAccessArchiveTab) {
            setActiveTab("menu")
        }
    }, [activeTab, canAccessArchiveTab])

    useEffect(() => {
        if (!canEditBoardSettings && ["changeBackground", "colors", "images"].includes(activeTab)) {
            setActiveTab("menu")
        }
    }, [activeTab, canEditBoardSettings])

    const ICON_SIZE_CLASS = "w-4 h-4";
    const iconClassName = `${ICON_SIZE_CLASS} text-neutral-300`;
    const icon = (Icon: ComponentType<SVGProps<SVGSVGElement>>) => <Icon className={iconClassName} />;

    const anchorRef = useRef<HTMLDivElement | null>(null);
    const shareBoardModalRef = useRef<HTMLDivElement>(null);

    const handleOpenShareBoardModal = () => {
        onClose();
        const id = "shareBoardModal";
        const descriptor: OverlayDescriptor = {
            id,
            render: () => (
                <BoardShareModal
                    ref={shareBoardModalRef}
                    onClose={() => closeOverlay(id)}
                    targetID={boardID}
                    style={{ width: "680px" }}
                />
            ),
            panelRef: shareBoardModalRef,
            type: "modal",
            renderType: "virtual",
            exclusiveGroup: "board-view-modals",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            },
            position: {
                virtual: "viewport-center",
            },
        };
        openOverlay(descriptor);
    };

    const boardVisibility = () => {
        const board: Board | undefined = boardsStore.boardsById[boardID];
        if (!board) return "private";
        return board.Visibility;
    }

    const boardVisibilityLabel = () => {
        const visibility = boardVisibility();
        if (visibility === "private") return "Private";
        if (visibility === "workspace") return "Workspace";
        if (visibility === "public") return "Public";
        return "Private";
    }

    const setBoardVisibility = (visibility: string) => {
        return boardActiios.setBoardVisibility(boardID, visibility);
    }

    const toggleBoardWatch = () => {
        if (boardWatch) {
            return patchBoardWatchActive(boardID, !isWatched);
        }
        return addBoardWatch(boardID);
    }

    const toggleBoardStarred = () => {
        return boardActiios.setBoardStarred(boardID, !isStarred);
    }

    const h = 32; // Standard height for menu items, can be adjusted as needed
    const panelClassName = (tab: BoardActionsMenuTabs, extraClassName = "") =>
        `absolute inset-0 text-neutral-300 overflow-hidden transition-all duration-200 ease-out scrollbar-hidden ${activeTab === tab
            ? "opacity-100 translate-x-0 pointer-events-auto"
            : "opacity-0 translate-x-2 pointer-events-none"
        } ${extraClassName}`

    const TAB_MIN_HEIGHT: Record<BoardActionsMenuTabs, number> = {
        menu: 420,
        activity: 260,
        about: 200,
        changeBackground: 300,
        colors: 220,
        images: 360,
        labels: 0,
        labelEditor: 260,
        archive: 50,
    }

    const PANEL_MAX_HEIGHT = 620
    const { resolvedPanelHeight, getPanelRef } = useTabPanelAutoHeight<BoardActionsMenuTabs>({
        activeTab,
        minHeightByTab: TAB_MIN_HEIGHT,
        maxHeight: PANEL_MAX_HEIGHT,
    })

    const closeBoardItem: MenuItemExtended = {
        id: "closeboard",
        label: "Close board",
        kind: "standard",
        height: h,
        icon: icon(ArchiveBoxXMarkIcon),
        onClick: () => boardActiios.closeBoardWithConfirmation(workspaceId, boardID, anchorRef),
    };

    const leaveBoardItem: MenuItemExtended = {
        id: "leaveboard",
        label: "Leave board",
        kind: "standard",
        height: h,
        icon: icon(XMarkIcon),
        onClick: () => {
            if (!currentUserID) return;
            boardActiios.leaveBoardWithConfirmation(boardID, currentUserID, anchorRef, onClose);
        },
    };


    const menuItems: MenuItemExtended[] = [
        {
            id: "share",
            label: "Share",
            kind: "standard",
            height: h,
            icon: icon(ShareIcon),
            onClick: handleOpenShareBoardModal,
        },
        {
            id: "about", label: "About this board", description: "Add a description to your board", kind: "standard",
            height: 48, icon: icon(InformationCircleIcon),
            onClick: () => setActiveTab("about")
        },
        {
            id: "visibility", label: `Visibility: ${boardVisibilityLabel()}`, kind: "anchoredMenu", height: h, icon: icon(EyeIcon)
            , disabled: !canEditBoardSettings
            , anchoredMenuProps: {
                exclusiveGroup: "board-action-menu-nested",
                menuComponent: ({ onClose, ref }) =>
                    <VisibilityDropDown
                        selectedVisibility={boardVisibility()}
                        setSelectedVisibility={(visibility) => {
                            void setBoardVisibility(visibility);
                            onClose();
                        }}
                        onClose={onClose}
                        ref={ref} />
            },
        },

        /* { id: "export", label: "Print, export, and share", kind: "standard", height: h, icon: icon(PrinterIcon) },*/
        {
            id: "star",
            label: "Star",
            kind: "standard",
            height: h,
            icon: icon(StarIcon),
            endIcon: isStarred ? <CheckIcon className="w-4 h-4" /> : undefined,
            onClick: () => { void toggleBoardStarred(); }
        },
        { id: "divider-1", label: "", kind: "divider", height: 1 },
        /* { id: "settings", label: "Settings", kind: "standard", height: h, icon: icon(Cog6ToothIcon) }, */
        {
            id: "changeBackground", label: "Change background", kind: "standard", height: h, icon: icon(PaintBrushIcon),
            disabled: !canEditBoardSettings,
            onClick: () => setActiveTab("changeBackground")
        },

        /* { id: "customfields", label: "Custom fields", kind: "standard", height: h, icon: icon(AdjustmentsHorizontalIcon) },*/
        /* { id: "divider-2", label: "", kind: "divider", height: 1 },*/
        {
            id: "labels", label: "Labels", kind: "standard", height: h, icon: icon(TagIcon),
            onClick: () => setActiveTab("labels")
        },
        /* { id: "stickers", label: "Stickers", kind: "standard", height: h, icon: icon(SparklesIcon) }, */
        /* { id: "makeTemplate", label: "Make template", kind: "standard", height: h, icon: icon(RectangleStackIcon) }, */
        { id: "activity", label: "Activity", kind: "standard", height: h, icon: icon(ClockIcon), onClick: () => setActiveTab("activity") },
        ...(canAccessArchiveTab ? [{
            id: "archiveditems", label: "Archived items", kind: "standard" as const, height: h, icon: icon(ArchiveBoxIcon),
            onClick: () => setActiveTab("archive")
        }] : []),
        { id: "divider-3", label: "", kind: "divider", height: 1 },
        {
            id: "watch",
            label: "Watch",
            kind: "standard",
            height: h,
            icon: icon(EyeIcon),
            endIcon: isWatched ? <CheckIcon className="w-4 h-4" /> : undefined,
            onClick: () => { void toggleBoardWatch(); }
        },
        { id: "collapseAll", label: "Collapse all lists", kind: "standard", height: h, icon: icon(ArrowsPointingInIcon) },
        { id: "copyboard", label: "Copy board", kind: "standard", height: h, icon: icon(DocumentDuplicateIcon) },
        { id: "emailboard", label: "Email board", kind: "standard", height: h, icon: icon(EnvelopeIcon) },
        ...(isAdminOrOwner ? [closeBoardItem] : []),
        ...(!isOwner ? [leaveBoardItem] : []),

    ]

    const Title = "Menu";
    return (
        <>
            <ActionMenuWrapper
                onBack={activeTab !== "menu" ? () => {
                    if (activeTab === "labelEditor") {
                        setActiveTab("labels");
                        return;
                    }
                    if (activeTab === "images") {
                        setActiveTab("changeBackground");
                        return;
                    }
                    setActiveTab("menu");
                } : undefined}
                requestGroups={[
                    { requestKey: ["board:edit:visibility", "board:edit:background:color", "board:edit:background:image", "userboard:edit:starred", "board:close", "board:label:create", "board:label:edit", "board:label:delete", "board:archive:list:restore", "board:archive:card:restore", "board:archive:list:purge", "board:archive:card:purge"], maxErrorMs: 3000, minLoadingMs: 0, minSuccessMs: 500 },
                    { requestKey: ["board:member:fetch", "board:archive:fetch"], show: ["error"], maxErrorMs: 3000 },
                ]}
                style={{ maxHeight: 650, overflow: "hidden", minHeight: TAB_MIN_HEIGHT[activeTab], paddingBottom: 10 }}

                ref={ref} Title={Title} onClose={onClose} width={350}
            >
                <div className="relative" style={{ height: `${resolvedPanelHeight}px` }}>
                    <div className={panelClassName("menu", "overflow-y-auto")}>
                        <div ref={getPanelRef("menu")}>
                            <DropDown items={menuItems} onClick={() => { }} />
                        </div>
                    </div>
                    <div className={panelClassName("activity", "overflow-y-auto")}>
                        <div ref={getPanelRef("activity")}>
                            <ActitivyTab boardId={boardID} />
                        </div>
                    </div>
                    <div className={panelClassName("about", "overflow-y-auto")}>
                        <div ref={getPanelRef("about")}>
                            <BoardAbout boardId={boardID} />
                        </div>
                    </div>
                    <div className={panelClassName("changeBackground")}>
                        <div ref={getPanelRef("changeBackground")}>
                            <BoardChangeBg onClick={(tab) => setActiveTab(tab)} />
                        </div>
                    </div>
                    <div className={panelClassName("colors")}>
                        <div ref={getPanelRef("colors")} className="px-4 pt-4">
                            <BoardColorsSection
                                onSelectColor={(color) => {
                                    void boardActiios.setBoardBackgroundColor(boardID, color.token);
                                    setActiveTab("menu");
                                }}
                            />
                        </div>
                    </div>
                    <div className={panelClassName("images", "overflow-y-auto")}>
                        <div ref={getPanelRef("images")}>
                            <ImageSearchMenu
                                showSearchHelpers={false}
                                defaultImageLimit={30}
                                onImageClick={(url) => {
                                    void boardActiios.setBoardBackgroundImage(boardID, url);
                                    setActiveTab("menu");
                                }}
                                onClose={() => setActiveTab("changeBackground")}
                            />
                        </div>
                    </div>
                    <div className={panelClassName("labels", "overflow-y-auto")}>
                        <div ref={getPanelRef("labels")} className="px-[14px] pb-3">
                            <div className="py-2 text-gray-500">
                                <CustomInput
                                    className={"h-[35px] mb-0"}
                                    value={labelsSearchInput}
                                    placeholder="Search labels..."
                                    onInputChange={(inputRef) => {
                                        if (!inputRef?.current) return;
                                        setLabelsSearchInput(inputRef.current.value);
                                    }}
                                />
                            </div>
                            <CardLabelsSelector
                                showCheckboxes={false}
                                searchQuery={labelsSearchInput}
                                onEditLabel={(id) => {
                                    setActiveLabelID(id);
                                    setActiveTab("labelEditor");
                                }}
                            />
                            <div className="py-1">
                                <LabeledButtonCustom
                                    label="Create new label"
                                    onClick={() => {
                                        setActiveLabelID(undefined);
                                        setActiveTab("labelEditor");
                                    }}
                                    className="bg-menubtn rounded-md h-8 justify-center font-medium text-[14px] tracking-wide"
                                />
                            </div>
                        </div>
                    </div>
                    <div className={panelClassName("labelEditor", "overflow-y-auto")}>
                        <div ref={getPanelRef("labelEditor")}>
                            <CreateBoardLabelMenu
                                onClose={onClose}
                                mode={activeLabelID ? "edit" : "create"}
                                labelId={activeLabelID}
                                onSelect={() => {
                                    setActiveLabelID(undefined);
                                    setActiveTab("labels");
                                }}
                            />
                        </div>
                    </div>
                    {canAccessArchiveTab && (
                        <div className={panelClassName("archive", "overflow-y-auto")}>
                            <div ref={getPanelRef("archive")}>
                                <BoardArchive boardID={boardID} />
                            </div>
                        </div>
                    )}
                </div>

            </ActionMenuWrapper>

        </>

    )
});

type ActitivyTabProps = {
    boardId: string;
}

export const ActitivyTab = ({ boardId }: ActitivyTabProps) => {
    const { loadMore } = useFetchFeedsForBoard(boardId);
    const auditIdsByBoardId = useAuditStore(useShallow((state) => state.auditIdsByBoardId));
    const auditLookUp = useAuditStore((state) => state.auditById);
    const auditIds = auditIdsByBoardId[boardId] || [];

    return (
        <div className="px-2  scrollbar-hidden h-[400px] overflow-y-auto flex flex-col gap-2 text-wrap items-center justify-start text-neutral-300">
            <ActivityFeedRenderer
                auditIds={auditIds}
                auditLookUp={auditLookUp}
                resetKey={boardId}
                onScrollEnd={() => {
                    void loadMore();
                }}
            />
        </div>
    )
}

