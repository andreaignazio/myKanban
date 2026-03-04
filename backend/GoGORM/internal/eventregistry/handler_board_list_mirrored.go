package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"context"

	"github.com/google/uuid"
)

type BoardListMirroredHandler struct {
	auditRepo auditcontext.Reader
}

func NewBoardListMirroredHandler(auditRepo auditcontext.Reader) *BoardListMirroredHandler {
	return &BoardListMirroredHandler{auditRepo: auditRepo}
}

func (h *BoardListMirroredHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	statePayload := evt.Payload.StatePayload
	if statePayload == nil {
		statePayload = &dto.BoardDetailResponse{}
	}

	var actorErr error
	var actorUserID uuid.UUID
	if evt.ActorUserID != nil {
		actorUserID = *evt.ActorUserID
	}

	actor, actorLookupErr := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, actorUserID, *evt.WorkspaceID, *evt.BoardID)
	if actorLookupErr != nil {
		actorErr = actorLookupErr
	}

	params := map[string]interface{}{}
	links := map[string]AuditEntityLink{}
	if evt.BoardID != nil {
		links["board"] = AuditEntityLink{
			EntityType:  "board",
			EntityID:    *evt.BoardID,
			BoardID:     evt.BoardID,
			WorkspaceID: evt.WorkspaceID,
		}
	}

	if len(evt.Targets) > 1 {
		links["list"] = AuditEntityLink{
			EntityType:  "list",
			EntityID:    evt.Targets[1].EntityID,
			BoardID:     evt.BoardID,
			WorkspaceID: evt.WorkspaceID,
		}
	}

	if actorErr == nil && actor != nil {
		params["actorName"] = actor.Name
	}
	if evt.BoardID != nil {
		params["boardID"] = evt.BoardID.String()
	}
	if len(evt.Targets) > 1 {
		params["listID"] = evt.Targets[1].EntityID.String()
	}

	templateKey := AuditTemplateBoardListMirrored
	switch evt.Type {
	case EventBoardListMirroredTarget:
		templateKey = AuditTemplateBoardListMirroredTarget
	case EventBoardListMirroredSource:
		templateKey = AuditTemplateBoardListMirroredSource
	}

	feed := AuditRenderPayload{
		TemplateKey: templateKey,
		Params:      params,
		Links:       links,
	}
	if actor != nil {
		feed.Actor = *actor
	}

	mainEntityID := uuid.Nil
	if evt.BoardID != nil {
		mainEntityID = *evt.BoardID
	}

	return EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      evt.Targets,
		MainEntity: MainEntityRef{
			EntityType: "board",
			EntityID:   mainEntityID,
		},
	}, nil
}
