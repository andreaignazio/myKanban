import { useMemo } from "react";
import { useBoardsStore } from "@/stores/boardsStore";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { useUserNotificationStore } from "@/stores/userNotificationStore";
import type { UserAuditNotification } from "@/stores/types";
import { getClassNamesForColorToken } from "@/domain/colorTokens";

export type NotificationBackground = {
    backgroundType: "image" | "color" | null;
    imageUrl: string | null;
    color: string | null;
};

type UseNotificationBackgroundArgs = {
    notification?: UserAuditNotification | null;
    notificationID?: string | null;
};

export function useNotificationBackground({ notification, notificationID }: UseNotificationBackgroundArgs): NotificationBackground {
    const notificationFromStore = useUserNotificationStore((state) =>
        notificationID ? state.notificationsById[notificationID] : undefined
    );
    const boardsById = useBoardsStore((state) => state.boardsById);
    const workspacesById = useWorkspaceStore((state) => state.workspacesById);

    return useMemo(() => {
        const target = notification ?? notificationFromStore;
        if (!target) {
            return { backgroundType: null, imageUrl: null, color: null };
        }

        const boardID = typeof target.BoardID === "string" ? target.BoardID : undefined;
        const workspaceIDFromNotification = typeof target.WorkspaceID === "string" ? target.WorkspaceID : undefined;

        if (target.MainEntityType !== "workspace") {
            const board = boardID ? boardsById[boardID] : undefined;
            const background = board?.Props?.Background;
            if (background?.Type === "image") {
                return {
                    backgroundType: "image",
                    imageUrl: background.Image?.Url ?? null,
                    color: null,
                };
            }
            if (background?.Type === "color") {
                const colorToken = background.Color?.Token;
                return {
                    backgroundType: "color",
                    imageUrl: null,
                    color: colorToken ? getClassNamesForColorToken(colorToken) : null,
                };
            }
            return { backgroundType: null, imageUrl: null, color: null };
        }

        const workspaceID = workspaceIDFromNotification ?? (boardID ? boardsById[boardID]?.WorkspaceID : undefined);
        const workspace = workspaceID ? workspacesById[workspaceID] : undefined;
        const cover = workspace?.Props?.Cover;
        if (cover?.Type === "image") {
            return {
                backgroundType: "image",
                imageUrl: cover.ImageUrl ?? null,
                color: null,
            };
        }
        if (cover?.Type === "color") {
            return {
                backgroundType: "color",
                imageUrl: null,
                color: cover.Color ?? null,
            };
        }

        return { backgroundType: null, imageUrl: null, color: null };
    }, [notification, notificationFromStore, boardsById, workspacesById]);
}
