import React from "react";
import { AsideTabsBar, type AsideTabs } from "./asideTabs";

type WorkspaceSettingsPageWrapperProps = {
    asideHeader?: React.ReactNode;
    asideLinks: AsideTabs[];
    activeTab: string | null;
    handleNavigate: (e: React.MouseEvent<HTMLDivElement>, href: string) => void;
    mainHeader?: React.ReactNode;
    classNameLayout?: string;
    widthAside?: string;
}

export const SettingsPageWrapper = ({ asideHeader, asideLinks, activeTab, handleNavigate, mainHeader, classNameLayout, widthAside }: WorkspaceSettingsPageWrapperProps) => {

    return (
        <div className={`flex flex-col xl:grid xl:grid-cols-[1fr_6fr] gap-4 h-full min-h-0 mt-2 ${classNameLayout ?? ""}`}>

            {/* Mobile horizontal nav bar — visible below xl */}
            <nav className="xl:hidden flex-shrink-0 flex flex-row overflow-x-auto gap-1 border-b border-neutral-700 pb-2 px-2">
                {asideLinks
                    .filter((l) => l.type === "page")
                    .map((link) => (
                        <div
                            key={link.id}
                            onClick={(e) => handleNavigate(e, link.href!)}
                            className={`flex-shrink-0 px-3 py-2 rounded-lg cursor-pointer text-sm font-medium text-neutral-300 hover:bg-surface transition-all
                                ${activeTab === link.id ? "bg-active" : ""}`}
                        >
                            {link.label}
                        </div>
                    ))}
            </nav>

            {/* Desktop aside — visible at xl+ */}
            <div className="hidden xl:block ms-5 rounded-lg bg-transparent h-full mt-2">
                <div className="flex flex-row items-center justify-between gap-2 mb-12">
                    {asideHeader}
                </div>
                <AsideTabsBar asideLinks={asideLinks} activeTab={activeTab} handleNavigate={handleNavigate} width={widthAside} />
            </div>

            <div className="flex flex-col flex-1 min-h-0 px-4 xl:px-12 xl:mt-2">
                {mainHeader}
            </div>

        </div>
    )
}