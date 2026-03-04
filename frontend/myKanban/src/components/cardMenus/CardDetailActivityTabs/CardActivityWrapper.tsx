import { LabeledButtonPresetB } from "@/components/buttons/labeledButton/LabeledButtonPresetB"
import { useAuditStore } from "@/stores/auditStore"
import { MessageSquareText } from "lucide-react"
import { useRef } from "react"


type CardActivityWrapperProps = {
    children?: React.ReactNode
    label?: string
    onScrollEnd?: () => void
    bottomOverlay?: React.ReactNode
}

export const C_PADDING_L = 45

export const CardActivityWrapper = ({ children, label, onScrollEnd, bottomOverlay }: CardActivityWrapperProps) => {



    const reachedEndRef = useRef(false)



    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget
        const threshold = 8 // tolleranza in px
        const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - threshold

        if (isAtBottom && !reachedEndRef.current) {
            reachedEndRef.current = true
            onScrollEnd?.()
        }

        // reset quando risale, così può richiamare di nuovo al prossimo fondo
        if (!isAtBottom) {
            reachedEndRef.current = false
        }
    }

    return (

        <div className="relative bg-[rgba(24, 25, 26,1)] w-full h-full min-h-0 px-4 flex flex-col">
            <div className="relative flex flex-row items-center gap-2 mt-4 mb-4">
                <div className="absolute left-0 top-0 items-center flex justify-center w-[40px] h-full">
                    <MessageSquareText size={19} className="translate-y-[2px]" />
                </div>
                <div className="relative flex flex-row w-full items-center justify-between gap-2" style={{ paddingLeft: C_PADDING_L }}>
                    <span className="text-[16px] font-bold">{label}</span>
                    <LabeledButtonPresetB label="Show details" className="px-3" onClick={() => { }} />
                </div>

            </div>
            <div
                onScroll={handleScroll}
                className="flex flex-1 min-h-0 flex-col overflow-y-auto scrollbar-hidden">
                {children}
            </div>
            {bottomOverlay && (
                <div className="pointer-events-none absolute bottom-2 left-4 right-4 z-20">
                    {bottomOverlay}
                </div>
            )}
        </div>
    )
}