import type { IconId } from "@/icons/iconCatalog";
import { ChevronRight } from "lucide-react";

export type AsideTabs = {
    id: string;
    label: string;
    type: "page" | "divider";
    href?: string;
    onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
    pageTitle?: string;
    pageDescription?: string;
    pageIconId?: IconId
}



type AsideTabsBarProps = {
    asideLinks: AsideTabs[];
    activeTab: string | null;
    handleNavigate: (e: React.MouseEvent<HTMLDivElement>, href: string) => void;
    width?: string;
}

export const AsideTabsBar = ({ asideLinks, activeTab, handleNavigate, width }: AsideTabsBarProps) => {

    return (
        <div className="flex flex-col gap-1 w-full ps-3">
            {asideLinks.map((link) => {
                if (link.type === "divider") {
                    return <hr key={link.id} className="my-2 border-neutral-700" />
                }
                return (
                    <TabRow key={link.id} item={link} activeItemId={activeTab} onClick={(e) => handleNavigate(e, link.href!)} width={width} />
                )
            }
            )}
        </div>
    )


}


type TabRowProps = {
    item: AsideTabs;
    activeItemId: string | null;
    onClick: (e: React.MouseEvent<HTMLDivElement>, itemId: string) => void;
    width?: string;
}

const TabRow = ({ item, activeItemId, onClick, width }: TabRowProps) => {
    return (
        <div onClick={(e) => onClick(e, item.id)}
            style={{ width: width || "180px" }}
            className={`flex items-center rounded-lg w-[180px]
                         gap-2 p-2 flex-row justify-between group transition-all
                          hover:bg-surface cursor-pointer 
                          ${activeItemId === item.id ? "bg-active" : ""}`}>
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-300">{item.label}</span>
            </div>

            <div >
                <ChevronRight className={`h-4 aspect-square text-neutral-400 
                                opacity-0 group-hover:opacity-100`} />
            </div>
        </div>
    )
}