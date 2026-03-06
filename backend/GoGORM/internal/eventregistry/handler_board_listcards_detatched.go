package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"context"
)

type BoardListCardDetatchedHandler struct {
	auditRepo auditcontext.Reader
}

func NewBoardListCardDetatchedHandler(auditRepo auditcontext.Reader) *BoardListCardDetatchedHandler {
	return &BoardListCardDetatchedHandler{auditRepo: auditRepo}
}

func (h *BoardListCardDetatchedHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {

	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	/*boardMeta, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}*/

	links := map[string]AuditEntityLink{
		"board": {
			EntityType: "board",
			EntityID:   *evt.BoardID,
		},
	}

	count := 0
	if evt.Payload.StatePayload != nil {
		count = len(evt.Payload.StatePayload.ListCardRelations)
	}

	templateKey := AuditTemplateBoardListCardsBulkDetached
	if evt.Type == EventBoardListCardDetatched {
		templateKey = AuditTemplateBoardListCardDetatched
	}

	feed := AuditRenderPayload{
		TemplateKey: templateKey,
		Actor:       *actor,
		Params:      map[string]interface{}{"count": count},
		Links:       links,
	}

	result := EventBuildResult{
		StatePayload: evt.Payload.StatePayload,
		FeedPayload:  feed,
		Targets:      evt.Targets,
		MainEntity: MainEntityRef{
			EntityType: "board",
			EntityID:   *evt.BoardID,
		},
	}

	return result, nil
}
