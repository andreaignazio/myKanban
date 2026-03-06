import { ImageColorRenderer } from "@/components/menuElements/ImageColorRenderer"
import { getClassNamesForColorToken } from "@/domain/colorTokens"
import type { Board } from "@/stores/types"

type CardMirrorsFieldProps = {
    board?: Board
    mode: "board" | "inbox-mirror" | "inbox"
    placement?: "default" | "cover"
}

export const Mirrors = ({ board, mode, placement = "default" }: CardMirrorsFieldProps) => {
    if (!board) return null
    if (mode === "inbox") return null

    const rootBoardBackgroundType = board?.Props?.Background?.Type
    const rootBoardBgImage = rootBoardBackgroundType === "image" ? board?.Props?.Background?.Image?.Url : undefined
    const rootBoardBgColorToken = rootBoardBackgroundType === "color" ? board?.Props?.Background?.Color?.Token : undefined
    const rootBoardBgColorClass = rootBoardBgColorToken ? getClassNamesForColorToken(rootBoardBgColorToken) : undefined
    const wrapperClassName = placement === "cover"
        ? "absolute top-1 left-2 z-20 text-white"
        : "bg-transparent text-white pt-3 px-3"

    return (
        <div className={wrapperClassName}>
            <div
                className="h-[30px] max-w-[170px] p-0 gap-1 w-fit pe-2 flex items-center justify-start rounded-[7px] bg-neutral-700/45 text-[11px] font-semibold"
            >
                <ImageColorRenderer
                    style={{ width: "26px", height: "26px" }}
                    overrideClassName
                    className="rounded-[6px] overflow-hidden shrink-0"
                    bgImage={rootBoardBgImage}
                    bgColor={rootBoardBgColorClass}

                    backgroundType={rootBoardBackgroundType ?? null}
                />
                <div className="flex flex-col items-start">
                    <span className="truncate text-[10px] font-medium">{board?.Name}</span>
                    <span className="text-[10px] font-extralight">{"X"}</span>
                </div>
            </div>
        </div>

    )
}