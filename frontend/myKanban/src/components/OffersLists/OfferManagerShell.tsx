import { forwardRef, useState } from "react"
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline"
import type { JSX } from "react"
import { CommonMenuWrapper } from "../menuElements/menuWrapper"
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes"

export type TabDef = {
    id: string;
    label: string;
    title: string;
    description: string;
    counter?: number;
    render: (showOnlyPending: boolean) => JSX.Element;
}

export const Switcher = ({ isOn, onToggle }: { isOn: boolean; onToggle: () => void }) => (
    <div
        className={`flex flex-row items-center justify-between cursor-pointer
            ${isOn ? "bg-lime-500" : "bg-gray-300"} rounded-full w-10 h-[20px] ps-[2px] pr-[2px] relative`}
        onClick={onToggle}
    >
        <div className={`w-4 h-4 bg-black/90 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${isOn ? "translate-x-5" : "translate-x-0"}`} />
        <CheckIcon className={`w-3 h-3 absolute left-[6px] text-black/90 transition-opacity duration-200 ${isOn ? "opacity-100" : "opacity-0"}`} strokeWidth={3} />
        <XMarkIcon className={`w-3 h-3 absolute right-[6px] text-black/90 transition-opacity duration-200 ${isOn ? "opacity-0" : "opacity-100"}`} strokeWidth={3} />
    </div>
)

type OfferManagerShellProps = {
    onClose?: () => void;
    requestKey?: AsyncRequestKey | AsyncRequestKey[];
    tabs: TabDef[];
    defaultTabIdx?: number;
    className?: string;
}

export const OfferManagerShell = forwardRef<HTMLDivElement, OfferManagerShellProps>(({ onClose, requestKey, tabs, defaultTabIdx = 0, className }, ref) => {
    const [showOnlyPending, setShowOnlyPending] = useState(false)
    const [activeIdx, setActiveIdx] = useState(defaultTabIdx)

    const activeTab = tabs[Math.min(activeIdx, tabs.length - 1)]

    return (
        <CommonMenuWrapper
            ref={ref}
            onClose={onClose}
            requestKey={requestKey}
            className={`w-[90vw] max-w-[800px]  !bg-main h-[80vh] flex flex-col items-center justify-start p-16 font-grotesk text-neutral-200 ${className || ""}`}
        >
            {/* Header: title + pending toggle */}
            <div className="w-full !h-22 max-w-[800px]  flex flex-row items-start justify-between gap-4 mb-1">
                <div className="flex flex-col gap-1">
                    <p className="text-2xl font-semibold tracking-tight text-text">{activeTab.title}</p>
                    <p className="text-sm text-zinc-400">{activeTab.description}</p>
                </div>
                <div className="flex items-center gap-3 pt-1 shrink-0">
                    <span className="text-sm font-helvetica text-gray-400 whitespace-nowrap">Show only pending</span>
                    <Switcher isOn={showOnlyPending} onToggle={() => setShowOnlyPending(v => !v)} />
                </div>
            </div>

            {/* Tab nav */}
            <div className="w-full max-w-5xl flex flex-row items-center gap-6 mt-4 mb-2">
                {tabs.map((tab, idx) => (
                    <button
                        key={tab.id}
                        className={`relative items-center justify-center flex text-sm text-text/70
                             hover:text-blue-400/80 hover:filter
                            hover:brightness-105 transition-colors group
                            ${activeIdx === idx ? " text-blue-400 font-bold " : ""}`}
                        onClick={() => setActiveIdx(idx)}
                    >
                        {tab.label}
                        {tab.counter !== undefined && tab.counter > 0 && (
                            <span className="ms-1 text-xs text-zinc-900 bg-zinc-200 rounded-full px-2 py-0.5 font-medium">
                                {tab.counter}
                            </span>
                        )}
                        <div className={`absolute -bottom-[9px] w-full h-0.5 bg-accent rounded-full transition-opacity
                            ${activeIdx === idx ? "opacity-100" : "opacity-0"}`} />
                    </button>
                ))}
            </div>

            <div className="h-px w-full max-w-5xl bg-zinc-400/20 mb-6" />

            {/* Content */}
            <div className="w-full flex-1 min-h-0 overflow-y-auto scrollbar-hidden">
                {activeTab.render(showOnlyPending)}
            </div>
        </CommonMenuWrapper>
    )
})
