import { ImageColorRenderer } from "@/components/menuElements/ImageColorRenderer"
import type { CardRootBoardContextValue } from "@/hooks/useCardRootBoardContext"
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus"
import { CardMirrorsMenu } from "../cardMenus/cardMirrorsMenu"
import { useDateTimeParser } from "@/hooks/useDateTimeParser"
import { useUiStore, type DomainModalData } from "@/stores/uiStore"
import { ConfirmDeletionPopover } from "../modals/ConfirmDeletion"
import { useUserInboxStore } from "@/stores/userInboxStore"

type CardMirrorsFieldProps = {
    rootBoardContext: CardRootBoardContextValue
    mode: "board" | "inbox-mirror" | "inbox"
    placement?: "default" | "cover"
    cardId: string;
    listCardId?: string;
    showShadow?: boolean
}

export const Mirrors = ({ rootBoardContext, mode, placement = "default", cardId, listCardId, showShadow = false }: CardMirrorsFieldProps) => {
    const {
        effectiveRootBoard: board,
        rootBoardBackgroundType,
        rootBoardBgImage,
        rootBoardBgColorClass,
        //isUserBoardPurged,
        // isUserBoardSoftDeleted,
        isMainListCardPurged,
        isMainListCardSoftDeleted,
        isRootPurged: isRootPurged,
        isRootSoftDeleted: isRootSoftDeleted,
    } = rootBoardContext

    const showResourceWarning = isMainListCardPurged || isMainListCardSoftDeleted || isRootPurged || isRootSoftDeleted
    //const showAccessWarning = isUserBoardPurged || isUserBoardSoftDeleted // reserved — not shown yet
    const showWarning = showResourceWarning
    if (!board && !showWarning) return null

    const handleConvertToInboxOnly = () => {
        const data: DomainModalData = {
            componentent: (onCloseModal) => (
                <ConfirmDeletionPopover
                    onClose={onCloseModal}
                    onSubmit={() => {
                        void useUserInboxStore.getState().convertToInboxOnly(cardId)
                        onCloseModal()
                    }}
                    title="Convert to inbox-only?"
                    body="The source card is no longer available. Convert this card to a standalone inbox card?"
                    submitLabel="Convert"
                />
            ),
            anchorRef: null,
        }
        useUiStore.getState().setDomainModalOpen(true, data)
    }

    const wrapperClassName = placement === "cover"
        ? "absolute top-1 left-2 z-20 text-white"
        : "bg-transparent text-white pt-3 px-3"

    const boardCreatedAt = board ? new Date(board.CreatedAt) : null
    const dateParser = useDateTimeParser()
    const boardCreatedAtFormatted = boardCreatedAt ? dateParser.stringifyDatePretty(boardCreatedAt, true)?.date : undefined

    // access warning label kept in reserve for future use
    // const accessWarningLabel = "you have lost access to this resource"
    const detailLabel = isMainListCardPurged
        ? "Main instance purged"
        : isMainListCardSoftDeleted
            ? "Main instance soft-deleted"
            : isRootPurged
                ? "Root purged"
                : isRootSoftDeleted
                    ? "Root soft-deleted"
                    : boardCreatedAtFormatted

    const mirrorUI = (
        <DummyMirrorUI
            name={board?.Name ?? "Root unavailable"}
            detailLabel={detailLabel}
            bgImage={rootBoardBgImage}
            bgColorClass={rootBoardBgColorClass}
            bgColorType={rootBoardBackgroundType === "color" ? "color" : rootBoardBackgroundType === "image" ? "image" : null}
            showResourceWarning={showResourceWarning}
            showAccessWarning={false}
            wrapperClassName={wrapperClassName}
            showShadow={showShadow}
            className="bg-neutral-700 z-50"
            enableHover={true}
        />
    )

    return (
        <div className="z-50">
            {showWarning && mode === "inbox-mirror"
                ? <div className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleConvertToInboxOnly() }}>{mirrorUI}</div>
                : <CardRowMenuBtn menuComponent={({ onClose, ref }) => <CardMirrorsMenu cardId={cardId} listCardId={listCardId} ref={ref} onClose={onClose} />}>
                    {mirrorUI}
                </CardRowMenuBtn>
            }
        </div>
    )
}

type DummyMirrorUIProps = {
    name?: string;
    detailLabel?: string;
    bgImage?: string;
    bgColorClass?: string;
    bgColorType?: "image" | "color" | null;
    wrapperClassName?: string;
    showResourceWarning?: boolean;
    showAccessWarning?: boolean;
    className?: string;
    imageSize?: string
    children?: React.ReactNode;
    nameClassName?: string;
    labelClassName?: string;
    showShadow?: boolean;
    enableHover?: boolean;
}

export const DummyMirrorUI = ({ nameClassName, labelClassName, children, imageSize = "26px", className, name, detailLabel, bgImage, bgColorClass, bgColorType, wrapperClassName, showResourceWarning, showAccessWarning, showShadow, enableHover }: DummyMirrorUIProps) => {

    return (
        <div className={wrapperClassName}>
            <div
                className={`h-[30px] max-w-[170px] px-[2px] py-[2px] relative overflow-hidden
                    ${showShadow ? "shadow-sm shadow-black/20" : ""}
                     gap-1 w-fit pe-2 flex items-center justify-start rounded-[7px]
                      bg-neutral-700/45 text-[11px] font-semibold ${className} 
                      transition-colors duration-300 ease-in-out
            `}
            >
                <ImageColorRenderer
                    style={{ width: imageSize, height: imageSize }}
                    overrideClassName
                    className="  rounded-[6px] overflow-hidden shrink-0"
                    bgImage={bgImage}
                    bgColor={bgColorClass}

                    backgroundType={bgColorType ?? null}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 opacity-0 hover:opacity-15 transition-all duration-300 ease-in-out" />
                </ImageColorRenderer>
                <div className="flex flex-col h-full items-start">
                    <span className={`truncate text-[10px] font-medium ${nameClassName}`}>{name}</span>
                    <span className={`text-[8px] font-extralight ${labelClassName}`}>{detailLabel}</span>
                </div>
                {showResourceWarning && (
                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                        !
                    </span>
                )}
                {showAccessWarning && (
                    <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                        !
                    </span>
                )}
                {children}
            </div>

        </div>
    )
}