import type { AsideTabs } from "@/components/workspacePages/asideTabs";
import { useEffect, useState } from "react";


export function useSyncTabRouter(asideLinks: AsideTabs[]) {
    const [activeTab, setActiveTab] = useState("members");
    useEffect(() => {
        const currentPath = window.location.pathname;
        const matchedLink = asideLinks.find(link => link.href === currentPath);
        if (matchedLink) {
            setActiveTab(matchedLink.id);
        }
    }, [window.location.pathname]);

    return {
        activeTab,
        setActiveTab
    }
}