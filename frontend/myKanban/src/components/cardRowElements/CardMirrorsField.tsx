import { ImageColorRenderer } from "@/components/menuElements/ImageColorRenderer"
import type { CardRootBoardContextValue } from "@/hooks/useCardRootBoardContext"
import { CardRowMenuBtn } from "../cardMenus/cardRowMenus"
import { CardMirrorsMenu } from "../cardMenus/cardMirrorsMenu"
import { useDateTimeParser } from "@/hooks/useDateTimeParser"

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

    return (
        <div className="z-50">

            <CardRowMenuBtn
                menuComponent={
                    ({ onClose, ref }) => <CardMirrorsMenu cardId={cardId} listCardId={listCardId} ref={ref} onClose={onClose} />
                }
            >
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
                />
            </CardRowMenuBtn>
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
}

export const DummyMirrorUI = ({ nameClassName, labelClassName, children, imageSize = "26px", className, name, detailLabel, bgImage, bgColorClass, bgColorType, wrapperClassName, showResourceWarning, showAccessWarning, showShadow }: DummyMirrorUIProps) => {

    return (
        <div className={wrapperClassName}>
            <div
                className={`h-[30px] max-w-[170px] px-[2px] py-[2px] 
                    ${showShadow ? "shadow-sm shadow-black/20" : ""}
                     gap-1 w-fit pe-2 flex items-center justify-start rounded-[7px]
                      bg-neutral-700/45 text-[11px] font-semibold ${className}`}
            >
                <ImageColorRenderer
                    style={{ width: imageSize, height: imageSize }}
                    overrideClassName
                    className="rounded-[6px] overflow-hidden shrink-0"
                    bgImage={bgImage}
                    bgColor={bgColorClass}

                    backgroundType={bgColorType ?? null}
                />
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