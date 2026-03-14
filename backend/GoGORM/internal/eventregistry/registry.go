package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"GoGORM/internal/ws"
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventRegistryService struct {
	db                *gorm.DB
	repo              EventRepository
	mirrorPropagation *MirrorPropagationService
	auditContextRepo  auditcontext.Reader
	handlers          map[DomainEventType]EventHandler
	MembershipRepo    MembershipRepo
	workspaceResolver WorkspaceResolver
	Hub               *ws.Hub
}

func NewEventRegistryService(repo EventRepository, hub *ws.Hub, workspaceResolver WorkspaceResolver, membershipRepo MembershipRepo, auditContextRepo auditcontext.Reader) *EventRegistryService {
	return &EventRegistryService{
		repo:              repo,
		mirrorPropagation: NewMirrorPropagationService(repo),
		Hub:               hub,
		workspaceResolver: workspaceResolver,
		MembershipRepo:    membershipRepo,
		auditContextRepo:  auditContextRepo,
		handlers:          buildHandlers(auditContextRepo),
	}
}

func shouldAttachRootBoardInvalidations(eventType DomainEventType) bool {
	switch eventType {
	case EventBoardPatched,
		EventWorkspaceBoardClosed,
		EventWorkspaceBoardPurged,
		EventBoardListCardMoved,
		EventBoardListCardPurged,
		EventListCardCrossBoardMoved,
		EventBoardListPatched:
		return true
	default:
		return false
	}
}

func shouldResolveAdditionalFanoutBoards(eventType DomainEventType) bool {
	switch eventType {
	case EventBoardPatched,
		EventWorkspaceBoardClosed,
		EventWorkspaceBoardPurged,
		EventBoardListCardMoved,
		EventBoardListCardPurged,
		EventListCardCrossBoardMoved,
		EventBoardListPatched:
		return true
	default:
		return false
	}
}

func uuidListToStrings(ids []uuid.UUID) []string {
	if len(ids) == 0 {
		return []string{}
	}
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		if id == uuid.Nil {
			continue
		}
		out = append(out, id.String())
	}
	return out
}

func appendUniqueUUID(target []uuid.UUID, values ...uuid.UUID) []uuid.UUID {
	seen := make(map[uuid.UUID]struct{}, len(target)+len(values))
	for _, id := range target {
		if id == uuid.Nil {
			continue
		}
		seen[id] = struct{}{}
	}
	for _, id := range values {
		if id == uuid.Nil {
			continue
		}
		if _, exists := seen[id]; exists {
			continue
		}
		seen[id] = struct{}{}
		target = append(target, id)
	}
	return target
}

func (s *EventRegistryService) resolveMirrorPropagation(ctx context.Context, input MirrorPropagationInput) (*MirrorPropagationResult, error) {
	if s.mirrorPropagation == nil {
		return nil, nil
	}
	return s.mirrorPropagation.Resolve(ctx, input)
}

func (s *EventRegistryService) resolveRootBoardInvalidationsForBoardEvent(ctx context.Context, event DomainEvent, buildResult EventBuildResult, broadcastBoardID uuid.UUID) ([]string, error) {
	if !shouldAttachRootBoardInvalidations(event.Type) {
		return []string{}, nil
	}

	switch event.Type {
	case EventBoardListCardMoved:
		movedListCardID := uuid.Nil
		rootListCardID := uuid.Nil

		if payload, ok := buildResult.RealtimePayload.(dto.MoveCardEventPayload); ok {
			movedListCardID = payload.ListCardPatch.ID
			rootListCardID = payload.ListCardPatch.RootID
		}
		if payloadPtr, ok := buildResult.RealtimePayload.(*dto.MoveCardEventPayload); ok && payloadPtr != nil {
			if movedListCardID == uuid.Nil {
				movedListCardID = payloadPtr.ListCardPatch.ID
			}
			if rootListCardID == uuid.Nil {
				rootListCardID = payloadPtr.ListCardPatch.RootID
			}
		}

		if movedListCardID != uuid.Nil && rootListCardID != uuid.Nil && movedListCardID == rootListCardID {
			ids, err := s.repo.ResolveListCardIDsByRootID(ctx, rootListCardID)
			if err != nil {
				return nil, err
			}
			if len(ids) > 0 {
				return uuidListToStrings(ids), nil
			}
		}

		if movedListCardID != uuid.Nil {
			return []string{movedListCardID.String()}, nil
		}

	case EventBoardListCardPurged:
		ids := make([]uuid.UUID, 0)
		if buildResult.StatePayload != nil {
			for _, rel := range buildResult.StatePayload.ListCardRelations {
				ids = appendUniqueUUID(ids, rel.ID)
			}
		}
		if len(ids) > 0 {
			return uuidListToStrings(ids), nil
		}
	}

	if broadcastBoardID == uuid.Nil {
		return []string{}, nil
	}
	ids, err := s.repo.ResolveListCardIDsByBoardID(ctx, broadcastBoardID)
	if err != nil {
		return nil, err
	}
	return uuidListToStrings(ids), nil
}

func (s *EventRegistryService) resolveAdditionalFanoutBoardIDs(ctx context.Context, event DomainEvent, buildResult EventBuildResult) ([]uuid.UUID, error) {
	if !shouldResolveAdditionalFanoutBoards(event.Type) {
		return []uuid.UUID{}, nil
	}

	boardIDs := make([]uuid.UUID, 0)

	resolveSourceBoardID := func() uuid.UUID {
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

	sourceBoardID := resolveSourceBoardID()

	switch event.Type {
	case EventBoardPatched, EventWorkspaceBoardClosed, EventWorkspaceBoardPurged:
		if sourceBoardID == uuid.Nil {
			return []uuid.UUID{}, nil
		}

		listMirrorConsumers, err := s.repo.ResolveBoardConsumersForSourceBoardMirrors(ctx, sourceBoardID)
		if err != nil {
			return nil, err
		}
		boardIDs = appendUniqueUUID(boardIDs, listMirrorConsumers...)

		cardMirrorConsumers, err := s.repo.ResolveBoardConsumersForSourceBoardCardMirrors(ctx, sourceBoardID)
		if err != nil {
			return nil, err
		}
		boardIDs = appendUniqueUUID(boardIDs, cardMirrorConsumers...)

	case EventBoardListCardMoved:
		if payload, ok := buildResult.RealtimePayload.(dto.MoveCardEventPayload); ok {
			if payload.ListCardPatch.RootID != uuid.Nil {
				consumers, err := s.repo.ResolveBoardConsumersForRootListCard(ctx, payload.ListCardPatch.RootID, sourceBoardID, uuid.Nil)
				if err != nil {
					return nil, err
				}
				boardIDs = appendUniqueUUID(boardIDs, consumers...)
			}
		}
		if payloadPtr, ok := buildResult.RealtimePayload.(*dto.MoveCardEventPayload); ok && payloadPtr != nil {
			if payloadPtr.ListCardPatch.RootID != uuid.Nil {
				consumers, err := s.repo.ResolveBoardConsumersForRootListCard(ctx, payloadPtr.ListCardPatch.RootID, sourceBoardID, uuid.Nil)
				if err != nil {
					return nil, err
				}
				boardIDs = appendUniqueUUID(boardIDs, consumers...)
			}
		}

	case EventBoardListCardPurged:
		if buildResult.StatePayload != nil {
			rootIDs := make([]uuid.UUID, 0, len(buildResult.StatePayload.ListCardRelations))
			for _, rel := range buildResult.StatePayload.ListCardRelations {
				if rel.RootID != uuid.Nil {
					rootIDs = appendUniqueUUID(rootIDs, rel.RootID)
				}
			}
			for _, rootID := range rootIDs {
				consumers, err := s.repo.ResolveBoardConsumersForRootListCard(ctx, rootID, sourceBoardID, uuid.Nil)
				if err != nil {
					return nil, err
				}
				boardIDs = appendUniqueUUID(boardIDs, consumers...)
			}
		}

	case EventBoardListPatched:
		// Fan-out to all boards that mirror any list from the source board.
		// This covers the access-mode change: consumers of mirror lists need to
		// invalidate their rootboard cache and re-evaluate canEdit.
		if sourceBoardID == uuid.Nil {
			return []uuid.UUID{}, nil
		}
		listMirrorConsumers, err := s.repo.ResolveBoardConsumersForSourceBoardMirrors(ctx, sourceBoardID)
		if err != nil {
			return nil, err
		}
		boardIDs = appendUniqueUUID(boardIDs, listMirrorConsumers...)

		cardMirrorConsumers, err := s.repo.ResolveBoardConsumersForSourceBoardCardMirrors(ctx, sourceBoardID)
		if err != nil {
			return nil, err
		}
		boardIDs = appendUniqueUUID(boardIDs, cardMirrorConsumers...)
	}

	return boardIDs, nil
}

func (s *EventRegistryService) EmitNotifcationReadEvent(ctx context.Context, userID uuid.UUID, notificationIDs []uuid.UUID, read bool) error {
	eventType := "notification.markread"
	if !read {
		eventType = "notification.markunread"
	}
	unreadCount, err := s.repo.GetUserUnreadNotificationCount(ctx, userID)
	if err != nil {
		return err
	}
	payload := ws.UserNotificationReadPayload{
		NotificationIDs: notificationIDs,
		UnreadCount:     unreadCount,
	}
	wsEvent := ws.UserEvent{
		Type:            eventType,
		RecipientUserID: userID,
		Payload: ws.UserEventPayload{
			UserNotificationReadPayload: &payload,
		},
		TS:          time.Now(),
		ID:          uuid.New(),
		ActorUserID: &userID,
	}

	s.Hub.BroadCastToUser(wsEvent)
	return nil
}
