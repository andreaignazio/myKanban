package EventRegistry

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	"context"

	"github.com/google/uuid"
)

type RootIDsResolver interface {
	Resolve(ctx context.Context, input MirrorPropagationInput) ([]uuid.UUID, error)
}

type BoardTargetsResolver interface {
	Resolve(ctx context.Context, input MirrorPropagationInput, rootListCardIDs []uuid.UUID) ([]uuid.UUID, error)
}

type UserTargetsResolver interface {
	Resolve(ctx context.Context, rootListCardIDs, invalidatedListCardIDs []uuid.UUID) ([]MirrorUserTarget, error)
}

type MirrorPropagationService struct {
	repo                EventRepository
	userTargetsResolver UserTargetsResolver
}

func NewMirrorPropagationService(repo EventRepository) *MirrorPropagationService {
	service := &MirrorPropagationService{repo: repo}
	service.userTargetsResolver = &rootUserTargetsResolver{repo: repo}
	return service
}

type MirrorPropagationInput struct {
	Event            DomainEvent
	BuildResult      EventBuildResult
	BroadcastBoardID uuid.UUID

	RootListCardID  uuid.UUID
	MovedListCardID uuid.UUID
	SourceBoardID   uuid.UUID
	TargetBoardID   uuid.UUID
}

type MirrorUserTarget struct {
	UserID                 uuid.UUID
	AffectedInboxCardIDs   []uuid.UUID
	InvalidatedListCardIDs []uuid.UUID
}

type MirrorPropagationResult struct {
	RootListCardIDs        []uuid.UUID
	InvalidatedListCardIDs []uuid.UUID
	AffectedBoardIDs       []uuid.UUID
	UserTargets            []MirrorUserTarget
}

func (s *MirrorPropagationService) Resolve(ctx context.Context, input MirrorPropagationInput) (*MirrorPropagationResult, error) {
	rootIDsResolver, err := s.getRootIDsResolver(input.Event.Type)
	if err != nil {
		return nil, err
	}

	rootListCardIDs, err := rootIDsResolver.Resolve(ctx, input)
	if err != nil {
		return nil, err
	}

	invalidatedListCardIDs, err := s.resolveInvalidatedListCardIDs(ctx, rootListCardIDs)
	if err != nil {
		return nil, err
	}

	boardTargetsResolver, err := s.getBoardTargetsResolver(input.Event.Type)
	if err != nil {
		return nil, err
	}

	affectedBoardIDs, err := boardTargetsResolver.Resolve(ctx, input, rootListCardIDs)
	if err != nil {
		return nil, err
	}

	userTargets, err := s.userTargetsResolver.Resolve(ctx, rootListCardIDs, invalidatedListCardIDs)
	if err != nil {
		return nil, err
	}

	return &MirrorPropagationResult{
		RootListCardIDs:        rootListCardIDs,
		InvalidatedListCardIDs: invalidatedListCardIDs,
		AffectedBoardIDs:       affectedBoardIDs,
		UserTargets:            userTargets,
	}, nil
}

func (s *MirrorPropagationService) getRootIDsResolver(eventType DomainEventType) (RootIDsResolver, error) {
	switch eventType {
	case EventBoardPatched, EventWorkspaceBoardClosed, EventWorkspaceBoardPurged:
		return &boardRootIDsResolver{repo: s.repo}, nil
	case EventBoardListCardMoved:
		return moveCardRootIDsResolver{}, nil
	case EventBoardListCardPurged:
		return purgedCardsRootIDsResolver{}, nil
	case EventListCardCrossBoardMoved:
		return crossBoardMoveRootIDsResolver{}, nil
	case EventBoardListPatched:
		return &listPatchedRootIDsResolver{repo: s.repo}, nil
	default:
		return nil, domainerr.ErrUnsupportedEvent
	}
}

func (s *MirrorPropagationService) getBoardTargetsResolver(eventType DomainEventType) (BoardTargetsResolver, error) {
	switch eventType {
	case EventBoardPatched, EventWorkspaceBoardClosed, EventWorkspaceBoardPurged:
		return &boardEventBoardTargetsResolver{repo: s.repo}, nil
	case EventBoardListCardMoved, EventBoardListCardPurged, EventBoardListPatched:
		return &rootScopedBoardTargetsResolver{repo: s.repo}, nil
	case EventListCardCrossBoardMoved:
		return &crossBoardMoveBoardTargetsResolver{repo: s.repo}, nil
	default:
		return nil, domainerr.ErrUnsupportedEvent
	}
}

func (s *MirrorPropagationService) resolveInvalidatedListCardIDs(ctx context.Context, rootListCardIDs []uuid.UUID) ([]uuid.UUID, error) {
	result := make([]uuid.UUID, 0)
	for _, rootListCardID := range rootListCardIDs {
		if rootListCardID == uuid.Nil {
			continue
		}
		ids, err := s.repo.ResolveListCardIDsByRootID(ctx, rootListCardID)
		if err != nil {
			return nil, err
		}
		result = appendUniqueUUID(result, ids...)
	}
	return result, nil
}

type boardRootIDsResolver struct {
	repo EventRepository
}

func (r *boardRootIDsResolver) Resolve(ctx context.Context, input MirrorPropagationInput) ([]uuid.UUID, error) {
	boardID := input.BroadcastBoardID
	if boardID == uuid.Nil {
		boardID = resolveSourceBoardID(input.Event, input.BuildResult)
	}
	if boardID == uuid.Nil {
		return []uuid.UUID{}, nil
	}
	return r.repo.ResolveRootListCardIDsByBoardID(ctx, boardID)
}

type listPatchedRootIDsResolver struct {
	repo EventRepository
}

func (r *listPatchedRootIDsResolver) Resolve(ctx context.Context, input MirrorPropagationInput) ([]uuid.UUID, error) {
	// Extract listID from the patched board list in the state payload
	if input.BuildResult.StatePayload != nil {
		for _, bl := range input.BuildResult.StatePayload.BoardListRelations {
			if bl.ListID != uuid.Nil {
				return r.repo.ResolveRootListCardIDsByListID(ctx, bl.ListID)
			}
		}
	}
	// Fallback: extract from targets
	for _, target := range input.Event.Targets {
		if target.EntityType == "list" && target.EntityID != uuid.Nil {
			return r.repo.ResolveRootListCardIDsByListID(ctx, target.EntityID)
		}
	}
	return []uuid.UUID{}, nil
}

type moveCardRootIDsResolver struct{}

func (moveCardRootIDsResolver) Resolve(_ context.Context, input MirrorPropagationInput) ([]uuid.UUID, error) {
	_, rootListCardID := extractMoveCardIDs(input.BuildResult)
	if rootListCardID == uuid.Nil {
		return []uuid.UUID{}, nil
	}
	return []uuid.UUID{rootListCardID}, nil
}

type purgedCardsRootIDsResolver struct{}

func (purgedCardsRootIDsResolver) Resolve(_ context.Context, input MirrorPropagationInput) ([]uuid.UUID, error) {
	rootIDs := make([]uuid.UUID, 0)
	if input.BuildResult.StatePayload != nil {
		for _, rel := range input.BuildResult.StatePayload.ListCardRelations {
			if rel.RootID != uuid.Nil {
				rootIDs = appendUniqueUUID(rootIDs, rel.RootID)
			}
		}
	}
	return rootIDs, nil
}

type crossBoardMoveRootIDsResolver struct{}

func (crossBoardMoveRootIDsResolver) Resolve(_ context.Context, input MirrorPropagationInput) ([]uuid.UUID, error) {
	rootListCardID := input.RootListCardID
	if rootListCardID == uuid.Nil {
		rootListCardID = input.MovedListCardID
	}
	if rootListCardID == uuid.Nil {
		return []uuid.UUID{}, nil
	}
	return []uuid.UUID{rootListCardID}, nil
}

type boardEventBoardTargetsResolver struct {
	repo EventRepository
}

func (r *boardEventBoardTargetsResolver) Resolve(ctx context.Context, input MirrorPropagationInput, _ []uuid.UUID) ([]uuid.UUID, error) {
	sourceBoardID := resolveSourceBoardID(input.Event, input.BuildResult)
	if sourceBoardID == uuid.Nil {
		return []uuid.UUID{}, nil
	}

	boardIDs := make([]uuid.UUID, 0)
	listMirrorConsumers, err := r.repo.ResolveBoardConsumersForSourceBoardMirrors(ctx, sourceBoardID)
	if err != nil {
		return nil, err
	}
	boardIDs = appendUniqueUUID(boardIDs, listMirrorConsumers...)

	cardMirrorConsumers, err := r.repo.ResolveBoardConsumersForSourceBoardCardMirrors(ctx, sourceBoardID)
	if err != nil {
		return nil, err
	}
	boardIDs = appendUniqueUUID(boardIDs, cardMirrorConsumers...)

	return boardIDs, nil
}

type rootScopedBoardTargetsResolver struct {
	repo EventRepository
}

func (r *rootScopedBoardTargetsResolver) Resolve(ctx context.Context, input MirrorPropagationInput, rootListCardIDs []uuid.UUID) ([]uuid.UUID, error) {
	sourceBoardID := resolveSourceBoardID(input.Event, input.BuildResult)
	boardIDs := make([]uuid.UUID, 0)
	for _, rootListCardID := range rootListCardIDs {
		consumers, err := r.repo.ResolveBoardConsumersForRootListCard(ctx, rootListCardID, sourceBoardID, uuid.Nil)
		if err != nil {
			return nil, err
		}
		boardIDs = appendUniqueUUID(boardIDs, consumers...)
	}
	return boardIDs, nil
}

type crossBoardMoveBoardTargetsResolver struct {
	repo EventRepository
}

func (r *crossBoardMoveBoardTargetsResolver) Resolve(ctx context.Context, input MirrorPropagationInput, rootListCardIDs []uuid.UUID) ([]uuid.UUID, error) {
	if len(rootListCardIDs) == 0 {
		return []uuid.UUID{}, nil
	}
	return r.repo.ResolveBoardConsumersForRootListCard(ctx, rootListCardIDs[0], input.SourceBoardID, input.TargetBoardID)
}

type rootUserTargetsResolver struct {
	repo EventRepository
}

func (r *rootUserTargetsResolver) Resolve(ctx context.Context, rootListCardIDs, invalidatedListCardIDs []uuid.UUID) ([]MirrorUserTarget, error) {
	if len(rootListCardIDs) == 0 {
		return []MirrorUserTarget{}, nil
	}

	targetsByUser := make(map[uuid.UUID]*MirrorUserTarget)
	for _, rootListCardID := range rootListCardIDs {
		if rootListCardID == uuid.Nil {
			continue
		}

		userIDs, err := r.repo.ResolveInboxUserConsumersForRootListCard(ctx, rootListCardID)
		if err != nil {
			return nil, err
		}

		for _, userID := range userIDs {
			if userID == uuid.Nil {
				continue
			}

			target, exists := targetsByUser[userID]
			if !exists {
				target = &MirrorUserTarget{UserID: userID}
				targetsByUser[userID] = target
			}

			affectedInboxCardIDs, err := r.repo.ResolveInboxCardIDsForUserAndRootListCard(ctx, userID, rootListCardID)
			if err != nil {
				return nil, err
			}
			target.AffectedInboxCardIDs = appendUniqueUUID(target.AffectedInboxCardIDs, affectedInboxCardIDs...)
			target.InvalidatedListCardIDs = appendUniqueUUID(target.InvalidatedListCardIDs, invalidatedListCardIDs...)
		}
	}

	result := make([]MirrorUserTarget, 0, len(targetsByUser))
	for _, target := range targetsByUser {
		result = append(result, *target)
	}
	return result, nil
}

func extractMoveCardIDs(buildResult EventBuildResult) (uuid.UUID, uuid.UUID) {
	if payload, ok := buildResult.RealtimePayload.(dto.MoveCardEventPayload); ok {
		return payload.ListCardPatch.ID, payload.ListCardPatch.RootID
	}
	if payload, ok := buildResult.RealtimePayload.(*dto.MoveCardEventPayload); ok && payload != nil {
		return payload.ListCardPatch.ID, payload.ListCardPatch.RootID
	}
	return uuid.Nil, uuid.Nil
}

func resolveSourceBoardID(event DomainEvent, buildResult EventBuildResult) uuid.UUID {
	if event.BoardID != nil && *event.BoardID != uuid.Nil {
		return *event.BoardID
	}
	for _, target := range buildResult.Targets {
		if target.EntityType == "board" && target.EntityID != uuid.Nil {
			return target.EntityID
		}
	}
	for _, target := range event.Targets {
		if target.EntityType == "board" && target.EntityID != uuid.Nil {
			return target.EntityID
		}
	}
	return uuid.Nil
}
