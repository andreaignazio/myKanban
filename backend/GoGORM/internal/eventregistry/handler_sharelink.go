package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type ShareLinkHandlerMode string

const (
	BoardShareLinkCreatedHandlerMode     ShareLinkHandlerMode = "board_sharelink_created"
	WorkspaceShareLinkCreatedHandlerMode ShareLinkHandlerMode = "workspace_sharelink_created"
	BoardShareLinkRevokedHandlerMode     ShareLinkHandlerMode = "board_sharelink_revoked"
	WorkspaceShareLinkRevokedHandlerMode ShareLinkHandlerMode = "workspace_sharelink_revoked"
)

type ShareLinkEventHandler struct {
	auditRepo auditcontext.Reader
	mode      ShareLinkHandlerMode
}

func NewBoardShareLinkCreatedHandler(auditRepo auditcontext.Reader) *ShareLinkEventHandler {
	return &ShareLinkEventHandler{auditRepo: auditRepo, mode: BoardShareLinkCreatedHandlerMode}
}

func NewWorkspaceShareLinkCreatedHandler(auditRepo auditcontext.Reader) *ShareLinkEventHandler {
	return &ShareLinkEventHandler{auditRepo: auditRepo, mode: WorkspaceShareLinkCreatedHandlerMode}
}

func NewBoardShareLinkRevokedHandler(auditRepo auditcontext.Reader) *ShareLinkEventHandler {
	return &ShareLinkEventHandler{auditRepo: auditRepo, mode: BoardShareLinkRevokedHandlerMode}
}

func NewWorkspaceShareLinkRevokedHandler(auditRepo auditcontext.Reader) *ShareLinkEventHandler {
	return &ShareLinkEventHandler{auditRepo: auditRepo, mode: WorkspaceShareLinkRevokedHandlerMode}
}

func (h *ShareLinkEventHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.WorkspaceID == nil || evt.ActorUserID == nil {
		return EventBuildResult{}, fmt.Errorf("sharelink handler: missing workspaceID or actorUserID")
	}

	statePayload := evt.Payload.StatePayload
	if statePayload == nil || len(statePayload.ShareLinks) == 0 {
		return EventBuildResult{}, fmt.Errorf("sharelink handler: missing state payload or share links")
	}

	actor, err := h.auditRepo.GetUserLiteOnlyWorkspaceRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID)
	if err != nil {
		return EventBuildResult{}, err
	}

	params := map[string]any{}
	links := map[string]AuditEntityLink{
		"actor": {
			EntityType:  "user",
			EntityID:    *evt.ActorUserID,
			WorkspaceID: evt.WorkspaceID,
		},
	}

	var templateKey AuditTemplateKey
	var mainEntity MainEntityRef
	var targets []TargetRef

	isBoardMode := h.mode == BoardShareLinkCreatedHandlerMode || h.mode == BoardShareLinkRevokedHandlerMode

	if isBoardMode {
		if evt.BoardID == nil {
			return EventBuildResult{}, fmt.Errorf("board.sharelink handler: missing boardID")
		}
		boardMeta, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
		if err != nil {
			return EventBuildResult{}, err
		}
		params["boardName"] = boardMeta.Name
		links["board"] = AuditEntityLink{
			EntityType:  "board",
			EntityID:    *evt.BoardID,
			BoardID:     evt.BoardID,
			WorkspaceID: evt.WorkspaceID,
		}
		mainEntity = MainEntityRef{EntityType: "board", EntityID: *evt.BoardID}
		targets = []TargetRef{
			{EntityType: "workspace", EntityID: *evt.WorkspaceID, WorkspaceID: evt.WorkspaceID},
			{EntityType: "board", EntityID: *evt.BoardID, BoardID: evt.BoardID, WorkspaceID: evt.WorkspaceID},
		}
		if h.mode == BoardShareLinkCreatedHandlerMode {
			templateKey = AuditTemplateBoardShareLinkCreated
		} else {
			templateKey = AuditTemplateBoardShareLinkRevoked
		}
	} else {
		workspaceMeta, err := h.auditRepo.GetWorkspaceMeta(ctx, *evt.WorkspaceID)
		if err != nil {
			return EventBuildResult{}, err
		}
		params["workspaceName"] = workspaceMeta.Name
		links["workspace"] = AuditEntityLink{
			EntityType:  "workspace",
			EntityID:    *evt.WorkspaceID,
			WorkspaceID: evt.WorkspaceID,
		}
		mainEntity = MainEntityRef{EntityType: "workspace", EntityID: *evt.WorkspaceID}
		targets = []TargetRef{
			{EntityType: "workspace", EntityID: *evt.WorkspaceID, WorkspaceID: evt.WorkspaceID},
		}
		if h.mode == WorkspaceShareLinkCreatedHandlerMode {
			templateKey = AuditTemplateWorkspaceShareLinkCreated
		} else {
			templateKey = AuditTemplateWorkspaceShareLinkRevoked
		}
	}

	feed := AuditRenderPayload{
		TemplateKey: templateKey,
		Actor:       *actor,
		Params:      params,
		Links:       links,
	}

	return EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		MainEntity:   mainEntity,
		Targets:      targets,
	}, nil
}

// resolveWorkspaceIDForShareLinkEvent is a helper to get the workspaceID
// needed for the DomainEvent when target is a board.
// (The emit pipeline auto-resolves it, but we expose this for callers that need it upfront.)
func resolveWorkspaceIDForShareLinkEvent(_ uuid.UUID) *uuid.UUID {
	return nil // workspace resolution delegated to emit pipeline
}
