
import { useBoardDetailStore } from "@/stores/boardDetailStore"
import { useAuthStore } from "@/stores/auth"
import { useRef, useEffect, useState, use } from "react"
import type { BoardEvent, UserEvent, WorkspaceEvent } from "@/stores/types"
import { usePresenceStore } from "@/stores/presenceStore"
import { useAuditStore } from "@/stores/auditStore"
import type { RealtimeAuditBoardEvent } from "@/stores/audittypes"
import { useUserNotificationStore } from "@/stores/userNotificationStore"
import { useLabelsStore } from "@/stores/labelsStore"
import { useCardMembersStore } from "@/stores/CardMembersStore"
import { useChecklistStore } from "@/stores/checklistStore"
import { useCardCommentsStore } from "@/stores/cardCommentsStore"
import { useUserInboxStore } from "@/stores/userInboxStore"
import { useWorkspaceStore } from "@/stores/workspaceStore"
import { useEventStore } from "@/stores/eventStore"
import { useUserMemberCardsStore } from "@/stores/userMemberCardsStore"
import { useShareOffersStore } from "@/stores/shareOffersStore"
import { useBoardsStore } from "@/stores/boardsStore"
import { useBoardMembersStore } from "@/stores/boardMembersStore"
import { useUiStore } from "@/stores/uiStore"

type SharedWsState = {
    ws: WebSocket | null
    boardID: string | null
    seq: number
    isConnecting: boolean
    isOpen: boolean
}

const sharedWsState: SharedWsState = {
    ws: null,
    boardID: null,
    seq: 0,
    isConnecting: false,
    isOpen: false
}

function buildWebSocketURL(workspaceID: string, boardID?: string): string {
    const proto = window.location.protocol == "https" ? "wss" : "ws"

    const userID = useAuthStore.getState().userID
    if (!userID) {
        console.warn("[ws] missing userID while building WebSocket URL", {
            workspaceID,
            boardID: boardID ?? null
        })
    }
    const base = `${proto}://localhost:8090/api/ws?workspaceID=${workspaceID}&userID=${userID}`
    const url = boardID ? `${base}&boardID=${boardID}` : base
    console.debug("[ws] build url", {
        workspaceID,
        boardID: boardID ?? null,
        hasUserID: Boolean(userID),
        url
    })
    return url
}

export function useBoardWebSocket(workspaceID: string, boardID: string | null) {

    const [events, setEvents] = useState<any[]>([])
    const applyStateEvent = useBoardDetailStore((state) => state.applyEvent)
    const applyPresenceEvent = usePresenceStore((state) => state.applyEvent)
    const applyAuditEvent = useAuditStore((state) => state.applyAuditEvent)
    const applyNotificationEvent = useUserNotificationStore((state) => state.applyEvent)
    const applyLabelEvent = useLabelsStore((state) => state.applyLabelEvent)
    const applyCardMemberEvent = useCardMembersStore((state) => state.applyCardMemberEvent)
    const applyChecklistEvent = useChecklistStore((state) => state.applyChecklistEvent)
    const applyCardCommentEvent = useCardCommentsStore((state) => state.applyCardCommentEvent)
    const applyUserInboxEvent = useUserInboxStore((state) => state.applyInboxEvent)
    const applyWorkspaceEvent = useWorkspaceStore((state) => state.applyWorkspaceEvent)
    const applyUserMemberCardsEvent = useUserMemberCardsStore((state) => state.applyUserEvent)
    const wsRef = useRef<WebSocket | null>(null)
    const retryRef = useRef({ attempts: 0, timer: 0 as any })
    const connectRef = useRef({ seq: 0 })
    const addEvent = useEventStore((state) => state.addEvent)
    const isAlreadyProcessed = useEventStore((state) => state.isAlreadyProcessed)
    const applyShareOfferEvent = useShareOffersStore((state) => state.applyShareOfferEvent)
    const removeUserBoardRelation = useBoardsStore((state) => state.removeUserBoardRelation)
    const removeBoardMember = useBoardMembersStore((state) => state.removeBoardMember)

    const dispatchEvent = (evt: BoardEvent | WorkspaceEvent | UserEvent) => {
        console.log("[ws] dispatch event", evt)
        const correlationID = (evt as { CorrelationID?: string | null }).CorrelationID
        const dedupeKey = (typeof correlationID === "string" && correlationID.trim() !== "")
            ? correlationID
            : `id::${evt.ID}`

        if (isAlreadyProcessed(dedupeKey, evt.Type)) {
            console.debug("[ws] already processed event, skipping", evt)
            return
        } addEvent(dedupeKey, evt.Type)

        if (
            evt.Type.includes("workspace.shareoffer.") ||
            evt.Type.includes("board.shareoffer.") ||
            evt.Type === "workspace.access.claimed" ||
            evt.Type === "board.access.claimed"
        ) {
            applyShareOfferEvent(evt as BoardEvent | WorkspaceEvent)
            console.debug("[ws] dispatch share offer event", evt)
            return
        }

        if (evt.Type.includes("workspace.user.shareoffer.") || evt.Type.includes("board.user.shareoffer.")) {
            applyShareOfferEvent(evt as UserEvent)
            console.debug("[ws] dispatch user share offer event", evt)
            return
        }

        if (evt.Type === "workspace.user.member.removed" || evt.Type === "workspace.user.member.role.changed") {
            applyWorkspaceEvent(evt as UserEvent)
            console.debug("[ws] dispatch workspace user membership event", evt)
            return
        }

        if (evt.Type === "board.user.member.removed") {
            const payload = (evt as UserEvent).Payload?.BoardMembershipPayload
            const boardID = payload?.Board?.ID ?? payload?.UserBoard?.BoardID
            const eventWorkspaceID = payload?.Board?.WorkspaceID
            const removedUserID = payload?.UserID ?? payload?.UserBoard?.UserID

            if (boardID && removedUserID) {
                removeBoardMember(boardID, removedUserID)
                const currentUserID = useAuthStore.getState().userID
                if (removedUserID === currentUserID) {
                    removeUserBoardRelation(boardID)

                    const currentRouteBoardID = useUiStore.getState().currentRouteParams.boardId
                    if (currentRouteBoardID === boardID) {
                        const resolvedWorkspaceID = eventWorkspaceID ?? useBoardsStore.getState().findWorkspaceIdByBoardId(boardID)
                        useUiStore.getState().setLostBoardAccessModalOpen(true, boardID, resolvedWorkspaceID)
                    }
                }
            }

            console.debug("[ws] dispatch board user membership removed", evt)
            return
        }

        if (evt.Type === "board.member.removed") {
            const payload = (evt as BoardEvent).Payload?.StatePayload as { UserBoardRelations?: Array<{ UserID: string; BoardID: string }> } | undefined
            const removedRelation = payload?.UserBoardRelations?.[0]
            if (removedRelation?.BoardID && removedRelation?.UserID) {
                removeBoardMember(removedRelation.BoardID, removedRelation.UserID)
            }
            console.debug("[ws] dispatch board membership removed", evt)
            return
        }

        if (evt.Type.includes("workspace.")) {
            console.debug("[ws] dispatch workspace event", evt)
            applyWorkspaceEvent(evt as WorkspaceEvent)
            return
        }

        if (
            evt.Type.includes("board.list.") ||
            evt.Type === "board.listcards.detatched" ||
            evt.Type === "board.listcard.detatched" ||
            evt.Type === "board.listcard.moved" ||
            evt.Type === "board.listcard.restored" ||
            evt.Type === "board.listcard.purged"
        ) {
            console.debug("[ws] dispatch board list event", evt)
            const hasFeedPayload = !!(evt as any)?.Payload?.FeedPayload
            if (hasFeedPayload) {
                applyAuditEvent(evt as unknown as RealtimeAuditBoardEvent)
            }
            applyStateEvent(evt)
            return
        }

        if (evt.Type.includes("listcard.crossboard.moved")) {
            console.log("received crossboard move event", evt)
            applyStateEvent(evt)
            return
        }
        if (evt.Type.includes("inbox")) {
            applyUserInboxEvent(evt as UserEvent)
            console.log("received inbox rootcard move event, ignoring to prevent duplicate handling", evt)
            return
        }
        if (evt.Type.includes("cards.user.member")) {
            applyUserMemberCardsEvent(evt as UserEvent)
            return
        }


        if (evt.Type.includes("presence")) {

            applyPresenceEvent(evt)
            return
        }
        if (evt.Type.includes("notification")) {
            // console.log("[ws] dispatch notification event", evt)
            applyNotificationEvent(evt)
            return
        }
        if (evt.Type.includes("label")) {
            applyLabelEvent(evt as BoardEvent)
            return
        }
        if (evt.Type.includes("card.member")) {
            applyCardMemberEvent(evt as BoardEvent)
            return
        }
        if (evt.Type.includes("checklist")) {
            // console.log("applying checklist evt")
            applyChecklistEvent(evt as BoardEvent)

        }
        if (evt.Type.includes("card.comment")) {
            // console.log("applying card comment evt", evt)
            applyCardCommentEvent(evt as BoardEvent)
        }
        if (evt.Type === "list.patched") {
            applyAuditEvent(evt as unknown as RealtimeAuditBoardEvent)
            applyStateEvent(evt)
            return
        }
        if (evt.Type.includes("list")) {
            // console.log("applying list evt", evt)
            applyStateEvent(evt)
            return
        }
        if ("BoardID" in evt) {
            // console.debug("[ws] dispatch board event", evt)
            applyAuditEvent(evt as unknown as RealtimeAuditBoardEvent)
            applyStateEvent(evt)
        } else if ("WorkspaceID" in evt) {
            // console.debug("[ws] dispatch workspace event", evt)
            applyStateEvent(evt)
        }

    }

    useEffect(() => {
        if (!workspaceID) return
        let disposed = false

        const connect = () => {
            if (disposed) return
            if (sharedWsState.ws && sharedWsState.boardID === boardID) {
                const rs = sharedWsState.ws.readyState
                if (rs === WebSocket.OPEN || rs === WebSocket.CONNECTING) {
                    wsRef.current = sharedWsState.ws
                    // console.debug("[ws] guard reuse", { boardID, seq: sharedWsState.seq })
                    return
                }
            }

            connectRef.current.seq += 1
            const seq = connectRef.current.seq
            const wsUrl = buildWebSocketURL(workspaceID, boardID ?? undefined)
            console.info("[ws] connecting", {
                seq,
                workspaceID,
                boardID: boardID ?? null,
                wsUrl
            })
            const ws = new WebSocket(wsUrl)
            wsRef.current = ws
            sharedWsState.ws = ws
            sharedWsState.boardID = boardID
            sharedWsState.seq = seq
            sharedWsState.isConnecting = true
            sharedWsState.isOpen = false
            // console.debug("[ws] connect", { boardID, seq })

            ws.onopen = () => {
                retryRef.current.attempts = 0
                sharedWsState.isConnecting = false
                sharedWsState.isOpen = true
                console.info("[ws] open", {
                    seq,
                    workspaceID,
                    boardID: boardID ?? null,
                    readyState: ws.readyState
                })
            }

            ws.onmessage = (msg) => {
                try {
                    const evt = JSON.parse(msg.data)

                    if (events.includes(evt.ID)) {

                        return
                    }

                    setEvents((prev) => [...prev, evt.ID])

                    dispatchEvent(evt as BoardEvent | WorkspaceEvent)
                } catch (error) {
                    console.error("[ws] failed to parse message", {
                        seq,
                        workspaceID,
                        boardID: boardID ?? null,
                        data: msg.data,
                        error
                    })
                }
            }

            ws.onclose = (event) => {
                if (disposed) {
                    console.info("[ws] close after dispose", {
                        seq,
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean
                    })
                    return
                }
                if (sharedWsState.ws === ws) {
                    sharedWsState.ws = null
                    sharedWsState.boardID = null
                    sharedWsState.isConnecting = false
                    sharedWsState.isOpen = false
                }
                retryRef.current.attempts++
                const a = retryRef.current.attempts
                const delay = Math.min(10_000, [0, 500, 1000, 1500, 2000][Math.min(4, a)])
                console.warn("[ws] close", {
                    seq,
                    workspaceID,
                    boardID: boardID ?? null,
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean,
                    attempts: a,
                    retryDelayMs: delay
                })
                retryRef.current.timer = setTimeout(connect, delay)
            }

            ws.onerror = (event) => {
                console.error("[ws] error", {
                    seq,
                    workspaceID,
                    boardID: boardID ?? null,
                    readyState: ws.readyState,
                    event
                })
                try { ws.close() } catch { }
            }

        }
        connect()
        return () => {
            disposed = true
            console.info("[ws] cleanup start", {
                seq: connectRef.current.seq,
                workspaceID,
                boardID: boardID ?? null
            })
            if (retryRef.current.timer) {
                window.clearTimeout(retryRef.current.timer)
            }
            if (wsRef.current) {
                // console.debug("[ws] cleanup", { boardID, seq: connectRef.current.seq })
                if (sharedWsState.ws === wsRef.current) {
                    sharedWsState.ws = null
                    sharedWsState.boardID = null
                    sharedWsState.isConnecting = false
                    sharedWsState.isOpen = false
                }
                try { wsRef.current.close() } catch { }
            }
            wsRef.current = null
            console.info("[ws] cleanup done", {
                seq: connectRef.current.seq,
                workspaceID,
                boardID: boardID ?? null
            })
        }
    }, [workspaceID, boardID, applyStateEvent])
}
