import { useWsMembersStore } from "@/stores/wsMembersStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import type { PatchWorkspacePropsRequest } from "@/stores/types";
import type { AsyncRequestKey } from "@/stores/asyncRequestTypes";
import { useAuthStore } from "@/stores/auth";
import { useNavigate } from "react-router-dom";
import { useUiStore, type DomainModalData } from "@/stores/uiStore";
import { ConfirmDeletionPopover } from "@/components/modals/ConfirmDeletion";

export function useWorkspaceActionRegistry() {

    const workspaceMembersStore = useWsMembersStore();
    const workspaceStore = useWorkspaceStore();
    const currentUserID = useAuthStore((state) => state.userID);
    const navigate = useNavigate();
    function setWorkspaceMemberRole(workspaceID: string, userID: string, role: string) {
        // console.log(`Setting role ${role} for user ${userID} in workspace ${workspaceID}`);
        return workspaceMembersStore.updateMemberRole(workspaceID, userID, { Role: role });
    }

    async function deleteWorkspaceMember(workspaceID: string, userID: string) {
        // console.log(`Deleting user ${userID} from workspace ${workspaceID}`);
        await workspaceMembersStore.deleteWorkspaceMember(workspaceID, userID);

        const isSelfLeave = currentUserID === userID;
        const isInWorkspaceRoute = window.location.pathname.startsWith(`/workspaces/${workspaceID}`);
        if (isSelfLeave && isInWorkspaceRoute) {
            navigate("/workspaces", { replace: true });
        }
    }

    function patchWorkspaceProps(workspaceID: string, payload: PatchWorkspacePropsRequest, asyncKey?: AsyncRequestKey) {
        return workspaceStore.patchWorkspaceProps(workspaceID, payload, asyncKey);
    }

    function createWorkspace(payload: { Name: string; Description?: string; Props?: import('@/stores/types').WorkspaceProps }) {
        return workspaceStore.createWorkspace(payload);
    }

    function deleteWorkspaceWithConfirmation(workspaceID: string) {
        const data: DomainModalData = {
            componentent: (onClose) => (
                <ConfirmDeletionPopover
                    onClose={onClose}
                    onSubmit={async () => {
                        await workspaceStore.deleteWorkspace(workspaceID);
                        onClose();
                        navigate("/workspaces", { replace: true });
                    }}
                    title="Delete workspace?"
                    body="This will permanently delete the workspace and all its boards. This action cannot be undone."
                    submitLabel="Delete"
                />
            ),
            anchorRef: null,
        };
        useUiStore.getState().setDomainModalOpen(true, data);
    }

    function leaveWorkspaceWithConfirmation(workspaceID: string, userID: string, anchorRef?: React.RefObject<HTMLElement | null>) {
        const data: DomainModalData = {
            componentent: (onClose) => (
                <ConfirmDeletionPopover
                    onClose={onClose}
                    onSubmit={() => {
                        void deleteWorkspaceMember(workspaceID, userID);
                        onClose();
                    }}
                    title="Leave workspace?"
                    body="Are you sure you want to leave this workspace?"
                    submitLabel="Leave"
                />
            ),
            anchorRef: anchorRef ?? null,
        };

        useUiStore.getState().setDomainModalOpen(true, data);
    }

    return {
        setWorkspaceMemberRole,
        deleteWorkspaceMember,
        patchWorkspaceProps,
        leaveWorkspaceWithConfirmation,
        createWorkspace,
        deleteWorkspaceWithConfirmation,
    }

}