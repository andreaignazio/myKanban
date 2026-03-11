import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { forwardRef, use, useEffect, useRef, useState, useTransition } from "react";
import { useParams } from "react-router-dom";
import { ActionMenuWrapper } from "./ActionMenuWrapper";
import { ListColorSelector } from "./ListColorSelector";
import { DropDown } from "../menuElements/DropDown";
import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { MenuItemExtended } from "@/types/uiTypes";
import { LabeledButtonCustom } from "../buttons/labeledButton";
import { CardSkeleton } from "../cardMenus/cardSkeleton";
import { useCardsStore } from "@/stores/cardsStore";
import { ImageSearchMenu } from "../cardMenus/imageSearchMenu";
import { ButtonHoverInset } from "../menuElements/buttonHoverInset";
import { cardCover } from "@/domain/colorTokens";
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";

type CardActionMenuBtnProps = {
    cardID: string;

}

export const CardActionMenuBtn = forwardRef<HTMLDivElement, CardActionMenuBtnProps>(({ cardID }, ref) => {
    const openOverlay = useOverlayStore((state) => state.open);
    const onMenuClose = useOverlayStore((state) => state.close);

    const cardActionsMenuRef = useRef<HTMLDivElement>(null)
    const acnhorRef = ref as React.RefObject<HTMLDivElement>;
    const btnRef = useRef<HTMLDivElement>(null);
    function handleOpenCardActionModal() {
        // console.log("Opening respond modal for share offer");
        const id = "card-action-menu";
        const descriptor: OverlayDescriptor = {
            id: id,
            render: () => <CardCoverTabSelector onClose={() => onMenuClose(id)} ref={cardActionsMenuRef} />,
            anchorRef: btnRef,
            panelRef: cardActionsMenuRef,
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
                virtual: "viewport-center",
                placement: "bottom",
            }
        }
        openOverlay(descriptor);

    }

    return (
        <div
            onClick={handleOpenCardActionModal}
            ref={btnRef} className="w-7 h-7 rounded-full p-1 flex items-center justify-center hover:bg-neutral-700/25 cursor-pointer">
            <PhotoIcon className="w-4 aspect-square text-white" />
        </div>
    )
});

type CardCoverTabSelectorProps = {
    onClose: () => void;
    cardId?: string;
    listCardId?: string;
    source?: "board" | "inbox" | "inbox-mirror";
}

export const CardCoverTabSelector = forwardRef<HTMLDivElement, CardCoverTabSelectorProps>(({ onClose, cardId, listCardId, source = "board" }, ref) => {
    const [activeTab, setActiveTab] = useState<"main" | "search">("main");
    const Title = activeTab === "main" ? "Cover" : "Search Photos";

    const requestKeys: AsyncRequestKey[] = ["card:edit:props"];
    return (
        <>
            <ActionMenuWrapper Title={Title}
                requestGroups={[
                    { requestKey: requestKeys, minLoadingMs: 0, maxErrorMs: 3000, minSuccessMs: 800, show: ["loading", "error", "success"] }
                ]}
                onBack={() => setActiveTab("main")}
                ref={ref}
                onClose={onClose}
                width={300}
                titleStyle={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", fontWeight: 600 }}>
                <div className="relative w-full h-full px-3" >
                    {activeTab === "main" && <CardCoverMenu ref={ref} onClose={onClose} setActiveTab={setActiveTab} cardId={cardId} listCardId={listCardId} source={source} />}
                    {activeTab === "search" && <ImageSearchMenu ref={ref} onClose={onClose} onBack={() => setActiveTab("main")} cardId={cardId} listCardId={listCardId} source={source} />}
                </div>
            </ActionMenuWrapper>
        </>
    )
})


type CardActionsMenuProps = {
    onClose: () => void;
    setActiveTab?: (tab: "main" | "search") => void;
    cardId?: string;
    listCardId?: string;
    source?: "board" | "inbox" | "inbox-mirror";

}

export const CardCoverMenu = forwardRef<HTMLDivElement, CardActionsMenuProps>(({ onClose, setActiveTab, cardId, listCardId, source = "board" }, ref) => {
    const boardID = useParams().boardId as string;
    const cardID = cardId ?? useParams().cardId as string;
    const cardActions = useCardActionRegistry();
    const isInboxMode = source === "inbox" || source === "inbox-mirror";

    //console.log("CardCoverMenu rendered with coverColor:", coverColor);
    const card = useCardsStore((state) => state.cardsById[cardID]);
    const currentCoverColor = card?.Props?.Props?.Display?.Cover?.Type === "color" ?
        card.Props.Props.Display.Cover.Color : undefined;
    const currentCoverURL = card?.Props?.Props?.Display?.Cover?.Type === "image" ?
        card.Props.Props.Display.Cover.URL : undefined;
    const [coverColor, setCoverColor] = useState<string | undefined>(currentCoverColor);
    const [coverURL, setCoverURL] = useState<string | undefined>(currentCoverURL);
    const hasCover = !!currentCoverColor || !!currentCoverURL;

    const coverSize = card?.Props?.Props?.Display?.Size;

    const createNewLabel = (label: string, onClick: () => void, hidden: boolean = false, disabled: boolean = false) => {
        return (
            <div className=" py-1">
                <LabeledButtonCustom label={label} onClick={onClick} hidden={hidden} disabled={disabled}
                    className={`bg-menubtn rounded-md h-8 justify-center
                               ${disabled ? "opacity-50" : ""}
                               font-medium text-[14px] tracking-wide`} />
            </div>
        )
    }
    useEffect(() => {
        setCoverColor(currentCoverColor);
    }, [currentCoverColor])

    useEffect(() => {
        setCoverURL(currentCoverURL);
    }, [currentCoverURL]);


    const coverSizeSelector = (coverColor?: string, coverURL?: string, hasCover?: boolean) => {
        return <CoverSizeMenu coverColor={coverColor} coverURL={coverURL} hasCover={hasCover} cardId={cardID} listCardId={listCardId} activeCoverSize={coverSize} source={source} />
    }

    const handleRemoveCover = () => {
        if (isInboxMode) {
            void cardActions.removeInboxCardCover(cardID);
            return;
        }
        void cardActions.removeCardCover(boardID, cardID, listCardId);

    }
    const handleSetCoverColor = (color: string) => {
        if (isInboxMode) {
            void cardActions.setInboxCardColor(cardID, color);
        } else {
            void cardActions.setCardColor(boardID, cardID, color, listCardId);
        }
        setCoverColor(color);
    }


    const headerStyle = { color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", fontWeight: 600 };
    const tipStyle = { color: "rgba(255, 255, 255, 0.5)", fontSize: "12px", fontWeight: 400 };
    const h = 32; // Standard height for menu items, can be adjusted as needed
    const menuItems: MenuItemExtended[] = [
        { id: "size", label: "Size", kind: "header", style: headerStyle },
        {
            id: "coverSize", label: "Cover Size", kind: "custom",
            customElement: () => coverSizeSelector(coverColor, coverURL, hasCover)
        },
        {
            id: "removeCover", label: "Remove Cover", kind: "custom",
            customElement: () => createNewLabel("Remove Cover",
                () => handleRemoveCover(), !hasCover)
        },
        { id: "colors", label: "Colors", kind: "header", style: headerStyle },
        {
            id: "labels", label: "Labels", kind: "custom",
            customElement: () => <CardColorSelector coverColor={coverColor} setCoverColor={handleSetCoverColor} cardId={cardID} />
        },
        {
            id: "enableColorBlindMode", label: "Enable Color Blind Mode", kind: "custom",
            customElement: () => createNewLabel("Enable Color Blind Mode",
                () => { })
        },
        { id: "divider", label: "", kind: "divider", height: 5 },
        { id: "attachments", label: "Attachments", kind: "header", style: headerStyle },
        {
            id: "uploadCoverImage", label: "Upload Cover Image", kind: "custom",
            customElement: () => createNewLabel("Upload Cover Image",
                () => { }, false, true)
        },
        { id: "attachmentsTip", label: "Tip: Drag an image on the card to upload", kind: "header", style: tipStyle },
        { id: "photosFromUnplash", label: "Photos from Unsplash", kind: "header", style: headerStyle },
        {
            id: "unsplashSelector", label: "", kind: "custom",
            customElement: () => <CoverImageSelector setCoverURL={setCoverURL} coverURL={coverURL} cardId={cardID} source={source} />
        },
        {
            id: "searchForPhotos", label: "Search for Photos", kind: "custom",
            customElement: () => createNewLabel("Search for Photos",
                () => { setActiveTab?.("search") })
        },
    ]

    const Title = "Cover";
    return (
        <>


            <DropDown items={menuItems} onClick={() => { }} />



        </>

    )
});

type CoverSizeMenuProps = {
    coverColor?: string;
    coverURL?: string;
    hasCover?: boolean;
    cardId?: string;
    listCardId?: string;
    activeCoverSize?: "small" | "large";
    source?: "board" | "inbox" | "inbox-mirror";
}

export const CoverSizeMenu = ({ coverColor, coverURL, hasCover, cardId, listCardId, activeCoverSize, source = "board" }: CoverSizeMenuProps) => {
    const boardID = useParams().boardId as string;
    const cardID = cardId ?? useParams().cardId as string;
    const cardActions = useCardActionRegistry();
    const isInboxMode = source === "inbox" || source === "inbox-mirror";
    const setCardCoverSize = (size: "small" | "large") => {
        if (isInboxMode) return cardActions.setInboxCardCoverSize(cardID, size);
        return cardActions.setCardCoverSize(boardID, cardID, size, listCardId);
    };
    //console.log("CoverSizeMenu rendered with coverColor:", coverColor);
    return (
        <div className="grid  grid-cols-2 w-full h-full flex-row items-start gap-2 mb-1">

            <CardSkeleton onClick={() => setCardCoverSize("large")}

                variant="detailed"
                className={"h-16"} backgroundColor={coverColor || undefined}
                backgroundImage={coverURL || undefined} isLocked={!hasCover} isActive={activeCoverSize === "large"} />
            <CardSkeleton onClick={() => setCardCoverSize("small")}
                className={"h-16"} backgroundColor={coverColor || undefined}
                backgroundImage={coverURL || undefined} isLocked={!hasCover} isActive={activeCoverSize === "small"} />
        </div>
    )
}

type CardColorSelectorProps = {
    coverColor?: string;
    setCoverColor?: (color: string) => void;
    cardId?: string;

}

export const CardColorSelector = forwardRef<HTMLDivElement, CardColorSelectorProps>(({ coverColor, setCoverColor, cardId }, ref) => {
    return (
        <>
            <div className="px-0">
                <div className="grid grid-cols-5 gap-2 my-2 mb-4 ">
                    {cardCover.map((color) => (
                        <div key={color} className={`h-[32px] w-full rounded-[4px]
                            hover:ring hover:ring-gray-300/50 hover:ring-offset-2
                             cursor-pointer ${coverColor === color ? "ring-2 ring-offset-2 ring-gray-300" : ""}`}
                            style={{ backgroundColor: color }} onClick={() => setCoverColor?.(color)}></div>
                    ))}
                </div>

            </div>
        </>
    )
})

type CoverImageSelectorProps = {
    setCoverURL?: (url: string) => void;
    coverURL?: string;
    cardId?: string;
    source?: "board" | "inbox" | "inbox-mirror";
}

export const CoverImageSelector = forwardRef<HTMLDivElement, CoverImageSelectorProps>(({ setCoverURL, coverURL, cardId, source = "board" }, ref) => {
    const boardID = useParams().boardId as string;
    const cardID = cardId ?? useParams().cardId as string;
    const cardActions = useCardActionRegistry();
    const isInboxMode = source === "inbox" || source === "inbox-mirror";
    const urls = [
        "https://images.unsplash.com/photo-1503023345310-bd7c1de61c7d",
        "https://images.unsplash.com/photo-1491895200222-0fc4a4c35e18",
        "https://images.unsplash.com/photo-1472214103451-9374bd1c798e",
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
        "https://images.unsplash.com/photo-1500534623283-312aade485b7",
        "https://images.unsplash.com/photo-1494526585095-c41746248156",
    ]
    const setCardCoverURL = (url: string) => {
        if (isInboxMode) {
            void cardActions.setInboxCardCoverURL(cardID, url);
        } else {
            void cardActions.setCardCoverURL(boardID, cardID, url);
        }
        setCoverURL?.(url);
    }

    return (
        <ImageRenderer urls={urls} onClick={setCardCoverURL} />

    )
})

type ImageRendererProps = {
    urls: string[];
    setCardCoverURL?: (url: string) => void;
    onClick?: (url: string) => void;
}

export const ImageRenderer = forwardRef<HTMLDivElement, ImageRendererProps>(({ urls, setCardCoverURL, onClick }, ref) => {
    const [loadedByUrl, setLoadedByUrl] = useState<Record<string, boolean>>({});
    const [, startTransition] = useTransition();

    useEffect(() => {
        startTransition(() => {
            setLoadedByUrl((prev) => {
                const next: Record<string, boolean> = {};
                urls.forEach((url) => {
                    if (prev[url]) {
                        next[url] = true;
                    }
                });
                return next;
            });
        });
    }, [urls, startTransition]);

    const handleImageLoaded = (url: string) => {
        startTransition(() => {
            setLoadedByUrl((prev) => prev[url] ? prev : { ...prev, [url]: true });
        });
    };

    return (
        <div className="grid grid-cols-3 gap-2 w-full h-full mb-3 ">
            {urls.map((url) => (

                <div key={url} className="relative  aspect-video rounded-md cursor-pointer" onClick={() => { onClick?.(url); }}>
                    <ButtonHoverInset onClick={() => { onClick?.(url); }} />
                    {!loadedByUrl[url] && <div className="absolute inset-0 rounded-md bg-neutral-700/60 animate-pulse" />}
                    <img
                        src={url}
                        alt="cover option"
                        loading="lazy"
                        decoding="async"
                        onLoad={() => handleImageLoaded(url)}
                        onError={() => handleImageLoaded(url)}
                        className={`w-full h-full object-cover rounded-md transition-opacity duration-150 ${loadedByUrl[url] ? "opacity-100" : "opacity-0"}`} />
                </div>
            )
            )}
        </div>
    )
})
