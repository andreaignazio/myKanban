package EventRegistry

import (
	"GoGORM/internal/dto"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"time"

	"github.com/google/uuid"
)

type TargetRef struct {
	EntityType  string
	EntityID    uuid.UUID
	BoardID     *uuid.UUID
	WorkspaceID *uuid.UUID
}

type MainEntityRef struct {
	EntityType string
	EntityID   uuid.UUID
}

type DomainEvent struct {
	Type             DomainEventType
	UserEventType    *ws.UserEventType
	WorkspaceID      *uuid.UUID
	BoardID          *uuid.UUID
	ActorUserID      *uuid.UUID
	CorrelationID    *uuid.UUID
	Payload          EventPayloadEnvelope
	Targets          []TargetRef
	MentionedUserIDs []uuid.UUID
	OccurredAt       time.Time
}

type CrossBoardMoveEmitRequest struct {
	WorkspaceID   *uuid.UUID
	ActorUserID   *uuid.UUID
	CorrelationID *uuid.UUID
	OccurredAt    time.Time

	RootListCardID  uuid.UUID
	MovedListCardID uuid.UUID
	CardID          uuid.UUID
	CardPatch       dto.CardResponse

	SourceBoardID uuid.UUID
	TargetBoardID uuid.UUID
	SourceListID  uuid.UUID
	TargetListID  uuid.UUID

	ListCardPatch dto.ListCardResponse
	FromListCards []dto.ListCardResponse
	ToListCards   []dto.ListCardResponse
}

type CrossBoardMoveBoardPayload struct {
	RootListCardID      string                                    `json:"RootListCardID"`
	MovedListCardID     string                                    `json:"MovedListCardID"`
	CardID              string                                    `json:"CardID"`
	Cards               map[uuid.UUID]dto.CardResponse            `json:"Cards"`
	SourceBoardID       string                                    `json:"SourceBoardID"`
	TargetBoardID       string                                    `json:"TargetBoardID"`
	FromListID          string                                    `json:"FromListID"`
	ToListID            string                                    `json:"ToListID"`
	ListCardPatch       dto.ListCardResponse                      `json:"ListCardPatch"`
	FromListCards       []dto.ListCardResponse                    `json:"FromListCards"`
	ToListCards         []dto.ListCardResponse                    `json:"ToListCards"`
	ListCardIdsByListID map[string][]string                       `json:"ListCardIdsByListID"`
	ExternalRootsByID   map[uuid.UUID]dto.ExternalRootRefResponse `json:"ExternalRootsByID"`
}

type EventBuildResult struct {
	StatePayload          *dto.BoardDetailResponse
	RealtimePayload       any
	FeedPayload           AuditRenderPayload
	Targets               []TargetRef
	MainEntity            MainEntityRef
	UserPayload           map[uuid.UUID]ws.UserEventPayload
	UserEventTypeByUserID map[uuid.UUID]ws.UserEventType
	UserEventType         *ws.UserEventType
}

type EventHandler interface {
	Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error)
}

type EventPayloadEnvelope struct {
	StatePayload    *dto.BoardDetailResponse
	RealtimePayload any
	FeedPayload     AuditRenderPayload
	UserPayload     map[uuid.UUID]ws.UserEventPayload
}

type AuditRenderPayload struct {
	TemplateKey AuditTemplateKey           `json:"TemplateKey"`
	Actor       models.UserLite            `json:"Actor"`
	Params      map[string]interface{}     `json:"Params"`
	Links       map[string]AuditEntityLink `json:"Links"`
	Snapshot    map[string]interface{}     `json:"-"`
}

type AuditEntityLink struct {
	EntityType  string
	EntityID    uuid.UUID
	BoardID     *uuid.UUID
	WorkspaceID *uuid.UUID
}
