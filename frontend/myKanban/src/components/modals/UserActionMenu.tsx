import { forwardRef, useRef } from "react"
import { ActionMenuWrapper } from "./ActionMenuWrapper"
import { DropDown } from "../menuElements/DropDown"
import type { MenuItemExtended } from "@/types/uiTypes"
import { MemberRow } from "../common/MemberRow"
import type { User } from "@/stores/types"
import { useAuthStore } from "@/stores/auth"
import { useUserStore } from "@/stores/userStore"
import { useShallow } from "zustand/shallow"
import { useNavigate } from "react-router-dom"
import { useClerk } from "@clerk/react"
import { useUiStore, type DomainModalData } from "@/stores/uiStore"
import { ConfirmDeletionPopover } from "./ConfirmDeletion"
import { useOverlayStore } from "@/overlays/overlayStore"
import { WorkspaceCreateWizard } from "../WorkspaceCreate/WorkspaceCreateWizard"

type UserActionMenuProps = {
    onClose?: () => void
}
export const UserActionMenu = forwardRef<HTMLDivElement, UserActionMenuProps>(({ onClose }, ref) => {
    const currentUserID = useAuthStore((state) => state.userID)
    const usersById = useUserStore(useShallow((state) => state.usersById))
    const user = currentUserID ? usersById[currentUserID] : undefined
    const navigate = useNavigate()
    const { signOut } = useClerk()
    const openOverlay = useOverlayStore((state) => state.open)
    const onMenuClose = useOverlayStore((state) => state.close)
    const wizardRef = useRef<HTMLDivElement>(null)

    const handleCreateWorkspace = () => {
        const id = "create-workspace-wizard"
        openOverlay({
            id,
            render: () => <WorkspaceCreateWizard ref={wizardRef} onClose={() => onMenuClose(id)} />,
            panelRef: wizardRef,
            type: "modal",
            renderType: "virtual",
            exclusiveGroup: "user-action-wizards",
            opts: { closeOnMouseLeave: false, closeOnClickOutside: true, closeOnEscape: true, lockBackdrop: true },
            position: { virtual: "viewport-center" },
        })
        onClose?.()
    }

    const handleLogout = () => {
        const data: DomainModalData = {
            componentent: (onCloseModal) => (
                <ConfirmDeletionPopover
                    onClose={onCloseModal}
                    onSubmit={() => {
                        void signOut({ redirectUrl: "/" })
                        onCloseModal()
                    }}
                    title="Logout?"
                    body="Are you sure you want to log out?"
                    submitLabel="Logout"
                />
            ),
            anchorRef: null,
        }
        useUiStore.getState().setDomainModalOpen(true, data)
    }

    const menuItems: MenuItemExtended[] = [
        { id: "profile", label: "Profile", kind: "custom", customElement: () => <div className="cursor-pointer" onClick={() => { navigate("/users/me/profile"); onClose?.() }}><UserProfileItem user={user as User | undefined} /></div> },
        { id: "divider1", label: "", kind: "divider" },
        { id: "activity", label: "Activity", kind: "standard", onClick: () => { navigate("/users/me/activities"); onClose?.() } },
        { id: "watched", label: "Watched", kind: "standard", onClick: () => { navigate("/users/me/watched"); onClose?.() } },
        { id: "cards", label: "Cards", kind: "standard", onClick: () => { navigate("/users/me/cards"); onClose?.() } },
        { id: "divider2", label: "", kind: "divider" },
        { id: "createWorkspace", label: "Create Workspace", kind: "standard", onClick: handleCreateWorkspace },
        { id: "divider3", label: "", kind: "divider" },
        { id: "logout", label: "Logout", kind: "standard", onClick: handleLogout },
    ]

    return (
        <ActionMenuWrapper
            ref={ref}
            onClose={() => { }}
            style={{ paddingTop: 12, width: "260px" }}
            Title="">
            <DropDown
                items={menuItems}
            />

        </ActionMenuWrapper>
    )
})
type UserProfileItemProps = {
    user?: User
}
const UserProfileItem = ({ user }: UserProfileItemProps) => {
    return (
        <div className="flex flex-col gap-2 px-4 mb-2">
            <span className="text-sm font-semibold text-neutral-400">Signed in as</span>
            <MemberRow user={user}
                showRowHoverEffect={false}
                rowClassName="!bg-transparent !pointer-events-none" />
        </div>
    )
}