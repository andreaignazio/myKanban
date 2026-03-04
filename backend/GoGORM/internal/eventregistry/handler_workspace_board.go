package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type WorkspaceBoardHandler struct {
	auditRepo auditcontext.Reader
	mode      WorkspaceBoardHandlerMode
}

type WorkspaceBoardHandlerMode string

const (
	WorkspaceBoardHandlerModeCreated  WorkspaceBoardHandlerMode = "created"
	WorkspaceBoardHandlerModeClosed   WorkspaceBoardHandlerMode = "closed"
	WorkspaceBoardHandlerModeRestored WorkspaceBoardHandlerMode = "restored"
	WorkspaceBoardHandlerModePurged   WorkspaceBoardHandlerMode = "purged"
)

func NewWorkspaceBoardCreatedHandler(auditRepo auditcontext.Reader) *WorkspaceBoardHandler {
	return &WorkspaceBoardHandler{auditRepo: auditRepo, mode: WorkspaceBoardHandlerModeCreated}
}

func NewWorkspaceBoardClosedHandler(auditRepo auditcontext.Reader) *WorkspaceBoardHandler {
	return &WorkspaceBoardHandler{auditRepo: auditRepo, mode: WorkspaceBoardHandlerModeClosed}
}

func NewWorkspaceBoardRestoredHandler(auditRepo auditcontext.Reader) *WorkspaceBoardHandler {
	return &WorkspaceBoardHandler{auditRepo: auditRepo, mode: WorkspaceBoardHandlerModeRestored}
}

func NewWorkspaceBoardPurgedHandler(auditRepo auditcontext.Reader) *WorkspaceBoardHandler {
	return &WorkspaceBoardHandler{auditRepo: auditRepo, mode: WorkspaceBoardHandlerModePurged}
}

func (h *WorkspaceBoardHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.WorkspaceID == nil || evt.ActorUserID == nil {
		return EventBuildResult{}, fmt.Errorf("workspace.board.%s: missing workspaceID/actorUserID", h.mode)
	}

	statePayload := evt.Payload.StatePayload
	if statePayload == nil || statePayload.Boards == nil {
		return EventBuildResult{}, fmt.Errorf("workspace.board.%s: invalid state payload type", h.mode)
	}

	boardID := evt.Targets[1].EntityID
	boardMeta := statePayload.Boards[boardID]

	workspaceMeta, err := h.auditRepo.GetWorkspaceMeta(ctx, *evt.WorkspaceID)
	if err != nil {
		return EventBuildResult{}, err
	}

	var actor *models.UserLite

	if h.mode != WorkspaceBoardHandlerModePurged {
		actor, err = h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, boardID)
		if err != nil {
			return EventBuildResult{}, err
		}
	} else {
		actor, err = h.auditRepo.GetUserLiteOnlyWorkspaceRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID)
		if err != nil {
			return EventBuildResult{}, err
		}
	}

	boardLink := AuditEntityLink{
		EntityType:  "board",
		EntityID:    boardID,
		BoardID:     &boardID,
		WorkspaceID: evt.WorkspaceID,
	}
	workspaceLink := AuditEntityLink{
		EntityType:  "workspace",
		EntityID:    *evt.WorkspaceID,
		WorkspaceID: evt.WorkspaceID,
	}

	links := map[string]AuditEntityLink{
		"board":     boardLink,
		"workspace": workspaceLink,
	}

	var templateKey AuditTemplateKey
	switch h.mode {
	case WorkspaceBoardHandlerModeCreated:
		templateKey = AuditTemplateWorkspaceBoardCreated
	case WorkspaceBoardHandlerModeClosed:
		templateKey = AuditTemplateWorkspaceBoardClosed
	case WorkspaceBoardHandlerModeRestored:
		templateKey = AuditTemplateWorkspaceBoardRestored
	case WorkspaceBoardHandlerModePurged:
		templateKey = AuditTemplateWorkspaceBoardPurged
	}

	params := map[string]interface{}{
		"boardName":     boardMeta.Name,
		"workspaceName": workspaceMeta.Name,
		"actorName":     actor.Name,
	}

	feed := AuditRenderPayload{
		Actor:       *actor,
		TemplateKey: templateKey,
		Params:      params,
		Links:       links,
	}

	result := EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      evt.Targets,
		MainEntity: MainEntityRef{
			EntityType: "board",
			EntityID:   boardID,
		},
	}

	if h.mode == WorkspaceBoardHandlerModeRestored {
		userBoards, err := h.auditRepo.GetUserBoardsByBoardID(ctx, boardID)
		if err != nil {
			return EventBuildResult{}, err
		}
		userPayload := make(map[uuid.UUID]ws.UserEventPayload)
		for _, ub := range userBoards {
			ubRespnse := dto.UserBoardToResponse(ub)
			restoredPayload := ws.WorkspaceBoardRestoredPayload{
				UserID:    ub.UserID,
				Board:     boardMeta,
				UserBoard: ubRespnse,
			}
			userPayload[ub.UserID] = ws.UserEventPayload{
				WorkspaceBoardRestoredPayload: &restoredPayload,
			}
		}
		result.UserPayload = userPayload
	}

	return result, nil
}
