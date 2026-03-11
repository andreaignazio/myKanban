package ws

import (
	"GoGORM/internal/dto"
	"GoGORM/models"
	"time"

	"github.com/google/uuid"
)

type Event struct {
	Type          string
	BoardID       uuid.UUID
	Payload       any
	TS            time.Time
	ID            uuid.UUID
	Counter       int
	ActorUserID   *uuid.UUID
	CorrelationID *uuid.UUID
}

type WorkspaceEvent struct {
	Type          string
	WorkspaceID   uuid.UUID
	Payload       any
	TS            time.Time
	ID            uuid.UUID
	Counter       int
	ActorUserID   *uuid.UUID
	CorrelationID *uuid.UUID
}

type BoardPresencePayload struct {
	Count int
	Users []models.UserLite
}

type UserEvent struct {
	Type            string
	RecipientUserID uuid.UUID
	WorkspaceID     *uuid.UUID
	Payload         UserEventPayload
	TS              time.Time
	ID              uuid.UUID
	Counter         int
	ActorUserID     *uuid.UUID
	CorrelationID   *uuid.UUID
}

type UserEventType string

const (
	EventUserNotificationCreated                   UserEventType = "user.notification.created"
	EventUserNotificationRead                      UserEventType = "user.notification.read"
	EventUserNotificationReadAll                   UserEventType = "user.notification.read_all"
	EventInboxCardsInvalidated                     UserEventType = "inbox.cards.invalidated"
	EventInboxRootCardMoved                        UserEventType = "inbox.rootcard.moved"
	EventCardsUserMemberAdded                      UserEventType = "cards.user.member.added"
	EventCardsUserMemberRemoved                    UserEventType = "cards.user.member.removed"
	EventUserWorkspaceBoardRestored                UserEventType = "workspace.user.board.restored"
	EventUserWorkspaceMemberRoleChanged            UserEventType = "workspace.user.member.role.changed"
	EventUserWorkspaceMemberRemoved                UserEventType = "workspace.user.member.removed"
	EventUserBoardMemberRemoved                    UserEventType = "board.user.member.removed"
	EventUserWorkspaceShareOfferCreated            UserEventType = "workspace.user.shareoffer.created"
	EventUserWorkspaceShareInviteCreatedAdmin      UserEventType = "workspace.user.shareoffer.admin.invite.created"
	EventUserWorkspaceShareInviteCreatedNonAdmin   UserEventType = "workspace.user.shareoffer.nonadmin.invite.created"
	EventUserWorkspaceShareRequestCreatedAdmin     UserEventType = "workspace.user.shareoffer.admin.request.created"
	EventUserWorkspaceShareRequestCreatedNonAdmin  UserEventType = "workspace.user.shareoffer.nonadmin.request.created"
	EventUserWorkspaceShareRequestAcceptedAdmin    UserEventType = "workspace.user.shareoffer.admin.request.accepted"
	EventUserWorkspaceShareRequestAcceptedNonAdmin UserEventType = "workspace.user.shareoffer.nonadmin.request.accepted"
	EventUserWorkspaceShareRequestRejectedAdmin    UserEventType = "workspace.user.shareoffer.admin.request.rejected"
	EventUserWorkspaceShareRequestRejectedNonAdmin UserEventType = "workspace.user.shareoffer.nonadmin.request.rejected"
	EventUserWorkspaceShareRequestRevokedAdmin     UserEventType = "workspace.user.shareoffer.admin.request.revoked"
	EventUserWorkspaceShareRequestRevokedNonAdmin  UserEventType = "workspace.user.shareoffer.nonadmin.request.revoked"
	EventUserWorkspaceShareOfferInviteAccepted     UserEventType = "workspace.user.shareoffer.invite.accepted"
	EventUserWorkspaceShareOfferInviteRejected     UserEventType = "workspace.user.shareoffer.invite.rejected"
	EventUserWorkspaceShareOfferInviteRevoked      UserEventType = "workspace.user.shareoffer.invite.revoked"
	EventUserBoardShareOfferInviteRevoked          UserEventType = "workspace.user.shareoffer.invite.revoked"
	EventUserBoardShareInviteCreatedAdmin          UserEventType = "board.user.shareoffer.admin.invite.created"
	EventUserBoardShareInviteCreatedNonAdmin       UserEventType = "board.user.shareoffer.nonadmin.invite.created"
	EventUserBoardShareInviteAcceptedAdmin         UserEventType = "board.user.shareoffer.admin.invite.accepted"
	EventUserBoardShareInviteAcceptedNonAdmin      UserEventType = "board.user.shareoffer.nonadmin.invite.accepted"
	EventUserBoardShareInviteRejectedAdmin         UserEventType = "board.user.shareoffer.admin.invite.rejected"
	EventUserBoardShareInviteRejectedNonAdmin      UserEventType = "board.user.shareoffer.nonadmin.invite.rejected"
	EventUserBoardShareInviteRevokedAdmin          UserEventType = "board.user.shareoffer.admin.invite.revoked"
	EventUserBoardShareInviteRevokedNonAdmin       UserEventType = "board.user.shareoffer.nonadmin.invite.revoked"
	EventUserBoardShareRequestCreatedAdmin         UserEventType = "board.user.shareoffer.admin.request.created"
	EventUserBoardShareRequestCreatedNonAdmin      UserEventType = "board.user.shareoffer.nonadmin.request.created"
	EventUserBoardShareRequestAcceptedAdmin        UserEventType = "board.user.shareoffer.admin.request.accepted"
	EventUserBoardShareRequestAcceptedNonAdmin     UserEventType = "board.user.shareoffer.nonadmin.request.accepted"
	EventUserBoardShareRequestRejectedAdmin        UserEventType = "board.user.shareoffer.admin.request.rejected"
	EventUserBoardShareRequestRejectedNonAdmin     UserEventType = "board.user.shareoffer.nonadmin.request.rejected"
	EventUserBoardShareRequestRevokedAdmin         UserEventType = "board.user.shareoffer.admin.request.revoked"
	EventUserBoardShareRequestRevokedNonAdmin      UserEventType = "board.user.shareoffer.nonadmin.request.revoked"
)

type UserEventPayload struct {
	UserNotificationCreatedPayload           *UserNotificationCreatedPayload           `json:"UserNotificationCreatedPayload,omitempty"`
	UserNotificationReadPayload              *UserNotificationReadPayload              `json:"UserNotificationReadPayload,omitempty"`
	UserNotificationReadAllPayload           *UserNotificationReadAllPayload           `json:"UserNotificationReadAllPayload,omitempty"`
	InboxCardsInvalidatedPayload             *InboxCardsInvalidatedPayload             `json:"InboxCardsInvalidatedPayload,omitempty"`
	InboxRootCardMovedPayload                *InboxRootCardMovedPayload                `json:"InboxRootCardMovedPayload,omitempty"`
	CardsUserMemberAddedPayload              *CardsUserMemberAddedPayload              `json:"CardsUserMemberAddedPayload,omitempty"`
	CardsUserMemberRemovedPayload            *CardsUserMemberRemovedPayload            `json:"CardsUserMemberRemovedPayload,omitempty"`
	WorkspaceBoardRestoredPayload            *WorkspaceBoardRestoredPayload            `json:"WorkspaceBoardRestoredPayload,omitempty"`
	WorkspaceMembershipPayload               *WorkspaceMembershipPayload               `json:"WorkspaceMembershipPayload,omitempty"`
	WorkspaceShareOfferCreatedPayload        *WorkspaceShareOfferCreatedPayload        `json:"WorkspaceShareOfferCreatedPayload,omitempty"`
	WorkspaceShareOfferInviteAcceptedPayload *WorkspaceShareOfferInviteAcceptedPayload `json:"WorkspaceShareOfferInviteAcceptedPayload,omitempty"`
	WorkspaceShareOfferInviteRejectedPayload *WorkspaceShareOfferInviteRejectedPayload `json:"WorkspaceShareOfferInviteRejectedPayload,omitempty"`
	WorkspaceShareOfferInviteRevokedPayload  *WorkspaceShareOfferInviteRevokedPayload  `json:"WorkspaceShareOfferInviteRevokedPayload,omitempty"`
	BoardShareInviteCreatedPayload           *BoardShareInviteCreatedPayload           `json:"BoardShareInviteCreatedPayload,omitempty"`
	BoardShareInviteAcceptedPayload          *BoardShareInviteAcceptedPayload          `json:"BoardShareInviteAcceptedPayload,omitempty"`
	BoardShareInviteRejectedPayload          *BoardShareInviteRejectedPayload          `json:"BoardShareInviteRejectedPayload,omitempty"`
	BoardShareInviteRevokedPayload           *BoardShareInviteRevokedPayload           `json:"BoardShareInviteRevokedPayload,omitempty"`
	BoardShareRequestCreatedPayload          *BoardShareRequestCreatedPayload          `json:"BoardShareRequestCreatedPayload,omitempty"`
	BoardShareRequestAcceptedPayload         *BoardShareRequestAcceptedPayload         `json:"BoardShareRequestAcceptedPayload,omitempty"`
	BoardShareRequestRejectedPayload         *BoardShareRequestRejectedPayload         `json:"BoardShareRequestRejectedPayload,omitempty"`
	BoardShareRequestRevokedPayload          *BoardShareRequestRevokedPayload          `json:"BoardShareRequestRevokedPayload,omitempty"`
	BoardMembershipPayload                   *BoardMembershipPayload                   `json:"BoardMembershipPayload,omitempty"`
}

type CardsUserMemberAddedPayload struct {
	Cards          []dto.CardResponse          `json:"Cards"`
	Lists          []dto.ListResponse          `json:"Lists"`
	BoardLists     []dto.BoardListResponse     `json:"BoardLists"`
	ListCards      []dto.ListCardResponse      `json:"ListCards"`
	Boards         []dto.BoardResponse         `json:"Boards"`
	UserBoards     []dto.BoardResponse         `json:"UserBoards"`
	BoardLabels    []dto.BoardLabelResponse    `json:"BoardLabels"`
	CardLabelLinks []dto.CardLabelLinkResponse `json:"CardLabelLinks"`
	Workspaces     []dto.WorkspaceResponse     `json:"Workspaces"`
}

type WorkspaceShareOfferCreatedPayload struct {
	ShareOffer dto.ShareOfferResponse         `json:"ShareOffer"`
	Users      map[uuid.UUID]dto.UserResponse `json:"Users"`
	Workspace  dto.WorkspaceDetailsResponse   `json:"Workspace"`
}

type WorkspaceShareOfferInviteAcceptedPayload struct {
	ShareOffer    dto.ShareOfferDetailsResponse  `json:"ShareOffer"`
	Workspace     dto.WorkspaceDetailsResponse   `json:"Workspace"`
	UserWorkspace dto.UserWorkspaceResponse      `json:"UserWorkspace"`
	Users         map[uuid.UUID]dto.UserResponse `json:"Users"`
}

type WorkspaceShareOfferInviteRejectedPayload struct {
	ShareOffer  dto.ShareOfferDetailsResponse  `json:"ShareOffer"`
	WorkspaceID uuid.UUID                      `json:"WorkspaceID"`
	Users       map[uuid.UUID]dto.UserResponse `json:"Users"`
}

type WorkspaceShareOfferInviteRevokedPayload struct {
	ShareOffer  dto.ShareOfferDetailsResponse  `json:"ShareOffer"`
	WorkspaceID uuid.UUID                      `json:"WorkspaceID"`
	Users       map[uuid.UUID]dto.UserResponse `json:"Users"`
}

type BoardShareRequestCreatedPayload struct {
	ShareOffer dto.ShareOfferResponse         `json:"ShareOffer"`
	Users      map[uuid.UUID]dto.UserResponse `json:"Users"`
	Board      dto.BoardResponse              `json:"Board"`
	Workspace  dto.WorkspaceDetailsResponse   `json:"Workspace"`
}
type BoardShareInviteCreatedPayload struct {
	ShareOffer dto.ShareOfferResponse         `json:"ShareOffer"`
	Users      map[uuid.UUID]dto.UserResponse `json:"Users"`
	Board      dto.BoardResponse              `json:"Board"`
	Workspace  dto.WorkspaceDetailsResponse   `json:"Workspace"`
}
type BoardShareRequestAcceptedPayload struct {
	ShareOffer dto.ShareOfferDetailsResponse  `json:"ShareOffer"`
	Board      dto.BoardResponse              `json:"Board"`
	UserBoard  dto.UserBoardResponse          `json:"UserBoard"`
	Users      map[uuid.UUID]dto.UserResponse `json:"Users"`
	Workspace  dto.WorkspaceDetailsResponse   `json:"Workspace"`
}
type BoardShareInviteAcceptedPayload struct {
	ShareOffer dto.ShareOfferDetailsResponse  `json:"ShareOffer"`
	Board      dto.BoardResponse              `json:"Board"`
	UserBoard  dto.UserBoardResponse          `json:"UserBoard"`
	Users      map[uuid.UUID]dto.UserResponse `json:"Users"`
	Workspace  dto.WorkspaceDetailsResponse   `json:"Workspace"`
}
type BoardShareRequestRejectedPayload struct {
	ShareOffer dto.ShareOfferDetailsResponse  `json:"ShareOffer"`
	Board      dto.BoardResponse              `json:"Board"`
	Users      map[uuid.UUID]dto.UserResponse `json:"Users"`
	Workspace  dto.WorkspaceDetailsResponse   `json:"Workspace"`
}
type BoardShareInviteRejectedPayload struct {
	ShareOffer dto.ShareOfferDetailsResponse  `json:"ShareOffer"`
	Board      dto.BoardResponse              `json:"Board"`
	Users      map[uuid.UUID]dto.UserResponse `json:"Users"`
	Workspace  dto.WorkspaceDetailsResponse   `json:"Workspace"`
}

type BoardShareInviteRevokedPayload struct {
	ShareOffer dto.ShareOfferDetailsResponse  `json:"ShareOffer"`
	Board      dto.BoardResponse              `json:"Board"`
	Users      map[uuid.UUID]dto.UserResponse `json:"Users"`
	Workspace  dto.WorkspaceDetailsResponse   `json:"Workspace"`
}

type BoardShareRequestRevokedPayload struct {
	ShareOffer dto.ShareOfferDetailsResponse  `json:"ShareOffer"`
	Board      dto.BoardResponse              `json:"Board"`
	Users      map[uuid.UUID]dto.UserResponse `json:"Users"`
	Workspace  dto.WorkspaceDetailsResponse   `json:"Workspace"`
}

type CardsUserMemberRemovedPayload struct {
	CardID uuid.UUID `json:"CardID"`
}

type InboxRootCardMovedPayload struct {
	RootListCardID       uuid.UUID                                 `json:"RootListCardID"`
	CardID               uuid.UUID                                 `json:"CardID"`
	SourceBoardID        uuid.UUID                                 `json:"SourceBoardID"`
	TargetBoardID        uuid.UUID                                 `json:"TargetBoardID"`
	SourceListID         uuid.UUID                                 `json:"SourceListID"`
	TargetListID         uuid.UUID                                 `json:"TargetListID"`
	AffectedInboxCardIDs []uuid.UUID                               `json:"AffectedInboxCardIDs"`
	ExternalRootsByID    map[uuid.UUID]dto.ExternalRootRefResponse `json:"ExternalRootsByID"`
}

type InboxCardsInvalidatedPayload struct {
	AffectedInboxCardIDs   []uuid.UUID `json:"AffectedInboxCardIDs"`
	InvalidatedListCardIDs []uuid.UUID `json:"InvalidatedListCardIDs"`
}

type UserNotificationCreatedPayload struct {
	Notification dto.UserAuditNotificationResponse `json:"Notification"`
	UnreadCount  int                               `json:"UnreadCount"`
	Delta        int                               `json:"Delta"`
}

type UserNotificationReadPayload struct {
	NotificationIDs []uuid.UUID `json:"NotificationIDs"`
	UnreadCount     int         `json:"UnreadCount"`
}

type UserNotificationReadAllPayload struct {
	UnreadCount int `json:"UnreadCount"`
}

type WorkspaceBoardRestoredPayload struct {
	UserID    uuid.UUID             `json:"UserID"`
	Board     dto.BoardResponse     `json:"Board"`
	UserBoard dto.UserBoardResponse `json:"UserBoard"`
}

type WorkspaceMembershipPayload struct {
	UserID        uuid.UUID                 `json:"UserID"`
	Workspace     dto.WorkspaceResponse     `json:"Workspace"`
	UserWorkspace dto.UserWorkspaceResponse `json:"UserWorkspace"`
}

type BoardMembershipPayload struct {
	UserID    uuid.UUID             `json:"UserID"`
	Board     dto.BoardResponse     `json:"Board"`
	UserBoard dto.UserBoardResponse `json:"UserBoard"`
}
