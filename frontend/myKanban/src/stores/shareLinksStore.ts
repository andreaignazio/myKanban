import { create } from "zustand"
import type {
    ClaimShareLinkResponse,
    CreateShareLinkRequest,
    PublicShareLink,
    ShareLinkAuthenticatedResponse,
    ShareLinkPublicPreviewResponse,
    ShareLinkTokenEntityData,
    Board,
    Workspace
} from "./types";
import { api } from "@/api/api";
import { useBoardsStore } from "./boardsStore";
import { useWorkspaceStore } from "./workspaceStore";
import { useBoardMembersStore } from "./boardMembersStore";
import { useWsMembersStore } from "./wsMembersStore";
import { useUserStore } from "./userStore";
import { useAsyncRequestStore, useAsyncKey } from "./asyncRequestStore";



type ShareLinksState = {
    currentJoiningToken: string | null;
    shareLinkIdsByTargetId: Record<string, string[]>;
    shareLinksById: Record<string, PublicShareLink>;
    tokenEntityDataByToken: Record<string, ShareLinkTokenEntityData>;
    tokenEntityRefByToken: Record<string, { entityId: string; entityType: "board" | "workspace" }>;
    setCurrentJoiningToken: (token: string | null) => void;
    createShareLink: (payload: CreateShareLinkRequest) => Promise<string>;
    fetchShareLinksByTargetId: (targetId: string) => Promise<void>;
    revokeShareLink: (shareLinkID: string) => Promise<void>;
    getTokenById: (ID: string) => string | null;
    buildUrlFromToken: (token: string) => string;
    fetchShareLinkPublicPreviewByToken: (token: string) => Promise<ShareLinkPublicPreviewResponse | null>;
    fetchShareLinkAuthenticatedByToken: (token: string) => Promise<ShareLinkAuthenticatedResponse | null>;
    claimShareLinkByToken: (token: string) => Promise<ClaimShareLinkResponse | null>;
    getEntityDataByToken: (token: string) => ShareLinkTokenEntityData | Board | Workspace | null;
    getPublicEntityDataByToken: (token: string) => ShareLinkTokenEntityData | null;
    getShareLinkByToken: (token: string) => PublicShareLink | null;
}

function buildUrlFromToken(token: string) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/sharelinks/join/${token}`;
}
export const useShareLinksStore = create<ShareLinksState>((set, get) => ({
    currentJoiningToken: null,
    shareLinkIdsByTargetId: {},
    shareLinksById: {},
    tokenEntityDataByToken: {},
    tokenEntityRefByToken: {},
    setCurrentJoiningToken(token) {
        set(() => ({ currentJoiningToken: token }));
    },
    buildUrlFromToken(token: string) {
        const baseUrl = window.location.origin;
        return `${baseUrl}/sharelinks/join/${token}`;
    },
    getTokenById: (ID: string) => {
        const shareLink = get().shareLinksById[ID]
        return shareLink ? shareLink.Token : null
    },
    createShareLink: async (payload) => {

        const response = await useAsyncRequestStore.getState().execute(
            "board:sharelink:create",
            () => api.post(`/sharelinks`, payload),
            {
                successResetDelayMs: 2000,
                onSuccess(response) {
                    set((state) => {
                        const shareLink = response.data as PublicShareLink;
                        const targetId = shareLink.TargetID;
                        const existingIds = state.shareLinkIdsByTargetId[targetId] || [];
                        return {
                            shareLinkIdsByTargetId: {
                                ...state.shareLinkIdsByTargetId,
                                [targetId]: [...existingIds, shareLink.ID],
                            },
                            shareLinksById: {
                                ...state.shareLinksById,
                                [shareLink.ID]: shareLink,
                            },
                        };
                    });
                },
            });
        return buildUrlFromToken(response?.data.Token);


    },
    fetchShareLinksByTargetId: async (targetId) => {
        try {
            const response = await api.get(`/sharelinks/${targetId}`);
            const shareLinks: PublicShareLink[] = response.data.ShareLinks;
            const users = response.data.Users;
            useUserStore.getState().mergeUsers(users);
            // console.log("Fetched share links:", shareLinks);
            const shareLinkIds = shareLinks.map(link => link.ID);
            const shareLinksById = shareLinks.reduce((acc, link) => {
                acc[link.ID] = link;
                return acc;
            }, {} as Record<string, PublicShareLink>);
            set((state) => ({
                shareLinkIdsByTargetId: {
                    ...state.shareLinkIdsByTargetId,
                    [targetId]: shareLinkIds,
                },
                shareLinksById: {
                    ...state.shareLinksById,
                    ...shareLinksById,
                },
            }));
        } catch (error) {
            // console.error("Error fetching share links:", error);
            throw error;
        }
    },
    revokeShareLink: async (shareLinkID) => {
        const handleRevoke = async () => {
            const token = get().getTokenById(shareLinkID);
            if (!token) throw new Error("Share link not found");
            await api.post(`/sharelinks/${token}/revoke`);
        }

        await useAsyncRequestStore.getState().execute(
            useAsyncKey("board:sharelink:revoke", shareLinkID),
            () => handleRevoke(),
            {
                successResetDelayMs: 2000,
            }
        );

    },
    fetchShareLinkPublicPreviewByToken: async (token) => {
        try {
            const response = await api.get(`/public/sharelinks/${token}`);
            const payload = response.data as ShareLinkPublicPreviewResponse;
            const entityData: ShareLinkTokenEntityData = {
                EntityID: payload.PublicShareLink.TargetID,
                EntityType: payload.Target.EntityType,
                Name: payload.Target.Name,
                Description: payload.Target.Description,
            };

            set((state) => ({
                currentJoiningToken: token,
                shareLinksById: {
                    ...state.shareLinksById,
                    [payload.PublicShareLink.ID]: payload.PublicShareLink,
                },
                tokenEntityDataByToken: {
                    ...state.tokenEntityDataByToken,
                    [token]: entityData,
                },
                tokenEntityRefByToken: {
                    ...state.tokenEntityRefByToken,
                    [token]: {
                        entityId: entityData.EntityID,
                        entityType: entityData.EntityType,
                    },
                },
            }));

            return payload;
        }
        catch (error) {
            return null;
        }
    },
    fetchShareLinkAuthenticatedByToken: async (token) => {
        try {
            const response = await api.get(`/sharelinks/token/${token}`);
            const payload = response.data as ShareLinkAuthenticatedResponse;

            set((state) => ({
                currentJoiningToken: token,
                shareLinksById: {
                    ...state.shareLinksById,
                    [payload.PublicShareLink.ID]: payload.PublicShareLink,
                },
                tokenEntityRefByToken: {
                    ...state.tokenEntityRefByToken,
                    [token]: {
                        entityId: payload.PublicShareLink.TargetID,
                        entityType: payload.EntityType,
                    },
                },
            }));

            if (payload.Users?.length) {
                useUserStore.getState().mergeUsers(payload.Users);
            }

            if (payload.EntityType === "board" && payload.Board) {
                useBoardsStore.getState().mergeBoardsPatch({ [payload.Board.ID]: payload.Board });
                useBoardsStore.getState().mergeBoardsInWorkspace(payload.Board.WorkspaceID, { [payload.Board.ID]: payload.Board });

                if (payload.UserBoards?.length) {
                    useBoardMembersStore.getState().mergeBoardMembers(payload.Board.ID, payload.UserBoards);
                }

                set((state) => ({
                    tokenEntityDataByToken: {
                        ...state.tokenEntityDataByToken,
                        [token]: {
                            EntityID: payload.Board!.ID,
                            EntityType: "board",
                            Name: payload.Board!.Name,
                            Description: payload.Board!.Props?.Description,
                        },
                    },
                }));
            }

            if (payload.EntityType === "workspace" && payload.Workspace) {
                useWorkspaceStore.setState((state) => ({
                    workspacesById: {
                        ...state.workspacesById,
                        [payload.Workspace!.ID]: payload.Workspace!,
                    },
                    workspaceIds: state.workspaceIds.includes(payload.Workspace!.ID)
                        ? state.workspaceIds
                        : [...state.workspaceIds, payload.Workspace!.ID],
                }));

                if (payload.UserWorkspaces?.length) {
                    useWsMembersStore.getState().mergeUserWorkspaceRelation(payload.UserWorkspaces);
                }

                set((state) => ({
                    tokenEntityDataByToken: {
                        ...state.tokenEntityDataByToken,
                        [token]: {
                            EntityID: payload.Workspace!.ID,
                            EntityType: "workspace",
                            Name: payload.Workspace!.Name,
                            Description: payload.Workspace!.Props?.Description,
                        },
                    },
                }));
            }

            return payload;
        }
        catch (error) {
            return null;
        }
    },
    claimShareLinkByToken: async (token) => {
        try {
            const response = await api.post(`/sharelinks/${token}/claim`);
            const payload = response.data as ClaimShareLinkResponse;

            set((state) => ({
                currentJoiningToken: token,
                shareLinksById: {
                    ...state.shareLinksById,
                    [payload.PublicShareLink.ID]: payload.PublicShareLink,
                },
            }));

            if (payload.UserBoard) {
                useBoardsStore.getState().mergeUserBoardRelation(payload.UserBoard);
                useBoardMembersStore.getState().upsertBoardMember(payload.UserBoard.BoardID, payload.UserBoard);
            }

            if (payload.UserWorkspace) {
                useWsMembersStore.getState().mergeUserWorkspaceRelation([payload.UserWorkspace]);
            }

            return payload;
        }
        catch (error) {
            return null;
        }
    },
    getEntityDataByToken: (token) => {
        const ref = get().tokenEntityRefByToken[token];
        if (!ref) {
            return get().tokenEntityDataByToken[token] ?? null;
        }

        if (ref.entityType === "board") {
            return useBoardsStore.getState().boardsById[ref.entityId] ?? get().tokenEntityDataByToken[token] ?? null;
        }

        return useWorkspaceStore.getState().workspacesById[ref.entityId] ?? get().tokenEntityDataByToken[token] ?? null;
    },
    getPublicEntityDataByToken: (token) => {
        return get().tokenEntityDataByToken[token] ?? null;
    },
    getShareLinkByToken: (token) => {
        const shareLinksByToken = get().shareLinksById;
        const shareLink = Object.values(shareLinksByToken).find(link => link.Token === token);
        return shareLink ?? null;
    },

}))
