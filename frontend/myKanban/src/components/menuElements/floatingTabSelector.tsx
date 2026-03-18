import { useEffect, useRef, useState } from "react";

export type TabType = "standart" | "divider" | "fixed" | "action";

export type Tab = {
    id: string;
    label: string;
    icon?: React.ReactNode;
    type?: TabType;
    onClick?: () => void;
    disabled?: boolean;
}
export type FloatingTabSelectorProps<TTab extends string> = {
    activeTabs: TTab[];
    onTabToggle: (tab: TTab) => void;
    tabs: { id: TTab; label: string, icon?: React.ReactNode, type?: TabType, onClick?: () => void, disabled?: boolean }[];
}

export const FloatingTabSelector = <TTab extends string,>({ activeTabs, onTabToggle, tabs }: FloatingTabSelectorProps<TTab>) => {
    const isActive = (id: TTab) => activeTabs.includes(id)

    const radius = 16
    const padding = 5

    const barRef = useRef<HTMLDivElement>(null)

    const [isSmall, setIsSmall] = useState(false)
    useEffect(() => {
        const topBar = barRef.current
        if (topBar) {
            const observer = new ResizeObserver((entries) => {
                for (let entry of entries) {
                    const width = entry.contentRect.width
                    // console.log("Top bar width:", width)
                    if (width < 400) {
                        setIsSmall(true)
                    } else {
                        setIsSmall(false)
                    }

                }
            })

            observer.observe(topBar)

            return () => {
                observer.disconnect()
            }
        }
    }, [])

    const resolveTabLabel = (label: string) => {
        if (!isSmall) return label
        const words = label.split(" ")
        if (words.length === 1) return label
        return words.map(word => word[0]).join("")
    }


    return (
        <div ref={barRef}
            style={{ borderRadius: radius, padding: padding }}
            className="z-50 relative cursor-default h-fit font-plex font-medium
        flex bg-[#18191a] gap-2 text-white items-center 
          p-[4px] overflow-hidden border-2
          border-gray-700/60 shadow-md">
            {tabs.map((tab) => (
                <div key={tab.id}>
                    {tab.type != "divider" && (
                        <div
                            style={{ borderRadius: radius - padding, }}
                            className={`
                                grid grid-cols-[24px_1fr] place-items-center
                                relative  px-4 py-[6px]
                            h-full   truncate
                         justify-center items-center
                        hover:filter  hover:brightness-110
                        transition-all duration-300 ease-in-out
                          ${isActive(tab.id) ? "bg-[#1c2b42] text-[#5887d0] hover:bg-blue-600/30"
                                    : tab.type === "fixed" ? "bg-transparent text-[#c9cacd] cursor-default" :
                                        "text-[#c9cacd] hover:bg-gray-700/50 "}

                            ${tab.type === "fixed" ? "cursor-default pointer-events-none" : "cursor-pointer"}
                            ${tab.disabled ? "cursor-default opacity-50 pointer-events-none" : ""}
                            `}

                            onClick={() => {
                                if (tab.type === "fixed") return;
                                if (tab.type === "action") {
                                    tab.onClick?.();
                                    return;
                                }
                                onTabToggle(tab.id);
                                tab.onClick?.();
                            }}
                        >
                            {tab.icon && <div className="col-span-1 mr-2">{tab.icon}</div>}
                            <span className="col-span-1 col-start-2 truncate max-w-[200px]" >{resolveTabLabel(tab.label)}</span>

                            <div className={`${!isActive(tab.id) ? "hidden" : ""}
                     absolute rounded-full w-4 h-1 bottom-0 bg-[#5887d0]`}></div>
                        </div>)}

                    {tab.type === "divider" && <div className="w-px h-6 self-stretch my-1 shrink-0 bg-gray-600/80" />}
                </div>
            ))}
        </div>
    )
}
