package EventRegistry

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

type WorkspaceSubscriptionHandler struct{}

func NewWorkspaceSubscriptionHandler() *WorkspaceSubscriptionHandler {
	return &WorkspaceSubscriptionHandler{}
}

func (h *WorkspaceSubscriptionHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.WorkspaceID == nil {
		return EventBuildResult{}, fmt.Errorf("workspace.subscription.*: missing workspaceID")
	}

	var templateKey AuditTemplateKey
	switch evt.Type {
	case EventWorkspaceSubscriptionCreated:
		templateKey = AuditTemplateWorkspaceSubscriptionCreated
	case EventWorkspaceSubscriptionCanceled:
		templateKey = AuditTemplateWorkspaceSubscriptionCanceled
	default:
		templateKey = AuditTemplateWorkspaceSubscriptionUpdated
	}

	links := map[string]AuditEntityLink{
		"workspace": {
			EntityType:  "workspace",
			EntityID:    *evt.WorkspaceID,
			WorkspaceID: evt.WorkspaceID,
		},
	}

	feed := AuditRenderPayload{
		TemplateKey: templateKey,
		Params:      map[string]interface{}{},
		Links:       links,
	}

	return EventBuildResult{
		RealtimePayload: evt.Payload.RealtimePayload,
		FeedPayload:     feed,
		MainEntity: MainEntityRef{
			EntityType: "workspace",
			EntityID:   *evt.WorkspaceID,
		},
	}, nil
}

// WorkspaceSubscriptionEmitInput is the input for emitting a subscription RT event.
type WorkspaceSubscriptionEmitInput struct {
	WorkspaceID uuid.UUID
	EventType   DomainEventType
	Payload     interface{}
}
