import type { ApiAuditLogEvent, AuditEntityLink, AuditRenderPayload, RealtimeAuditBoardEvent } from "@/stores/audittypes";
import type { UserAuditNotification } from "@/stores/types";
import { useAuditEntityStore } from "@/stores/auditEntityStore";

export type FeedBodyChunk =
    | { kind: "text"; text: string }
    | {
        kind: "link";
        text: string;
        href: string;
        entityType?: "card" | "list" | "board" | "user" | "workspace" | "actor" | "target_user";
        entityID?: string
    };

export type MainEntityTypeStrict =
    | "card"
    | "list"
    | "board"
    | "workspace";

type ResolvedMainEntityType =
    | MainEntityTypeStrict
    | "label"
    | "board_label"
    | "checklist"
    | "entry";

export type RenderFeed = {
    Actor: AuditRenderPayload["Actor"];
    BoardID: string;
    MainEntityRef: {
        EntityType: MainEntityTypeStrict;
        EntityID: string;
    };
    Body: FeedBodyChunk[];
    CreatedAt: string;
};

export type RenderFeedExtended = {
    ID?: string;
} & RenderFeed;

type AuditLike = ApiAuditLogEvent | RealtimeAuditBoardEvent | UserAuditNotification;

const FALLBACK_ACTOR: AuditRenderPayload["Actor"] = {
    ID: "",
    Name: "Qualcuno",
    Username: "",
    AvatarUrl: "",
    Role: "",
}

const FALLBACK_PAYLOAD: AuditRenderPayload = {
    TemplateKey: "audit.legacy.event",
    Actor: FALLBACK_ACTOR,
    Params: {},
    Links: {},
}

function toPayload(audit: AuditLike): AuditRenderPayload {
    const realtimePayload = (audit as RealtimeAuditBoardEvent)?.Payload;
    if (realtimePayload && "FeedPayload" in realtimePayload && realtimePayload.FeedPayload) {
        return realtimePayload.FeedPayload as AuditRenderPayload;
    }
    const apiPayload = (audit as ApiAuditLogEvent | UserAuditNotification).Payload as AuditRenderPayload | undefined;
    return apiPayload ?? FALLBACK_PAYLOAD;
}

function toCreatedAt(audit: AuditLike): string {
    if ((audit as RealtimeAuditBoardEvent).TS) {
        return (audit as RealtimeAuditBoardEvent).TS;
    }
    return (audit as ApiAuditLogEvent | UserAuditNotification).CreatedAt;
}

function toBoardID(audit: AuditLike): string {
    return ((audit as ApiAuditLogEvent).BoardID ?? (audit as RealtimeAuditBoardEvent).BoardID ?? "") as string;
}

function paramString(payload: AuditRenderPayload, key: string, fallback: string): string {
    const value = payload.Params?.[key];
    return typeof value === "string" && value.length > 0 ? value : fallback;
}

function buildUrlFromLink(link?: AuditEntityLink): string {
    if (!link) return "";
    switch (link.EntityType) {
        case "card":
            return `/workspaces/${link.WorkspaceID}/boards/${link.BoardID}/cards/${link.EntityID}`;
        case "list":
            return `/workspaces/${link.WorkspaceID}/boards/${link.BoardID}`;
        case "board":
            return `/workspaces/${link.WorkspaceID}/boards/${link.EntityID}`;
        case "workspace":
            return `/workspaces/${link.EntityID}/boards`;
        case "user":
            return userHref(link.EntityID, link.WorkspaceID ?? undefined);
        default:
            return "";
    }
}

function resolveCardName(payload: AuditRenderPayload): string {
    const id = payload.Links?.card?.EntityID;
    if (id) {
        const live = useAuditEntityStore.getState().cardsById[id]?.Title as string | undefined;
        if (live) return live;
    }
    return paramString(payload, "cardTitle", "card");
}

function resolveListName(payload: AuditRenderPayload): string {
    const id = payload.Links?.list?.EntityID;
    if (id) {
        const live = useAuditEntityStore.getState().listsById[id]?.Title as string | undefined;
        if (live) return live;
    }
    return paramString(payload, "listTitle", "lista");
}

function resolveBoardName(payload: AuditRenderPayload): string {
    const id = payload.Links?.board?.EntityID;
    if (id) {
        const live = useAuditEntityStore.getState().boardsById[id]?.Name as string | undefined;
        if (live) return live;
    }
    return paramString(payload, "boardName", "board");
}

function resolveActor(payload: AuditRenderPayload): AuditRenderPayload["Actor"] {
    const fallback = payload.Actor ?? FALLBACK_ACTOR;
    const actorID = fallback?.ID;
    if (!actorID) {
        return fallback;
    }

    const liveUser = useAuditEntityStore.getState().usersById[actorID];
    if (!liveUser) {
        return fallback;
    }

    return {
        ...fallback,
        Name: (liveUser.Name as string | undefined) ?? fallback.Name,
        Username: (liveUser.Username as string | undefined) ?? fallback.Username,
        AvatarUrl: (liveUser.AvatarUrl as string | undefined) ?? fallback.AvatarUrl,
        Props: (liveUser.Props as AuditRenderPayload["Actor"]["Props"] | undefined) ?? fallback.Props,
    };
}

function resolveUserNameByID(userID?: string | null): string | undefined {
    if (!userID) return undefined;
    const liveUser = useAuditEntityStore.getState().usersById[userID];
    return liveUser?.Name as string | undefined;
}

function resolveTargetUser(payload: AuditRenderPayload): { userID?: string; name: string } {
    const actorID = payload.Actor?.ID;
    const preferredKeys = ["target_user", "entryMemberUser", "user"];
    for (const key of preferredKeys) {
        const linkedUserID = payload.Links?.[key]?.EntityType === "user" ? payload.Links[key]?.EntityID : undefined;
        if (linkedUserID && linkedUserID !== actorID) {
            const liveName = resolveUserNameByID(linkedUserID);
            if (liveName) return { userID: linkedUserID, name: liveName };
            return { userID: linkedUserID, name: paramString(payload, "targetUserName", "utente") };
        }
    }

    const userLinks = Object.values(payload.Links ?? {}).filter((link) => link.EntityType === "user" && link.EntityID !== actorID);
    for (const link of userLinks) {
        const liveName = resolveUserNameByID(link.EntityID);
        if (liveName) return { userID: link.EntityID, name: liveName };
        return { userID: link.EntityID, name: paramString(payload, "targetUserName", "utente") };
    }

    return {
        name: paramString(
            payload,
            "targetUserName",
            paramString(payload, "cardMemberUserName", paramString(payload, "entryMemberUserName", "utente"))
        ),
    };
}

function userHref(userID?: string, workspaceID?: string): string {
    if (!userID) return "";

    const currentWorkspaceID = typeof window !== "undefined"
        ? window.location.pathname.match(/^\/workspaces\/([^/]+)/)?.[1]
        : undefined;

    const lastWorkspaceID = typeof window !== "undefined"
        ? window.localStorage.getItem("lastWorkspaceId") ?? undefined
        : undefined;

    const resolvedWorkspaceID = workspaceID ?? currentWorkspaceID ?? lastWorkspaceID;
    if (resolvedWorkspaceID) {
        return `/workspaces/${resolvedWorkspaceID}/users/${userID}/activities`;
    }

    return `/users/${userID}/activities`;
}

function actorPrefixChunks(actor: AuditRenderPayload["Actor"], verbPhrase: string): FeedBodyChunk[] {
    const actorName = actor?.Name || "Qualcuno";
    if (actor?.ID) {
        return [
            { kind: "link", text: actorName, href: userHref(actor.ID), entityType: "actor", entityID: actor.ID },
            { kind: "text", text: ` ${verbPhrase}` },
        ];
    }
    return [{ kind: "text", text: `${actorName} ${verbPhrase}` }];
}

function resolveWorkspaceName(payload: AuditRenderPayload): string {
    const workspaceID = payload.Links?.workspace?.EntityID;
    if (workspaceID) {
        const live = useAuditEntityStore.getState().workspacesById[workspaceID]?.Name as string | undefined;
        if (live) return live;
    }
    return paramString(payload, "workspaceName", "workspace");
}

function toResolvedMainEntityType(entityType?: string): ResolvedMainEntityType | undefined {
    switch (entityType) {
        case "card":
        case "list":
        case "board":
        case "workspace":
        case "label":
        case "board_label":
        case "checklist":
        case "entry":
            return entityType;
        default:
            return undefined;
    }
}

function toMainEntityTypeStrict(entityType?: string): MainEntityTypeStrict | undefined {
    switch (entityType) {
        case "card":
        case "list":
        case "board":
        case "workspace":
            return entityType;
        default:
            return undefined;
    }
}

function resolveMainEntity(audit: AuditLike): { entityType?: ResolvedMainEntityType; entityID?: string } {
    const event = audit as ApiAuditLogEvent;
    const resolvedEventType = toResolvedMainEntityType(event?.MainEntityType);
    if (resolvedEventType && typeof event?.MainEntityID === "string" && event.MainEntityID.length > 0) {
        return {
            entityType: resolvedEventType,
            entityID: event.MainEntityID,
        };
    }

    const payload = toPayload(audit);
    const fallbackLink = payload?.Links?.card ?? payload?.Links?.list ?? payload?.Links?.board ?? payload?.Links?.workspace;
    const resolvedLinkType = toResolvedMainEntityType(fallbackLink?.EntityType);
    if (resolvedLinkType && fallbackLink?.EntityID) {
        return {
            entityType: resolvedLinkType,
            entityID: fallbackLink.EntityID,
        };
    }

    return {
        entityType: "board",
        entityID: toBoardID(audit),
    };
}

function resolveLabelTitle(payload: AuditRenderPayload, audit: AuditLike): string {
    return paramString(payload, "labelTitle", "etichetta");
}

function resolveChecklistTitle(payload: AuditRenderPayload, audit: AuditLike): string {
    const fromLink = payload.Links?.checklist?.EntityID;
    const main = resolveMainEntity(audit);
    const fromMain = main.entityType === "checklist" ? main.entityID : undefined;
    const checklistID = fromLink ?? fromMain;
    if (checklistID) {
        const live = useAuditEntityStore.getState().checklistsById[checklistID]?.Title as string | undefined;
        if (typeof live === "string" && live.length > 0) {
            return live;
        }
    }
    return paramString(payload, "checklistTitle", "checklist");
}

function resolveEntryTitle(payload: AuditRenderPayload, audit: AuditLike): string {
    const fromLink = payload.Links?.entry?.EntityID;
    const main = resolveMainEntity(audit);
    const fromMain = main.entityType === "entry" ? main.entityID : undefined;
    const entryID = fromLink ?? fromMain;
    if (entryID) {
        const live = useAuditEntityStore.getState().entriesById[entryID]?.Title as string | undefined;
        if (typeof live === "string" && live.length > 0) {
            return live;
        }
    }
    return paramString(payload, "entryTitle", "voce");
}

export function buildFeedFromAudit(audit: AuditLike): RenderFeed {
    const payload = toPayload(audit);
    const actor = resolveActor(payload);
    const cardName = resolveCardName(payload);
    const listName = resolveListName(payload);
    const boardName = resolveBoardName(payload);
    const workspaceName = resolveWorkspaceName(payload);
    const targetUser = resolveTargetUser(payload);
    const checklistTitle = resolveChecklistTitle(payload, audit);
    const entryTitle = resolveEntryTitle(payload, audit);
    const labelTitle = resolveLabelTitle(payload, audit);
    const mainEntityRef = resolveMainEntity(audit);
    const newRole = paramString(payload, "new_role", paramString(payload, "newRole", "ruolo"));

    let body: FeedBodyChunk[] = [];
    switch (payload.TemplateKey) {
        case "audit.card.created":
            body = [
                ...actorPrefixChunks(actor, "ha creato"),
                { kind: "text", text: ` ` },
                { kind: "link", text: cardName, href: buildUrlFromLink(payload.Links?.card), entityType: "card", entityID: payload.Links?.card?.EntityID },
                { kind: "text", text: ` nella lista ${listName} su ${boardName}` },
            ];
            break;
        case "audit.card.patched":
            body = [
                ...actorPrefixChunks(actor, "ha aggiornato"),
                { kind: "text", text: ` ` },
                { kind: "link", text: cardName, href: buildUrlFromLink(payload.Links?.card), entityType: "card", entityID: payload.Links?.card?.EntityID },
                { kind: "text", text: ` in ${listName}` },
            ];
            break;
        case "audit.list.patched":
            body = [
                ...actorPrefixChunks(actor, "ha modificato lista"),
                { kind: "text", text: ` ${listName} su ${boardName}` },
            ];
            break;
        case "audit.board.patched": {
            const changedFields = paramString(payload, "changedFields", "board settings");
            body = [
                ...actorPrefixChunks(actor, "ha aggiornato"),
                { kind: "text", text: ` ` },
                {
                    kind: "link",
                    text: boardName,
                    href: buildUrlFromLink(payload.Links?.board),
                    entityType: "board",
                    entityID: payload.Links?.board?.EntityID,
                },
                { kind: "text", text: ` (${changedFields})` },
            ];
            break;
        }
        case "audit.workspace.member.role.changed":
        case "audit.workspace.member.role.changed.self":
            body = [
                ...actorPrefixChunks(actor, "ha cambiato ruolo di"),
                { kind: "text", text: ` ` },
                targetUser.userID
                    ? { kind: "link", text: targetUser.name, href: userHref(targetUser.userID), entityType: "user", entityID: targetUser.userID }
                    : { kind: "text", text: targetUser.name },
                { kind: "text", text: ` a ${newRole} in ${workspaceName}` },
            ];
            break;
        case "audit.workspace.member.removed":
        case "audit.workspace.member.removed.self":
            body = [
                ...actorPrefixChunks(actor, "ha rimosso"),
                { kind: "text", text: ` ` },
                targetUser.userID
                    ? { kind: "link", text: targetUser.name, href: userHref(targetUser.userID), entityType: "user", entityID: targetUser.userID }
                    : { kind: "text", text: targetUser.name },
                { kind: "text", text: ` da ${workspaceName}` },
            ];
            break;
        case "audit.workspace.access.claimed":
            body = [
                ...actorPrefixChunks(actor, "ha ottenuto accesso al workspace tramite link"),
                { kind: "text", text: ` ` },
                payload.Links?.workspace?.EntityID
                    ? {
                        kind: "link",
                        text: workspaceName,
                        href: buildUrlFromLink(payload.Links?.workspace),
                        entityType: "workspace",
                        entityID: payload.Links?.workspace?.EntityID,
                    }
                    : { kind: "text", text: workspaceName },
            ];
            break;
        case "audit.board.access.claimed":
            body = [
                ...actorPrefixChunks(actor, "ha ottenuto accesso alla board tramite link"),
                { kind: "text", text: ` ` },
                payload.Links?.board?.EntityID
                    ? {
                        kind: "link",
                        text: boardName,
                        href: buildUrlFromLink(payload.Links?.board),
                        entityType: "board",
                        entityID: payload.Links?.board?.EntityID,
                    }
                    : { kind: "text", text: boardName },
            ];
            break;
        case "audit.workspace.shareoffer.created":
            body = [
                ...actorPrefixChunks(actor, "ha inviato un invito a"),
                { kind: "text", text: ` ` },
                targetUser.userID
                    ? { kind: "link", text: targetUser.name, href: userHref(targetUser.userID), entityType: "user", entityID: targetUser.userID }
                    : { kind: "text", text: targetUser.name },
                { kind: "text", text: ` nel workspace ${workspaceName}` },
            ];
            break;
        case "audit.card.member.added":
        case "audit.card.member.added.self":
            body = [
                ...actorPrefixChunks(actor, "ha aggiunto"),
                { kind: "text", text: ` ` },
                targetUser.userID
                    ? { kind: "link", text: targetUser.name, href: userHref(targetUser.userID), entityType: "user", entityID: targetUser.userID }
                    : { kind: "text", text: targetUser.name },
                { kind: "text", text: ` alla card ${cardName}` },
            ];
            break;
        case "audit.card.member.removed":
        case "audit.card.member.removed.self":
            body = [
                ...actorPrefixChunks(actor, "ha rimosso"),
                { kind: "text", text: ` ` },
                targetUser.userID
                    ? { kind: "link", text: targetUser.name, href: userHref(targetUser.userID), entityType: "user", entityID: targetUser.userID }
                    : { kind: "text", text: targetUser.name },
                { kind: "text", text: ` dalla card ${cardName}` },
            ];
            break;
        case "audit.checklist.created":
        case "audit.checklist.patched":
        case "audit.checklist.deleted":
        case "audit.checklist.moved":
            body = [
                ...actorPrefixChunks(actor, "ha aggiornato checklist"),
                { kind: "text", text: ` ${checklistTitle} nella card ${cardName}` },
            ];
            break;
        case "audit.checklist.entry.created":
        case "audit.checklist.entry.patched":
        case "audit.checklist.entry.deleted":
        case "audit.checklist.entry.moved":
            body = [
                ...actorPrefixChunks(actor, "ha aggiornato voce"),
                { kind: "text", text: ` ${entryTitle} in ${checklistTitle}` },
            ];
            break;
        case "audit.checklist.entry.member.added":
        case "audit.checklist.entry.member.added.self":
            body = [
                ...actorPrefixChunks(actor, "ha assegnato"),
                { kind: "text", text: ` ` },
                targetUser.userID
                    ? { kind: "link", text: targetUser.name, href: userHref(targetUser.userID), entityType: "user", entityID: targetUser.userID }
                    : { kind: "text", text: targetUser.name },
                { kind: "text", text: ` alla voce ${entryTitle}` },
            ];
            break;
        case "audit.checklist.entry.member.removed":
        case "audit.checklist.entry.member.removed.self":
            body = [
                ...actorPrefixChunks(actor, "ha rimosso"),
                { kind: "text", text: ` ` },
                targetUser.userID
                    ? { kind: "link", text: targetUser.name, href: userHref(targetUser.userID), entityType: "user", entityID: targetUser.userID }
                    : { kind: "text", text: targetUser.name },
                { kind: "text", text: ` dalla voce ${entryTitle}` },
            ];
            break;
        case "audit.label.created":
        case "audit.label.deleted":
        case "audit.label.patched":
            body = [
                ...actorPrefixChunks(actor, "ha aggiornato etichetta"),
                { kind: "text", text: ` ${labelTitle} su ${boardName}` },
            ];
            break;
        case "audit.card.label.added":
        case "audit.card.label.removed":
            body = [
                ...actorPrefixChunks(actor, "ha aggiornato etichetta"),
                { kind: "text", text: ` ${labelTitle} su ${cardName}` },
            ];
            break;
        case "audit.workspace.board.created":
        case "audit.workspace.board.closed":
        case "audit.workspace.board.restored":
        case "audit.workspace.board.purged":
            body = [
                ...actorPrefixChunks(actor, "ha aggiornato la board"),
                { kind: "text", text: ` ${boardName} nel workspace ${workspaceName}` },
            ];
            break;
        case "audit.board.list.created":
            body = [
                ...actorPrefixChunks(actor, "ha aggiunto la lista"),
                { kind: "text", text: ` ${listName} su ${boardName}` },
            ];
            break;
        case "audit.board.list.detached":
            body = [
                ...actorPrefixChunks(actor, "ha staccato la lista"),
                { kind: "text", text: ` ${listName} da ${boardName}` },
            ];
            break;
        case "audit.board.list.restored":
            body = [
                ...actorPrefixChunks(actor, "ha ripristinato la lista"),
                { kind: "text", text: ` ${listName} su ${boardName}` },
            ];
            break;
        case "audit.board.list.purged":
            body = [
                ...actorPrefixChunks(actor, "ha eliminato definitivamente la lista"),
                { kind: "text", text: ` ${listName} da ${boardName}` },
            ];
            break;
        case "audit.board.list.moved":
            body = [
                ...actorPrefixChunks(actor, "ha spostato la lista"),
                { kind: "text", text: ` ${listName} su ${boardName}` },
            ];
            break;
        case "audit.board.list.patched":
            body = [
                ...actorPrefixChunks(actor, "ha aggiornato la lista"),
                { kind: "text", text: ` ${listName} su ${boardName}` },
            ];
            break;
        case "audit.board.list.mirrored":
        case "audit.board.list.mirrored.target":
            body = [
                ...actorPrefixChunks(actor, "ha specchiato la lista"),
                { kind: "text", text: ` ${listName} su ${boardName}` },
            ];
            break;
        case "audit.board.list.mirrored.source":
            body = [
                ...actorPrefixChunks(actor, "ha specchiato fuori la lista"),
                { kind: "text", text: ` ${listName} da ${boardName}` },
            ];
            break;
        case "audit.board.listcard.detatched":
            body = [
                ...actorPrefixChunks(actor, "ha archiviato la card"),
                { kind: "text", text: ` ${cardName} dalla lista ${listName} su ${boardName}` },
            ];
            break;
        case "audit.board.listcard.moved":
            const toListTitle = paramString(payload, "toListTitle", listName);
            body = [
                ...actorPrefixChunks(actor, "ha spostato la card"),
                { kind: "text", text: ` ${cardName} in ${toListTitle} su ${boardName}` },
            ];
            break;
        case "audit.board.listcards.bulkmoved":
            const fromListBulkTitle = paramString(payload, "fromListTitle", "questa lista");
            const toListBulkTitle = paramString(payload, "toListTitle", "un'altra lista");
            body = [
                ...actorPrefixChunks(actor, "ha spostato tutte le card"),
                { kind: "text", text: ` da ${fromListBulkTitle} a ${toListBulkTitle} su ${boardName}` },
            ];
            break;
        case "audit.board.listcards.bulkdetatched":
            const archivedFromListTitle = paramString(payload, "listTitle", "questa lista");
            body = [
                ...actorPrefixChunks(actor, "ha archiviato tutte le card"),
                { kind: "text", text: ` da ${archivedFromListTitle} su ${boardName}` },
            ];
            break;
        case "audit.board.listcard.restored":
            body = [
                ...actorPrefixChunks(actor, "ha ripristinato la card"),
                { kind: "text", text: ` ${cardName} nella lista ${listName} su ${boardName}` },
            ];
            break;
        case "audit.board.listcard.purged":
            body = [
                ...actorPrefixChunks(actor, "ha eliminato definitivamente la card"),
                { kind: "text", text: ` ${cardName} dalla lista ${listName} su ${boardName}` },
            ];
            break;
        case "audit.card.mirrored":
            body = [
                ...actorPrefixChunks(actor, "ha specchiato la card"),
                { kind: "text", text: ` ${cardName}` },
            ];
            break;
        case "audit.card_comment.created":
        case "audit.card_comment.edited":
        case "audit.card_comment.deleted":
            body = [
                ...actorPrefixChunks(actor, "ha aggiornato commenti su"),
                { kind: "text", text: ` ${cardName}` },
            ];
            break;
        default:
            body = actorPrefixChunks(actor, "ha eseguito un'azione");
            break;
    }

    return {
        Actor: actor,
        BoardID: toBoardID(audit),
        MainEntityRef: {
            EntityType: (mainEntityRef.entityType ? toMainEntityTypeStrict(mainEntityRef.entityType) : undefined) ?? "board",
            EntityID: mainEntityRef.entityID ?? toBoardID(audit),
        },
        Body: body,
        CreatedAt: toCreatedAt(audit),
    };
}

export function useFeedFromAudit() {
    return {
        feedFromAudit: buildFeedFromAudit,
    };
}
