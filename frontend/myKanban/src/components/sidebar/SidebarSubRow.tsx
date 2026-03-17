import { CatalogIcon } from "@/icons/iconCatalog"
import type { SidebarItem } from "./WorkspaceSubRows"
import { ChevronRight } from "lucide-react"

type SidebarSubRowProps = {
    item: SidebarItem
    isActive: boolean
    onClick: (itemId: string) => void
    className?: string
    isCollapsed?: boolean
}

export const SidebarSubRow = ({ item, isActive, onClick, className, isCollapsed }: SidebarSubRowProps) => {
    if (isCollapsed) {
        return (
            <div
                onClick={() => onClick(item.id)}
                title={item.name}
                className={`flex items-center justify-center rounded-lg p-2 cursor-pointer transition-all
                    hover:bg-surface ${isActive ? "bg-active" : ""}`}
            >
                {item.icon
                    ? <span className="flex h-4 w-4 items-center justify-center">{item.icon}</span>
                    : <CatalogIcon id={item.iconId ?? "boards"} className="h-4 w-4 aspect-square" />
                }
            </div>
        )
    }

    return (
        <div onClick={() => onClick(item.id)}
            key={item.id} className={`flex items-center rounded-lg w-full ps-14
                         gap-2 p-2 flex-row justify-between group transition-all
                          hover:bg-surface cursor-pointer
                          ${isActive ? "bg-active" : ""} ${className || ""}`}>
            <div className="flex flex-row items-center justify-start gap-2.5">
                <div className="flex h-full w-4 aspect-square items-start ">
                    {item.icon ? item.icon : <CatalogIcon id={item.iconId ?? "boards"} className="flex h-4 aspect-square items-start " />}
                </div>
                <div>{item.name}</div>
            </div>
            <div >
                <ChevronRight className={`h-4 aspect-square text-neutral-400
                                opacity-0 group-hover:opacity-100`} />
            </div>
        </div>
    )
}