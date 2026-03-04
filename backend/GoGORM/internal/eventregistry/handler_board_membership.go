package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"GoGORM/internal/ws"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type BoardMembershipHandler struct {
	auditRepo auditcontext.Reader
}

func NewBoardMembershipRemovedHandler(auditRepo auditcontext.Reader) *BoardMembershipHandler {
	return &BoardMembershipHandler{auditRepo: auditRepo}
}

func (h *BoardMembershipHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	statePayload := evt.Payload.StatePayload
	if statePayload == nil || len(statePayload.UserBoardRelations) == 0 || evt.BoardID == nil || evt.WorkspaceID == nil || evt.ActorUserID == nil {
		return EventBuildResult{}, fmt.Errorf("board.member.removed: invalid payload")
	}

	removedRelation := statePayload.UserBoardRelations[0]
	targetUserID := removedRelation.UserID

	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		actor, err = h.auditRepo.GetUserLiteOnlyWorkspaceRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID)
		if err != nil {
			return EventBuildResult{}, err
		}
	}

	targetUserMeta, err := h.auditRepo.GetUserLite(ctx, targetUserID)
	if err != nil {
		return EventBuildResult{}, err
	}

	workspaceMeta, err := h.auditRepo.GetWorkspaceMeta(ctx, *evt.WorkspaceID)
	if err != nil {
		return EventBuildResult{}, err
	}

	boardMeta, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	if statePayload.Boards == nil {
		statePayload.Boards = make(map[uuid.UUID]dto.BoardResponse)
	}
	statePayload.Boards[boardMeta.ID] = dto.BoardToResponse(boardMeta)

	links := map[string]AuditEntityLink{
		"workspace": {
			EntityType:  "workspace",
			EntityID:    *evt.WorkspaceID,
			WorkspaceID: evt.WorkspaceID,
		},
		"board": {
			EntityType:  "board",
			EntityID:    *evt.BoardID,
			WorkspaceID: evt.WorkspaceID,
		},
		"target_user": {
			EntityType:  "user",
			EntityID:    targetUserID,
			WorkspaceID: evt.WorkspaceID,
		},
		"actor": {
			EntityType:  "user",
			EntityID:    *evt.ActorUserID,
			WorkspaceID: evt.WorkspaceID,
		},
	}

	templateKey := AuditTemplateBoardMemberRemoved
	if targetUserID == *evt.ActorUserID {
		templateKey = AuditTemplateBoardMemberRemovedSelf
	}

	feed := AuditRenderPayload{
		TemplateKey: templateKey,
		Actor:       *actor,
		Params: map[string]any{
			"boardName":          boardMeta.Name,
			"workspaceName":      workspaceMeta.Name,
			"targetUserName":     targetUserMeta.Name,
			"targetUserUsername": targetUserMeta.Username,
		},
		Links: links,
	}

	userPayloadMap := map[uuid.UUID]ws.UserEventPayload{
		targetUserID: {
			BoardMembershipPayload: &ws.BoardMembershipPayload{
				UserID:    targetUserID,
				Board:     dto.BoardToResponse(boardMeta),
				UserBoard: removedRelation,
			},
		},
	}

	userEventType := ws.EventUserBoardMemberRemoved

	return EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      evt.Targets,
		MainEntity: MainEntityRef{
			EntityType: "board",
			EntityID:   *evt.BoardID,
		},
		UserPayload:   userPayloadMap,
		UserEventType: &userEventType,
	}, nil
}
