import { create } from 'zustand';
import type { ApiAuditLogEvent, ApiAuditLogResponse, AuditCursor, AuditLogPaginatedResponse, AuditPageInfo, RealtimeAuditBoardEvent } from './audittypes';
import { api } from '@/api/api';
import { buildFeedFromAudit, type RenderFeed } from '@/hooks/useFeedFromAudit';
import { useAuditEntityStore } from './auditEntityStore';
import { useUserStore } from './userStore';
import type { User } from './usertypes';


type AuditStore = {
    auditIdsByUserId: Record<string, string[]>
    auditIdsByBoardId: Record<string, string[]>
    auditIdsByCardId: Record<string, string[]>

    cursorByBoardId: Record<string, AuditPageInfo | null>
    cursorByUserId: Record<string, AuditPageInfo | null>
    cursorByCardId: Record<string, AuditPageInfo | null>


    auditById: Record<string, ApiAuditLogEvent>
    feedsByBoardId: Record<string, RenderFeed[]>
    openToast: boolean;
    toastFeed: RenderFeed | null;

    fetchAuditsForBoard: (boardID: string) => Promise<void>
    fetchAuditsForCard: (cardID: string, workspaceID?: string) => Promise<void>

    resetCursorForBoard: (boardID: string) => void
    resetCursorForUser: (userID: string) => void
    resetCursorForCard: (cardID: string) => void
    fetchAuditsForCardPaginated: (cardID: string, workspaceID?: string) => Promise<void>

    fetchAuditsForMe: (userID: string) => Promise<void>
    fetchAuditsForUser: (userID: string, workspaceID: string) => Promise<void>
    mergeAuditsForUser: (audits: ApiAuditLogEvent[], userID: string) => void
    mergeEachAuditForUser: (audits: ApiAuditLogEvent[], userID: string) => void
    generateRenderFeedForBoardId: (boardId: string) => RenderFeed[]
    applyAuditEvent: (event: RealtimeAuditBoardEvent) => void
    actionNameFromActionType: (actionType: string) => string
    readableDateFromTimestamp: (timestamp: string) => string

}

const normalizeAuditLogResponse = (data: ApiAuditLogEvent[] | ApiAuditLogResponse): ApiAuditLogResponse => {
    if (Array.isArray(data)) {
        return { Audits: data, Entities: {} };
    }
    return {
        Audits: data?.Audits ?? [],
        Entities: data?.Entities ?? {},
    };
};

const hydrateEntitiesFromAuditResponse = (response: ApiAuditLogResponse) => {
    useAuditEntityStore.getState().mergeAuditEntities(response.Entities);
    useUserStore.getState().mergeUsers(Object.values(response.Entities.Users ?? {}) as User[]);
};

const buildUrlFromRequest = (path: string, cursor?: AuditCursor | null, limit?: number) => {
    const params = new URLSearchParams();
    if (cursor) {
        params.append("cursorID", cursor.ID);
        params.append("cursorCreatedAt", cursor.CreatedAt);
    }
    if (limit) {
        params.append("limit", limit.toString());
    }
    return `${path}?${params.toString()}`;
};

export const useAuditStore = create<AuditStore>((set, get) => ({
    auditIdsByUserId: {},
    auditIdsByBoardId: {},
    auditIdsByCardId: {},
    cursorByBoardId: {},
    cursorByUserId: {},
    cursorByCardId: {},
    auditById: {},
    feedsByBoardId: {},
    openToast: false,
    toastFeed: null,

    actionNameFromActionType: (actionType: string) => {
        switch (actionType) {
            case "card.created":
                return "Created card"
            case "board.list.created":
                return "Created list"
            case "board.list.detatched":
                return "Detached list"
            case "board.list.moved":
                return "Moved list"
            case "board.list.patched":
                return "Updated list"
            case "board.list.mirrored":
            case "board.list.mirrored.target":
                return "Mirrored list to board"
            case "board.list.mirrored.source":
                return "Mirrored list from board"
            default:
                return actionType
        }
    },
    readableDateFromTimestamp: (timestamp: string) => {
        const date = new Date(timestamp);
        const d = new Date(date ?? "");

        const readable = new Intl.DateTimeFormat("it-IT", {
            day: "numeric",
            month: "long",
            year: "numeric",
        }).format(d);
        return readable;
    },
    fetchAuditsForBoard: async (boardID: string) => {
        try {
            const url = `/boards/${boardID}/auditlog`;
            const urlWithParams = buildUrlFromRequest(url, get().cursorByBoardId[boardID]?.NextCursor, 20);
            const response = await api.get(urlWithParams);
            const paginatedData = response.data as AuditLogPaginatedResponse;
            const pageInfo: AuditPageInfo = {
                NextCursor: paginatedData.NextCursor,
                HasMore: paginatedData.HasMore,
            };

            set((state) => ({
                cursorByBoardId: {
                    ...state.cursorByBoardId,
                    [boardID]: pageInfo,
                },
            }));

            const normalized = normalizeAuditLogResponse(paginatedData.Events as ApiAuditLogEvent[] | ApiAuditLogResponse);
            const audits = normalized.Audits;
            hydrateEntitiesFromAuditResponse(normalized);

            set((state) => {
                const newAuditById = { ...state.auditById };
                const auditIds = audits.map((audit) => {
                    newAuditById[audit.ID] = audit;
                    return audit.ID;
                });
                const nextBoardAuditIds = [...(state.auditIdsByBoardId[boardID] ?? []), ...auditIds];
                const uniqueAuditIds = Array.from(new Set(nextBoardAuditIds));

                return {
                    auditById: newAuditById,
                    auditIdsByBoardId: {
                        ...state.auditIdsByBoardId,
                        [boardID]: uniqueAuditIds,
                    },
                };
            });
        } catch (error) {
            // console.error("Failed to fetch audits for board", error);
        }
    },
    fetchAuditsForCard: async (cardID: string, workspaceID?: string) => {
        try {
            const url = workspaceID
                ? `/workspaces/${workspaceID}/cards/${cardID}/activity`
                : `/inbox/cards/${cardID}/activity`;



            const response = await api.get(url);
            const normalized = normalizeAuditLogResponse(response.data as ApiAuditLogEvent[] | ApiAuditLogResponse);
            const audits = normalized.Audits;
            hydrateEntitiesFromAuditResponse(normalized);

            set((state) => {
                const newAuditById = { ...state.auditById };
                const auditIds = audits.map((audit) => {
                    newAuditById[audit.ID] = audit;
                    return audit.ID;
                });

                return {
                    auditById: newAuditById,
                    auditIdsByCardId: {
                        ...state.auditIdsByCardId,
                        [cardID]: auditIds,
                    },
                };
            });
        } catch (error) {
            // console.error("Failed to fetch audits for card", error);
        }
    },

    fetchAuditsForCardPaginated: async (cardID: string, workspaceID?: string) => {
        // console.debug("Fetching audits for card with pagination", { cardID, workspaceID })
        try {
            const url = workspaceID
                ? `/workspaces/${workspaceID}/cards/${cardID}/activity`
                : `/inbox/cards/${cardID}/activity`;

            const urlWithParams = buildUrlFromRequest(url, get().cursorByCardId[cardID]?.NextCursor, 20);
            //console.debug("Built URL for paginated request", urlWithParams);
            const response = await api.get(urlWithParams);

            const paginatedData = response.data as AuditLogPaginatedResponse;
            console.debug("Fetched paginated audits for card", { cardID, workspaceID, paginatedData });
            const pageInfo: AuditPageInfo = {
                NextCursor: paginatedData.NextCursor,
                HasMore: paginatedData.HasMore,
            };

            set((state) => {
                const newCursorByCardId = { ...state.cursorByCardId };
                newCursorByCardId[cardID] = pageInfo || null;
                return { cursorByCardId: newCursorByCardId };
            });

            const data = paginatedData.Events;

            const normalized = normalizeAuditLogResponse(data as ApiAuditLogEvent[] | ApiAuditLogResponse);
            const audits = normalized.Audits;
            hydrateEntitiesFromAuditResponse(normalized);

            set((state) => {
                const newAuditById = { ...state.auditById };
                const auditIds = audits.map((audit) => {
                    newAuditById[audit.ID] = audit;
                    return audit.ID;
                });
                const nextCardAuditIds = [...(state.auditIdsByCardId[cardID] ?? []), ...auditIds];
                const uniqueAuditIds = Array.from(new Set(nextCardAuditIds));

                return {
                    auditById: newAuditById,
                    auditIdsByCardId: {
                        ...state.auditIdsByCardId,
                        [cardID]: uniqueAuditIds,
                    },
                };
            });
        } catch (error) {
            // console.error("Failed to fetch audits for card", error);
        }
    },

    resetCursorForCard: (cardID: string) => {
        console.debug("Resetting cursor for card", cardID);
        set((state) => ({
            cursorByCardId: {
                ...state.cursorByCardId,
                [cardID]: null,
            },
            auditIdsByCardId: { ...state.auditIdsByCardId, [cardID]: [] }
        }));
    },

    resetCursorForBoard: (boardID: string) => {
        set((state) => ({
            cursorByBoardId: {
                ...state.cursorByBoardId,
                [boardID]: null,
            },
            auditIdsByBoardId: {
                ...state.auditIdsByBoardId,
                [boardID]: [],
            },
        }));
    },

    resetCursorForUser: (userID: string) => {
        set((state) => ({
            cursorByUserId: {
                ...state.cursorByUserId,
                [userID]: null,
            },
            auditIdsByUserId: {
                ...state.auditIdsByUserId,
                [userID]: [],
            },
        }));
    },





    fetchAuditsForMe: async (userID: string) => {
        try {
            const url = `/activity/me`;
            const urlWithParams = buildUrlFromRequest(url, get().cursorByUserId[userID]?.NextCursor, 20);
            const response = await api.get(urlWithParams)
            const paginatedData = response.data as AuditLogPaginatedResponse;
            const pageInfo: AuditPageInfo = {
                NextCursor: paginatedData.NextCursor,
                HasMore: paginatedData.HasMore,
            };

            set((state) => ({
                cursorByUserId: {
                    ...state.cursorByUserId,
                    [userID]: pageInfo,
                },
            }));

            const normalized = normalizeAuditLogResponse(paginatedData.Events as ApiAuditLogEvent[] | ApiAuditLogResponse);
            const audits = normalized.Audits;
            hydrateEntitiesFromAuditResponse(normalized);

            set((state) => {
                const nextAuditById = { ...state.auditById }
                const newIds = audits.map((audit) => {
                    nextAuditById[audit.ID] = audit
                    return audit.ID
                })
                const nextIds = [...(state.auditIdsByUserId[userID] ?? []), ...newIds]
                const uniqueIds = Array.from(new Set(nextIds))

                return {
                    auditById: nextAuditById,
                    auditIdsByUserId: { ...state.auditIdsByUserId, [userID]: uniqueIds }
                }
            });
        } catch (error) {
            // console.error("Failed to fetch audits for user", error);
        }
    },

    fetchAuditsForUser: async (userID: string, workspaceID: string) => {
        try {
            const url = `workspaces/${workspaceID}/activity/users/${userID}`;
            const urlWithParams = buildUrlFromRequest(url, get().cursorByUserId[userID]?.NextCursor, 20);
            const response = await api.get(urlWithParams)
            const paginatedData = response.data as AuditLogPaginatedResponse;
            const pageInfo: AuditPageInfo = {
                NextCursor: paginatedData.NextCursor,
                HasMore: paginatedData.HasMore,
            };

            set((state) => ({
                cursorByUserId: {
                    ...state.cursorByUserId,
                    [userID]: pageInfo,
                },
            }));

            const normalized = normalizeAuditLogResponse(paginatedData.Events as ApiAuditLogEvent[] | ApiAuditLogResponse);
            const audits = normalized.Audits;
            hydrateEntitiesFromAuditResponse(normalized);

            set((state) => {
                const nextAuditById = { ...state.auditById }
                const newIds = audits.map((audit) => {
                    nextAuditById[audit.ID] = audit
                    return audit.ID
                })
                const nextIds = [...(state.auditIdsByUserId[userID] ?? []), ...newIds]
                const uniqueIds = Array.from(new Set(nextIds))

                return {
                    auditById: nextAuditById,
                    auditIdsByUserId: { ...state.auditIdsByUserId, [userID]: uniqueIds }
                }
            });
        } catch (error) {
            // console.error("Failed to fetch audits for user", error);
        }
    },



    mergeAuditsForUser: (audits: ApiAuditLogEvent[], userID: string) => {
        set((state) => {
            const nextAuditById = { ...get().auditById }

            audits.forEach((audit) => {
                nextAuditById[audit.ID] = audit
            })

            return {
                auditById: nextAuditById,
                auditIdsByUserId: { ...state.auditIdsByUserId, [userID]: audits.map((audit) => audit.ID) }
            }

        });
    },

    mergeEachAuditForUser: (audits: ApiAuditLogEvent[], userID: string) => {
        set((state) => {
            const nextAuditById = { ...get().auditById }
            const nextAuditIdsByUserId = { ...state.auditIdsByUserId }
            const nextAuditIdsForUser = nextAuditIdsByUserId[userID] ? [...nextAuditIdsByUserId[userID]] : []

            audits.forEach((audit) => {
                nextAuditById[audit.ID] = audit
                if (!nextAuditIdsForUser.includes(audit.ID)) {
                    nextAuditIdsForUser.unshift(audit.ID)
                }
            })

            return {
                auditById: nextAuditById,
                auditIdsByUserId: { ...state.auditIdsByUserId, [userID]: nextAuditIdsForUser }
            }

        });

    },


    generateRenderFeedForBoardId: (boardId: string): RenderFeed[] => {
        const audits = useAuditStore.getState().auditIdsByBoardId[boardId]?.map(
            (id) => useAuditStore.getState().auditById[id]) || [];
        // console.debug("Generating render feed for board", boardId, "with audits", audits);

        const feeds: RenderFeed[] = audits.map((audit) => {
            const feed = buildFeedFromAudit(audit);
            return feed


        })
        set((state) => ({
            feedsByBoardId: {
                ...state.feedsByBoardId,
                [boardId]: feeds,
            },
        }));
        // console.log("Generated feeds for board", boardId, feeds);
        return feeds;
    },

    applyAuditEvent: async (event: RealtimeAuditBoardEvent) => {
        if (!event?.Payload?.FeedPayload) {
            return
        }
        const feed = buildFeedFromAudit(event);
        const apiPayload = event.Payload.FeedPayload
        const mainEntityLink =
            apiPayload?.Links?.card ??
            apiPayload?.Links?.list ??
            apiPayload?.Links?.board;

        const nextApiAudit: ApiAuditLogEvent = {
            ID: event.ID,
            BoardID: event.BoardID,
            ActorUserID: event.ActorUserID,
            ActionType: event.Type,
            MainEntityID: mainEntityLink?.EntityID ?? event.BoardID,
            MainEntityType: mainEntityLink?.EntityType ?? "board",
            Payload: apiPayload,
            CreatedAt: event.TS,
        }

        get().mergeEachAuditForUser([nextApiAudit], event.ActorUserID)
        // console.debug("Applying audit event", event, "generated feed", feed);
        set(() => ({
            toastFeed: feed,
            openToast: true
        }));
    },



}));
