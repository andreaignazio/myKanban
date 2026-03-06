import type { ApiAuditLogEvent } from "./audittypes";
import type { ListCard } from "./boardDetailStore";
import type { ShareOffer, ShareOfferDetailsResponse, WorkspaceDetailResponse } from "./shareOfferTypes";
import type { User, UserLite, UserProps } from "./usertypes";

export type { User, UserLite } from "./usertypes";

export type Workspace = {
    ID: string;
    Name: string;
    CreatedByUserID: string;
    Visibility?: string;
    PublicToken?: string;
    Props?: WorkspaceProps;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
};

export type WorkspaceCoverProps = {
    Type?: string;
    ImageUrl?: string | null;
    Color?: string;
};

export type WorkspaceProps = {
    IconID?: string;
    IconBg?: string;
    IconBorderColor?: string;
    FooterColor?: string;
    Cover?: WorkspaceCoverProps;
    Description?: string;
} & Record<string, unknown>;

export type PatchWorkspacePropsRequest = {
    Name?: string;
    Visibility?: "private" | "workspace" | "public";
    Props: WorkspaceProps;
};

export type UserWorkspace = {
    ID: string;
    WorkspaceID: string;
    UserID: string;
    Position: string;
    Role: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
};

export type SubscriptionPlan = "free" | "premium" | "pro";

export type WorkspaceSubscription = {
    WorkspaceID: string;
    Plan: SubscriptionPlan;
    Status: string;
    CurrentPeriodEnd: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
};

export type Board = {
    ID: string;
    Name: string;
    CreatedByUserID: string;
    WorkspaceID: string;
    Visibility: string;
    PublicToken: string;
    Props?: BoardProps;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
};

export type BoardProps = {
    Description?: string;
    Background?: BoardBackgroundProps;
};

export type BoardBackgroundProps = {
    Type: "image" | "color";
    Image?: BoardBackgroundImageProps;
    Color?: BoardBackgroundColorProps;
};

export type BoardBackgroundImageProps = {
    Url?: string;
};

export type BoardBackgroundColorProps = {
    Token?: string;
};

export type UserBoardProps = {
    Starred?: boolean;
};

export type UserBoard = {
    UserID: string;
    BoardID: string;
    Role: string;
    Position: string;
    Props?: UserBoardProps;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
};

export type PatchUserBoardPropsRequest = {
    Props: UserBoardProps;
};

export type PublicShareLink = {
    ID: string;
    Token: string;
    TargetType: "board" | "workspace";
    TargetID: string;
    Mode: ShareLinkAccessMode
    Role: string;
    ExpiresAt?: string | null;
    RevokedAt?: string | null;
    CreatedByUserID: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
};

export type ShareLinkAccessMode = "autojoin" | "sendrequest"

export type ClaimShareLinkResponse = {
    PublicShareLink: PublicShareLink;
    UserBoard?: UserBoard | null;
    UserWorkspace?: UserWorkspace | null;
};

export type CreateShareLinkRequest = {
    TargetType: "board" | "workspace";
    TargetID: string;
    Role: "viewer" | "member" | "admin" | "owner";
    Mode?: "autojoin" | "sendrequest";
    ExpiresAt?: string | null;
};

export type ShareLinkPreviewResponse = {
    PublicShareLink: PublicShareLink;
    TargetName?: string | null;
};

export type ShareLinkTargetLite = {
    EntityType: "board" | "workspace";
    Name: string;
    Description?: string;
};

export type ShareLinkPublicPreviewResponse = {
    PublicShareLink: PublicShareLink;
    Target: ShareLinkTargetLite;
};

export type ShareLinkTokenEntityData = {
    EntityID: string;
    EntityType: "board" | "workspace";
    Name: string;
    Description?: string;
};

export type ShareLinkAuthenticatedResponse = {
    PublicShareLink: PublicShareLink;
    EntityType: "board" | "workspace";
    Board?: Board;
    Workspace?: Workspace;
    Users: User[];
    UserBoards?: UserBoard[];
    UserWorkspaces?: UserWorkspace[];
};

export type BoardWithRelation = {
    Board: Board;
    Relation: UserBoard;
};

export type List = {
    ID: string;
    Title: string;
    Props?: Record<string, unknown>;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
};

export type Card = {
    ID: string;
    Title: string;
    Done: boolean;
    Description?: string | unknown;
    StartDate?: string | null;
    EndDate?: string | null;
    Props?: {
        Props?: CardProps;
    }
    CreatedByUserID?: string;
    CreatedInListID?: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
};

export type ListCardRelation = {
    ID: string;
    CardID: string;
    ListID: string;
    Position: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
    RootID?: string;
};

export type BoardList = {
    ID: string;
    RootID: string;
    BoardID: string;
    ListID: string;
    Position: string;
    AccessMode?: BoardListAccessMode;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
};

export type BoardListAccessMode = "readonly" | "editable";

export type PatchListAccessModeRequest = {
    AccessMode: BoardListAccessMode;
};

export type BoardListMirrorItem = {
    Board: Board;
    BoardList: BoardList;
    IsRoot: boolean;
};

export type BoardListMirrorsResponse = {
    RootBoardListID: string;
    CurrentBoardListID: string;
    Items: BoardListMirrorItem[];
};

export type ListCardMovedPayload = {
    ListCardPatch: ListCardRelation;
    FromListCards: ListCardRelation[];
    ToListCards: ListCardRelation[];
    Cards?: Record<string, Card>;
    FromListID: string;
    ToListID: string;
    SourceBoardID?: string;
    TargetBoardID?: string;
    ListCardIdsByListID?: Record<string, string[]>;
};

export type PatchCardPropsRequest = {
    Props: CardProps;
};

export type PatchMePropsRequest = {
    Props: Partial<UserProps> & Record<string, unknown>;
};

export type PatchMeDetailRequest = {
    Name?: string;
    Username?: string;
    Email?: string;
};

export type CardProps = {
    Display?: CardDisplayProps;
    Layout?: string;
}

export type CardDisplayProps = {
    Size?: "small" | "large";
    Cover?: CardCoverProps | null;
}

export type CardCoverProps = {
    Type: "color" | "image";
    Color?: string;
    URL?: string;
}



export type BoardEvent = {
    Type: string;
    BoardID: string;
    Payload: any;
    ID: string;
    TS: string;
    Counter: number;
    ActorUserID: string;
    CorrelationID: string;
}

export type WorkspaceEvent = {
    Type: string;
    WorkspaceID: string;
    Payload: any;
    ID: string;
    TS: string;
    Counter: number;
    ActorUserID: string;
    CorrelationID: string;
}

export type ListWatch = {
    ID: string;
    UserID: string;
    ListID: string;
    BoardID: string;
    WorkspaceID: string;
    Position: string;
    Active: boolean;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
}

export type CardWatch = {
    ID: string;
    UserID: string;
    CardID: string;
    BoardID: string;
    WorkspaceID: string;
    Position: string;
    Active: boolean;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
}

export type BoardWatch = {
    ID: string;
    UserID: string;
    BoardID: string;
    WorkspaceID: string;
    Position: string;
    Active: boolean;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
}

export type UserWatchResponse = {
    CardWatches: CardWatch[];
    Cards: Card[];
    ListWatches: ListWatch[];
    Lists: List[];
    BoardWatches: BoardWatch[];
    Boards: Board[];
}

export type UserWatchPatchResponse = {
    EntityType: "card" | "list" | "board";
    BoardWatch?: BoardWatch;
    ListWatch?: ListWatch;
    CardWatch?: CardWatch;
}

export type UserAuditNotification = ApiAuditLogEvent & {
    NotificationID: string;
    Read: boolean;
    NotificationCreatedAt: string;
    NotificationUpdatedAt: string;
    NotificationDeletedAt: string | null;
}



export type UserNotificationResponse = {
    UnreadCount: number;
    UserNotifications: UserAuditNotification[]
    Boards: Board[];
    Lists: List[];
    Cards: Card[];
}

export type BoardMember = {
    User: User;
    Relation: UserBoard;
    UserWorkspace?: UserWorkspace;
}

export type MarkNotificationsRequest = {
    NotificationIDs: string[];
}

export type UserEvent = {
    Type: string;
    RecipientUserID: string;
    WorkspaceID: string;
    Payload: UserEventPayload;
    TS: string;
    ID: string;
    Counter: number;
    ActorUserID: string;
    CorrelationID: string;

}

export type UserEventPayload = {
    UserNotificationCreatedPayload?: UserNotificationCreatedPayload;
    UserNotificationReadPayload?: UserNotificationReadPayload;
    UserNotificationReadAllPayload?: UserNotificationReadAllPayload;
    InboxRootCardMovedPayload?: InboxRootCardMovedPayload;
    CardsUserMemberAddedPayload?: CardsUserMemberAddedPayload;
    CardsUserMemberRemovedPayload?: CardsUserMemberRemovedPayload;
    WorkspaceBoardRestoredPayload?: UserWorkspaceBoardRestoredPayload;
    WorkspaceShareOfferCreatedPayload?: WorkspaceShareOfferCreatedPayload;
    WorkspaceShareOfferInviteAcceptedPayload?: WorkspaceShareOfferInviteAcceptedPayload;
    WorkspaceShareOfferInviteRejectedPayload?: WorkspaceShareOfferInviteRejectedPayload;
    WorkspaceShareOfferInviteRevokedPayload?: WorkspaceShareOfferInviteRevokedPayload;
    BoardShareInviteCreatedPayload?: BoardShareInviteCreatedPayload;
    BoardShareInviteAcceptedPayload?: BoardShareInviteAcceptedPayload;
    BoardShareInviteRejectedPayload?: BoardShareInviteRejectedPayload;
    BoardShareInviteRevokedPayload?: BoardShareInviteRevokedPayload;
    BoardShareRequestCreatedPayload?: BoardShareRequestCreatedPayload;
    BoardShareRequestAcceptedPayload?: BoardShareRequestAcceptedPayload;
    BoardShareRequestRejectedPayload?: BoardShareRequestRejectedPayload;
    BoardShareRequestRevokedPayload?: BoardShareRequestRevokedPayload;
    WorkspaceMembershipPayload?: WorkspaceMembershipPayload;
    BoardMembershipPayload?: BoardMembershipPayload;
}

export type WorkspaceMembershipPayload = {
    UserID: string;
    Workspace: Workspace;
    UserWorkspace: UserWorkspace;
}

export type BoardMembershipPayload = {
    UserID: string;
    Board: Board;
    UserBoard: UserBoard;
}

export type CardsUserMemberAddedPayload = UserMemberCardsResponse;

export type CardsUserMemberRemovedPayload = {
    CardID: string;
}

export type UserNotificationCreatedPayload = {
    Notification: UserAuditNotification;
    UnreadCount: number;
    Delta: number; // +1
}

export type UserNotificationReadPayload = {
    NotificationIDs: string[];
    UnreadCount: number;
}

export type UserNotificationReadAllPayload = {
    UnreadCount: number;
}

export type PatchCardDetailsRequest = {
    Title?: string
    Done?: boolean
    Description?: string
    StartDate?: string | null
    EndDate?: string | null
}

export type BoardLabel = {
    ID: string;
    BoardID: string;
    Title: string;
    Color: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;

}

export type CardLabelLink = {
    ID: string;
    CardID: string;
    BoardID: string;
    BoardLabelID: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
}

export type CreateBoardLabelRequest = {
    Title: string;
    Color: string;
}

export type PatchBoardLabelRequest = {
    Title?: string;
    Color?: string;
}





export type UnsplashPhoto = {
    ID: string;
    ThumbURL: string;
    RegularURL: string;
    AuthorName: string;
    AuthorUsername: string;
    AttributionURL: string;
    DownloadLocation: string;
}

export type UnsplashSearchResponse = {
    Query: string;
    Page: number;
    PerPage: number;
    Total: number;
    TotalPages: number;
    Results: UnsplashPhoto[];
}

export type CardMember = {
    ID: string;
    CardID: string;
    UserID: string;
    CreatedByUserID: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
}

export type AddCardMemberRequest = {
    MemberID: string;
}

export type CardMemberResponse = {
    CardMember: CardMember;
    User: User;
}

export type UserMemberCardsResponse = {
    Cards: Card[];
    Lists: List[];
    BoardLists: BoardList[];
    ListCards: ListCardRelation[];
    Boards: Board[];
    UserBoards: Board[];
    BoardLabels: BoardLabel[];
    CardLabelLinks: CardLabelLink[];
    Workspaces: Workspace[];
    InboxCards: Card[];
}

export type Checklist = {
    ID: string;
    Title: string;
    CreatedByUserID: string;
    CreatedInCardID: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
}

export type Entry = {
    ID: string;
    Title: string;
    Done: boolean;
    DueDate?: string | null;
    CreatedByUserID: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
}

export type ChecklistEntry = {
    ID: string;
    ChecklistID: string;
    EntryID: string;
    Position: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
}

export type CardChecklist = {
    ID: string;
    CardID: string;
    ChecklistID: string;
    Position: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
}

export type EntryMember = {
    ID: string;
    EntryID: string;
    UserID: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
}

export type CreateChecklistRequest = {
    Title: string;
    InsertAt?: "end" | "start" | null;
    BeforeID?: string | null;
}

export type CloneChecklistRequest = {
    NewTitle: string;
    ChecklistIDSource: string;
}

export type PatchChecklistRequest = {
    Title?: string;
}

export type MoveChecklistRequest = {
    InsertAt?: "start" | "end" | null;
    BeforeID?: string | null;
}

export type CreateChecklistEntryRequest = {
    Title: string;
    InsertAt?: "start" | "end" | null;
    BeforeID?: string | null;
}

export type PatchChecklistEntryRequest = {
    Title?: string;
    Done?: boolean;
    DueDate?: string | null;
}

export type MoveChecklistEntryRequest = {
    InsertAt?: "start" | "end" | null;
    BeforeID?: string | null;
}

export type AddEntryMemberRequest = {
    MemberID: string;
}

export type ChecklistRowResponse = {
    Checklist?: Checklist;
    CardChecklist?: CardChecklist;
    Entries?: ChecklistEntry[];
}

export type ChecklistEntryRowResponse = {
    Entry?: Entry;
    ChecklistEntry?: ChecklistEntry;
}

export type CloneChecklistResponse = {
    CardID: string;
    CardChecklist?: CardChecklist;
    Checklist?: Checklist;
    Entries?: Entry[];
    ChecklistEntries?: ChecklistEntry[];
}

export type CrossMoveChecklistEntryRequest = {
    TargetChecklistID: string;
    TargetBeforeID?: string | null;
    InsertAt?: "start" | "end" | null;
}

export type ConvertChecklistEntryRequest = {
    EntryID: string;
    CardID: string;
    ListID: string;
    BoardID: string;
}

export type ConvertChecklistEntryResponse = {
    Card?: Card;
    ListCard?: ListCardRelation;
    ListCardIDs?: string[];
    ListID?: string;
    ChecklistID?: string;
    EntryIDs?: string[];
    DeletedEntryID?: string;
}

export type CardComment = {
    ID: string;
    CardID: string;
    CommentMentions: CommentMention[]
    Content: string;
    CreatedByUserID: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
}

export type CommentMention = {
    CardCommentID: string;
    MentionedUserID: string;
    CreatedByUserID: string;
    CreatedAt: string;
    UpdatedAt: string;
    DeletedAt: string | null;
}

export type CardCommentResponse = {
    CardComments: CardComment[];
    Users: UserLite[];
}

export type CreateCardCommentRequest = {
    Content: string;
    MentionedUserIDs?: string[];
}

export type PatchCardCommentRequest = {
    Content?: string;
    MentionedUserIDs?: string[];
}

export type MoveCardToBoardRequest = {
    SourceListID: string;
    TargetBoardID: string;
    TargetListID: string;
    BeforeID?: string | null;
    InsertAt?: "start" | "end" | null;
}

export type MirrorCardToListRequest = {
    TargetListID: string;
    TargetBoardID: string;
    BeforeID?: string | null;
    InsertAt?: "start" | "end" | null;
}

export type CopyCardToListRequest = MirrorCardToListRequest & {
    Title?: string;
    KeepComments: boolean;
    KeepMembers: boolean;
    KeepLabels: boolean;
    KeepChecklists: boolean;
}

export type BulkCopyListRef = {
    ListID: string;
    Title?: string | null;
}

export type BulkCopyListsRequest = {
    ListIDs?: string[];
    Lists?: BulkCopyListRef[];
    AfterID?: string | null;
    InsertAt?: "start" | "end" | null;
    KeepMembers?: boolean;
}

export type BulkCopiedListItem = {
    SourceListID: string;
    TargetListID: string;
    CopiedCards: number;
}

export type BulkCopyListsResponse = {
    Items: BulkCopiedListItem[];
    TotalCopiedLists: number;
    TotalCopiedCards: number;
}

export type MoveBoardListRequest = {
    TargetBoardID?: string | null;
    BeforeID?: string | null;
    AfterID?: string | null;
    InsertAt?: "start" | "end" | null;
}

export type MoveBoardListResponse = {
    SourceBoardList?: BoardList | null;
    TargetBoardList?: BoardList | null;
}

export type MirrorBoardListRequest = {
    TargetBoardID: string;
    BeforeID?: string | null;
    InsertAt?: "start" | "end" | null;
}

export type MirrorBoardListResponse = {
    List: List;
    BoardList: BoardList;
}

export type BulkMoveListCardsInBoardRequest = {
    ListCardIDs: string[];
    TargetListID: string;
    AfterID?: string | null;
    BeforeID?: string | null;
    InsertAt?: "start" | "end" | null;
}

export type BulkMoveListCardsInBoardResponse = {
    MovedListCards: ListCard[];
}

export type BulkDetatchListCardsRequest = {
    ListID: string;
}

export type BulkDetatchListCardsResponse = {
    DetatchedListCards: ListCard[];
}

export type InboxCard = {
    ID: string
    UserID: string
    CardID: string
    Position: string
    SourceBoardID: string | null
    RootListCardID: string
    Mirrors: string[]
    CreatedAt: string
    UpdatedAt: string
    DeletedAt: string | null
}

export type InboxCardResponse = {
    Cards: Record<string, Card>;
    InboxCards: InboxCard[];
}

export type MirrorCardToInboxRequest = {
    BeforeID?: string | null;
    InsertAt?: "start" | "end" | null;
}

export type CreateInboxCardRequest = MirrorCardToInboxRequest & {
    Title: string;
}

export type UserInboxCardResponse = {
    Cards: Record<string, Card>;
    InboxCards: InboxCard[];
}

export type CrossBoardMoveBoardPayload = {
    RootListCardID: string
    MovedListCardID: string
    CardID: string
    Cards?: Record<string, Card>
    Boards?: Record<string, Board>
    SourceBoardID: string
    TargetBoardID: string
    FromListID: string
    ToListID: string
    ListCardPatch: ListCard
    FromListCards: ListCard[]
    ToListCards: ListCard[]
    ListCardIdsByListID: Record<string, string[]>
}

export type InboxRootCardMovedPayload = {
    RootListCardID: string
    CardID: string
    SourceBoardID: string
    TargetBoardID: string
    SourceListID: string
    TargetListID: string
    AffectedInboxCardIDs: string[]
}

export type CreateBoardRequest = {
    Name: string;
    Visibility: "private" | "public" | "workspace";
    AfterID?: string | null;
    InsertAt?: "start" | "end" | null;
    Props?: BoardProps;
}

export type UserWorkspaceBoardRestoredPayload = {
    UserID: string;
    Board: Board;
    UserBoard: UserBoard;
}

export type ChangeWorkspaceMemberRoleRequest = {
    Role: string;
}


export type WorkspaceShareOfferCreatedPayload = {
    ShareOffer: ShareOffer;
    Users: Record<string, User>;
    Workspace?: WorkspaceDetailResponse;
    Workspaces?: WorkspaceDetailResponse[];
}

export type WorkspaceShareOfferInviteAcceptedPayload = {
    ShareOffer: ShareOfferDetailsResponse;
    Users: Record<string, User>;
    Workspace: WorkspaceDetailResponse;
    UserWorkspace: UserWorkspace;
}

export type WorkspaceShareOfferInviteRejectedPayload = {
    ShareOffer: ShareOfferDetailsResponse;
    WorkspaceID: string;
    Users: Record<string, User>;
}

export type WorkspaceShareOfferInviteRevokedPayload = {
    ShareOffer: ShareOfferDetailsResponse;
    WorkspaceID: string;
    Users: Record<string, User>;
}

export type BoardShareRequestCreatedPayload = {
    ShareOffer: ShareOffer
    Users: Record<string, User>;
    Board: Board
    Workspace: WorkspaceDetailResponse
}

export type BoardShareInviteCreatedPayload = {
    ShareOffer: ShareOffer
    Users: Record<string, User>;
    Board: Board
    Workspace: WorkspaceDetailResponse
}

export type BoardShareRequestAcceptedPayload = {
    ShareOffer: ShareOfferDetailsResponse
    Board: Board
    UserBoard: UserBoard
    UserWorkspace?: UserWorkspace
    Users: Record<string, User>;
    Workspace: WorkspaceDetailResponse
}

export type BoardShareInviteAcceptedPayload = {
    ShareOffer: ShareOfferDetailsResponse
    Board: Board
    UserBoard: UserBoard
    Users: Record<string, User>;
    Workspace: WorkspaceDetailResponse
}

export type BoardShareRequestRejectedPayload = {
    ShareOffer: ShareOfferDetailsResponse
    Board: Board
    Users: Record<string, User>;
    Workspace: WorkspaceDetailResponse
}

export type BoardShareInviteRejectedPayload = {
    ShareOffer: ShareOfferDetailsResponse
    Board: Board
    Users: Record<string, User>;
    Workspace: WorkspaceDetailResponse
}

export type BoardShareInviteRevokedPayload = {
    ShareOffer: ShareOfferDetailsResponse
    Board: Board
    Users: Record<string, User>;
    Workspace: WorkspaceDetailResponse
}

export type BoardShareRequestRevokedPayload = {
    ShareOffer: ShareOfferDetailsResponse
    Board: Board
    Users: Record<string, User>;
    Workspace: WorkspaceDetailResponse
}

export type CardMirrorsResponse = {
    MirrorDataByListCardID: Record<string, MirrorCardData[]>
    Boards: Board[]
    UserBoards: UserBoard[]
    Lists: List[]
    BoardLists: BoardList[]
    ListCards: ListCard[]
}

export type MirrorCardData = {
    UserID: string
    BoardID: string
    ListID: string
    BoardListID: string
    ListCardID: string
    CardID: string
}
