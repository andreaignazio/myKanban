import { forwardRef } from "react"
import type { CardRowMode } from "../CardRow"

export type CardRowCoverWrapperProps = {
    mode: CardRowMode
    cardColor?: string
    cardCoverURL?: string
    children: React.ReactNode
}



export const CardRowCoverWrapper = forwardRef<HTMLDivElement, CardRowCoverWrapperProps>(({ mode, cardColor, cardCoverURL, children }, ref) => {


    return (
        <div
            ref={ref}
            style={{
                backgroundColor: mode !== "detailed" ? cardColor : "#242528",
                backgroundImage: mode !== "detailed" ? (cardCoverURL ? `url(${cardCoverURL})` : undefined) : undefined,
                backgroundSize: "cover", backgroundPosition: "center",

            }}
            className={`relative flex flex-col text-gray-100
                 bg-[#242528]
                rounded-lg  min-h-[40px] justify-center overflow-hidden shadow-sm
                group ring-2 ring-white/0 mx-1 hover:ring-white/100
                `}>

            {mode === "detailed" && <div
                style={{
                    backgroundColor: cardColor || "#242528",
                    backgroundImage: mode === "detailed" ? (cardCoverURL ? `url(${cardCoverURL})` : undefined) : undefined,
                    backgroundSize: "cover", backgroundPosition: "center"
                }}
                className="flex flex-row bg-blue-400 h-9">

            </div>}
            {children}
        </div>

    )
})