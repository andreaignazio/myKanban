package subscription

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/guard"
	"GoGORM/internal/rbac"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"errors"
	"log"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SubscriptionService struct {
	db                *gorm.DB
	SubscriptionRepo  SubscriptionRepo
	SuspensionService *WorkspaceSuspensionService
	MembershipRepo    MembershipRepo
	BillingProvider   BillingProvider
	WebhookInboxRepo  WebhookInboxRepo
	EventRegistry     *EventRegistry.EventRegistryService
	IncludeDeleted    bool
}

type SubscriptionRepo interface {
	GetWorkspaceSubscription(ctx context.Context, workspaceID uuid.UUID) (*models.WorkspaceSubscription, error)
	CountWorkspaceBoards(ctx context.Context, workspaceID uuid.UUID) (int64, error)
	ListWorkspaceBoardsForSuspension(ctx context.Context, workspaceID uuid.UUID) ([]WorkspaceBoardSuspensionCandidate, error)
	ListWorkspaceMembersForSuspension(ctx context.Context, workspaceID uuid.UUID) ([]WorkspaceMemberSuspensionCandidate, error)
	UpsertFromWebhook(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID, event BillingWebhookEvent) error
	UpdatePendingChange(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID, pending PendingSubscriptionChange) error
	ClearPendingChange(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID) error
	ApplyWorkspaceBoardSuspensionState(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID, suspendedIDs, pendingIDs []uuid.UUID) error
	ApplyWorkspaceMemberSuspensionState(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID, suspendedIDs, pendingIDs []uuid.UUID) error
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUserWorkspaceRole(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (string, error)
}

type BillingProvider interface {
	//EnsureProviderCustomer(ctx context.Context, workspaceID, ownerUserID uuid.UUID) (string, error)
	VerifyAndParseWebhook(ctx context.Context, rawBody []byte, signatureHeader string) (*BillingWebhookEvent, error)
	CreateCheckoutSession(ctx context.Context, input CreateCheckoutSessionInput) (*CreateCheckoutSessionOutput, error)
	CreateSubscriptionUpdateConfirmationSession(ctx context.Context, input CreateSubscriptionUpdateConfirmationSessionInput) (*CreateCheckoutSessionOutput, error)
	GetSubscriptionState(ctx context.Context, input GetSubscriptionStateInput) (*BillingWebhookEvent, error)
	CancelSubscription(ctx context.Context, subscriptionID string) (*BillingWebhookEvent, error)
	ResumeSubscription(ctx context.Context, subscriptionID string) (*BillingWebhookEvent, error)
	ScheduleSubscriptionPlanChange(ctx context.Context, input ScheduleSubscriptionPlanChangeInput) (*ScheduleSubscriptionPlanChangeOutput, error)
	ReleaseSubscriptionSchedule(ctx context.Context, scheduleID string) error
}

type WebhookInboxRepo interface {
	TryAcquire(ctx context.Context, provider string, eventID string) (bool, error)
	MarkProcessed(provider string, eventID string, processedAt time.Time) error
	//MarkFailed(provider string, eventID string, failedAt time.Time, reason string) error
}

func NewSubscriptionService(
	db *gorm.DB,
	subscriptionRepo SubscriptionRepo,
	membershipRepo MembershipRepo,
	billingProvider BillingProvider,
	webhookInboxRepo WebhookInboxRepo,
	includeDeleted bool) *SubscriptionService {
	svc := &SubscriptionService{
		db:               db,
		SubscriptionRepo: subscriptionRepo,
		MembershipRepo:   membershipRepo,
		BillingProvider:  billingProvider,
		WebhookInboxRepo: webhookInboxRepo,
		IncludeDeleted:   includeDeleted,
	}
	svc.SuspensionService = NewWorkspaceSuspensionService(db, subscriptionRepo, membershipRepo, includeDeleted)
	return svc
}

func (s *SubscriptionService) WithEventRegistry(er *EventRegistry.EventRegistryService) *SubscriptionService {
	s.EventRegistry = er
	return s
}

func (s *SubscriptionService) CheckWorkspaceMembershipLimit(ctx context.Context, userID uuid.UUID) (bool, error) {
	return true, nil
}

func (s *SubscriptionService) StartCheckoutForWorkspace(ctx context.Context, workspaceID, actorUserID uuid.UUID,
	req *RequestSubscriptionCheckout) (*SubscriptionCheckoutResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, actorUserID, workspaceID, rbac.Owner, s.IncludeDeleted); err != nil {
		return nil, err
	}

	currentSubscription, err := s.SubscriptionRepo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to fetch workspace subscription")
	}

	if currentSubscription == nil || currentSubscription.ProviderSubscriptionID == nil || *currentSubscription.ProviderSubscriptionID == "" {
		return s.startNewCheckout(ctx, workspaceID, actorUserID, req)
	}

	comparison, ok := req.PlanCode.Compare(currentSubscription.Plan)
	if !ok {
		return nil, domainerr.New(nil, "invalid subscription plan transition")
	}
	isImmediateUpgrade := comparison > 0 || (comparison == 0 && req.Seats > currentSubscription.SeatQuantity)

	if req.PlanCode == currentSubscription.Plan && req.Seats == currentSubscription.SeatQuantity {
		if currentSubscription.ProviderScheduleID == nil || *currentSubscription.ProviderScheduleID == "" {
			return subscriptionActionResponse(SubscriptionActionUpdated, currentSubscription), nil
		}

		if err := s.BillingProvider.ReleaseSubscriptionSchedule(ctx, *currentSubscription.ProviderScheduleID); err != nil {
			return nil, domainerr.Wrap(err, "failed to release pending subscription schedule")
		}

		updatedSubscription, err := s.updatePendingChangeAndFetch(ctx, workspaceID, PendingSubscriptionChange{})
		if err != nil {
			return nil, err
		}

		return subscriptionActionResponse(SubscriptionActionUpdated, updatedSubscription), nil
	}

	if currentSubscription.ProviderScheduleID != nil && *currentSubscription.ProviderScheduleID != "" {
		if err := s.BillingProvider.ReleaseSubscriptionSchedule(ctx, *currentSubscription.ProviderScheduleID); err != nil {
			return nil, domainerr.Wrap(err, "failed to release existing subscription schedule")
		}
		if _, err := s.updatePendingChangeAndFetch(ctx, workspaceID, PendingSubscriptionChange{}); err != nil {
			return nil, err
		}
	}

	if isImmediateUpgrade {
		if currentSubscription.ProviderCustomerID == nil || *currentSubscription.ProviderCustomerID == "" {
			return nil, domainerr.New(nil, "workspace subscription missing provider customer ID")
		}

		portalSession, err := s.BillingProvider.CreateSubscriptionUpdateConfirmationSession(ctx, CreateSubscriptionUpdateConfirmationSessionInput{
			WorkspaceID:    workspaceID,
			CustomerID:     *currentSubscription.ProviderCustomerID,
			SubscriptionID: *currentSubscription.ProviderSubscriptionID,
			PlanCode:       req.PlanCode,
			SeatQuantity:   req.Seats,
			SuccessURL:     req.SuccessUrl,
			CancelURL:      req.CancelUrl,
		})
		if err != nil {
			return nil, domainerr.Wrap(err, "failed to create hosted upgrade confirmation session")
		}
		if portalSession == nil || portalSession.CheckoutUrl == "" {
			return nil, domainerr.New(nil, "billing provider returned empty hosted upgrade confirmation session")
		}

		return &SubscriptionCheckoutResponse{
			Action:      string(SubscriptionActionCheckout),
			SessionID:   strPtrOrNil(portalSession.SessionID),
			CheckoutUrl: strPtrOrNil(portalSession.CheckoutUrl),
		}, nil
	}

	if currentSubscription.CurrentPeriodEnd == nil {
		refreshedSubscription, err := s.refreshSubscriptionStateIfNeeded(ctx, workspaceID, currentSubscription)
		if err != nil {
			return nil, err
		}
		currentSubscription = refreshedSubscription
		if currentSubscription == nil || currentSubscription.CurrentPeriodEnd == nil {
			return nil, domainerr.New(nil, "current subscription is missing period end for scheduled downgrade")
		}
	}

	scheduleOutput, err := s.BillingProvider.ScheduleSubscriptionPlanChange(ctx, ScheduleSubscriptionPlanChangeInput{
		WorkspaceID:         workspaceID,
		SubscriptionID:      *currentSubscription.ProviderSubscriptionID,
		CurrentPlanCode:     currentSubscription.Plan,
		CurrentPriceID:      valueOrStringPtr(currentSubscription.ProviderPriceID),
		CurrentSeatQuantity: currentSubscription.SeatQuantity,
		TargetPlanCode:      req.PlanCode,
		TargetSeatQuantity:  req.Seats,
		Metadata: map[string]string{
			"workspace_id": workspaceID.String(),
		},
	})
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to schedule provider subscription change")
	}
	if scheduleOutput == nil || scheduleOutput.ScheduleID == "" {
		return nil, domainerr.New(nil, "billing provider returned empty schedule response")
	}

	pendingPlan := req.PlanCode
	pendingSeats := req.Seats
	scheduleID := scheduleOutput.ScheduleID
	updatedSubscription, err := s.updatePendingChangeAndFetch(ctx, workspaceID, PendingSubscriptionChange{
		ProviderScheduleID:       &scheduleID,
		PendingPlan:              &pendingPlan,
		PendingSeatQuantity:      &pendingSeats,
		PendingChangeEffectiveAt: &scheduleOutput.EffectiveAt,
	})
	if err != nil {
		return nil, err
	}

	return subscriptionActionResponse(SubscriptionActionScheduled, updatedSubscription), nil
}

func (s *SubscriptionService) startNewCheckout(ctx context.Context, workspaceID, actorUserID uuid.UUID,
	req *RequestSubscriptionCheckout) (*SubscriptionCheckoutResponse, error) {
	input := CreateCheckoutSessionInput{
		WorkspaceID: workspaceID,
		UserID:      actorUserID,
		PlanCode:    req.PlanCode,
		Seats:       req.Seats,
		SuccessURL:  req.SuccessUrl,
		CancelURL:   req.CancelUrl,
	}

	output, err := s.BillingProvider.CreateCheckoutSession(ctx, input)
	if err != nil {
		return nil, err
	}

	response := &SubscriptionCheckoutResponse{
		Action:      string(SubscriptionActionCheckout),
		SessionID:   strPtrOrNil(output.SessionID),
		CheckoutUrl: strPtrOrNil(output.CheckoutUrl),
	}

	return response, nil
}

func (s *SubscriptionService) persistSubscriptionEventAndFetch(ctx context.Context, workspaceID uuid.UUID, event BillingWebhookEvent, clearPending bool) (*models.WorkspaceSubscription, error) {
	if event.WorkspaceID == uuid.Nil {
		event.WorkspaceID = workspaceID
	}
	if event.WorkspaceID != workspaceID {
		return nil, domainerr.Wrap(errors.New("provider workspace mismatch"), "subscription update returned mismatched workspace")
	}

	var reconcileResult ReconcileResult
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.SubscriptionRepo.UpsertFromWebhook(ctx, tx, workspaceID, event); err != nil {
			return domainerr.Wrap(err, "failed to persist provider subscription state")
		}
		if clearPending {
			if err := s.SubscriptionRepo.ClearPendingChange(ctx, tx, workspaceID); err != nil {
				return domainerr.Wrap(err, "failed to clear pending subscription change")
			}
		}
		var err error
		reconcileResult, err = s.reconcileWorkspaceSuspensionFromPersistedSubscriptionTx(ctx, tx, workspaceID)
		if err != nil {
			return domainerr.Wrap(err, "failed to reconcile workspace suspension state")
		}
		return nil
	}); err != nil {
		return nil, err
	}
	s.emitSuspensionUpdatedEvents(ctx, workspaceID, uuid.Nil, reconcileResult)

	updatedSubscription, err := s.SubscriptionRepo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to fetch updated workspace subscription")
	}

	return updatedSubscription, nil
}

func (s *SubscriptionService) updatePendingChangeAndFetch(ctx context.Context, workspaceID uuid.UUID, pending PendingSubscriptionChange) (*models.WorkspaceSubscription, error) {
	var reconcileResult ReconcileResult
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.SubscriptionRepo.UpdatePendingChange(ctx, tx, workspaceID, pending); err != nil {
			return err
		}
		var err error
		reconcileResult, err = s.reconcileWorkspaceSuspensionFromPersistedSubscriptionTx(ctx, tx, workspaceID)
		return err
	}); err != nil {
		return nil, domainerr.Wrap(err, "failed to persist pending subscription change")
	}
	s.emitSuspensionUpdatedEvents(ctx, workspaceID, uuid.Nil, reconcileResult)

	updatedSubscription, err := s.SubscriptionRepo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to fetch updated workspace subscription")
	}

	return updatedSubscription, nil
}

func (s *SubscriptionService) refreshSubscriptionStateIfNeeded(ctx context.Context, workspaceID uuid.UUID, currentSubscription *models.WorkspaceSubscription) (*models.WorkspaceSubscription, error) {
	if currentSubscription == nil || currentSubscription.CurrentPeriodEnd != nil {
		return currentSubscription, nil
	}
	if s.BillingProvider == nil {
		return currentSubscription, nil
	}
	if currentSubscription.ProviderSubscriptionID == nil || *currentSubscription.ProviderSubscriptionID == "" {
		return currentSubscription, nil
	}

	event, err := s.BillingProvider.GetSubscriptionState(ctx, GetSubscriptionStateInput{
		WorkspaceID:    workspaceID,
		SubscriptionID: *currentSubscription.ProviderSubscriptionID,
		EventType:      string(CustomerSubscriptionUpdated),
		OccurredAt:     time.Now(),
	})
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to refresh provider subscription state")
	}
	if event == nil {
		return currentSubscription, nil
	}

	updatedSubscription, err := s.persistSubscriptionEventAndFetch(ctx, workspaceID, *event, false)
	if err != nil {
		return nil, err
	}

	return updatedSubscription, nil
}

func subscriptionActionResponse(action SubscriptionAction, subscription *models.WorkspaceSubscription) *SubscriptionCheckoutResponse {
	response := &SubscriptionCheckoutResponse{Action: string(action)}
	if subscription != nil {
		subscriptionDTO := dto.WorkspaceSubscriptionToResponse(subscription)
		response.Subscription = &subscriptionDTO
	}
	return response
}

func (s *SubscriptionService) ReplaceBoardPendingSuspensionSelection(ctx context.Context, workspaceID, actorUserID uuid.UUID, markedBoardIDs, unmarkedBoardIDs []uuid.UUID) error {
	if s.SuspensionService == nil {
		return domainerr.New(nil, "workspace suspension service not configured")
	}
	if err := s.SuspensionService.ReplaceBoardPendingSuspensionSelection(ctx, workspaceID, actorUserID, markedBoardIDs, unmarkedBoardIDs); err != nil {
		return err
	}
	changedBoards := make([]ReconcileBoardChange, 0, len(markedBoardIDs)+len(unmarkedBoardIDs))
	for _, id := range markedBoardIDs {
		changedBoards = append(changedBoards, ReconcileBoardChange{BoardID: id, IsPendingSuspend: true})
	}
	for _, id := range unmarkedBoardIDs {
		changedBoards = append(changedBoards, ReconcileBoardChange{BoardID: id, IsPendingSuspend: false})
	}
	s.emitSuspensionUpdatedEvents(ctx, workspaceID, actorUserID, ReconcileResult{ChangedBoards: changedBoards})
	return nil
}

func (s *SubscriptionService) ReplaceMemberPendingSuspensionSelection(ctx context.Context, workspaceID, actorUserID uuid.UUID, markedUserIDs, unmarkedUserIDs []uuid.UUID) error {
	if s.SuspensionService == nil {
		return domainerr.New(nil, "workspace suspension service not configured")
	}
	if err := s.SuspensionService.ReplaceMemberPendingSuspensionSelection(ctx, workspaceID, actorUserID, markedUserIDs, unmarkedUserIDs); err != nil {
		return err
	}
	changedMembers := make([]ReconcileMemberChange, 0, len(markedUserIDs)+len(unmarkedUserIDs))
	for _, id := range markedUserIDs {
		changedMembers = append(changedMembers, ReconcileMemberChange{UserID: id, IsPendingSuspend: true})
	}
	for _, id := range unmarkedUserIDs {
		changedMembers = append(changedMembers, ReconcileMemberChange{UserID: id, IsPendingSuspend: false})
	}
	s.emitSuspensionUpdatedEvents(ctx, workspaceID, actorUserID, ReconcileResult{ChangedMembers: changedMembers})
	return nil
}

func (s *SubscriptionService) GetAllWorkspaceBoardsForSuspensionManagement(ctx context.Context, workspaceID, actorUserID uuid.UUID) ([]dto.BoardResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, actorUserID, workspaceID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	var boards []models.Board
	if err := s.db.WithContext(ctx).
		Table("boards").
		Where("workspace_id = ? AND deleted_at IS NULL", workspaceID).
		Order("created_at ASC").
		Find(&boards).Error; err != nil {
		return nil, domainerr.Wrap(err, "failed to list workspace boards")
	}
	response := make([]dto.BoardResponse, 0, len(boards))
	for i := range boards {
		response = append(response, dto.BoardToResponse(&boards[i]))
	}
	return response, nil
}

func (s *SubscriptionService) FetchWorkspaceSubscriptionWithReconcile(ctx context.Context, workspaceID, actorUserID uuid.UUID) (*SubscriptionReconcileResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, actorUserID, workspaceID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}

	var fetchReconcileResult ReconcileResult
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		var err error
		fetchReconcileResult, err = s.reconcileWorkspaceSuspensionFromPersistedSubscriptionTx(ctx, tx, workspaceID)
		return err
	}); err != nil {
		return nil, domainerr.Wrap(err, "failed to reconcile workspace suspension state")
	}
	s.emitSuspensionUpdatedEvents(ctx, workspaceID, actorUserID, fetchReconcileResult)

	subscription, err := s.SubscriptionRepo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to fetch workspace subscription")
	}
	if subscription == nil {
		return nil, domainerr.WithKind(domainerr.New(nil, "workspace subscription not found"), domainerr.ErrNotFound)
	}

	members, err := s.SubscriptionRepo.ListWorkspaceMembersForSuspension(ctx, workspaceID)
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to list workspace members")
	}

	boards, err := s.SubscriptionRepo.ListWorkspaceBoardsForSuspension(ctx, workspaceID)
	if err != nil {
		return nil, domainerr.Wrap(err, "failed to list workspace boards")
	}

	memberStates := make([]MemberSuspensionState, 0, len(members))
	for _, m := range members {
		memberStates = append(memberStates, MemberSuspensionState{
			UserID:           m.UserID,
			IsSuspended:      m.IsSuspended,
			IsPendingSuspend: m.IsPendingSuspend,
		})
	}

	boardStates := make([]BoardSuspensionState, 0, len(boards))
	for _, b := range boards {
		boardStates = append(boardStates, BoardSuspensionState{
			BoardID:          b.ID,
			IsSuspended:      b.IsSuspended,
			IsPendingSuspend: b.IsPendingSuspend,
		})
	}

	return &SubscriptionReconcileResponse{
		Subscription: dto.WorkspaceSubscriptionToResponse(subscription),
		MemberStates: memberStates,
		BoardStates:  boardStates,
	}, nil
}

func valueOrStringPtr(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func (s *SubscriptionService) HandleBillingWebhook(ctx context.Context,
	event BillingWebhookEvent) error {

	if event.EventID == "" || event.Provider == "" {
		return domainerr.New(nil, "invalid webhook event: missing provider or event ID")
	}

	//dedup events
	acquired, err := s.WebhookInboxRepo.TryAcquire(ctx, event.Provider, event.EventID)
	if err != nil {
		return domainerr.Wrap(err, "failed to acquire webhook event")
	}

	if !acquired {
		log.Printf("subscription webhook already processed, ignoring duplicate: provider=%s event_id=%s", event.Provider, event.EventID)
		return nil
	}

	var webhookReconcileResult ReconcileResult
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.SubscriptionRepo.UpsertFromWebhook(ctx, tx, event.WorkspaceID, event); err != nil {
			return domainerr.Wrap(err, "failed to upsert subscription from webhook")
		}
		var reconcileErr error
		webhookReconcileResult, reconcileErr = s.reconcileWorkspaceSuspensionFromPersistedSubscriptionTx(ctx, tx, event.WorkspaceID)
		if reconcileErr != nil {
			return domainerr.Wrap(reconcileErr, "failed to reconcile workspace suspension state")
		}
		if err := s.WebhookInboxRepo.MarkProcessed(event.Provider, event.EventID, time.Now()); err != nil {
			return domainerr.Wrap(err, "failed to mark webhook event as processed")
		}
		return nil
	})

	if err != nil {
		return domainerr.Wrap(err, "failed to process webhook event in transaction")
	}

	s.emitSuspensionUpdatedEvents(ctx, event.WorkspaceID, uuid.Nil, webhookReconcileResult)
	s.emitSubscriptionRealtimeEvent(ctx, event)

	return nil
}

func (s *SubscriptionService) emitSuspensionUpdatedEvents(ctx context.Context, workspaceID uuid.UUID, actorUserID uuid.UUID, result ReconcileResult) {
	if s.EventRegistry == nil {
		return
	}

	if len(result.ChangedMembers) > 0 {
		changedUserIDs := make([]uuid.UUID, 0, len(result.ChangedMembers))
		for _, m := range result.ChangedMembers {
			changedUserIDs = append(changedUserIDs, m.UserID)
		}

		var userWorkspaces []models.UserWorkspace
		if err := s.db.WithContext(ctx).
			Table("user_workspaces").
			Where("workspace_id = ? AND user_id IN ? AND deleted_at IS NULL", workspaceID, changedUserIDs).
			Find(&userWorkspaces).Error; err != nil {
			log.Printf("suspension RT emit: failed to query user_workspaces for workspace %s: %v", workspaceID, err)
		} else if len(userWorkspaces) > 0 {
			relations := make([]dto.UserWorkspaceResponse, 0, len(userWorkspaces))
			for i := range userWorkspaces {
				relations = append(relations, dto.UserWorkspaceToResponse(&userWorkspaces[i]))
			}
			userEventType := ws.EventUserWorkspaceMemberSuspensionUpdated
			memberEvent := EventRegistry.DomainEvent{
				Type:          EventRegistry.EventWorkspaceMemberSuspensionUpdated,
				UserEventType: &userEventType,
				WorkspaceID:   &workspaceID,
				ActorUserID:   &actorUserID,
				OccurredAt:    time.Now(),
				Payload: EventRegistry.EventPayloadEnvelope{
					StatePayload: &dto.BoardDetailResponse{
						UserWorkspaceRelations: relations,
					},
				},
			}
			if emitErr := s.EventRegistry.Emit(ctx, s.db, memberEvent); emitErr != nil {
				log.Printf("suspension RT emit: failed to emit member suspension update for workspace %s: %v", workspaceID, emitErr)
			}
		}
	}

	if len(result.ChangedBoards) > 0 {
		changedBoardIDs := make([]uuid.UUID, 0, len(result.ChangedBoards))
		for _, b := range result.ChangedBoards {
			changedBoardIDs = append(changedBoardIDs, b.BoardID)
		}

		var boards []models.Board
		if err := s.db.WithContext(ctx).
			Table("boards").
			Where("id IN ? AND deleted_at IS NULL", changedBoardIDs).
			Find(&boards).Error; err != nil {
			log.Printf("suspension RT emit: failed to query boards for workspace %s: %v", workspaceID, err)
		} else if len(boards) > 0 {
			boardsMap := make(map[uuid.UUID]dto.BoardResponse, len(boards))
			for i := range boards {
				boardsMap[boards[i].ID] = dto.BoardToResponse(&boards[i])
			}
			boardEvent := EventRegistry.DomainEvent{
				Type:        EventRegistry.EventWorkspaceBoardSuspensionUpdated,
				WorkspaceID: &workspaceID,
				ActorUserID: &actorUserID,
				OccurredAt:  time.Now(),
				Payload: EventRegistry.EventPayloadEnvelope{
					StatePayload: &dto.BoardDetailResponse{
						Boards: boardsMap,
					},
				},
			}
			if emitErr := s.EventRegistry.Emit(ctx, s.db, boardEvent); emitErr != nil {
				log.Printf("suspension RT emit: failed to emit board suspension update for workspace %s: %v", workspaceID, emitErr)
			}
		}
	}
}

func (s *SubscriptionService) emitSubscriptionRealtimeEvent(ctx context.Context, event BillingWebhookEvent) {
	if s.EventRegistry == nil {
		return
	}
	subscription, err := s.SubscriptionRepo.GetWorkspaceSubscription(ctx, event.WorkspaceID)
	if err != nil || subscription == nil {
		log.Printf("subscription RT emit: failed to fetch subscription for workspace %s: %v", event.WorkspaceID, err)
		return
	}

	var domainEventType EventRegistry.DomainEventType
	switch ProviderEventTypes(event.EventType) {
	case CustomerSubscriptionCreated:
		domainEventType = EventRegistry.EventWorkspaceSubscriptionCreated
	case CustomerSubscriptionDeleted:
		domainEventType = EventRegistry.EventWorkspaceSubscriptionCanceled
	default:
		domainEventType = EventRegistry.EventWorkspaceSubscriptionUpdated
	}

	subscriptionDTO := dto.WorkspaceSubscriptionToResponse(subscription)
	actorID := uuid.Nil
	domainEvent := EventRegistry.DomainEvent{
		Type:        domainEventType,
		WorkspaceID: &event.WorkspaceID,
		ActorUserID: &actorID,
		OccurredAt:  event.OccurredAt,
		Payload: EventRegistry.EventPayloadEnvelope{
			RealtimePayload: subscriptionDTO,
		},
	}
	if emitErr := s.EventRegistry.Emit(ctx, s.db, domainEvent); emitErr != nil {
		log.Printf("subscription RT emit: failed to emit %s for workspace %s: %v", domainEventType, event.WorkspaceID, emitErr)
	}
}

func (s *SubscriptionService) ChangeSeatQuantity(ctx context.Context, workspaceID uuid.UUID, actorUserID uuid.UUID, newSeats int) error {
	return nil
}

func (s *SubscriptionService) CancelWorkspaceSubscription(ctx context.Context, workspaceID uuid.UUID, actorUserID uuid.UUID) error {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, actorUserID, workspaceID, rbac.Owner, s.IncludeDeleted); err != nil {
		return err
	}

	currentSubscription, err := s.SubscriptionRepo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		return domainerr.Wrap(err, "failed to fetch workspace subscription")
	}
	if currentSubscription == nil {
		return domainerr.WithKind(domainerr.New(nil, "workspace subscription not found"), domainerr.ErrNotFound)
	}
	if currentSubscription.ProviderSubscriptionID == nil || *currentSubscription.ProviderSubscriptionID == "" {
		return domainerr.New(nil, "workspace subscription missing provider subscription ID")
	}
	if currentSubscription.CancelAtPeriodEnd {
		return nil
	}
	if s.BillingProvider == nil {
		return domainerr.New(nil, "billing provider not configured")
	}
	if err := s.releasePendingScheduleForDirectBillingChange(ctx, workspaceID, currentSubscription); err != nil {
		return err
	}

	event, err := s.BillingProvider.CancelSubscription(ctx, *currentSubscription.ProviderSubscriptionID)
	if err != nil {
		return domainerr.Wrap(err, "failed to cancel provider subscription")
	}
	if event == nil {
		return domainerr.New(nil, "billing provider returned empty cancel response")
	}
	if event.WorkspaceID == uuid.Nil {
		event.WorkspaceID = workspaceID
	}
	if event.WorkspaceID != workspaceID {
		return domainerr.Wrap(errors.New("provider workspace mismatch"), "cancel subscription returned mismatched workspace")
	}

	var cancelReconcileResult ReconcileResult
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.SubscriptionRepo.UpsertFromWebhook(ctx, tx, workspaceID, *event); err != nil {
			return domainerr.Wrap(err, "failed to persist canceled subscription state")
		}
		var err error
		cancelReconcileResult, err = s.reconcileWorkspaceSuspensionFromPersistedSubscriptionTx(ctx, tx, workspaceID)
		if err != nil {
			return domainerr.Wrap(err, "failed to reconcile workspace suspension state")
		}
		return nil
	}); err != nil {
		return domainerr.Wrap(err, "failed to cancel subscription in transaction")
	}

	s.emitSuspensionUpdatedEvents(ctx, workspaceID, actorUserID, cancelReconcileResult)
	return nil
}

func (s *SubscriptionService) ResumeWorkspaceSubscription(ctx context.Context, workspaceID uuid.UUID, actorUserID uuid.UUID) error {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, actorUserID, workspaceID, rbac.Owner, s.IncludeDeleted); err != nil {
		return err
	}

	currentSubscription, err := s.SubscriptionRepo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		return domainerr.Wrap(err, "failed to fetch workspace subscription")
	}
	if currentSubscription == nil {
		return domainerr.WithKind(domainerr.New(nil, "workspace subscription not found"), domainerr.ErrNotFound)
	}
	if currentSubscription.ProviderSubscriptionID == nil || *currentSubscription.ProviderSubscriptionID == "" {
		return domainerr.New(nil, "workspace subscription missing provider subscription ID")
	}
	if !currentSubscription.CancelAtPeriodEnd {
		return nil
	}
	if s.BillingProvider == nil {
		return domainerr.New(nil, "billing provider not configured")
	}
	if err := s.releasePendingScheduleForDirectBillingChange(ctx, workspaceID, currentSubscription); err != nil {
		return err
	}

	event, err := s.BillingProvider.ResumeSubscription(ctx, *currentSubscription.ProviderSubscriptionID)
	if err != nil {
		return domainerr.Wrap(err, "failed to resume provider subscription")
	}
	if event == nil {
		return domainerr.New(nil, "billing provider returned empty resume response")
	}
	if event.WorkspaceID == uuid.Nil {
		event.WorkspaceID = workspaceID
	}
	if event.WorkspaceID != workspaceID {
		return domainerr.Wrap(errors.New("provider workspace mismatch"), "resume subscription returned mismatched workspace")
	}

	var resumeReconcileResult ReconcileResult
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.SubscriptionRepo.UpsertFromWebhook(ctx, tx, workspaceID, *event); err != nil {
			return domainerr.Wrap(err, "failed to persist resumed subscription state")
		}
		var err error
		resumeReconcileResult, err = s.reconcileWorkspaceSuspensionFromPersistedSubscriptionTx(ctx, tx, workspaceID)
		if err != nil {
			return domainerr.Wrap(err, "failed to reconcile workspace suspension state")
		}
		return nil
	}); err != nil {
		return domainerr.Wrap(err, "failed to resume subscription in transaction")
	}

	s.emitSuspensionUpdatedEvents(ctx, workspaceID, actorUserID, resumeReconcileResult)
	return nil
}

func (s *SubscriptionService) releasePendingScheduleForDirectBillingChange(ctx context.Context, workspaceID uuid.UUID, currentSubscription *models.WorkspaceSubscription) error {
	if currentSubscription == nil || currentSubscription.ProviderScheduleID == nil || *currentSubscription.ProviderScheduleID == "" {
		return nil
	}

	if err := s.BillingProvider.ReleaseSubscriptionSchedule(ctx, *currentSubscription.ProviderScheduleID); err != nil {
		return domainerr.Wrap(err, "failed to release pending subscription schedule before direct billing change")
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		return s.SubscriptionRepo.ClearPendingChange(ctx, tx, workspaceID)
	}); err != nil {
		return domainerr.Wrap(err, "failed to clear pending subscription change before direct billing change")
	}

	currentSubscription.ProviderScheduleID = nil
	currentSubscription.PendingPlan = nil
	currentSubscription.PendingSeatQuantity = nil
	currentSubscription.PendingChangeEffectiveAt = nil

	return nil
}

func (s *SubscriptionService) reconcileWorkspaceSuspensionFromPersistedSubscriptionTx(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID) (ReconcileResult, error) {
	subscription, err := loadWorkspaceSubscriptionTx(ctx, tx, workspaceID)
	if err != nil {
		return ReconcileResult{}, err
	}
	if subscription == nil {
		return ReconcileResult{}, domainerr.WithKind(domainerr.New(nil, "workspace subscription not found"), domainerr.ErrNotFound)
	}

	return s.SuspensionService.ReconcileWorkspaceSuspensionTx(ctx, tx, workspaceID, providerSnapshotFromSubscription(subscription))
}

func loadWorkspaceSubscriptionTx(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID) (*models.WorkspaceSubscription, error) {
	var subscription models.WorkspaceSubscription
	if err := tx.WithContext(ctx).
		Table("workspace_subscriptions").
		Where("workspace_id = ? AND deleted_at IS NULL", workspaceID).
		First(&subscription).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &subscription, nil
}
