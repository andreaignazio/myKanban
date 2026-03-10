import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { useCardsStore } from "@/stores/cardsStore";
import type { MenuItemExtended } from "@/types/uiTypes";
import { forwardRef, use, useEffect, useRef, useState, useTransition } from "react";
import { useParams } from "react-router";
import { DropDown } from "../menuElements/DropDown";
import { CustomInput } from "../menuElements/CustomInput";
import { ImageRenderer } from "../modals/CardCoverMenu";
import { useMediaStore } from "@/stores/mediaStore";
import { useShallow } from "zustand/shallow";
import { baseImages } from "@/domain/colorTokens";

type CardActionsMenuProps = {
    onClose: () => void;
    setActiveTab?: (tab: "main" | "search" | "overview") => void;
    onBack?: () => void;
    onImageClick?: (url: string) => void;
    showSearchHelpers?: boolean;
    defaultImageLimit?: number;
    cardId?: string;
    source?: "board" | "inbox" | "inbox-mirror";
}

const DEFAULT_IMAGE_LIMIT = 30;

export const ImageSearchMenu = forwardRef<HTMLDivElement, CardActionsMenuProps>(({ onClose, setActiveTab, onBack, onImageClick, showSearchHelpers = true, defaultImageLimit = DEFAULT_IMAGE_LIMIT, cardId, source = "board" }, ref) => {
    const boardID = useParams().boardId as string;
    const cardID = cardId ?? useParams().cardId as string;
    const cardActions = useCardActionRegistry();
    const removeCover = cardActions.removeCardCover;
    const fetchMedia = useMediaStore((state) => state.fetchMedia);
    const [searchInput, setSearchInput] = useState("");
    //console.log("ImageSearchMenu rendered with coverColor:", coverColor);
    const card = useCardsStore((state) => state.cardsById[cardID]);
    const isInboxMode = source === "inbox" || source === "inbox-mirror";

    const setCardCoverURL = (url: string) => {
        if (isInboxMode) {
            void cardActions.setInboxCardCoverURL(cardID, url);
        } else {
            void cardActions.setCardCoverURL(boardID, cardID, url);
        }
        onBack?.();
        //setCoverURL?.(url);
    }

    const handleSelectSuggestedSearch = async (query: string) => {
        setSearchInput(query);
        await fetchMedia(query, defaultImageLimit);
    }

    const input = () => {
        return (
            <div className=" py-2 text-gray-500">
                <CustomInput className={"h-[35px] mb-0"}
                    value={searchInput}
                    onInputChange={(inputRef) => {
                        inputRef?.current && setSearchInput(inputRef?.current.value)
                    }} />
            </div>
        )
    }
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (timer.current) {
            clearTimeout(timer.current);
        }
        timer.current = setTimeout(async () => {
            if (searchInput.length > 2) {
                await fetchMedia(searchInput, defaultImageLimit);
            }
        }, 300);
    }, [searchInput, fetchMedia]);


    const handleTempSearch = async () => {
        await fetchMedia(searchInput, defaultImageLimit);
    }


    const headerStyle = { color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", fontWeight: 600 };
    const tipStyle = { color: "rgba(255, 255, 255, 0.5)", fontSize: "12px", fontWeight: 400 };
    const h = 32; // Standard height for menu items, can be adjusted as needed
    const useExternalImageClickHandler = typeof onImageClick === "function";
    const menuItems: MenuItemExtended[] = [
        { id: "searchmedia", label: "Search Unplash for photos", kind: "custom", customElement: input },
        ...(showSearchHelpers ? [
            { id: "suggested", label: "Suggested searches", kind: "header", style: headerStyle } as MenuItemExtended,
            { id: "suggestedSearches", label: "Search Unplash for photos", kind: "custom", customElement: () => <SuggestedSearches onSelect={handleSelectSuggestedSearch} /> } as MenuItemExtended,
        ] : []),
        { id: "topResults", label: "Top Results", kind: "header", style: headerStyle },
        {
            id: "imageResults", label: "Image Results", kind: "custom",
            customElement: () => <ImageResults searchInput={searchInput}
                imageLimit={defaultImageLimit}
                onImageClick={onImageClick}
                setCoverUrl={useExternalImageClickHandler ? undefined : setCardCoverURL}
                onBack={useExternalImageClickHandler ? undefined : () => setActiveTab?.("main")} />
        },
    ]

    const Title = "Search Photos";
    return (
        <>

            <div className="relative w-full h-full px-3" >
                <button onClick={handleTempSearch}>Search</button>
                <DropDown items={menuItems} onClick={() => { }} />
            </div>


        </>

    )
});

type SuggestedSearchesProps = {
    onSelect?: (query: string) => void;
}

export const SuggestedSearches = ({ onSelect }: SuggestedSearchesProps) => {
    const suggestedSearches = ["Nature", "Technology", "People", "Architecture", "Food",
        "Travel", "Animals", "Business", "Fashion", "Health"];
    return (
        <div className="flex flex-row flex-wrap gap-1 mb-3">
            {suggestedSearches.map((search) => (
                <div key={search} className="px-3 py-1.5 bg-menubtn rounded-md text-sm cursor-pointer
                 hover:bg-neutral-600"
                    onClick={() => onSelect?.(search)}>
                    {search}
                </div>
            ))}
        </div>

    )
}

type ImageResultsProps = {
    searchInput: string;
    onImageClick?: (url: string) => void;
    setCoverUrl?: (url: string) => void;
    onBack?: () => void;
    imageLimit?: number;
}

export const ImageResults = ({ searchInput, onImageClick, setCoverUrl, onBack, imageLimit = DEFAULT_IMAGE_LIMIT }: ImageResultsProps) => {
    const mediaCache = useMediaStore(useShallow((state) => state.mediaCache));
    const defaultUrls = baseImages.map((image) => image.url);
    const [urls, setUrls] = useState<string[]>(defaultUrls.slice(0, imageLimit));
    const [, startTransition] = useTransition();

    const handleImageClick = (url: string) => {
        if (onImageClick) {
            onImageClick(url);
            return;
        }

        setCoverUrl?.(url);
        onBack?.();
    }

    useEffect(() => {
        if (searchInput.trim().length === 0) {
            startTransition(() => {
                setUrls(defaultUrls.slice(0, imageLimit));
            });
            return;
        }

        const dedupedUrls = Array.from(new Set(mediaCache.map((photo) => photo.RegularURL)));

        startTransition(() => {
            setUrls(dedupedUrls.slice(0, imageLimit));
        });
    }, [defaultUrls, mediaCache, searchInput, imageLimit, startTransition]);

    return (
        <ImageRenderer urls={urls} onClick={handleImageClick}>

        </ImageRenderer>
    )
}