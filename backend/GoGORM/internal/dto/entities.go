package dto

import (
	"GoGORM/internal/rbac"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type BoardResponse struct {
	ID              uuid.UUID      `json:"ID"`
	Name            string         `json:"Name"`
	CreatedByUserID uuid.UUID      `json:"CreatedByUserID"`
	WorkspaceID     uuid.UUID      `json:"WorkspaceID"`
	Visibility      string         `json:"Visibility"`
	PublicToken     string         `json:"PublicToken"`
	Props           datatypes.JSON `json:"Props,omitempty"`
	CreatedAt       time.Time      `json:"CreatedAt"`
	UpdatedAt       time.Time      `json:"UpdatedAt"`
	DeletedAt       *time.Time     `json:"DeletedAt,omitempty"`
}

type ListResponse struct {
	ID               uuid.UUID      `json:"ID"`
	Title            string         `json:"Title"`
	Props            datatypes.JSON `json:"Props,omitempty"`
	CreatedByUserID  uuid.UUID      `json:"CreatedByUserID"`
	CreatedInBoardID uuid.UUID      `json:"CreatedInBoardID"`
	CreatedAt        time.Time      `json:"CreatedAt"`
	UpdatedAt        time.Time      `json:"UpdatedAt"`
	DeletedAt        *time.Time     `json:"DeletedAt,omitempty"`
}

type CardResponse struct {
	ID              uuid.UUID      `json:"ID"`
	Title           string         `json:"Title"`
	Done            bool           `json:"Done"`
	Description     string         `json:"Description,omitempty"`
	StartDate       *time.Time     `json:"StartDate,omitempty"`
	EndDate         *time.Time     `json:"EndDate,omitempty"`
	Props           datatypes.JSON `json:"Props,omitempty"`
	CreatedByUserID uuid.UUID      `json:"CreatedByUserID"`
	CreatedInListID uuid.UUID      `json:"CreatedInListID"`
	CreatedAt       time.Time      `json:"CreatedAt"`
	UpdatedAt       time.Time      `json:"UpdatedAt"`
	DeletedAt       *time.Time     `json:"DeletedAt,omitempty"`
}

type UserBoardProps struct {
	Starred *bool `json:"Starred,omitempty"`
}

type UserBoardResponse struct {
	UserID    uuid.UUID      `json:"UserID"`
	BoardID   uuid.UUID      `json:"BoardID"`
	Role      string         `json:"Role"`
	Position  string         `json:"Position"`
	Props     UserBoardProps `json:"Props"`
	CreatedAt time.Time      `json:"CreatedAt"`
	UpdatedAt time.Time      `json:"UpdatedAt"`
	DeletedAt *time.Time     `json:"DeletedAt,omitempty"`
}

type BoardListResponse struct {
	ID         uuid.UUID                `json:"ID"`
	RootID     uuid.UUID                `json:"RootID"`
	BoardID    uuid.UUID                `json:"BoardID"`
	ListID     uuid.UUID                `json:"ListID"`
	Position   string                   `json:"Position"`
	AccessMode rbac.BoardListAccessMode `json:"AccessMode"`
	CreatedAt  time.Time                `json:"CreatedAt"`
	UpdatedAt  time.Time                `json:"UpdatedAt"`
	DeletedAt  *time.Time               `json:"DeletedAt,omitempty"`
}

type ListCardResponse struct {
	ID        uuid.UUID   `json:"ID"`
	CardID    uuid.UUID   `json:"CardID"`
	ListID    uuid.UUID   `json:"ListID"`
	RootID    uuid.UUID   `json:"RootID"`
	Mirrors   []uuid.UUID `json:"Mirrors,omitempty"`
	Position  string      `json:"Position"`
	CreatedAt time.Time   `json:"CreatedAt"`
	UpdatedAt time.Time   `json:"UpdatedAt"`
	DeletedAt *time.Time  `json:"DeletedAt,omitempty"`
}

type WorkspaceResponse struct {
	ID              uuid.UUID      `json:"ID"`
	Name            string         `json:"Name"`
	CreatedByUserID uuid.UUID      `json:"CreatedByUserID"`
	Visibility      string         `json:"Visibility"`
	PublicToken     string         `json:"PublicToken"`
	Props           datatypes.JSON `json:"Props,omitempty"`
	CreatedAt       time.Time      `json:"CreatedAt"`
	UpdatedAt       time.Time      `json:"UpdatedAt"`
	DeletedAt       *time.Time     `json:"DeletedAt,omitempty"`
}

type UserWorkspaceResponse struct {
	ID          uuid.UUID  `json:"ID"`
	WorkspaceID uuid.UUID  `json:"WorkspaceID"`
	UserID      uuid.UUID  `json:"UserID"`
	Position    string     `json:"Position"`
	Role        string     `json:"Role"`
	CreatedAt   time.Time  `json:"CreatedAt"`
	UpdatedAt   time.Time  `json:"UpdatedAt"`
	DeletedAt   *time.Time `json:"DeletedAt,omitempty"`
}

type SubscriptionResponse struct {
	WorkspaceID      uuid.UUID  `json:"WorkspaceID"`
	Plan             string     `json:"Plan"`
	Status           string     `json:"Status"`
	CurrentPeriodEnd time.Time  `json:"CurrentPeriodEnd"`
	CreatedAt        time.Time  `json:"CreatedAt"`
	UpdatedAt        time.Time  `json:"UpdatedAt"`
	DeletedAt        *time.Time `json:"DeletedAt,omitempty"`
}

type UserWorkspaceRowsResponse struct {
	Workspaces             []WorkspaceResponse
	UserWorkspaces         []UserWorkspaceResponse
	WorkspaceSubscriptions []SubscriptionResponse
}

type UserBoardRowsResponse struct {
	Boards             []BoardResponse     `json:"Boards"`
	UserBoards         []UserBoardResponse `json:"UserBoards"`
	CanModifyByBoardID map[uuid.UUID]bool  `json:"CanModifyByBoardID,omitempty"`
}

type ShareOfferResponse struct {
	ID              uuid.UUID  `json:"ID"`
	TargetType      string     `json:"TargetType"`
	TargetID        uuid.UUID  `json:"TargetID"`
	FromUserID      uuid.UUID  `json:"FromUserID"`
	ToUserID        *uuid.UUID `json:"ToUserID,omitempty"`
	OfferedRole     string     `json:"OfferedRole"`
	Message         string     `json:"Message,omitempty"`
	Status          string     `json:"Status"`
	Kind            string     `json:"Kind"`
	DecidedByUserID *uuid.UUID `json:"DecidedByUserID,omitempty"`
	DecidedAt       *time.Time `json:"DecidedAt,omitempty"`
	CreatedAt       time.Time  `json:"CreatedAt"`
	UpdatedAt       time.Time  `json:"UpdatedAt"`
	DeletedAt       *time.Time `json:"DeletedAt,omitempty"`
}

type ShareOfferEventResponse struct {
	ID         uuid.UUID      `json:"ID"`
	OfferID    uuid.UUID      `json:"OfferID"`
	TargetType string         `json:"TargetType"`
	TargetID   uuid.UUID      `json:"TargetID"`
	EventType  string         `json:"EventType"`
	Payload    datatypes.JSON `json:"Payload,omitempty"`
	CreatedAt  time.Time      `json:"CreatedAt"`
}

type PublicShareLinkResponse struct {
	ID              uuid.UUID  `json:"ID"`
	Token           string     `json:"Token"`
	TargetType      string     `json:"TargetType"`
	TargetID        uuid.UUID  `json:"TargetID"`
	Mode            string     `json:"Mode"`
	Role            string     `json:"Role"`
	ExpiresAt       *time.Time `json:"ExpiresAt,omitempty"`
	RevokedAt       *time.Time `json:"RevokedAt,omitempty"`
	CreatedByUserID uuid.UUID  `json:"CreatedByUserID"`
	CreatedAt       time.Time  `json:"CreatedAt"`
	UpdatedAt       time.Time  `json:"UpdatedAt"`
	DeletedAt       *time.Time `json:"DeletedAt,omitempty"`
}

type WorkspaceMembersResponse struct {
	User           []UserResponse          `json:"User"`
	UsersWorkspace []UserWorkspaceResponse `json:"UserWorkspace"`
}

type WorkspaceDetailsResponse struct {
	Workspace             WorkspaceResponse          `json:"Workspace"`
	WorkspaceMembers      []WorkspaceMembersResponse `json:"WorkspaceMembers"`
	WorkspaceSubscription SubscriptionResponse       `json:"WorkspaceSubscription"`
}

type DetailedUserResponse struct {
	User            UserResponse            `json:"User"`
	UserDerivedData UserDerivedDataResponse `json:"UserDerivedData"`
}

type UserDerivedDataResponse struct {
	Subscription string `json:"Subscription"`
}

type RespondToShareOfferResponse struct {
	ShareOffer ShareOfferResponse `json:"ShareOffer"`
	// Depending on the TargetType and OfferedRole, one of these might be populated
	UserBoard     *UserBoardResponse     `json:"UserBoard,omitempty"`
	UserWorkspace *UserWorkspaceResponse `json:"UserWorkspace,omitempty"`
}

type BoardOfferDetailResponse struct {
	Board        BoardResponse         `json:"Board"`
	BoardMembers []BoardMemberResponse `json:"BoardMembers"`
}

type BoardMemberResponse struct {
	User      UserResponse      `json:"User"`
	UserBoard UserBoardResponse `json:"UserBoardRelation"`
}

type BoardShareOffersResponse struct {
	ShareOffer ShareOfferResponse `json:"ShareOffer"`
	User       []UserResponse     `json:"User"`
}

type ShareOfferDetailsResponse struct {
	ShareOffer             ShareOfferResponse       `json:"ShareOffer"`
	TargetWorkspaceDetails WorkspaceDetailsResponse `json:"TargetWorkspaceDetails"`
}

type BoardAuditLogEventResponse struct {
	ID             uuid.UUID  `json:"ID"`
	BoardID        *uuid.UUID `json:"BoardID,omitempty"`
	WorkspaceID    *uuid.UUID `json:"WorkspaceID,omitempty"`
	ActorUserID    uuid.UUID  `json:"ActorUserID"`
	ActionType     string     `json:"ActionType"`
	MainEntityID   uuid.UUID  `json:"MainEntityID"`
	MainEntityType string     `json:"MainEntityType"`
	//Payload     AuditRenderPayloadResponse `json:"Payload"`
	Payload   datatypes.JSON `json:"Payload"` // Keep as raw JSON for now, frontend can parse it when needed
	CreatedAt time.Time      `json:"CreatedAt"`
}

type AuditEntitiesResponse struct {
	Workspaces       []WorkspaceResponse      `json:"Workspaces"`
	Boards           []BoardResponse          `json:"Boards"`
	Lists            []ListResponse           `json:"Lists"`
	Cards            []CardResponse           `json:"Cards"`
	Users            []UserLiteRespone        `json:"Users"`
	UserWorkspaces   []UserWorkspaceResponse  `json:"UserWorkspaces"`
	BoardLists       []BoardListResponse      `json:"BoardLists"`
	ListCards        []ListCardResponse       `json:"ListCards"`
	CardMembers      []CardMemberResponse     `json:"CardMembers"`
	CardLabelLinks   []CardLabelLinkResponse  `json:"CardLabelLinks"`
	EntryMembers     []EntryMemberResponse    `json:"EntryMembers"`
	ListWatches      []ListWatchResponse      `json:"ListWatches"`
	CardWatches      []CardWatchResponse      `json:"CardWatches"`
	BoardWatches     []BoardWatchResponse     `json:"BoardWatches"`
	Checklists       []ChecklistResponse      `json:"Checklists"`
	Entries          []EntryResponse          `json:"Entries"`
	ChecklistEntries []ChecklistEntryResponse `json:"ChecklistEntries"`
	CardChecklists   []CardChecklistResponse  `json:"CardChecklists"`
	UnresolvedTypes  []string                 `json:"UnresolvedTypes"`
}

type AuditLogResponse struct {
	Audits   []BoardAuditLogEventResponse `json:"Audits"`
	Entities AuditEntitiesResponse        `json:"Entities"`
}

type AuditRenderPayloadResponse struct {
	TemplateKey string                             `json:"TemplateKey"`
	Actor       UserLiteRespone                    `json:"Actor"`
	Params      map[string]interface{}             `json:"Params"`
	Links       map[string]AuditEntityLinkResponse `json:"Links"`
}

type AuditEntityLinkResponse struct {
	EntityType  string     `json:"EntityType"`
	EntityID    uuid.UUID  `json:"EntityID"`
	BoardID     *uuid.UUID `json:"BoardID,omitempty"`
	WorkspaceID *uuid.UUID `json:"WorkspaceID,omitempty"`
}

type CardWatchResponse struct {
	ID          uuid.UUID  `json:"ID"`
	UserID      uuid.UUID  `json:"UserID"`
	WorkspaceID uuid.UUID  `json:"WorkspaceID"`
	CardID      uuid.UUID  `json:"CardID"`
	BoardID     uuid.UUID  `json:"BoardID"`
	Position    string     `json:"Position"`
	Active      bool       `json:"Active"`
	CreatedAt   time.Time  `json:"CreatedAt"`
	UpdatedAt   time.Time  `json:"UpdatedAt"`
	DeletedAt   *time.Time `json:"DeletedAt,omitempty"`
}

type ListWatchResponse struct {
	ID          uuid.UUID  `json:"ID"`
	UserID      uuid.UUID  `json:"UserID"`
	WorkspaceID uuid.UUID  `json:"WorkspaceID"`
	ListID      uuid.UUID  `json:"ListID"`
	BoardID     uuid.UUID  `json:"BoardID"`
	Position    string     `json:"Position"`
	Active      bool       `json:"Active"`
	CreatedAt   time.Time  `json:"CreatedAt"`
	UpdatedAt   time.Time  `json:"UpdatedAt"`
	DeletedAt   *time.Time `json:"DeletedAt,omitempty"`
}

type BoardWatchResponse struct {
	ID          uuid.UUID  `json:"ID"`
	UserID      uuid.UUID  `json:"UserID"`
	WorkspaceID uuid.UUID  `json:"WorkspaceID"`
	BoardID     uuid.UUID  `json:"BoardID"`
	Position    string     `json:"Position"`
	Active      bool       `json:"Active"`
	CreatedAt   time.Time  `json:"CreatedAt"`
	UpdatedAt   time.Time  `json:"UpdatedAt"`
	DeletedAt   *time.Time `json:"DeletedAt,omitempty"`
}

type UserAuditNotificationResponse struct {
	BoardAuditLogEventResponse `json:",inline"`
	NotificationID             uuid.UUID  `json:"NotificationID"`
	Read                       bool       `json:"Read"`
	NotificationCreatedAt      time.Time  `json:"NotificationCreatedAt"`
	NotificationUpdatedAt      time.Time  `json:"NotificationUpdatedAt"`
	NotificationDeletedAt      *time.Time `json:"NotificationDeletedAt,omitempty"`
}

type BoardLabelResponse struct {
	ID              uuid.UUID  `json:"ID"`
	BoardID         uuid.UUID  `json:"BoardID"`
	Title           *string    `json:"Title"`
	Color           *string    `json:"Color"`
	CreatedByUserID uuid.UUID  `json:"CreatedByUserID"`
	CreatedAt       time.Time  `json:"CreatedAt"`
	UpdatedAt       time.Time  `json:"UpdatedAt"`
	DeletedAt       *time.Time `json:"DeletedAt,omitempty"`
}

type CardLabelLinkResponse struct {
	ID           uuid.UUID  `json:"ID"`
	CardID       uuid.UUID  `json:"CardID"`
	BoardID      uuid.UUID  `json:"BoardID"`
	BoardLabelID uuid.UUID  `json:"BoardLabelID"`
	CreatedAt    time.Time  `json:"CreatedAt"`
	UpdatedAt    time.Time  `json:"UpdatedAt"`
	DeletedAt    *time.Time `json:"DeletedAt,omitempty"`
}

type CardMemberResponse struct {
	ID              uuid.UUID  `json:"ID"`
	CardID          uuid.UUID  `json:"CardID"`
	UserID          uuid.UUID  `json:"UserID"`
	CreatedByUserID uuid.UUID  `json:"CreatedByUserID"`
	CreatedAt       time.Time  `json:"CreatedAt"`
	UpdatedAt       time.Time  `json:"UpdatedAt"`
	DeletedAt       *time.Time `json:"DeletedAt,omitempty"`
}

type ChecklistResponse struct {
	ID              uuid.UUID  `json:"ID"`
	Title           string     `json:"Title"`
	CreatedByUserID uuid.UUID  `json:"CreatedByUserID"`
	CreatedInCardID uuid.UUID  `json:"CreatedInCardID"`
	CreatedAt       time.Time  `json:"CreatedAt"`
	UpdatedAt       time.Time  `json:"UpdatedAt"`
	DeletedAt       *time.Time `json:"DeletedAt,omitempty"`
}

type EntryResponse struct {
	ID              uuid.UUID  `json:"ID"`
	Title           string     `json:"Title"`
	Done            bool       `json:"Done"`
	DueDate         *time.Time `json:"DueDate,omitempty"`
	CreatedByUserID uuid.UUID  `json:"CreatedByUserID"`
	CreatedAt       time.Time  `json:"CreatedAt"`
	UpdatedAt       time.Time  `json:"UpdatedAt"`
	DeletedAt       *time.Time `json:"DeletedAt,omitempty"`
}

type ChecklistEntryResponse struct {
	ID          uuid.UUID  `json:"ID"`
	ChecklistID uuid.UUID  `json:"ChecklistID"`
	EntryID     uuid.UUID  `json:"EntryID"`
	Position    string     `json:"Position"`
	CreatedAt   time.Time  `json:"CreatedAt"`
	UpdatedAt   time.Time  `json:"UpdatedAt"`
	DeletedAt   *time.Time `json:"DeletedAt,omitempty"`
}

type CardChecklistResponse struct {
	ID          uuid.UUID  `json:"ID"`
	CardID      uuid.UUID  `json:"CardID"`
	ChecklistID uuid.UUID  `json:"ChecklistID"`
	Position    string     `json:"Position"`
	CreatedAt   time.Time  `json:"CreatedAt"`
	UpdatedAt   time.Time  `json:"UpdatedAt"`
	DeletedAt   *time.Time `json:"DeletedAt,omitempty"`
}

type EntryMemberResponse struct {
	ID        uuid.UUID  `json:"ID"`
	EntryID   uuid.UUID  `json:"EntryID"`
	UserID    uuid.UUID  `json:"UserID"`
	CreatedAt time.Time  `json:"CreatedAt"`
	UpdatedAt time.Time  `json:"UpdatedAt"`
	DeletedAt *time.Time `json:"DeletedAt,omitempty"`
}

type CardCommentResponse struct {
	ID              uuid.UUID                `json:"ID"`
	CardID          uuid.UUID                `json:"CardID"`
	CommentMentions []CommentMentionResponse `json:"CommentMentions,omitempty"`
	Content         string                   `json:"Content"`
	CreatedByUserID uuid.UUID                `json:"CreatedByUserID"`
	CreatedAt       time.Time                `json:"CreatedAt"`
	UpdatedAt       time.Time                `json:"UpdatedAt"`
	DeletedAt       *time.Time               `json:"DeletedAt,omitempty"`
}

type CommentMentionResponse struct {
	CardCommentID   uuid.UUID  `json:"CardCommentID"`
	MentionedUserID uuid.UUID  `json:"MentionedUserID"`
	CreatedByUserID uuid.UUID  `json:"CreatedByUserID"`
	CreatedAt       time.Time  `json:"CreatedAt"`
	UpdatedAt       time.Time  `json:"UpdatedAt"`
	DeletedAt       *time.Time `json:"DeletedAt,omitempty"`
}

type InboxCardResponse struct {
	ID             uuid.UUID   `json:"ID"`
	UserID         uuid.UUID   `json:"UserID"`
	CardID         uuid.UUID   `json:"CardID"`
	Pos            string      `json:"Pos"`
	Mirrors        []uuid.UUID `json:"Mirrors,omitempty"`
	SourceBoardID  *uuid.UUID  `json:"SourceBoardID,omitempty"`
	RootListCardID *uuid.UUID  `json:"RootListCardID,omitempty"`
	CreatedAt      time.Time   `json:"CreatedAt"`
	UpdatedAt      time.Time   `json:"UpdatedAt"`
	DeletedAt      *time.Time  `json:"DeletedAt,omitempty"`
}
