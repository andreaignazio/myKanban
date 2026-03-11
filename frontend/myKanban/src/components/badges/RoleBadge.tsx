import { useOverlayStore, type OverlayDescriptor } from "@/overlays/overlayStore";
import { useRef, useState } from "react";
import { DropDownMenu, type MenuItem, type WorkspaceMenuItem } from "../menuElements/CustomDropDown";
import { UserRoleBadge, type Role } from "./UserRoleBadge";

type UserRoleBadgeProps = {
    items?: MenuItem[] | WorkspaceMenuItem[];
    role: Role;
    className?: string;
    onClick?: () => void;
    size?: "sm" | "md" | "lg";
    children?: React.ReactNode;
    isLocked?: boolean;
    lightBg?: boolean;
}

export function UserRoleBadgeSelector({ items, role, className, onClick, size = "md", children, isLocked = false, lightBg = false }: UserRoleBadgeProps) {
    const anchorRef = useRef<HTMLDivElement>(null);
    const onOpenOverlay = useOverlayStore((state) => state.open)
    const closeOverlay = useOverlayStore((state) => state.close)
    const panelRef = useRef<HTMLDivElement>(null)
    //const triggerUpdate = useOverlayStore((state) => state.triggerUpdate)

    const [, setActiveId] = useState<string | null>(null)
    const setDropdownActiveId = useOverlayStore((state) => state.setDropdownActiveId)


    const btnId = `role-badge-dropdown`;
    function handleOpenDropdpown() {
        if (isLocked) return;

        const descriptor: OverlayDescriptor = {
            id: btnId,
            render: () => <DropDownMenu fixedWidth={200} btnId={btnId} onClick={(id) => { setActiveId(id); setDropdownActiveId(btnId, id); closeOverlay(btnId); }}
                anchorRef={anchorRef} ref={panelRef} items={items || []} />,
            panelRef: panelRef,
            anchorRef: anchorRef,
            type: "dropdown",
            opts: {
                closeOnClickOutside: true,
                closeOnEscape: true,
                closeOnMouseLeave: false,
                lockBackdrop: true,

            },
            position: {
                placement: "bottom-start",
                offset: [2, 0],

            },
            renderType: "anchored",
            exclusiveGroup: "dropdowns",

        }
        onOpenOverlay(descriptor);
    }
    //const placeholder = placeholderCustom ? placeholderCustom : btnId === "workspace-dropdown" ? "Select workspace" : "Select visibility";

    return (
        <div onClick={handleOpenDropdpown} ref={anchorRef}
            className={className}>
            <UserRoleBadge role={role} isLocked={isLocked} onClick={onClick} interactive lightBg={lightBg}>
                {children}
            </UserRoleBadge>
        </div>
    )
}
