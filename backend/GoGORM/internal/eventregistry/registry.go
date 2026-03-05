package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type EventRegistryService struct {
	db                *gorm.DB
	repo              EventRepository
	auditContextRepo  auditcontext.Reader
	handlers          map[DomainEventType]EventHandler
	MembershipRepo    MembershipRepo
	workspaceResolver WorkspaceResolver
	Hub               *ws.Hub
}

type EventRepository interface {
	CreateAuditEvent(ctx context.Context, tx *gorm.DB, event *models.BoardAuditEvent) error
	CreateAuditEventTargets(ctx context.Context, tx *gorm.DB, targets []models.AuditEventTargets) error
	GetBoardAuditLog(ctx context.Context, boardID uuid.UUID) ([]models.BoardAuditEvent, error)
	GetBoardAuditLogPaginated(ctx context.Context, boardID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.AuditPage, error)
	GetWorkspaceAuditLog(ctx context.Context, workspaceID uuid.UUID) ([]models.BoardAuditEvent, error)
	GetCardActivity(ctx context.Context, cardID uuid.UUID) ([]models.BoardAuditEvent, error)
	GetWorkspaceCardActivity(ctx context.Context, workspaceID, cardID uuid.UUID) ([]models.BoardAuditEvent, error)
	IsInboxCardOwnedByUser(ctx context.Context, userID, cardID uuid.UUID) (bool, error)
	GetWorkspaceUserActivity(ctx context.Context, workspaceID, actorUserID uuid.UUID) ([]models.BoardAuditEvent, error)
	GetWorkspaceUserActivityPaginated(ctx context.Context, workspaceID, actorUserID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.AuditPage, error)
	GetUserActivity(ctx context.Context, actorUserID uuid.UUID) ([]models.BoardAuditEvent, error)
	GetUserActivityPaginated(ctx context.Context, actorUserID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.AuditPage, error)
	GetAuditEntitiesDetails(ctx context.Context, entityIDsByType map[string][]uuid.UUID) (AuditEntityRows, error)
	GetAffectedBoardIDsForTargets(ctx context.Context, targetIDsByEntity map[string][]uuid.UUID) ([]uuid.UUID, error)
	ResolveBoardConsumersForSourceBoardMirrors(ctx context.Context, sourceBoardID uuid.UUID) ([]uuid.UUID, error)
	ResolveBoardConsumersForRootListCard(ctx context.Context, rootListCardID, sourceBoardID, targetBoardID uuid.UUID) ([]uuid.UUID, error)
	GetBoardsByIDs(ctx context.Context, boardIDs []uuid.UUID) ([]models.Board, error)
	ResolveInboxUserConsumersForRootListCard(ctx context.Context, rootListCardID uuid.UUID) ([]uuid.UUID, error)
	ResolveInboxCardIDsForUserAndRootListCard(ctx context.Context, userID, rootListCardID uuid.UUID) ([]uuid.UUID, error)
	GetExternalRootRefsByIDs(ctx context.Context, rootIDs []uuid.UUID) ([]models.ExternalRootRefRow, error)
	GetUsersToBeNotifiedSingleQuery(ctx context.Context, targetIDsByEntity map[string][]uuid.UUID) (map[string][]uuid.UUID, error)
	GetUsersToBeNotifiedFlatSingleQuery(ctx context.Context, targetIDsByEntity map[string][]uuid.UUID) ([]uuid.UUID, error)
	CreateUserAuditNotifications(ctx context.Context, notifications []models.UserAuditNotification) error
	GetUserUnreadNotificationCount(ctx context.Context, userID uuid.UUID) (int, error)
	GetWorkspaceCardActivityPaginated(ctx context.Context,
		workspaceID, cardID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.AuditPage, error)
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUserWorkspaceRole(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (string, error)
}

func NewEventRegistryService(repo EventRepository, hub *ws.Hub, workspaceResolver WorkspaceResolver, membershipRepo MembershipRepo, auditContextRepo auditcontext.Reader) *EventRegistryService {
	return &EventRegistryService{
		repo:              repo,
		Hub:               hub,
		workspaceResolver: workspaceResolver,
		MembershipRepo:    membershipRepo,
		auditContextRepo:  auditContextRepo,
		handlers:          buildHandlers(auditContextRepo),
	}
}

func (s *EventRegistryService) Emit(ctx context.Context, tx *gorm.DB, event DomainEvent) error {
	//Validate event type
	fmt.Printf("Emitting event: %s, BoardID: %v, ActorUserID: %v, WorkspaceID: %v\n", event.Type, event.BoardID, event.ActorUserID, event.WorkspaceID)
	if !event.Type.IsValidEventType() {
		fmt.Println("Invalid event type:", event.Type)
		return nil
	}

	db := tx
	if db == nil {
		db = s.db
	}
	if db == nil {
		fmt.Println("Error-1: db is nil in EventRegistryService.Emit")
		return fmt.Errorf("event registry emit: nil db")
	}
	if event.WorkspaceID == nil && event.BoardID != nil {
		if s.workspaceResolver == nil {
			fmt.Println("Error-2: workspace resolver is nil in EventRegistryService.Emit when resolving workspace ID for board event")
			return fmt.Errorf("event registry emit: workspace resolver is nil for board event")
		}
		workspaceID, err := s.workspaceResolver.ResolveWorkspaceID(ctx, *event.BoardID)
		if err != nil {
			fmt.Println("Error-3: failed to resolve workspace ID for board event in EventRegistryService.Emit:", err)
			return err
		}
		event.WorkspaceID = &workspaceID
	}

	handler, err := getHandler(s.handlers, event.Type)
	if err != nil {
		fmt.Println("Error-4: no handler found for event type in EventRegistryService.Emit:", event.Type)
		return err
	}

	buildResult, err := handler.Build(ctx, event)
	if err != nil {
		fmt.Println("Error-5: failed to build event payload in EventRegistryService.Emit for event type:", event.Type, "error:", err)
		return err
	}

	payloadByte, err := json.Marshal(buildResult.FeedPayload)
	if err != nil {
		fmt.Println("Error-6: failed to marshal event payload in EventRegistryService.Emit for event type:", event.Type, "error:", err)
		return err
	}
	payloadJSON := datatypes.JSON(payloadByte)

	auditEvent := models.BoardAuditEvent{
		ID:          uuid.New(),
		BoardID:     event.BoardID,
		WorkspaceID: event.WorkspaceID,
		ActorUserID: *event.ActorUserID,
		ActionType:  string(event.Type),
		Payload:     payloadJSON, // Use the actual payload data
		CreatedAt:   event.OccurredAt,
	}
	targets := buildResult.Targets
	if len(targets) == 0 {
		targets = event.Targets
	}

	if buildResult.MainEntity.EntityID == uuid.Nil || buildResult.MainEntity.EntityType == "" {
		fmt.Println("Error-7: missing main entity in build result for event type:", event.Type)
		return fmt.Errorf("event registry emit: missing main entity in build result for event type %s", event.Type)
	}

	auditEvent.MainEntityID = buildResult.MainEntity.EntityID
	auditEvent.MainEntityType = buildResult.MainEntity.EntityType

	eventTargets := make([]models.AuditEventTargets, 0, len(targets))
	for _, target := range targets {
		targetBoardID := event.BoardID
		if target.BoardID != nil {
			targetBoardID = target.BoardID
		}
		if targetBoardID == nil {
			continue
		}
		eventTargets = append(eventTargets, models.AuditEventTargets{
			ID:          uuid.New(),
			AuditID:     auditEvent.ID,
			BoardID:     *targetBoardID,
			WorkspaceID: event.WorkspaceID,
			EntityType:  target.EntityType,
			EntityID:    target.EntityID,
			CreatedAt:   event.OccurredAt,
		})
	}
	err = db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.repo.CreateAuditEvent(ctx, tx, &auditEvent); err != nil {
			fmt.Println("Error-8: Tx.CreateAuditEvent")
			return err
		}
		if len(eventTargets) > 0 {
			if err := s.repo.CreateAuditEventTargets(ctx, tx, eventTargets); err != nil {
				fmt.Println("Error-9: Tx.CreateAuditEventTargets")
				return err
			}
		}
		return nil
	})
	if err != nil {
		fmt.Println("Error-10: failed to create audit event and targets in transaction in EventRegistryService.Emit for event type:", event.Type, "error:", err)
		return err
	}
	targetIDsByEntity := make(map[string][]uuid.UUID)
	for _, target := range targets {
		if targetIDsByEntity[target.EntityType] == nil {
			targetIDsByEntity[target.EntityType] = []uuid.UUID{}
		}
		targetIDsByEntity[target.EntityType] = append(targetIDsByEntity[target.EntityType], target.EntityID)
	}

	affectedBoardIDs := make([]uuid.UUID, 0)
	affectedBoardSet := make(map[uuid.UUID]struct{})
	resolvedBoardIDs, err := s.repo.GetAffectedBoardIDsForTargets(ctx, targetIDsByEntity)
	if err != nil {
		fmt.Println("Error-11b: failed to resolve affected boards in EventRegistryService.Emit for event type:", event.Type, "error:", err)
		return err
	}
	for _, boardID := range resolvedBoardIDs {
		if boardID == uuid.Nil {
			continue
		}
		if _, exists := affectedBoardSet[boardID]; exists {
			continue
		}
		affectedBoardSet[boardID] = struct{}{}
		affectedBoardIDs = append(affectedBoardIDs, boardID)
	}
	if event.BoardID != nil {
		if _, exists := affectedBoardSet[*event.BoardID]; !exists {
			affectedBoardSet[*event.BoardID] = struct{}{}
			affectedBoardIDs = append(affectedBoardIDs, *event.BoardID)
		}
	}

	if event.Type == EventBoardPatched && event.BoardID != nil {
		mirrorConsumerBoardIDs, err := s.repo.ResolveBoardConsumersForSourceBoardMirrors(ctx, *event.BoardID)
		if err != nil {
			fmt.Println("Error-11c: failed to resolve mirror consumer boards for board.patched:", err)
			return err
		}
		for _, boardID := range mirrorConsumerBoardIDs {
			if boardID == uuid.Nil {
				continue
			}
			if _, exists := affectedBoardSet[boardID]; exists {
				continue
			}
			affectedBoardSet[boardID] = struct{}{}
			affectedBoardIDs = append(affectedBoardIDs, boardID)
		}
	}

	if (event.Type == EventCardMirrored || event.Type == EventCardMirroredTarget || event.Type == EventCardMirroredSource) && event.BoardID != nil {
		affectedBoardIDs = []uuid.UUID{*event.BoardID}
	}

	usersToBeNotified, err := s.repo.GetUsersToBeNotifiedFlatSingleQuery(ctx, targetIDsByEntity)
	if err != nil {
		fmt.Println("Error-11: failed to get users to be notified in EventRegistryService.Emit for event type:", event.Type, "error:", err)
		return err
	}
	if event.MentionedUserIDs != nil {
		usersToBeNotified = append(usersToBeNotified, event.MentionedUserIDs...)
	}

	notifications := make([]models.UserAuditNotification, 0, len(usersToBeNotified))
	for _, userID := range usersToBeNotified {
		notifications = append(notifications, models.UserAuditNotification{
			ID:      uuid.New(),
			UserID:  userID,
			AuditID: auditEvent.ID,
			Read:    false,
		})
	}
	if len(notifications) > 0 {
		if err := s.repo.CreateUserAuditNotifications(ctx, notifications); err != nil {
			fmt.Println("Error-12: failed to create user audit notifications in EventRegistryService.Emit for event type:", event.Type, "error:", err)
			return err
		}

		for _, notification := range notifications {
			userNortificationRow := dto.UserNotificationRow{
				BoardAuditEvent:       auditEvent,
				NotificationID:        notification.ID,
				Read:                  false,
				NotificationCreatedAt: notification.CreatedAt,
				NotificationUpdatedAt: notification.UpdatedAt,
				NotificationDeletedAt: &notification.DeletedAt.Time,
			}
			userNotificationResponse := dto.UserAuditNotificationRowToResponse(userNortificationRow)
			unreadCount, err := s.repo.GetUserUnreadNotificationCount(ctx, notification.UserID)
			if err != nil {
				fmt.Println("Error-13: failed to get user unread notification count in EventRegistryService.Emit for event type:", event.Type, "error:", err)
				return err
			}

			userEventPayload := ws.UserNotificationCreatedPayload{
				Notification: userNotificationResponse,
				UnreadCount:  unreadCount,
				Delta:        1,
			}
			s.Hub.BroadCastToUser(ws.UserEvent{
				Type:            "notification.created",
				RecipientUserID: notification.UserID,
				WorkspaceID:     event.WorkspaceID,
				Payload: ws.UserEventPayload{
					UserNotificationCreatedPayload: &userEventPayload,
				},
				TS:            event.OccurredAt,
				ID:            uuid.New(),
				ActorUserID:   event.ActorUserID,
				CorrelationID: event.CorrelationID,
			})
		}
	}

	fmt.Println("Before Emitted event:", event.Type, "for BoardID:", event.BoardID, "with targets:", targets)
	if event.Type.IsBoardCoreToastEvent() {
		if len(affectedBoardIDs) == 0 && event.BoardID != nil {
			affectedBoardIDs = append(affectedBoardIDs, *event.BoardID)
		}
		for _, boardID := range affectedBoardIDs {
			fmt.Println("Emitting board event to WebSocket for event type:", event.Type, "BoardID:", boardID)
			wsPayload := EventPayloadEnvelope{
				StatePayload:    buildResult.StatePayload,
				RealtimePayload: buildResult.RealtimePayload,
				FeedPayload:     buildResult.FeedPayload,
			}
			wsEvent := ws.Event{
				Type:          string(event.Type),
				BoardID:       boardID,
				Payload:       wsPayload,
				TS:            event.OccurredAt,
				ID:            uuid.New(),
				ActorUserID:   event.ActorUserID,
				CorrelationID: event.CorrelationID,
			}
			s.Hub.BroadCastToBoard(wsEvent)
		}
	} else if event.WorkspaceID != nil && !event.Type.IsUserFanOutEvent() {
		fmt.Println("Emitting workspace event to WebSocket for event type:", event.Type, "WorkspaceID:", *event.WorkspaceID)
		wsEvent := ws.WorkspaceEvent{
			Type:        string(event.Type),
			WorkspaceID: *event.WorkspaceID,
			Payload: EventPayloadEnvelope{
				StatePayload: buildResult.StatePayload,
				FeedPayload:  buildResult.FeedPayload,
			},
			TS:            event.OccurredAt,
			ID:            uuid.New(),
			ActorUserID:   event.ActorUserID,
			CorrelationID: event.CorrelationID,
		}
		s.Hub.BroadCastToWorkspace(wsEvent)
	}
	if event.Type.IsWorkspaceCoreToastEvent() {
		fmt.Println("Emitting workspace core toast event to WebSocket for event type:", event.Type, "WorkspaceID:", *event.WorkspaceID)
		wsEvent := ws.WorkspaceEvent{
			Type:        string(event.Type),
			WorkspaceID: *event.WorkspaceID,
			Payload: EventPayloadEnvelope{
				StatePayload: buildResult.StatePayload,
				FeedPayload:  buildResult.FeedPayload,
			},
			TS:            event.OccurredAt,
			ID:            uuid.New(),
			ActorUserID:   event.ActorUserID,
			CorrelationID: event.CorrelationID,
		}
		s.Hub.BroadCastToWorkspace(wsEvent)
	}
	if event.Type.IsUserFanOutEvent() {
		fmt.Printf("[eventregistry][fanout.start] event=%s workspace=%v recipients=%d correlation=%v\n", event.Type, event.WorkspaceID, len(buildResult.UserPayload), event.CorrelationID)
		for userID, payload := range buildResult.UserPayload {
			userEventType := event.UserEventType
			if buildResult.UserEventType != nil {
				userEventType = buildResult.UserEventType
			}
			if buildResult.UserEventTypeByUserID != nil {
				if byUserType, ok := buildResult.UserEventTypeByUserID[userID]; ok {
					userEventType = &byUserType
				}
			}
			if userEventType == nil {
				return fmt.Errorf("event registry emit: missing user event type for fan-out event type %s and user %s", event.Type, userID)
			}

			fmt.Printf("[eventregistry][fanout.emit] event=%s userEventType=%s recipient=%s correlation=%v payloadKeys=%+v\n", event.Type, *userEventType, userID.String(), event.CorrelationID, payload)
			wsEvent := ws.UserEvent{
				Type:            string(*userEventType),
				RecipientUserID: userID,
				WorkspaceID:     event.WorkspaceID,
				Payload:         payload,
				TS:              event.OccurredAt,
				ID:              uuid.New(),
				ActorUserID:     event.ActorUserID,
				CorrelationID:   event.CorrelationID,
			}
			s.Hub.BroadCastToUser(wsEvent)
		}
	}

	return nil
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

func (s *EventRegistryService) EmitCrossBoardMove(ctx context.Context, req CrossBoardMoveEmitRequest) error {
	if req.OccurredAt.IsZero() {
		req.OccurredAt = time.Now()
	}

	if req.SourceBoardID == uuid.Nil || req.TargetBoardID == uuid.Nil {
		return fmt.Errorf("event registry cross-board move: invalid identifiers")
	}

	effectiveRootListCardID := req.RootListCardID
	if effectiveRootListCardID == uuid.Nil {
		effectiveRootListCardID = req.MovedListCardID
	}
	if effectiveRootListCardID == uuid.Nil {
		return fmt.Errorf("event registry cross-board move: missing root list card identifier")
	}

	if req.WorkspaceID == nil {
		if s.workspaceResolver == nil {
			return fmt.Errorf("event registry cross-board move: workspace resolver unavailable")
		}
		workspaceID, err := s.workspaceResolver.ResolveWorkspaceID(ctx, req.SourceBoardID)
		if err != nil {
			return err
		}
		req.WorkspaceID = &workspaceID
	}

	boardConsumers, err := s.repo.ResolveBoardConsumersForRootListCard(ctx, effectiveRootListCardID, req.SourceBoardID, req.TargetBoardID)
	if err != nil {
		return err
	}

	externalRootRows, err := s.repo.GetExternalRootRefsByIDs(ctx, []uuid.UUID{effectiveRootListCardID})
	if err != nil {
		return err
	}

	boardsRows, err := s.repo.GetBoardsByIDs(ctx, []uuid.UUID{req.SourceBoardID, req.TargetBoardID})
	if err != nil {
		return err
	}
	boardsPayload := make(map[uuid.UUID]dto.BoardResponse, len(boardsRows))
	for i := range boardsRows {
		boardRow := boardsRows[i]
		boardsPayload[boardRow.ID] = dto.BoardToResponse(&boardRow)
	}

	externalRootsByID := make(map[uuid.UUID]dto.ExternalRootRefResponse)
	for i := range externalRootRows {
		row := externalRootRows[i]
		if row.RootListCardID == uuid.Nil {
			continue
		}
		if _, exists := externalRootsByID[row.RootListCardID]; exists {
			continue
		}
		externalRootsByID[row.RootListCardID] = dto.ExternalRootRefToResponse(&row)
	}

	mapIDs := func(listCards []dto.ListCardResponse) []string {
		ids := make([]string, 0, len(listCards))
		for _, lc := range listCards {
			ids = append(ids, lc.ID.String())
		}
		return ids
	}

	buildBoardPayload := func(boardID uuid.UUID) CrossBoardMoveBoardPayload {
		cards := map[uuid.UUID]dto.CardResponse{}
		if req.CardPatch.ID != uuid.Nil {
			cards[req.CardID] = req.CardPatch
		}

		payload := CrossBoardMoveBoardPayload{
			RootListCardID:      effectiveRootListCardID.String(),
			MovedListCardID:     req.MovedListCardID.String(),
			CardID:              req.CardID.String(),
			Cards:               cards,
			Boards:              boardsPayload,
			SourceBoardID:       req.SourceBoardID.String(),
			TargetBoardID:       req.TargetBoardID.String(),
			FromListID:          req.SourceListID.String(),
			ToListID:            req.TargetListID.String(),
			ListCardPatch:       req.ListCardPatch,
			FromListCards:       []dto.ListCardResponse{},
			ToListCards:         []dto.ListCardResponse{},
			ListCardIdsByListID: map[string][]string{},
			ExternalRootsByID:   externalRootsByID,
		}

		if boardID == req.SourceBoardID {
			payload.FromListCards = req.FromListCards
			payload.ListCardIdsByListID[req.SourceListID.String()] = mapIDs(req.FromListCards)
		}
		if boardID == req.TargetBoardID {
			payload.ToListCards = req.ToListCards
			payload.ListCardIdsByListID[req.TargetListID.String()] = mapIDs(req.ToListCards)
		}

		return payload
	}

	for _, boardID := range boardConsumers {
		if boardID == uuid.Nil {
			continue
		}
		s.Hub.BroadCastToBoard(ws.Event{
			Type:          string(EventListCardCrossBoardMoved),
			BoardID:       boardID,
			Payload:       buildBoardPayload(boardID),
			TS:            req.OccurredAt,
			ActorUserID:   req.ActorUserID,
			CorrelationID: req.CorrelationID,
		})
	}

	inboxUsers, err := s.repo.ResolveInboxUserConsumersForRootListCard(ctx, effectiveRootListCardID)
	if err != nil {
		return err
	}

	for _, userID := range inboxUsers {
		if userID == uuid.Nil {
			continue
		}
		affectedInboxCardIDs, err := s.repo.ResolveInboxCardIDsForUserAndRootListCard(ctx, userID, effectiveRootListCardID)
		if err != nil {
			return err
		}

		payload := ws.InboxRootCardMovedPayload{
			RootListCardID:       effectiveRootListCardID,
			CardID:               req.CardID,
			SourceBoardID:        req.SourceBoardID,
			TargetBoardID:        req.TargetBoardID,
			SourceListID:         req.SourceListID,
			TargetListID:         req.TargetListID,
			AffectedInboxCardIDs: affectedInboxCardIDs,
			ExternalRootsByID:    externalRootsByID,
		}

		s.Hub.BroadCastToUser(ws.UserEvent{
			Type:            string(ws.EventInboxRootCardMoved),
			RecipientUserID: userID,
			WorkspaceID:     req.WorkspaceID,
			Payload: ws.UserEventPayload{
				InboxRootCardMovedPayload: &payload,
			},
			TS:            req.OccurredAt,
			ActorUserID:   req.ActorUserID,
			CorrelationID: req.CorrelationID,
		})
	}

	return nil
}
