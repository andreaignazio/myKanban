
import { CatalogIcon, type IconId } from "@/icons/iconCatalog";
import { ArrowRightIcon, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarSubRow } from "./SidebarSubRow";


export type SidebarItem = {
    id: string;
    name: string;
    iconId?: IconId;
    icon?: React.ReactNode
    route?: string;
    show?: boolean;
}

export function WorkspaceSubRows({ workspaceId, className }: { workspaceId: string, className?: string }) {

    const items: SidebarItem[] = [
        { id: "1", name: "Boards", iconId: "boards", route: `/workspaces/${workspaceId}/boards` },
        { id: "2", name: "Members", iconId: "members", route: `/workspaces/${workspaceId}/members` },
        { id: "3", name: "Settings", iconId: "settings", route: `/workspaces/${workspaceId}/settings` },
        { id: "4", name: "Subscriptions", iconId: "subscriptions", route: `/workspaces/${workspaceId}/settings/subscription` },
    ];

    const navigate = useNavigate()
    const location = useLocation()
    function handleItemClick(itemId: string) {
        navigate(items.find(item => item.id === itemId)?.route || "")
        // console.log("Clicked item", itemId)
    }
    const [activeItemId, setActiveItemId] = useState<string | null>(null)


    useEffect(() => {
        const currentPath = location.pathname

        const activeItem = items.reduce<SidebarItem | null>((bestMatch, item) => {
            const route = item.route
            if (!route) return bestMatch

            const isMatch = currentPath === route || currentPath.startsWith(`${route}/`)
            if (!isMatch) return bestMatch

            if (!bestMatch || route.length > (bestMatch.route?.length ?? 0)) {
                return item
            }

            return bestMatch
        }, null)

        setActiveItemId(activeItem?.id ?? null)
    }, [location.pathname, workspaceId]) // Re-run when the path changes or workspaceId changes
    return (
        <>
            <div className="flex flex-col
             text-neutral-300 text-sm font-normal gap-2 ">
                {items.map((item) => (
                    <SidebarSubRow key={item.id} item={item} isActive={activeItemId === item.id} onClick={handleItemClick}
                        className={className}
                    />

                ))}
            </div>

        </>
    )
}