package shares

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/rbac"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"fmt"

	"github.com/google/uuid"
)

func (s *ShareService) CreateWorkspaceShareOffer(ctx context.Context, userID uuid.UUID,
	sourceWorkspaceID, correlationID uuid.UUID, req CreateShareOfferRequest) ([]models.ShareOffer, error) {
	userRoleStr, err := s.MembershipRepo.GetUserWorkspaceRole(ctx, userID, sourceWorkspaceID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	userRole, ok := rbac.ParseRole(userRoleStr)
	if !ok {
		return nil, domainerr.ErrForbidden
	}
	if userRole < rbac.Admin {
		return nil, domainerr.ErrForbidden
	}
	offeredRole, ok := rbac.ParseRole(req.OfferedRole)
	if !ok {
		return nil, domainerr.ErrValidation
	}

	finalOfferedRole := offeredRole
	if offeredRole > userRole {
		finalOfferedRole = userRole
	}

	shareOffers := make([]models.ShareOffer, 0, len(req.ToUserIDs))
	for _, toUserID := range req.ToUserIDs {
		shareOffer := models.ShareOffer{
			ID:          uuid.New(),
			TargetType:  "workspace",
			TargetID:    sourceWorkspaceID,
			FromUserID:  userID,
			ToUserID:    &toUserID,
			OfferedRole: rbac.Role(finalOfferedRole),
			Status:      "pending",
			Kind:        models.ShareOfferKindInvite,
			Message:     req.Message,
		}
		shareOffers = append(shareOffers, shareOffer)

	}

	if err := s.ShareRepo.CreateBulkShareOffers(ctx, shareOffers); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	responses := dto.ShareOffersToResponses(shareOffers)

	statePayload := &dto.BoardDetailResponse{
		ShareOffers: responses,
	}
	envelopePayload := &EventRegistry.EventPayloadEnvelope{
		StatePayload: statePayload,
	}

	targets := make([]EventRegistry.TargetRef, 0, len(shareOffers))
	for _, shareOffer := range shareOffers {
		targets = append(targets, EventRegistry.TargetRef{
			EntityType:  "user",
			EntityID:    *shareOffer.ToUserID,
			WorkspaceID: &sourceWorkspaceID,
		})
	}
	targets = append(targets, EventRegistry.TargetRef{
		EntityType: "workspace",
		EntityID:   sourceWorkspaceID,
	})

	userEvent := ws.EventUserWorkspaceShareInviteCreatedAdmin

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventWorkspaceShareOfferCreated,
		UserEventType: &userEvent,
		WorkspaceID:   &sourceWorkspaceID,
		Payload:       *envelopePayload,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Targets:       targets,
	}
	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		fmt.Println("Error emitting workspace created offer event:", err)
	}

	return shareOffers, nil
}
