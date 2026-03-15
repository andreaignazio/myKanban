//go:build debug

package subscription

import (
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"time"

	"github.com/google/uuid"
)

// DebugEmitSuspensionEvent emits a workspace.user.member.suspension.updated event directly,
// bypassing the DB reconciler. For development/testing only.
func (s *SubscriptionService) DebugEmitSuspensionEvent(ctx context.Context, workspaceID, targetUserID, actorUserID uuid.UUID, isSuspended bool) error {
	if s.EventRegistry == nil {
		return nil
	}

	var uw models.UserWorkspace
	if err := s.db.WithContext(ctx).
		Table("user_workspaces").
		Where("workspace_id = ? AND user_id = ? AND deleted_at IS NULL", workspaceID, targetUserID).
		First(&uw).Error; err != nil {
		return err
	}

	uw.IsSuspended = isSuspended
	uw.IsPendingSuspend = false

	relation := dto.UserWorkspaceToResponse(&uw)
	userEventType := ws.EventUserWorkspaceMemberSuspensionUpdated
	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventWorkspaceMemberSuspensionUpdated,
		UserEventType: &userEventType,
		WorkspaceID:   &workspaceID,
		ActorUserID:   &actorUserID,
		OccurredAt:    time.Now(),
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: &dto.BoardDetailResponse{
				UserWorkspaceRelations: []dto.UserWorkspaceResponse{relation},
			},
		},
	}
	if emitErr := s.EventRegistry.Emit(ctx, s.db, domainEvent); emitErr != nil {
		return emitErr
	}
	return nil
}
