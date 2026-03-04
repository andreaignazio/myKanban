import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function useWorkspaceLandingRedirect() {
    const navigate = useNavigate();
    const workspaceIds = useWorkspaceStore((state) => state.workspaceIds);
    const getWorkspaceStatus = useWorkspaceStore((state) => state.getWorkspaceStatus);
    const hasHydratedWorkspaces = useWorkspaceStore((state) => state.hasHydratedWorkspaces);

    useEffect(() => {
        if (!hasHydratedWorkspaces) {
            return;
        }

        const firstAccessibleWorkspaceID = workspaceIds.find((workspaceID) => getWorkspaceStatus(workspaceID) === "accessible");

        if (firstAccessibleWorkspaceID) {
            navigate(`/workspaces/${firstAccessibleWorkspaceID}/boards`, { replace: true });
            return;
        }

        navigate("/users/me/activities", { replace: true });
    }, [workspaceIds, getWorkspaceStatus, hasHydratedWorkspaces, navigate]);
}
