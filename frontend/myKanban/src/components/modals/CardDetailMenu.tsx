import { forwardRef, use, useEffect, useRef, useState, type ComponentType, type RefObject, type SVGProps, type TransitionEvent } from "react";

import { ClockIcon, EllipsisHorizontalIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CardActionMenuBtn, CardCoverMenu, CardCoverTabSelector } from "./CardCoverMenu";
import { useCardsStore } from "@/stores/cardsStore";
import { useCardActionRegistry } from "@/actionRegistry/cardActionRegistry";
import { useParams } from "react-router";
import { CheckIcon, } from "@heroicons/react/24/solid";
import { PlusIcon, TagIcon, CheckCircleIcon, UserPlusIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus";
import { CardAddFields } from "../cardMenus/cardAddFieldsMenu";
import { CardLabelMenu } from "../cardMenus/cardLabelMenu";
import { CardMembersMenu } from "../cardMenus/cardMembersMenu";
import { CardChecklistMenu } from "../cardMenus/cardChecklistMenu";
import { CardChecklists } from "../cardMenus/cardChecklist/cardChecklists";
import { CardDatesMenu } from "../cardMenus/cardDatesMenu";
import { headerStyle } from "../cardMenus/cardMenuStyle";
import { useDateTimeParser } from "@/hooks/useDateTimeParser";
import { LabeledButtonPresetA, LabeledButtonPresetB, LabeledButtonPresetBSubmit } from "../buttons/labeledButton";
import { Car, ChevronDown, ChevronDownIcon, Eye, EyeIcon, TextAlignEndIcon, TextAlignStartIcon, XIcon } from "lucide-react";
import { CardComments } from "../cardMenus/CardDetailActivityTabs/CardComments";
import { EntityDescriptionEditor } from "../common/EntityDescriptionEditor";
import { useCardMembersStore } from "@/stores/CardMembersStore";
import { useShallow } from "zustand/shallow";
import { UserAvatar } from "../badges/UserAvatar";
import { useUserStore } from "@/stores/userStore";
import { CardRow } from "../CardRow";
import { useLabelsStore } from "@/stores/labelsStore";
import { CardMoveMenu, TabSelector } from "../cardMenus/cardMoveMenu";
import { useUserWatchStore } from "@/stores/userWatchStore";
import { CardActivity } from "../cardMenus/CardDetailActivityTabs/CardActivity";
import { FloatingTabSelector, type Tab } from "../menuElements/floatingTabSelector";
import { useBoardDetailStore } from "@/stores/boardDetailStore";
import { useListsStore } from "@/stores/listsStore";
import { useListTheme } from "@/hooks/useListTheme";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { LAYOUT_BREAKPOINTS } from "@/constants/layout";
import { CardActionsDropDown } from "../cardMenus/cardActionsDropDown";
import { useIsOverlayActive } from "@/hooks/useIsOverlayActive";
import { RoundButton } from "../buttons/RoundButton";
import { useDeferredContentVisibility } from "@/hooks/useDeferredContentVisibility";
import { useAuditStore } from "@/stores/auditStore";
import { MenuStateIndicator } from "../menuElements/menuWrapper";
import type { RequestGroup } from "./ActionMenuWrapper";
import { motion } from "motion/react";
import { menuMotionProps } from "./menuMotion";

type CardDetailMenuProps = {
    listId?: string;
    cardId?: string;
    onClose: () => void;
}

export const CardDetailMenu = forwardRef<HTMLDivElement, CardDetailMenuProps>(({ cardId, listId, onClose }, ref) => {
    const ACTIVITY_COLUMN_COLLAPSE_WIDTH = LAYOUT_BREAKPOINTS.cardDetailAsideCollapse;
    const card = useCardsStore((state) => cardId ? state.cardsById[cardId] : null);
    const boardId = useParams().boardId as string;
    const workspaceId = useParams().workspaceId as string;

    // console.log("Card data for cardId", cardId, ":", card);
    const coverSize = card?.Props?.Props?.Display?.Size || "small";
    // console.log("Card cover size:", coverSize);
    const sizePx = coverSize === "small" ? 64 : 130;
    const cardColor = card?.Props?.Props?.Display?.Cover?.Type === "color" ? card.Props.Props.Display.Cover.Color : undefined;
    const cardCoverURL = card?.Props?.Props?.Display?.Cover?.Type === "image" ? card.Props.Props.Display.Cover.URL : undefined;
    const cardHasCover = !!card?.Props?.Props?.Display?.Cover;
    // console.log("Card color:", cardColor);
    const resolvedSizePx = cardHasCover ? sizePx : 64; // If there's no cover, set height to 0 to hide the area

    const isCardWatched = useUserWatchStore((state) => cardId ? state.isCardWatched(cardId) : false);
    const patchCardWatchActive = useUserWatchStore((state) => state.patchCardWatchActive);

    const resetCursorForCard = useAuditStore((state) => state.resetCursorForCard);

    useEffect(() => {
        if (cardId) {
            resetCursorForCard(cardId!);
        }
        return () => {
            if (cardId) {
                resetCursorForCard(cardId);
            }
        };
    }, [cardId, resetCursorForCard]);

    const toggleCardWatch = () => {
        if (!cardId) return;
        patchCardWatchActive(cardId, !isCardWatched);
    };

    const [asideActiveTab, setAsideActiveTab] = useState("activity");
    const isAsideCollapsedByWindow = useMediaQuery(`(max-width: ${ACTIVITY_COLUMN_COLLAPSE_WIDTH - 1}px)`);

    const isAsideCollapsed = isAsideCollapsedByWindow || asideActiveTab === "";
    const {
        isCollapsedAnimated: isAsideCollapsedAnimated,
        isContentHidden: isAsideContentHidden,
        handleTransitionEnd: handleAsideTransitionEnd,
    } = useDeferredContentVisibility({
        isCollapsed: isAsideCollapsed,
        collapseStartDelayMs: 70,
        revealFallbackDelayMs: 380,
        transitionProperty: "width",
    });

    const handleCardWrapperTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
        handleAsideTransitionEnd(event);
    }

    const maxWith = isAsideCollapsedAnimated ? 700 : 1100;
    const resolvedWidth = `clamp(700px, ${maxWith}px, ${maxWith}px)`;

    const floatingTabs: Tab[] = [
        { id: "card", label: "Card", type: "fixed" },
        { id: "divider1", label: "", type: "divider" },
        { id: "activity", label: "Activity", },
        { id: "comments", label: "Comments", },
    ]

    const getRootListIdForCardId = useBoardDetailStore((state) => state.getRootListIdForCardId);
    const listsById = useListsStore((state) => state.listsById);
    const rootId = getRootListIdForCardId(cardId!);
    const rootList = rootId ? listsById[rootId] : null;
    //const rootList = useListsStore(useShallow((state) => rootId ? state.listsById[rootId] : null));
    const rootListName = rootList?.Title || "Unknown List";
    const { listColor, listTheme, listTextColor, hasListTheme } = useListTheme(rootId);


    const coverMenuId = "card-cover-menu";
    const actionMenuId = "card-actions-dropdown";
    const exclusiveGroup = "card-detail-submenu";
    const { isMenuActive: isCoverMenuActive } = useIsOverlayActive(coverMenuId);
    const { isMenuActive: isActionMenuActive } = useIsOverlayActive(actionMenuId);

    const iconBtnClass = "w-5 aspect-square text-white"

    const handleSetAsideActiveTab = (tabId: string) => {
        if (tabId === asideActiveTab) {
            setAsideActiveTab("");
        } else {
            setAsideActiveTab(tabId);
        }
    }

    const requestGroups: RequestGroup[] = [
        {
            requestKey: ["card:edit:dates:add:cardmenu"],
            minLoadingMs: 0, minSuccessMs: 3000, maxErrorMs: 3000,
            show: ["error", "loading", "success"]
        },
        {
            requestKey: ["card:edit:description", "card:edit:done"],
            minLoadingMs: 0, minSuccessMs: 3000, maxSuccessMs: 1000, maxErrorMs: 3000,
            show: ["success"]
        },
        {
            requestKey: [
                "checklist:create",
                "checklist:clone",
                "checklist:delete",
                "checklist:edit",
                "checklist:move",

                "checklist:entry:edit",
                "checklist:entry:convert",
                "checklist:entry:delete",
                "checklist:entry:move",
                "checklist:entry:crossmove",
                "checklist:entry:member:add",
                "checklist:entry:member:remove",
            ],
            minLoadingMs: 0,
            minSuccessMs: 3000,
            maxErrorMs: 3000,
            show: ["error", "loading", "success"]
        },
        {
            requestKey: ["checklist:entry:create",],
            minLoadingMs: 0,
            minSuccessMs: 3000,
            maxErrorMs: 3000,
            show: ["error"]
        },
        {
            requestKey: ["watch:add:card", "watch:patch:card"],
            minLoadingMs: 0,
            minSuccessMs: 3000,
            maxSuccessMs: 1000,
            maxErrorMs: 3000,
            show: ["error", "loading", "success"]
        }
    ]


    return (
        <>
            <CardMenuWrapper
                requestGroups={requestGroups}
                Title="Card Actions"
                width={resolvedWidth}
                onTransitionEnd={handleCardWrapperTransitionEnd}
                onClose={onClose} ref={ref}>

                <div className="flex w-full flex-col justify-start h-full min-h-0">
                    <div
                        style={{
                            height: `${resolvedSizePx}px`, backgroundColor: cardColor || "transparent",
                            backgroundImage: cardCoverURL ? `url(${cardCoverURL})` : undefined,
                            backgroundSize: "cover", backgroundPosition: "center",
                            borderBottom: !cardHasCover ? "2px solid rgba(255, 255, 255, 0.1)" : "none",
                            display: "flex", justifyContent: "flex-start", alignItems: "start",
                        }}
                        className="bg-[#4c6b1f] ">
                        <div className=" absolute top-4 right-0 flex items-center gap-1 px-4">
                            {isCardWatched && (
                                <RoundButton>
                                    <EyeIcon className={iconBtnClass} onClick={toggleCardWatch} />
                                </RoundButton>
                            )}


                            <CardRowMenuBtn
                                customId={coverMenuId}
                                exclusiveGroup={exclusiveGroup}
                                menuComponent={({ onClose, ref }) => <CardCoverTabSelector onClose={onClose} ref={ref} cardId={cardId!} />} >

                                <RoundButton isActive={isCoverMenuActive} >
                                    <PhotoIcon className={iconBtnClass} />
                                </RoundButton>
                            </CardRowMenuBtn>

                            <CardRowMenuBtn
                                customId={actionMenuId}
                                exclusiveGroup={exclusiveGroup}
                                menuComponent={({ onClose: onDropdownClose, ref }) => <CardActionsDropDown onClose={onDropdownClose} ref={ref} cardId={cardId!} listId={listId} onMoveSubmitSuccess={onClose} />}
                            >
                                <RoundButton isActive={isActionMenuActive} >
                                    <EllipsisHorizontalIcon className={iconBtnClass} strokeWidth={2} />
                                </RoundButton>
                            </CardRowMenuBtn>

                            <RoundButton isActive={false} >
                                <XIcon onClick={onClose} className={iconBtnClass} />
                            </RoundButton>
                        </div>
                        <div className="absolute top-5 left-5">



                            <CardRowMenuBtn
                                offset={[8, 0]}
                                cardID={cardId!}
                                menuComponent={({ onClose, ref }) =>
                                    <CardMoveMenu onClose={onClose}
                                        ref={ref} cardId={cardId} mode="mirror"
                                        listId={listId} />} >


                                <LabeledButtonPresetB label={rootListName} onClick={() => { }} iconAtLeft={false}
                                    style={{
                                        height: 28, backgroundColor: hasListTheme ? listColor : "rgba(255, 255, 255, 0.1)",
                                        color: hasListTheme ? listTextColor : "rgba(255, 255, 255, 0.7)"
                                    }}
                                    className={`font-inter h-[30px] font-extralight
                                     ${hasListTheme ? "" : "!bg-neutral-700/70 !text-neutral-300"} w-fit px-3`}

                                >
                                    <ChevronDownIcon className="w-4 h-4 ml-1 text-neutral-300" />
                                </LabeledButtonPresetB>
                            </CardRowMenuBtn>
                        </div>

                    </div>
                    <div className="relative flex w-full flex-row items-stretch flex-1 min-h-0">
                        <div className={`relative flex flex-col h-full items-stretch gap-2 min-h-0 transition-all duration-300
                            ${isAsideCollapsedAnimated ? "w-full min-w-full" : "w-[55%] min-w-[55%]"}`}>
                            <CardMain cardId={cardId!} isAsideCollapsed={isAsideCollapsedByWindow} />

                        </div>

                        <div className={`relative flex bg-[rgba(24,25,26,1)] h-full min-h-0 overflow-hidden transition-all duration-300
                            ${isAsideCollapsedAnimated ? "w-0 min-w-0 opacity-0 pointer-events-none" : "w-[45%] min-w-[45%] opacity-100 pointer-events-auto"}`}>

                            <div className={`absolute inset-0 min-h-0 ${isAsideContentHidden ? "transition-none" : "transition-all duration-300 ease-out"}
                            ${!isAsideContentHidden && asideActiveTab === "activity" ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 translate-x-2 pointer-events-none"}`}>
                                <CardActivity cardID={cardId} workspaceId={workspaceId} />
                            </div>
                            <div className={`absolute inset-0 min-h-0 ${isAsideContentHidden ? "transition-none" : "transition-all duration-300 ease-out"}
                            ${!isAsideContentHidden && asideActiveTab === "comments" ? "opacity-100 translate-x-0 pointer-events-auto" : "opacity-0 -translate-x-2 pointer-events-none"}`}>
                                <CardComments />
                            </div>
                        </div>

                    </div>
                </div>
            </CardMenuWrapper>
            <div className={`absolute -bottom-16 transition-all duration-200 
                ${isAsideCollapsedByWindow ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                <FloatingTabSelector
                    activeTab={asideActiveTab}
                    setActiveTab={handleSetAsideActiveTab}
                    tabs={floatingTabs} />
            </div>
        </>
    )

})
type CardMenuWrapperProps = {
    children?: React.ReactNode
    Title: string
    onClose: () => void
    width?: number | string
    isAsideCollapsed?: boolean
    onTransitionEnd?: (event: TransitionEvent<HTMLDivElement>) => void
    requestGroups?: RequestGroup[];
}

export const CardMenuWrapper = forwardRef<HTMLDivElement, CardMenuWrapperProps>(({ children, Title, onClose, width, onTransitionEnd, requestGroups }, ref) => {


    const indicators = requestGroups && requestGroups.length > 0
        ? requestGroups.map((g, i) => (
            <MenuStateIndicator key={i}
                maxWidth={700}
                requestKey={g.requestKey}
                minLoadingMs={g.minLoadingMs}
                minSuccessMs={g.minSuccessMs}
                maxSuccessMs={g.maxSuccessMs}
                maxErrorMs={g.maxErrorMs}
                show={g.show} />
        ))
        : null;
    return (
        <motion.div className="relative w-fit h-fit overflow-visible" {...menuMotionProps}>
            {indicators}
            <div ref={ref}
                style={{ width: width }}
                onTransitionEnd={onTransitionEnd}
                className={`flex justify-start items-start theme-dark bg-menu transition-[width] duration-300
             h-[80vh] rounded-xl
            shadow-lg shadow-black relative
         text-white overflow-hidden`} >
                {children}
            </div>
        </motion.div>
    )

})

export type Buttons = {
    id: string;
    label: string;
    menuToOpen?: (props: { onClose: () => void, ref: RefObject<HTMLDivElement | null> }) => React.ReactNode;
    onClick?: () => void;
    icon?: React.ReactNode;
    width?: number | string;
    shouldHideBtn?: () => boolean;
}
export const PADDING_L = "35px"

type CardMainProps = {
    cardId: string;
    isAsideCollapsed?: boolean;
}


export const CardMain = ({ cardId, isAsideCollapsed }: CardMainProps) => {
    const boardId = useParams().boardId!;
    const cardActions = useCardActionRegistry();
    const card = useCardsStore((state) => state.cardsById[cardId!]);
    const [titleFocused, setTitleFocused] = useState(false);
    const [title, setTitle] = useState(card?.Title || "Untitled Card");
    const titleInputRef = useRef<HTMLInputElement>(null);
    const pendingTitleRef = useRef(title);
    const persistedTitleRef = useRef(card?.Title || "Untitled Card");
    const isTitleSavePendingRef = useRef(false);
    const boardIdRef = useRef(boardId);
    const cardActionsRef = useRef(cardActions);
    const cardEntityIdRef = useRef(card?.ID);
    const [done, setDone] = useState(card?.Done || false);

    useEffect(() => {
        pendingTitleRef.current = title;
    }, [title]);

    useEffect(() => {
        boardIdRef.current = boardId;
    }, [boardId]);

    useEffect(() => {
        cardActionsRef.current = cardActions;
    }, [cardActions]);

    useEffect(() => {
        cardEntityIdRef.current = card?.ID;
    }, [card?.ID]);

    useEffect(() => {
        const storeTitle = card?.Title || "Untitled Card";

        if (storeTitle === persistedTitleRef.current) {
            isTitleSavePendingRef.current = false;
        }

        if (titleFocused) {
            return;
        }

        if (isTitleSavePendingRef.current) {
            return;
        }

        persistedTitleRef.current = storeTitle;
        setTitle(storeTitle);
    }, [card?.Title, titleFocused]);

    useEffect(() => {
        setDone(!!card?.Done);
    }, [card?.Done]);

    const hasDates = !!card?.StartDate || !!card?.EndDate;
    const hasMembers = useCardMembersStore((state) => {
        const memberIds = state.cardMemberIdsByCardId[cardId] || [];
        return memberIds.length > 0;
    });
    const hasLabels = useLabelsStore((state) => {
        const labelIds = state.cardLabelsIdsByCardIdAndBoardId[boardId]?.[cardId] || [];
        return labelIds.length > 0;
    });

    const savePendingTitleIfNeeded = () => {
        const currentCardId = cardEntityIdRef.current;
        if (!currentCardId) {
            return;
        }

        const currentTitle = pendingTitleRef.current || "Untitled Card";
        if (currentTitle !== persistedTitleRef.current) {
            isTitleSavePendingRef.current = true;
            cardActionsRef.current.setCardTitle(boardIdRef.current, currentCardId, currentTitle)
            persistedTitleRef.current = currentTitle;
        }
    };

    const handleOnBlurTitle = () => {
        setTitleFocused(false);
        savePendingTitleIfNeeded();
    }

    useEffect(() => {
        return () => {
            savePendingTitleIfNeeded();
        }
    }, []);
    const handleDoneToggle = () => {
        const newDone = !done;
        setDone(newDone);
        cardActions.setCardDone(boardId, card.ID, newDone);
    }
    const ICON_SIZE_CLASS = "w-4 h-4";
    const iconClassName = `${ICON_SIZE_CLASS} text-neutral-300`;
    const icon = (Icon: ComponentType<SVGProps<SVGSVGElement>>) => <Icon className={iconClassName} />;

    const rowButtons: Buttons[] = [
        { id: "add", label: "Add", icon: icon(PlusIcon), onClick: () => console.log("Add button clicked"), menuToOpen: ({ onClose, ref }) => <CardAddFields onClose={onClose} cardId={cardId} ref={ref} /> },
        {
            id: "labels", label: "Labels", icon: icon(TagIcon), onClick: () => console.log("Labels button clicked"),
            menuToOpen: ({ onClose, ref }) => <CardLabelMenu onClose={onClose} ref={ref} />
        },
        {
            id: "dates", label: "Dates", icon: icon(ClockIcon), shouldHideBtn: () => hasDates,
            onClick: () => console.log("Labels button clicked"), menuToOpen: ({ onClose, ref }) => <CardDatesMenu onClose={onClose} ref={ref} contextKey="cardmenu" />
        },
        { id: "members", label: "Members", icon: icon(UserPlusIcon), onClick: () => console.log("Members button clicked"), menuToOpen: ({ onClose, ref }) => <CardMembersMenu onClose={onClose} ref={ref} boardId={boardId} cardId={cardId} /> },
        { id: "checklist", label: "Checklist", icon: icon(CheckCircleIcon), onClick: () => console.log("Checklist button clicked"), menuToOpen: ({ onClose, ref }) => <CardChecklistMenu onClose={onClose} ref={ref} /> },

    ]

    const description = "...";

    return (
        <div className="relative bg-[rgba(36,37,40,1)] w-full h-full min-h-0 pt-4 px-4 flex flex-col">

            <div className="flex flex-col gap-2 w-full flex-1 min-h-0 items-start justify-start scrollbar-hidden pb-4 overflow-y-auto">
                <div className="relative flex flex-row mt-2 ">
                    <div className="absolute  h-full flex items-center justify-center ">
                        <div className={`w-5 p-[0.2px] aspect-square rounded-full border-2 ${done ? "border-done bg-done" : "border-gray-500"} cursor-pointer`} onClick={handleDoneToggle}>
                            {done && <CheckIcon className="w-full h-full text-menu" />}
                        </div>
                    </div>
                    <div
                        style={{ paddingLeft: PADDING_L }}
                        className="flex items-center h-full font-bold text-2xl">
                        <input
                            ref={titleInputRef}
                            className=" bg-transparent focus:outline-none"
                            onFocus={() => setTitleFocused(true)}
                            onBlur={handleOnBlurTitle}
                            value={title}
                            onChange={(e) => setTitle(e.currentTarget.value)} />
                    </div>
                </div>
                <div
                    style={{ paddingLeft: PADDING_L }}
                    className="flex items-center mt-4 gap-2">
                    {rowButtons.map((btn) => (
                        <CardRowMenuBtn key={btn.id} cardID={cardId}
                            menuComponent={({ onClose, ref }) => btn.menuToOpen ? btn.menuToOpen({ onClose, ref }) : null}
                            label={btn.label}
                            icon={btn.icon}
                            shouldHideBtn={btn.shouldHideBtn} />

                    ))}
                </div>
                <div style={{ paddingLeft: PADDING_L }}
                    className="flex flex-wrap w-full items-start gap-x-3 gap-y-2">
                    {hasMembers && (
                        <>
                            <CardMembersField cardId={cardId} />
                        </>
                    )}
                    {hasLabels && (
                        <>
                            <CardLabelsField />
                        </>
                    )}
                    {hasDates && (
                        <>
                            <CardsDetesField />
                        </>
                    )}


                </div>
                <EntityDescriptionEditor
                    entityKey={cardId}
                    value={card?.Description}
                    onSave={(nextValue) => cardActions.setCardDescription(boardId, cardId, nextValue)}
                    paddingLeft={PADDING_L}
                    icon={<TextAlignEndIcon className="absolute left-2 top-[10px] w-4 h-4 text-neutral-300 mb-1" />}
                />
                <div className="flex flex-col w-full">
                    <CardChecklists />
                </div>
                <CardActivitiesInline show={isAsideCollapsed ?? false} />


            </div>


        </div >
    )
}

type CardActivitiesInlineProps = {
    show: boolean;
}


const CardActivitiesInline = ({ show }: CardActivitiesInlineProps) => {
    const [activeTab, setActiveTab] = useState("activity");
    const { workspaceId, cardId } = useParams<{ workspaceId: string; cardId: string }>();
    const tabs: Tab[] = [
        { id: "activity", label: "Activity" },
        { id: "comments", label: "Comments" },
    ]

    return (
        <div className={`flex flex-col w-full
        ${show ? "max-h-[600px]" : "max-h-0 overflow-hidden flex-shrink-0"} 
        transition-all duration-300
        `}>

            <TabSelector tabs={tabs} setActiveTab={setActiveTab} activeTab={activeTab} />
            <div className="flex flex-col w-full min-h-0 overflow-hidden">
                {activeTab === "activity" && <CardActivity cardID={cardId} workspaceId={workspaceId} />}
                {activeTab === "comments" && <CardComments />}
            </div>
        </div >
    )
}



const CARD_FIELDS_H = 32;


const CardsDetesField = () => {
    const cardID = useParams().cardId as string;
    const card = useCardsStore((state) => state.cardsById[cardID]);
    const from = card?.StartDate ? new Date(card.StartDate) : undefined;
    const to = card?.EndDate ? new Date(card.EndDate) : undefined;
    const parseDateTime = useDateTimeParser().stringifyDatePretty;
    const fromDateTime = from ? parseDateTime(from, true) : undefined;
    const toDateTime = to ? parseDateTime(to, true) : undefined;

    const label = fromDateTime && toDateTime
        ? `${fromDateTime.date}-${toDateTime.date}, ${toDateTime.time}`
        : fromDateTime
            ? `${fromDateTime.date}, ${fromDateTime.time}`
            : toDateTime
                ? `${toDateTime.date}, ${toDateTime.time}`
                : "Set dates";

    const header = (fromDateTime && toDateTime) ? "Card Dates"
        : fromDateTime ? "Start Date"
            : toDateTime ? "Due Date"
                : "Card Dates";

    const isOverdue = !!to && to.getTime() < Date.now() && !card?.Done;
    return (

        <CardFieldsWrapper header={header}>
            <div className="flex items-center gap-2 mt-1 text-sm text-neutral-300">

                <CardRowMenuBtn
                    cardID={cardID}
                    menuComponent={({ onClose, ref }) => <CardDatesMenu onClose={onClose} ref={ref} contextKey="cardmenu" />}>
                    <LabeledButtonPresetB
                        label={label}
                        iconAtLeft={false}
                        style={{ borderRadius: "3px", height: CARD_FIELDS_H }}
                        className="  font-inter !text-[14px] font-extralight  w-fit px-3"
                        onClick={() => console.log("Edit dates")}
                    >
                        {isOverdue && <OverdueBadge />}
                        <ChevronDown className="w-4 h-4 ml-1 text-neutral-300" />

                    </LabeledButtonPresetB>
                </CardRowMenuBtn>
            </div>
        </CardFieldsWrapper>

    )
}

const OverdueBadge = () => {
    return (
        <div className="bg-[#42221f] text-[#fd9891] text-xs px-1 rounded ml-1">
            Overdue
        </div>
    )
}

type CardFieldWrapperProps = {
    header: string;
    children: React.ReactNode;
}
const CardFieldsWrapper = ({ header, children }: CardFieldWrapperProps) => {
    return (
        <div className="flex flex-col min-w-0">
            <span
                style={{ ...headerStyle, fontSize: "12px", marginBottom: "1px" }}
            >{header}</span>
            {children}
        </div>
    )
}

const EMPTY_IDS: string[] = [];
const CardMembersField = ({ cardId }: { cardId: string }) => {
    const iconSize = CARD_FIELDS_H;
    const cardID = cardId;
    const boardId = useParams().boardId as string;
    const cardMembersIdsFromCard = useCardMembersStore(useShallow((state) => state.getUserIDsByCardID(cardID) ?? []));
    const getUserById = useUserStore((state) => state.getUserByID);

    const userRenderer = (userID: string) => {
        const user = getUserById(userID);
        if (!user) return null;
        return (
            <CardRowMenuBtn key={userID} cardID={cardID}
                menuComponent={({ onClose, ref }) => <CardMembersMenu onClose={onClose} ref={ref} boardId={boardId} cardId={cardID} />}>
                <UserAvatar key={userID} user={user} size={iconSize - 1} />
            </CardRowMenuBtn>
        )
    }


    return (
        <CardFieldsWrapper header="Members">
            <div className="flex flex-wrap items-center justify-start gap-1 mt-1 text-sm text-neutral-300">
                {cardMembersIdsFromCard.map((memberId) => userRenderer(memberId))}
                <CardRowMenuBtn cardID={cardID}
                    menuComponent={({ onClose, ref }) => <CardMembersMenu onClose={onClose} ref={ref} boardId={boardId} cardId={cardID} />} >
                    <PlusButton height={iconSize} variant="round" />
                </CardRowMenuBtn>

            </div>
        </CardFieldsWrapper>
    )
}

const CardLabelsField = () => {
    const cardID = useParams().cardId as string;
    const boardId = useParams().boardId as string;
    const labelsById = useLabelsStore((state) => state.BoardLabelsById);
    const cardLabelsIds = useLabelsStore((state) => {
        if (!cardID) return EMPTY_IDS;
        return state.cardLabelsIdsByCardIdAndBoardId[boardId]?.[cardID] ?? EMPTY_IDS;
    });

    //const menu = ({ onClose, ref }) => <CardLabelMenu onClose={onClose} ref={ref} />

    return (
        <CardFieldsWrapper header="Labels">
            <div
                className="relative flex flex-wrap items-center justify-start gap-1 mt-1 text-sm text-neutral-300">
                {cardLabelsIds.map((labelId) => {
                    return (
                        <CardRowMenuBtn key={labelId} cardID={cardID} menuComponent={({ onClose, ref }) => <CardLabelMenu onClose={onClose} ref={ref} />} >
                            <LabelItem key={labelId} labelId={labelId} height={CARD_FIELDS_H} />
                        </CardRowMenuBtn>
                    )
                })}
                <CardRowMenuBtn cardID={cardID} menuComponent={({ onClose, ref }) => <CardLabelMenu onClose={onClose} ref={ref} />} >
                    <PlusButton height={CARD_FIELDS_H} variant="rectangle" />
                </CardRowMenuBtn>
            </div>
        </CardFieldsWrapper>
    )
}

type LabelItemProps = {
    labelId: string;
    height?: number;
}
const LabelItem = ({ labelId, height }: LabelItemProps) => {
    const labelsById = useLabelsStore((state) => state.BoardLabelsById);
    const label = labelsById[labelId];

    if (!label) return null;
    return (
        <div key={labelId} className=" w-12 rounded-md hover:brightness-110 cursor-pointer hover:ring-2 hover:ring-white/80 transition-all"
            style={{ backgroundColor: label.Color, height: height ?? '100%' }} />
    );
}

type PlusButtonProps = {
    height?: number;
    variant?: "round" | "rectangle";
    showLabelWhenCompact?: boolean;
}
const PlusButton = ({ height, variant }: PlusButtonProps) => {
    const classSquare = ""
    return (
        <div style={{ height: height ?? '100%', width: height ?? '100%' }}
            className={`flex items-center justify-center  ${variant === "round" ? "rounded-full" : "rounded-md"} bg-menubtn text-neutral-300
            hover:bg-gray-500/30 hover:text-gray-300 cursor-pointer`}>
            <PlusIcon className="w-4 h-4" />
        </div>
    )
}