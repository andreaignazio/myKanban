import type { AuditActor } from "./usertypes";

export type UUID = string;

export type AuditEntityType = "board" | "list" | "card" | string;

export type AuditEntityLink = {
    EntityType: AuditEntityType;
    EntityID: UUID;
    BoardID?: UUID | null;
    WorkspaceID?: UUID | null;
};

export type { AuditActor } from "./usertypes";

export type AuditRenderPayload = {
    TemplateKey: TemplateKeyTypes;
    Actor: AuditActor;
    Params: Record<ParamsKey, string | unknown>;
    Links: Record<LinkKey, AuditEntityLink>;
};

export type LinkKey = AuditEntityType
export type ParamsKey = "listTile" | "cardTitle" | string

export type ApiAuditLogEvent = {
    ID: UUID;
    BoardID?: UUID | null;
    WorkspaceID?: UUID | null;
    ActorUserID: UUID;
    ActionType: string;
    MainEntityID: string;
    MainEntityType: AuditEntityType;
    Payload: AuditRenderPayload;
    CreatedAt: string;
};

export type RealtimeAuditPayloadEnvelope = {
    StatePayload: unknown;
    RealtimePayload?: unknown;
    FeedPayload: AuditRenderPayload;
};

export type RealtimeAuditBoardEvent = {
    Type: string;
    BoardID: UUID;
    Payload: RealtimeAuditPayloadEnvelope;
    TS: string;
    ID: UUID;
    Counter: number;
    ActorUserID: UUID;
    CorrelationID: UUID;
};

export type BoardAuditLogEvent = ApiAuditLogEvent;
export type BoardAuditLogRender = ApiAuditLogEvent;
export type EventPayloadEnvelope = RealtimeAuditPayloadEnvelope;

export type ApiAuditLogResponse = {
    Audits: ApiAuditLogEvent[];
    Entities: {
        Workspaces?: Array<Record<string, unknown> & { ID: string }>;
        Boards?: Array<Record<string, unknown> & { ID: string }>;
        Lists?: Array<Record<string, unknown> & { ID: string }>;
        Cards?: Array<Record<string, unknown> & { ID: string }>;
        Users?: Array<Record<string, unknown> & { ID: string }>;
        UserWorkspaces?: Array<Record<string, unknown> & { ID: string }>;
        WorkspaceSubscriptions?: Array<Record<string, unknown> & { ID: string }>;
        UserBoards?: Array<Record<string, unknown> & { ID: string }>;
        BoardLists?: Array<Record<string, unknown> & { ID: string }>;
        ListCards?: Array<Record<string, unknown> & { ID: string }>;
        BoardLabels?: Array<Record<string, unknown> & { ID: string }>;
        CardMembers?: Array<Record<string, unknown> & { ID: string }>;
        CardLabelLinks?: Array<Record<string, unknown> & { ID: string }>;
        EntryMembers?: Array<Record<string, unknown> & { ID: string }>;
        ListWatches?: Array<Record<string, unknown> & { ID: string }>;
        CardWatches?: Array<Record<string, unknown> & { ID: string }>;
        BoardWatches?: Array<Record<string, unknown> & { ID: string }>;
        Checklists?: Array<Record<string, unknown> & { ID: string }>;
        Entries?: Array<Record<string, unknown> & { ID: string }>;
        ChecklistEntries?: Array<Record<string, unknown> & { ID: string }>;
        CardChecklists?: Array<Record<string, unknown> & { ID: string }>;
    };
};

export const AuditTemplateKey = {
    LegacyEvent: "audit.legacy.event",

    CardCreated: "audit.card.created",
    CardPatched: "audit.card.patched",
    CardMirrored: "audit.card.mirrored",

    LabelCreated: "audit.label.created",
    LabelDeleted: "audit.label.deleted",
    LabelPatched: "audit.label.patched",
    CardLabelAdded: "audit.card.label.added",
    CardLabelRemoved: "audit.card.label.removed",

    CardMemberAdded: "audit.card.member.added",
    CardMemberRemoved: "audit.card.member.removed",
    CardMemberAddedSelf: "audit.card.member.added.self",
    CardMemberRemovedSelf: "audit.card.member.removed.self",

    CardCommentCreated: "audit.card_comment.created",
    CardCommentDeleted: "audit.card_comment.deleted",
    CardCommentEdited: "audit.card_comment.edited",
    BoardPatched: "audit.board.patched",
    ListPatched: "audit.list.patched",

    ChecklistCreated: "audit.checklist.created",
    ChecklistPatched: "audit.checklist.patched",
    ChecklistDeleted: "audit.checklist.deleted",
    ChecklistMoved: "audit.checklist.moved",
    ChecklistEntryCreated: "audit.checklist.entry.created",
    ChecklistEntryPatched: "audit.checklist.entry.patched",
    ChecklistEntryDeleted: "audit.checklist.entry.deleted",
    ChecklistEntryMoved: "audit.checklist.entry.moved",
    ChecklistEntryMemberAdded: "audit.checklist.entry.member.added",
    ChecklistEntryMemberRemoved: "audit.checklist.entry.member.removed",
    ChecklistEntryMemberAddedSelf: "audit.checklist.entry.member.added.self",
    ChecklistEntryMemberRemovedSelf: "audit.checklist.entry.member.removed.self",

    WorkspaceBoardCreated: "audit.workspace.board.created",
    WorkspaceBoardClosed: "audit.workspace.board.closed",
    WorkspaceBoardRestored: "audit.workspace.board.restored",
    WorkspaceBoardPurged: "audit.workspace.board.purged",
    WorkspaceMemberRoleChanged: "audit.workspace.member.role.changed",
    WorkspaceMemberRoleChangedSelf: "audit.workspace.member.role.changed.self",
    WorkspaceMemberRemoved: "audit.workspace.member.removed",
    WorkspaceMemberRemovedSelf: "audit.workspace.member.removed.self",
    WorkspaceAccessClaimed: "audit.workspace.access.claimed",
    WorkspaceShareOfferCreated: "audit.workspace.shareoffer.created",
    BoardAccessClaimed: "audit.board.access.claimed",
    BoardListCreated: "audit.board.list.created",
    BoardListDetached: "audit.board.list.detached",
    BoardListRestored: "audit.board.list.restored",
    BoardListPurged: "audit.board.list.purged",
    BoardListMoved: "audit.board.list.moved",
    BoardListPatched: "audit.board.list.patched",
    BoardListMirrored: "audit.board.list.mirrored",
    BoardListMirroredTarget: "audit.board.list.mirrored.target",
    BoardListMirroredSource: "audit.board.list.mirrored.source",
    BoardListCardDetatched: "audit.board.listcard.detatched",
    BoardListCardMoved: "audit.board.listcard.moved",
    BoardListCardRestored: "audit.board.listcard.restored",
    BoardListCardPurged: "audit.board.listcard.purged",
    BoardListCardsBulkMoved: "audit.board.listcards.bulkmoved",
    BoardListCardsBulkDetatched: "audit.board.listcards.bulkdetatched",
} as const;

export type TemplateKeyTypes = typeof AuditTemplateKey[keyof typeof AuditTemplateKey]


export type AuditCursor = {
    ID: UUID;
    CreatedAt: string;
}

export type AuditPage = AuditPageInfo & {
    Audits: BoardAuditLogEvent[];

}

export type AuditPageInfo = {
    NextCursor?: AuditCursor | null;
    HasMore: boolean;

}

export type AuditRequest = {
    Cursor?: AuditCursor | null;
    Limit: number;
}

export type AuditLogPaginatedResponse = {
    Events: ApiAuditLogResponse
    NextCursor?: AuditCursor | null;
    HasMore: boolean;
}
