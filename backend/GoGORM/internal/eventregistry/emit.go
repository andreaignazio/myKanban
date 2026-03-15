package EventRegistry

import (
	"GoGORM/internal/dto"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func (s *EventRegistryService) Emit(ctx context.Context, tx *gorm.DB, event DomainEvent) error {
	if !event.Type.IsValidEventType() {
		log.Printf("[emit] invalid event type: %s", event.Type)
		return nil
	}

	db := tx
	if db == nil {
		db = s.db
	}
	if db == nil {
		log.Printf("[emit] error: db is nil for event type %s", event.Type)
		return fmt.Errorf("event registry emit: nil db")
	}
	if event.WorkspaceID == nil && event.BoardID != nil {
		if s.workspaceResolver == nil {
			log.Printf("[emit] error: workspace resolver is nil for board event (type=%s)", event.Type)
			return fmt.Errorf("event registry emit: workspace resolver is nil for board event")
		}
		workspaceID, err := s.workspaceResolver.ResolveWorkspaceID(ctx, *event.BoardID)
		if err != nil {
			log.Printf("[emit] error: failed to resolve workspace ID for board event (type=%s): %v", event.Type, err)
			return err
		}
		event.WorkspaceID = &workspaceID
	}

	handler, err := getHandler(s.handlers, event.Type)
	if err != nil {
		log.Printf("[emit] error: no handler for event type %s", event.Type)
		return err
	}

	buildResult, err := handler.Build(ctx, event)
	if err != nil {
		log.Printf("[emit] error: handler.Build failed for event type %s: %v", event.Type, err)
		return err
	}

	var mirrorPropagationResult *MirrorPropagationResult
	if shouldAttachRootBoardInvalidations(event.Type) || shouldResolveAdditionalFanoutBoards(event.Type) {
		mirrorPropagationResult, err = s.resolveMirrorPropagation(ctx, MirrorPropagationInput{
			Event:       event,
			BuildResult: buildResult,
		})
		if err != nil {
			log.Printf("[emit] error: mirror propagation failed for event type %s: %v", event.Type, err)
			return err
		}
	}

	payloadByte, err := json.Marshal(buildResult.FeedPayload)
	if err != nil {
		log.Printf("[emit] error: failed to marshal feed payload for event type %s: %v", event.Type, err)
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
			return err
		}
		if len(eventTargets) > 0 {
			if err := s.repo.CreateAuditEventTargets(ctx, tx, eventTargets); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		log.Printf("[emit] error: failed to persist audit event for type %s: %v", event.Type, err)
		return err
	}

	targetIDsByEntity := make(map[string][]uuid.UUID)
	for _, target := range targets {
		if targetIDsByEntity[target.EntityType] == nil {
			targetIDsByEntity[target.EntityType] = []uuid.UUID{}
		}
		targetIDsByEntity[target.EntityType] = append(targetIDsByEntity[target.EntityType], target.EntityID)
	}

	if err := s.EmitNotificationHandler(ctx, event, auditEvent, targetIDsByEntity); err != nil {
		log.Printf("[emit] error: notification handler failed for event type %s: %v", event.Type, err)
		return err
	}

	affectedBoardIDs := make([]uuid.UUID, 0)
	affectedBoardSet := make(map[uuid.UUID]struct{})
	resolvedBoardIDs, err := s.repo.GetAffectedBoardIDsForTargets(ctx, targetIDsByEntity)
	if err != nil {
		log.Printf("[emit] error: failed to resolve affected boards for type %s: %v", event.Type, err)
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
	if mirrorPropagationResult != nil {
		for _, boardID := range mirrorPropagationResult.AffectedBoardIDs {
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

	additionalFanoutBoardIDs, err := s.resolveAdditionalFanoutBoardIDs(ctx, event, buildResult)
	if err != nil {
		log.Printf("[emit] error: failed to resolve additional fanout boards for type %s: %v", event.Type, err)
		return err
	}
	for _, boardID := range additionalFanoutBoardIDs {
		if boardID == uuid.Nil {
			continue
		}
		if _, exists := affectedBoardSet[boardID]; exists {
			continue
		}
		affectedBoardSet[boardID] = struct{}{}
		affectedBoardIDs = append(affectedBoardIDs, boardID)
	}

	// Disabled on purpose: forcing card mirrored events to a single board drops already
	// resolved fan-out targets and can desynchronize affectedBoardIDs from affectedBoardSet.
	// if (event.Type == EventCardMirrored || event.Type == EventCardMirroredTarget || event.Type == EventCardMirroredSource) && event.BoardID != nil {
	// 	affectedBoardIDs = []uuid.UUID{*event.BoardID}
	// 	affectedBoardSet = map[uuid.UUID]struct{}{*event.BoardID: {}}
	// 	fmt.Printf("[eventregistry][card-mirrored.post-reset] event=%s board=%v affectedBoardIDs=%v affectedBoardSet=%+v\n", event.Type, event.BoardID, affectedBoardIDs, affectedBoardSet)
	// }

	boardIdsForMirroredListsTargets, err := s.resolveBoardIDsForMirroredListsTargets(ctx, targetIDsByEntity)
	if err != nil {
		log.Printf("[emit] error: failed to resolve mirrored list board IDs for type %s: %v", event.Type, err)
		return err
	}

	for _, boardID := range boardIdsForMirroredListsTargets {
		if boardID == uuid.Nil {
			continue
		}
		if _, exists := affectedBoardSet[boardID]; exists {
			continue
		}
		affectedBoardSet[boardID] = struct{}{}
		affectedBoardIDs = append(affectedBoardIDs, boardID)
	}
	if event.Type.IsBoardCoreToastEvent() {
		if len(affectedBoardIDs) == 0 && event.BoardID != nil {
			affectedBoardIDs = append(affectedBoardIDs, *event.BoardID)
		}
		invalidatedListCardIDs := []string{}
		if mirrorPropagationResult != nil {
			invalidatedListCardIDs = uuidListToStrings(mirrorPropagationResult.InvalidatedListCardIDs)
		}
		for _, boardID := range affectedBoardIDs {
			wsPayload := EventPayloadEnvelope{
				StatePayload:    buildResult.StatePayload,
				RealtimePayload: buildResult.RealtimePayload,
				FeedPayload:     buildResult.FeedPayload,
			}
			if len(invalidatedListCardIDs) > 0 {
				wsPayload.Invalidations = &EventInvalidations{RootBoardListCardIds: invalidatedListCardIDs}
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
			log.Printf("[emit] board  evt=%s board=%s", event.Type, boardID)
			s.Hub.BroadCastToBoard(wsEvent)
		}
	} else if event.WorkspaceID != nil && !event.Type.IsUserFanOutEvent() {
		resolvedBoardID := uuid.Nil
		for _, target := range targets {
			if target.EntityType == "board" && target.EntityID != uuid.Nil {
				resolvedBoardID = target.EntityID
				break
			}
		}
		if resolvedBoardID == uuid.Nil && event.BoardID != nil {
			resolvedBoardID = *event.BoardID
		}

		invalidatedListCardIDs := []string{}
		if mirrorPropagationResult != nil {
			invalidatedListCardIDs = uuidListToStrings(mirrorPropagationResult.InvalidatedListCardIDs)
		}

		workspacePayload := EventPayloadEnvelope{
			StatePayload:    buildResult.StatePayload,
			RealtimePayload: buildResult.RealtimePayload,
			FeedPayload:     buildResult.FeedPayload,
		}
		if len(invalidatedListCardIDs) > 0 {
			workspacePayload.Invalidations = &EventInvalidations{RootBoardListCardIds: invalidatedListCardIDs}
		}

		wsEvent := ws.WorkspaceEvent{
			Type:          string(event.Type),
			WorkspaceID:   *event.WorkspaceID,
			Payload:       workspacePayload,
			TS:            event.OccurredAt,
			ID:            uuid.New(),
			ActorUserID:   event.ActorUserID,
			CorrelationID: event.CorrelationID,
		}
		log.Printf("[emit] workspace evt=%s workspace=%s", event.Type, *event.WorkspaceID)
		s.Hub.BroadCastToWorkspace(wsEvent)
	}
	if event.Type.IsWorkspaceCoreToastEvent() {
		resolvedBoardID := uuid.Nil
		for _, target := range targets {
			if target.EntityType == "board" && target.EntityID != uuid.Nil {
				resolvedBoardID = target.EntityID
				break
			}
		}
		if resolvedBoardID == uuid.Nil && event.BoardID != nil {
			resolvedBoardID = *event.BoardID
		}

		invalidatedListCardIDs := []string{}
		if mirrorPropagationResult != nil {
			invalidatedListCardIDs = uuidListToStrings(mirrorPropagationResult.InvalidatedListCardIDs)
		}

		workspacePayload := EventPayloadEnvelope{
			StatePayload:    buildResult.StatePayload,
			RealtimePayload: buildResult.RealtimePayload,
			FeedPayload:     buildResult.FeedPayload,
		}
		if len(invalidatedListCardIDs) > 0 {
			workspacePayload.Invalidations = &EventInvalidations{RootBoardListCardIds: invalidatedListCardIDs}
		}

		wsEvent := ws.WorkspaceEvent{
			Type:          string(event.Type),
			WorkspaceID:   *event.WorkspaceID,
			Payload:       workspacePayload,
			TS:            event.OccurredAt,
			ID:            uuid.New(),
			ActorUserID:   event.ActorUserID,
			CorrelationID: event.CorrelationID,
		}
		log.Printf("[emit] workspace-toast evt=%s workspace=%s", event.Type, *event.WorkspaceID)
		s.Hub.BroadCastToWorkspace(wsEvent)
	}
	if err := s.emitMirrorPropagationUserEvents(event, mirrorPropagationResult); err != nil {
		return err
	}
	if event.Type.IsUserFanOutEvent() {
		if err := s.emitHandlerUserFanOutEvents(event, buildResult); err != nil {
			return err
		}
	}

	return nil
}

func (s *EventRegistryService) emitUserEvent(userEvent ws.UserEvent) {
	if userEvent.RecipientUserID == uuid.Nil {
		return
	}
	if userEvent.ID == uuid.Nil {
		userEvent.ID = uuid.New()
	}
	log.Printf("[emit] user   evt=%s user=%s", userEvent.Type, userEvent.RecipientUserID)
	s.Hub.BroadCastToUser(userEvent)
}

func (s *EventRegistryService) emitUserEvents(userEvents []ws.UserEvent) {
	for _, userEvent := range userEvents {
		s.emitUserEvent(userEvent)
	}
}

func (s *EventRegistryService) emitMirrorPropagationUserEvents(event DomainEvent, mirrorPropagationResult *MirrorPropagationResult) error {
	if mirrorPropagationResult == nil || len(mirrorPropagationResult.UserTargets) == 0 {
		return nil
	}

	userEvents := make([]ws.UserEvent, 0, len(mirrorPropagationResult.UserTargets))
	for _, userTarget := range mirrorPropagationResult.UserTargets {
		if userTarget.UserID == uuid.Nil {
			continue
		}
		if len(userTarget.AffectedInboxCardIDs) == 0 && len(userTarget.InvalidatedListCardIDs) == 0 {
			continue
		}

		userEvents = append(userEvents, ws.UserEvent{
			Type:            string(ws.EventInboxCardsInvalidated),
			RecipientUserID: userTarget.UserID,
			WorkspaceID:     event.WorkspaceID,
			Payload: ws.UserEventPayload{
				InboxCardsInvalidatedPayload: &ws.InboxCardsInvalidatedPayload{
					AffectedInboxCardIDs:   userTarget.AffectedInboxCardIDs,
					InvalidatedListCardIDs: userTarget.InvalidatedListCardIDs,
				},
			},
			TS:            event.OccurredAt,
			ActorUserID:   event.ActorUserID,
			CorrelationID: event.CorrelationID,
		})
	}

	s.emitUserEvents(userEvents)
	return nil
}

func (s *EventRegistryService) emitHandlerUserFanOutEvents(event DomainEvent, buildResult EventBuildResult) error {
	userEvents := make([]ws.UserEvent, 0, len(buildResult.UserPayload))
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

		userEvents = append(userEvents, ws.UserEvent{
			Type:            string(*userEventType),
			RecipientUserID: userID,
			WorkspaceID:     event.WorkspaceID,
			Payload:         payload,
			TS:              event.OccurredAt,
			ActorUserID:     event.ActorUserID,
			CorrelationID:   event.CorrelationID,
		})
	}

	s.emitUserEvents(userEvents)
	return nil
}

func (s *EventRegistryService) EmitNotificationHandler(ctx context.Context, event DomainEvent, auditEvent models.BoardAuditEvent, targetIDsByEntity map[string][]uuid.UUID) error {

	usersToBeNotified, err := s.repo.GetUsersToBeNotifiedFlatSingleQuery(ctx, targetIDsByEntity)
	if err != nil {
		log.Printf("[emit] error: failed to get notification targets for type %s: %v", event.Type, err)
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
			log.Printf("[emit] error: failed to create notifications for type %s: %v", event.Type, err)
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
				log.Printf("[emit] error: failed to get unread count for user %s (type=%s): %v", notification.UserID, event.Type, err)
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
	return nil
}

func (s *EventRegistryService) resolveBoardIDsForMirroredListsTargets(ctx context.Context, targetIDsByEntity map[string][]uuid.UUID) ([]uuid.UUID, error) {

	listIds := targetIDsByEntity["list"]
	if len(listIds) == 0 {
		return nil, nil
	}
	boardIds, err := s.ResolveBoardIDsForMirroredLists(ctx, listIds)
	if err != nil {
		return nil, err
	}
	return boardIds, nil
}
