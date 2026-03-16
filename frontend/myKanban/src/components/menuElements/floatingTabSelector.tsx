
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
    activeTab: TTab;
    setActiveTab: (tab: TTab) => void;
    tabs: { id: TTab; label: string, icon?: React.ReactNode, type?: TabType, onClick?: () => void, disabled?: boolean }[];

}

export const FloatingTabSelector = <TTab extends string,>({ activeTab, setActiveTab, tabs }: FloatingTabSelectorProps<TTab>) => {
    return (
        <div className="z-50 relative cursor-default 
        flex bg-[#18191a] gap-2 text-white items-center
         rounded-2xl p-[4px] overflow-hidden border-2
          border-gray-700/60 shadow-md">
            {tabs.map((tab) => (
                <div key={tab.id}>
                    {tab.type != "divider" && (<div
                        className={`relative flex px-4 py-[6px]
                        rounded-lg justify-center items-center 
                        hover:filter  hover:brightness-110 

                          ${activeTab === tab.id ? "bg-[#1c2b42] text-[#5887d0]"
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
                            setActiveTab(tab.id);
                            tab.onClick?.();
                        }}
                    >
                        {tab.icon && <div className="mr-2">{tab.icon}</div>}
                        {tab.label}

                        <div className={`${activeTab !== tab.id ? "hidden" : ""}
                     absolute rounded-full w-4 h-1 bottom-0 bg-[#5887d0]`}></div>
                    </div>)}

                    {tab.type === "divider" && <div className="w-px h-6 self-stretch my-1 shrink-0 bg-gray-600/80" />}
                </div>
            ))}
        </div>
    )
}
