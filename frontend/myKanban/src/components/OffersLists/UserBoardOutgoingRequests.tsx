import { useCacheStore } from "@/stores/cacheStore";
import { useShareOffersStore, type ShareOffer } from "@/stores/shareOffersStore";
import type { Board, PublicShareLink, User, Workspace } from "@/stores/types";
import { Component, forwardRef, use, useEffect, useRef, useState, type JSX, type RefObject } from "react";
import { useShallow } from "zustand/shallow";
import { SubscriptionBadge } from "@/components/badges/subscriptionBadge";
import { ExclamationCircleIcon, PencilIcon, ShieldCheckIcon, SquaresPlusIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { ShareActionModal } from "../modals/ShareActionModal";
import { UserHoverCard } from "../modals/UserHoverCard";
import { CopyLinkText } from "../menuElements/CopyLinkToClipboard";
import { useShareLinksStore } from "@/stores/shareLinksStore";
import { useUserStore } from "@/stores/userStore";
import { UserAvatarDummy } from "../badges/UserAvatarDummy";
import { useBoardBackground } from "@/hooks/useBoardBackground";
import { ImageColorRenderer } from "../menuElements/ImageColorRenderer";
import { useWorkspaceDerivedProps } from "@/hooks/useWorkspaceDerivedProps";
import { CatalogIcon } from "@/icons/iconCatalog";
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus";
import { WorkspaceHoverCard } from "../hoverCards/WorkspaceHoverCard";
import { BoardHoverCard } from "../hoverCards/BoardHoverCard";

type OutgoingRequestsProps = {
    panelRef?: React.RefObject<HTMLDivElement | null>;
}
type TabularData = ShareOffer | PublicShareLink;

export type ColumnDefinition<Row extends TabularData = ShareOffer> = {
    name: string;
    key: string;
    width?: string;
    align?: "start" | "center" | "end";
    getValue: (row: Row) => string | null;
    style?: React.CSSProperties;
    labelStyle?: React.CSSProperties;
    renderCell?: (args: {
        value: string | null;
        shareId: string;
        style?: React.CSSProperties;
        row?: Row;
    }) => JSX.Element;
}

export const UserBoardOutgoingRequests = forwardRef<HTMLDivElement, OutgoingRequestsProps>(({ panelRef }: OutgoingRequestsProps, ref) => {

    const fetchUserBoardAccessSentRequests = useShareOffersStore((state) => state.fetchUserBoardAccessSentRequests)
    const offersIds = useShareOffersStore(useShallow((state) => state.userBoardAccessSentRequestsIds))
    const offersById = useCacheStore((state) => state.offerById)
    useEffect(() => {

        fetchUserBoardAccessSentRequests();
    }, [fetchUserBoardAccessSentRequests])

    const boardById = useCacheStore((state) => state.offerBoardById)

    function getBoardIdFromOffer(offer: ShareOffer) {
        if (offer.TargetType === "board") {
            return offer.TargetID;
        }
        return null;
    }

    function getWorkspaceIdFromOffer(offer: ShareOffer) {
        if (offer.TargetType === "board") {
            const board = boardById[offer.TargetID];
            // console.log("Board fetched for offer:", offer.ID, "is:", board);
            return board?.WorkspaceID || null;
        } else if (offer.TargetType === "workspace") {
            // console.log("Offer with ID:", offer.ID, "is a workspace share offer with TargetID:", offer.TargetID);
            return offer.TargetID;
        }
        return null;
    }

    const columns: ColumnDefinition[] = [
        { name: "Board", key: "board", width: "2fr", align: "start", getValue: (offer: ShareOffer) => getBoardIdFromOffer(offer) },
        { name: "Workspace", key: "workspace", width: "1.5fr", align: "center", getValue: (offer: ShareOffer) => getWorkspaceIdFromOffer(offer) },
        { name: "Stato", key: "status", width: "0.5fr", align: "center", getValue: (offer: ShareOffer) => offer.Status },
        { name: "Ruolo", key: "role", width: "0.5fr", align: "center", getValue: (offer: ShareOffer) => offer.OfferedRole },
        { name: "Data", key: "date", width: "1.2fr", align: "center", getValue: (offer: ShareOffer) => offer.CreatedAt },
        //{ name: "Mittente", key: "sender", width: "2fr", getValue: (offer: ShareOffer) => offer.FromUserID },
        { name: "Azione", key: "action", width: "90px", align: "center", getValue: (offer: ShareOffer) => offer.Status === "pending" ? "revoke" : offer.Status },
    ]

    return (
        <div
            ref={ref}
            className="theme-dark w-fit h-60vh flex bg-main flex-col
            overflow-hidden 
            items-center justify-start  
            font-grotesk text-neutral-200"
        >
            <div className="w-full max-w-5xl flex flex-col gap-2 mb-4">
                <p className="text-2xl font-semibold tracking-tight text-text">Inbox</p>
                <p className="text-sm text-text/70">Condivisioni ricevute, stato e mittenti in un colpo d'occhio.</p>
            </div>

            <div className="w-full max-w-5xl flex flex-col gap-3 animate-rise-in">


                <GridBuilder columns={columns} data={offersIds} />
            </div>
        </div>
    )
})

type GridBuilderProps<Row extends TabularData = ShareOffer> = {
    columns: ColumnDefinition<Row>[];
    data: string[];
    CustomLookup?: (id: string) => Row | undefined;
    emptyMessage?: string;
}

export function GridBuilder<Row extends TabularData = ShareOffer>({ columns, data, CustomLookup, emptyMessage }: GridBuilderProps<Row>) {

    const [layout, setLayout] = useState("");

    useEffect(() => {
        const newLayout = columns.map((col) => col.width ?? "1fr").join(" ");
        setLayout(newLayout);
    }, [columns]);

    const rowStyle = {
        gridTemplateColumns: layout,
    };

    return (
        <>
            <div className="w-full rounded-xl bg-transparent">
                <div className="flex flex-col gap-3">
                    <div
                        style={rowStyle}
                        className="hidden md:grid w-full gap-3 items-center px-4 py-2 text-xs uppercase tracking-wide text-text/60">
                        {data.length > 0 && columns.map((col) => {
                            const justifyTextClass = col.align === "start" ? "text-left" : col.align === "center" ? "text-center" : "text-center";
                            const justifyClass = col.align === "start" ? "justify-start" : col.align === "center" ? "justify-center" : "justify-center";
                            return (
                                <div className={`flex ${justifyTextClass} ${justifyClass}`} style={col.labelStyle} key={col.key}>
                                    {col.name}
                                </div>
                            );
                        })}
                    </div>

                    {data.length === 0 && (
                        <div className="w-full rounded-xl border border-border/40 p-6 text-sm text-text/70">
                            {emptyMessage ?? "Nessuna condivisione inviata per te."}
                        </div>
                    )}

                    {data.map((ID) => (
                        <div key={ID} className="grid w-full gap-3 items-center rounded-xl border border-border/40 min-h-24 px-4" style={rowStyle}>
                            <ShareOfferCustomRow<Row> offerId={ID} items={columns} CustomLookup={CustomLookup} />
                        </div>
                    ))}
                </div>
            </div>
        </>

    )
}



type ShareOfferRowProps<Row extends TabularData = ShareOffer> = {
    offerId: string;
    items: ColumnDefinition<Row>[];
    CustomLookup?: (id: string) => Row | undefined;

}

type ComponentRegistry = Record<string, { render: (value: string | null, shareId: string, style?: React.CSSProperties) => JSX.Element }>;

export function ShareOfferCustomRow<Row extends TabularData = ShareOffer>({ offerId, items, CustomLookup }: ShareOfferRowProps<Row>) {
    let data: Row | undefined = undefined;
    if (CustomLookup) {
        data = CustomLookup(offerId);
    } else {
        data = useCacheStore((state) => state.offerById[offerId]) as Row | undefined;
    }


    const componentsByKey: ComponentRegistry = {
        board: {
            render: (value: string | null, shareId: string, style?: React.CSSProperties) =>
                <BoardComponent ID={value} shareId={shareId} style={style} />
        },
        workspace: {
            render: (value: string | null, shareId: string, style?: React.CSSProperties) =>
                <WorkspaceComponent ID={value} shareId={shareId} style={style} />
        },
        sender: {
            render: (value: string | null, shareId: string, style?: React.CSSProperties) =>
                <UserComponent ID={value} shareId={shareId} style={style} />
        },
        recipient: {
            render: (value: string | null, shareId: string, style?: React.CSSProperties) =>
                <UserComponent ID={value} shareId={shareId} style={style} />
        },
        status: {
            render: (value: string | null, shareId: string, style?: React.CSSProperties) =>
                <StatusComponent status={value} style={style} />
        },
        role: {
            render: (value: string | null, shareId: string, style?: React.CSSProperties) =>
                <RoleComponent role={value} style={style} />
        },
        date: {
            render: (value: string | null, shareId: string, style?: React.CSSProperties) =>
                <DateComponent date={value} style={style} />
        },
        action: {
            render: (value: string | null, shareId: string, style?: React.CSSProperties) =>
                <ActionComponent action={value as GridActionType} shareId={shareId} style={style} />
        },
        link: {
            render: (value: string | null, shareId: string, style?: React.CSSProperties) =>
                <LinkComponent token={value ?? ""} style={style} />

        }


    }

    return (
        <>
            {items.map((item) => {
                const value = data ? item.getValue(data) : null;
                const justifyClass = item.align === "start" ? "justify-start" : item.align === "center" ? "justify-center" : "justify-end";
                const justifyTextClass = item.align === "start" ? "text-left" : item.align === "center" ? "text-center" : "text-right";
                const customCell = item.renderCell?.({ value, shareId: offerId, style: item.style, row: data });
                return (
                    <div key={item.key}
                        style={{ justifyContent: justifyClass }}
                        className={`grid col-auto gap-1 py-4 ${justifyTextClass}`}>
                        <span className="md:hidden text-[11px] uppercase tracking-wide text-text/60">{item.name}</span>
                        {customCell ?? (componentsByKey[item.key] ? componentsByKey[item.key].render(value, offerId, item.style) : <div>{value}</div>)}
                    </div>
                );
            })}



        </>
    )
}

export const LinkComponent = ({ token, style }: { token: string, style?: React.CSSProperties }) => {
    const link = useShareLinksStore((state) => state.buildUrlFromToken(token));

    return (
        <CopyLinkText link={link} label="Copy link" />
    )
}




type GridActionType = "revoke" | "respond" | "accepted" | "rejected" | "none";
type ActionComponentProps = {
    action: GridActionType;
    shareId: string;
    style?: React.CSSProperties;
}
export const ActionComponent = ({ action, shareId, style }: ActionComponentProps) => {
    const [label, setLabel] = useState("");
    const [justifyClass, setJustifyClass] = useState("justify-start");
    const [isPending, setIsPending] = useState(false);
    const openOverlay = useOverlayStore((state) => state.open)
    const onMenuClose = useOverlayStore((state) => state.close)

    useEffect(() => {
        switch (action) {
            case "revoke":
                setLabel("Revoke");
                setJustifyClass("justify-start");
                setIsPending(true);
                break;
            case "respond":
                setLabel("Respond");
                setJustifyClass("justify-start");
                setIsPending(true);
                break;
            case "accepted":
                setLabel("");
                setJustifyClass("justify-center");
                setIsPending(false);
                break;
            case "rejected":
                setLabel("");
                setJustifyClass("justify-center");
                setIsPending(false);
                break;
            default:
                setLabel("");
        }
    }, [action]);
    function onClick() {
        // console.log("Clicked action:", action, "for share offer with id:", shareId);
        if (action === "respond") {
            handleOpenRespondModal(shareId);
        } else if (action === "revoke") {
            handleOpenRespondModal(shareId);
        }

    }

    const shareActionModalRef = useRef<HTMLDivElement>(null)
    function handleOpenRespondModal(shareOfferID: string) {
        if (action !== "respond" && action !== "revoke") {
            return;
        }
        //  console.log("Opening respond modal for share offer", shareOfferID);
        const id = "respondModal-" + shareOfferID;
        const descriptor: OverlayDescriptor = {
            id: id,
            render: () => <ShareActionModal ref={shareActionModalRef} shareOfferID={shareOfferID} actionType={action} onClose={() => onMenuClose(id)} />,
            panelRef: shareActionModalRef,
            type: "modal",
            renderType: "virtual",
            exclusiveGroup: "share-action-modal",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            },
            position: {
                virtual: "viewport-center"
            }
        }
        openOverlay(descriptor);

    }

    return (
        <>
            <div onClick={onClick}
                className={`relative flex flex-row items-center ${justifyClass}
           ${isPending ? "hover:filter hover:brightness-110 hover:cursor-pointer" : ""}
         rounded-md py-1 px-2 gap-1`}
                style={style}
            >
                <div className=" text-nowrap">{label}</div>
                <div className=" rounded-sm  p-0.1">
                    {action === "respond" && <PencilIcon className="ms-2 w-5 h-5" />}
                    {action === "revoke" && <ExclamationCircleIcon className="w-5 h-5 text-red-500" />}
                    {action === "accepted" && <ShieldCheckIcon className="w-5 h-5 text-green-500" />}
                    {action === "rejected" && <XCircleIcon className="w-5 h-5 text-red-500" />}
                </div>
            </div>

        </>

    )

}

export const DateComponent = ({ date, style }: { date: string | null, style?: React.CSSProperties }) => {
    if (!date) {
        return <span className="text-sm text-text/60" style={style}>â€”</span>
    }

    const d = new Date(date);
    if (Number.isNaN(d.getTime())) {
        return <span className="text-sm text-text/60" style={style}>â€”</span>
    }

    const readable = new Intl.DateTimeFormat("it-IT", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(d);

    return (
        <span className="text-sm text-text" style={style}>{readable}</span>
    )
}

export const RoleComponent = ({ role, style }: { role: string | null, style?: React.CSSProperties }) => {
    const roleBadgeClass = getRoleBadgeClass(role as ShareOffer["OfferedRole"]);
    return (
        <span className={`w-fit rounded-full border px-2 py-1 text-xs font-medium ${roleBadgeClass}`} style={style}>
            {role}
        </span>
    )
}


export const StatusComponent = ({ status, style }: { status: string | null, style?: React.CSSProperties }) => {
    const statusBadgeClass = getStatusBadgeClass(status as ShareOffer["Status"]);
    return (
        <span className={`w-fit rounded-full border px-2 py-1 text-xs font-medium ${statusBadgeClass}`} style={style}>
            {status}
        </span>
    )
}


type ComponentProps = {
    ID: string | null;
    shareId: string;
}

type BoardComponentProps = ComponentProps & {
    style?: React.CSSProperties;
}
export const BoardComponent = ({ ID: boardId, shareId, style }: BoardComponentProps) => {
    const getBoard = useCacheStore((state) => state.getBoardById);
    const [board, setBoard] = useState<Board | undefined>(undefined);
    const anchorRef = useRef<HTMLDivElement>(null);
    const variant: string = "1";

    const { backgroundColorClassName, resolvedBackgroundUrl, backgroundType } = useBoardBackground({ board });

    useEffect(() => {
        if (!boardId) {
            // console.warn("Board ID is null for share offer with id:", shareId);
            return;
        }
        const board = getBoard(boardId);
        setBoard(board);
    }, [getBoard, boardId, shareId])

    function onClick() {
        // console.log("Clicked on share offer with id:", shareId, "and boardId:", boardId);
    }

    return (
        <>
            {variant === "1" && (
                <CardRowMenuBtn
                    customId={"board-hover-card-" + shareId}
                    menuComponent={({ onClose, ref }) => <BoardHoverCard boardID={boardId ?? ""} onClose={onClose} ref={ref} />}
                >
                    <div className="flex flex-row 
                items-center overflow-hidden
                 bg-transparent hover:bg-main/20
                  hover:cursor-pointer 
                  rounded-lg w-full h-16 " ref={anchorRef} onClick={onClick} style={style}>
                        <ImageColorRenderer
                            className="!w-full"
                            backgroundType={backgroundType}
                            bgImage={resolvedBackgroundUrl}
                            bgColor={backgroundColorClassName}
                        />
                    </div>
                </CardRowMenuBtn>
            )}
            {variant === "2" && (<DummyComponent Name={board?.Name ?? "Caricamento..."}
                Type="board"
                onClick={onClick}
                ref={anchorRef}
                style={style}
            />)}
        </>

    )
}




type WorkspaceComponentProps = ComponentProps & {
    style?: React.CSSProperties;

}

export const WorkspaceComponent = ({ ID: workspaceId, shareId, style }: WorkspaceComponentProps) => {
    const getWorkspace = useCacheStore((state) => state.getWorkspaceById);
    const [workspace, setWorkspace] = useState<Workspace | undefined>(undefined);
    const anchorRef = useRef<HTMLDivElement>(null);
    const getSubscription = useCacheStore((state) => state.getOfferWorkspaceSubscription);
    // setWorkspace(getWorkspace(workspaceId));
    useEffect(() => {
        if (!workspaceId) {
            // console.warn("Workspace ID is null for share offer with id:", shareId);
            return;
        }
        const workspace = getWorkspace(workspaceId);
        // console.log("Fetched workspace for ID:", workspaceId, workspace);
        setWorkspace(workspace);
    }, [getWorkspace, workspaceId, shareId])
    function onClick() {
        if (!workspaceId) {
            // console.warn("Workspace ID is null for share offer with id:", shareId);
            return;
        }
        setWorkspace(getWorkspace(workspaceId));
        // console.log("Clicked on share offer with id:", shareId, "and workspaceId:", workspaceId, workspace)
    }

    const variant: string = "1";
    const { avatarProps } = useWorkspaceDerivedProps("", workspace);
    const iconId = avatarProps?.iconId;


    return (
        <>
            {variant === "1" && (
                <CardRowMenuBtn
                    customId={"workspace-hover-card-" + shareId}
                    menuComponent={
                        ({ onClose, ref }) => <WorkspaceHoverCard workspaceID={workspaceId ?? ""} onClose={onClose} ref={ref} />
                    }
                >
                    <div className="flex flex-row gap-2 justify-center items-center" style={style}>
                        <CatalogIcon id={iconId ?? "boards"}
                            className="w-12 h-12
                     text-neutral-300  
                     border border-neutral-300 rounded-xl p-3"
                        />
                        <SubscriptionBadge plan={workspaceId ? getSubscription(workspaceId)?.Plan ?? "free" : "free"} />
                    </div>
                </CardRowMenuBtn>
            )}
            {variant === "2" && (<DummyComponent
                Name={workspace?.Name ?? "Caricamento..."}
                Type="workspace"
                onClick={onClick}
                ref={anchorRef}
                style={style}
            >
                <SubscriptionBadge plan={workspaceId ? getSubscription(workspaceId)?.Plan ?? "free" : "free"} />
            </DummyComponent>)}
        </>
    )
}
type UserComponentProps = ComponentProps & {
    style?: React.CSSProperties;
}

export const UserComponent = ({ ID: userId, shareId, style }: UserComponentProps) => {
    const getUser = useUserStore((state) => state.getUserByID);
    const [user, setUser] = useState<ReturnType<typeof getUser>>(undefined);
    const openOverlay = useOverlayStore((state) => state.open)
    const anchorRef = useRef<HTMLDivElement>(null);
    const userCardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!userId) {
            // console.warn("User ID is null for share offer with id:", shareId);
            return;
        }
        const user = getUser(userId);
        setUser(user);
    }
        , [getUser, userId, shareId])

    function onClick() {
        if (!userId) {
            return;
        }
        const id = `userGrid-${shareId}-${userId}`;
        const descriptor: OverlayDescriptor = {
            id,
            render: () => <UserHoverCard userID={userId} />,
            panelRef: userCardRef,
            anchorRef: anchorRef as RefObject<HTMLElement | null>,
            type: "popover",
            renderType: "anchored",
            exclusiveGroup: "user-card-hover",
            opts: {
                closeOnMouseLeave: false,
                closeOnClickOutside: true,
                closeOnEscape: true,
                lockBackdrop: true,
            }
        }
        openOverlay(descriptor)
    }

    if (!userId) {
        return <span className="text-sm text-text/60" style={style}>—</span>
    }

    return (
        <div
            ref={anchorRef}
            className="flex flex-row items-center overflow-hidden hover:bg-slate-500/20 rounded-lg w-full px-3 py-2 cursor-pointer"
            style={style}
            onClick={onClick}
        >
            <div className="mr-3">
                <UserAvatarDummy user={user ?? undefined} size={36} disableHoverEffect={true} />
            </div>
            <div className="flex flex-col min-h-12 items-start">
                <p className="font-semibold text-text">{user?.Name ?? "Caricamento..."}</p>
                <p className="text-xs text-text/70">@{user?.Username === "" ? "username" : user?.Username}</p>
            </div>
        </div>
    )
}


type DummyComponentProps = {
    Name: string;
    Username?: string;
    children?: React.ReactNode;
    Type: "board" | "workspace" | "user";
    onClick: () => void;
    style?: React.CSSProperties;
}
export const DummyComponent = forwardRef<HTMLDivElement, DummyComponentProps>(({ Name, Username, children, Type, onClick, style }: DummyComponentProps, ref) => {

    const avatarPlaceholder = Type === "user" ? "U" : Type === "board" ? "B" : "W";
    const avatarContent = Username ? Username[0].toUpperCase() : Name[0].toUpperCase();
    // console.log("Rendering DummyComponent with Name:", Name, "Username:", Username, "Type:", Type)

    return (
        <div
            ref={ref}
            onClick={onClick}
            className="flex flex-row items-center overflow-hidden hover:bg-main/20 hover:cursor-pointer rounded-lg w-full px-3 py-2"
            style={style}>
            <div className="bg-gray-500 min-w-9 min-h-9 rounded-full flex items-center justify-center mr-3">
                <p className="text-white text-sm">{avatarContent ?? avatarPlaceholder}</p>
            </div>
            <div className="flex flex-col min-h-12 items-start">
                <p className="font-semibold text-text">{Name}</p>
                {Type === "user" && <p className="text-xs text-text/70">@{Username === "" ? "mmm" : Username}</p>}
                {children}
            </div>
        </div >


    )
})

function getStatusBadgeClass(status: ShareOffer["Status"]) {
    switch (status) {
        case "accepted":
            return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
        case "pending":
            return "border-amber-500/40 bg-amber-500/15 text-amber-200";
        case "rejected":
            return "border-rose-500/40 bg-rose-500/15 text-rose-200";
        default:
            return "border-border/40 bg-surface/40 text-text";
    }
}

function getRoleBadgeClass(role: ShareOffer["OfferedRole"]) {
    switch (role) {
        case "owner":
            return "border-amber-500/40 bg-amber-500/15 text-amber-200";
        case "admin":
            return "border-sky-500/40 bg-sky-500/15 text-sky-200";
        case "member":
            return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
        case "viewer":
            return "border-slate-500/40 bg-slate-500/15 text-slate-200";
        default:
            return "border-border/40 bg-surface/40 text-text";
    }
}
