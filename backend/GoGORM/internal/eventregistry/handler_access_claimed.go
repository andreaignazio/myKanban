package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type AccessClaimedHandlerMode string

const (
	WorkspaceAccessClaimedHandlerMode AccessClaimedHandlerMode = "workspace_access_claimed"
	BoardAccessClaimedHandlerMode     AccessClaimedHandlerMode = "board_access_claimed"
)

type AccessClaimedHandler struct {
	auditRepo auditcontext.Reader
	mode      AccessClaimedHandlerMode
}

func NewWorkspaceAccessClaimedHandler(auditRepo auditcontext.Reader) *AccessClaimedHandler {
	return &AccessClaimedHandler{auditRepo: auditRepo, mode: WorkspaceAccessClaimedHandlerMode}
}

func NewBoardAccessClaimedHandler(auditRepo auditcontext.Reader) *AccessClaimedHandler {
	return &AccessClaimedHandler{auditRepo: auditRepo, mode: BoardAccessClaimedHandlerMode}
}

func (h *AccessClaimedHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.ActorUserID == nil || evt.WorkspaceID == nil {
		return EventBuildResult{}, fmt.Errorf("access.claimed: missing actor/workspace")
	}
	statePayload := evt.Payload.StatePayload
	if statePayload == nil {
		return EventBuildResult{}, fmt.Errorf("access.claimed: missing state payload")
	}

	switch h.mode {
	case WorkspaceAccessClaimedHandlerMode:
		if len(statePayload.UserWorkspaceRelations) == 0 {
			return EventBuildResult{}, fmt.Errorf("workspace.access.claimed: missing user workspace relation")
		}

		workspaceMeta, err := h.auditRepo.GetWorkspaceMeta(ctx, *evt.WorkspaceID)
		if err != nil {
			return EventBuildResult{}, err
		}
		actor, err := h.auditRepo.GetUserLiteOnlyWorkspaceRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID)
		if err != nil {
			return EventBuildResult{}, err
		}
		targetUserID := statePayload.UserWorkspaceRelations[0].UserID
		targetUser, err := h.auditRepo.GetUserLiteOnlyWorkspaceRoleByID(ctx, targetUserID, *evt.WorkspaceID)
		if err != nil {
			return EventBuildResult{}, err
		}

		feed := AuditRenderPayload{
			TemplateKey: AuditTemplateWorkspaceAccessClaimed,
			Actor:       *actor,
			Params: map[string]interface{}{
				"workspaceName":  workspaceMeta.Name,
				"targetUserName": targetUser.Name,
			},
			Links: map[string]AuditEntityLink{
				"workspace": {
					EntityType:  "workspace",
					EntityID:    *evt.WorkspaceID,
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
			},
		}

		return EventBuildResult{
			StatePayload: statePayload,
			FeedPayload:  feed,
			Targets:      evt.Targets,
			MainEntity: MainEntityRef{
				EntityType: "workspace",
				EntityID:   *evt.WorkspaceID,
			},
		}, nil

	case BoardAccessClaimedHandlerMode:
		if evt.BoardID == nil {
			return EventBuildResult{}, fmt.Errorf("board.access.claimed: missing board id")
		}
		if len(statePayload.UserBoardRelations) == 0 {
			return EventBuildResult{}, fmt.Errorf("board.access.claimed: missing user board relation")
		}

		boardMeta, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
		if err != nil {
			return EventBuildResult{}, err
		}
		actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
		if err != nil {
			return EventBuildResult{}, err
		}
		targetUserID := statePayload.UserBoardRelations[0].UserID
		targetUser, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, targetUserID, *evt.WorkspaceID, *evt.BoardID)
		if err != nil {
			return EventBuildResult{}, err
		}

		if statePayload.Boards == nil {
			statePayload.Boards = map[uuid.UUID]dto.BoardResponse{}
		}
		statePayload.Boards[boardMeta.ID] = dto.BoardToResponse(boardMeta)

		feed := AuditRenderPayload{
			TemplateKey: AuditTemplateBoardAccessClaimed,
			Actor:       *actor,
			Params: map[string]interface{}{
				"boardName":      boardMeta.Name,
				"targetUserName": targetUser.Name,
			},
			Links: map[string]AuditEntityLink{
				"board": {
					EntityType:  "board",
					EntityID:    *evt.BoardID,
					BoardID:     evt.BoardID,
					WorkspaceID: evt.WorkspaceID,
				},
				"workspace": {
					EntityType:  "workspace",
					EntityID:    *evt.WorkspaceID,
					WorkspaceID: evt.WorkspaceID,
				},
				"target_user": {
					EntityType:  "user",
					EntityID:    targetUserID,
					BoardID:     evt.BoardID,
					WorkspaceID: evt.WorkspaceID,
				},
				"actor": {
					EntityType:  "user",
					EntityID:    *evt.ActorUserID,
					BoardID:     evt.BoardID,
					WorkspaceID: evt.WorkspaceID,
				},
			},
		}

		return EventBuildResult{
			StatePayload: statePayload,
			FeedPayload:  feed,
			Targets:      evt.Targets,
			MainEntity: MainEntityRef{
				EntityType: "board",
				EntityID:   *evt.BoardID,
			},
		}, nil
	default:
		return EventBuildResult{}, fmt.Errorf("access.claimed: unsupported handler mode")
	}
}
