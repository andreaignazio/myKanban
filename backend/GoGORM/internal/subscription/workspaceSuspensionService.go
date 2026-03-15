package subscription

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/guard"
	"GoGORM/internal/rbac"
	"GoGORM/internal/subscriptionplan"
	"GoGORM/models"
	"context"
	"log"
	"sort"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WorkspaceSuspensionRepo interface {
	GetWorkspaceSubscription(ctx context.Context, workspaceID uuid.UUID) (*models.WorkspaceSubscription, error)
	ListWorkspaceBoardsForSuspension(ctx context.Context, workspaceID uuid.UUID) ([]WorkspaceBoardSuspensionCandidate, error)
	ListWorkspaceMembersForSuspension(ctx context.Context, workspaceID uuid.UUID) ([]WorkspaceMemberSuspensionCandidate, error)
	ApplyWorkspaceBoardSuspensionState(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID, suspendedIDs, pendingIDs []uuid.UUID) error
	ApplyWorkspaceMemberSuspensionState(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID, suspendedIDs, pendingIDs []uuid.UUID) error
}

type WorkspaceSuspensionService struct {
	db             *gorm.DB
	Repo           WorkspaceSuspensionRepo
	MembershipRepo MembershipRepo
	IncludeDeleted bool
}

func NewWorkspaceSuspensionService(db *gorm.DB, repo WorkspaceSuspensionRepo, membershipRepo MembershipRepo, includeDeleted bool) *WorkspaceSuspensionService {
	return &WorkspaceSuspensionService{
		db:             db,
		Repo:           repo,
		MembershipRepo: membershipRepo,
		IncludeDeleted: includeDeleted,
	}
}

type ReconcileMemberChange struct {
	UserID           uuid.UUID
	IsSuspended      bool
	IsPendingSuspend bool
}

type ReconcileBoardChange struct {
	BoardID          uuid.UUID
	IsSuspended      bool
	IsPendingSuspend bool
}

type ReconcileResult struct {
	ChangedMembers []ReconcileMemberChange
	ChangedBoards  []ReconcileBoardChange
}

func (s *WorkspaceSuspensionService) ReconcileWorkspaceSuspensionTx(ctx context.Context, tx *gorm.DB, workspaceID uuid.UUID, snapshot ProviderSubscriptionSnapshot) (ReconcileResult, error) {
	boardCandidates, err := s.Repo.ListWorkspaceBoardsForSuspension(ctx, workspaceID)
	if err != nil {
		return ReconcileResult{}, err
	}
	memberCandidates, err := s.Repo.ListWorkspaceMembersForSuspension(ctx, workspaceID)
	if err != nil {
		return ReconcileResult{}, err
	}

	boardLimit := workspaceBoardLimit(snapshot)
	memberLimit := workspaceMemberLimit(snapshot)
	boardSelected := selectBoardSuspensionCandidates(boardCandidates, exceededCount(len(boardCandidates), boardLimit))
	memberSelected := selectMemberSuspensionCandidates(memberCandidates, exceededCount(countSuspensibleMembers(memberCandidates), memberLimit))
	//fmt.Println("Reconciling workspace suspension state:", "board limit:", boardLimit, "member limit:", memberLimit, "boards selected for suspension:", boardSelected, "members selected for suspension:", memberSelected)
	var suspendedBoards []uuid.UUID
	var pendingBoards []uuid.UUID
	var suspendedMembers []uuid.UUID
	var pendingMembers []uuid.UUID

	if isImmediateSuspensionStatus(snapshot.Status) {
		suspendedBoards = boardSelected
		suspendedMembers = memberSelected
	} else {
		pendingBoards = boardSelected
		pendingMembers = memberSelected
	}

	if err := s.Repo.ApplyWorkspaceBoardSuspensionState(ctx, tx, workspaceID, suspendedBoards, pendingBoards); err != nil {
		return ReconcileResult{}, err
	}
	if err := s.Repo.ApplyWorkspaceMemberSuspensionState(ctx, tx, workspaceID, suspendedMembers, pendingMembers); err != nil {
		return ReconcileResult{}, err
	}

	suspendedMemberSet := make(map[uuid.UUID]bool, len(suspendedMembers))
	for _, id := range suspendedMembers {
		suspendedMemberSet[id] = true
	}
	pendingMemberSet := make(map[uuid.UUID]bool, len(pendingMembers))
	for _, id := range pendingMembers {
		pendingMemberSet[id] = true
	}

	var changedMembers []ReconcileMemberChange
	for _, c := range memberCandidates {
		newIsSuspended := suspendedMemberSet[c.ID]
		newIsPendingSuspend := pendingMemberSet[c.ID]
		if newIsSuspended != c.IsSuspended || newIsPendingSuspend != c.IsPendingSuspend {
			changedMembers = append(changedMembers, ReconcileMemberChange{
				UserID:           c.UserID,
				IsSuspended:      newIsSuspended,
				IsPendingSuspend: newIsPendingSuspend,
			})
		}
	}

	suspendedBoardSet := make(map[uuid.UUID]bool, len(suspendedBoards))
	for _, id := range suspendedBoards {
		suspendedBoardSet[id] = true
	}
	pendingBoardSet := make(map[uuid.UUID]bool, len(pendingBoards))
	for _, id := range pendingBoards {
		pendingBoardSet[id] = true
	}

	var changedBoards []ReconcileBoardChange
	for _, b := range boardCandidates {
		newIsSuspended := suspendedBoardSet[b.ID]
		newIsPendingSuspend := pendingBoardSet[b.ID]
		if newIsSuspended != b.IsSuspended || newIsPendingSuspend != b.IsPendingSuspend {
			changedBoards = append(changedBoards, ReconcileBoardChange{
				BoardID:          b.ID,
				IsSuspended:      newIsSuspended,
				IsPendingSuspend: newIsPendingSuspend,
			})
		}
	}

	return ReconcileResult{ChangedMembers: changedMembers, ChangedBoards: changedBoards}, nil
}

func (s *WorkspaceSuspensionService) ReplaceBoardPendingSuspensionSelection(ctx context.Context, workspaceID, actorUserID uuid.UUID, markedBoardIDs, unmarkedBoardIDs []uuid.UUID) error {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, actorUserID, workspaceID, rbac.Owner, s.IncludeDeleted); err != nil {
		log.Printf("[DEBUG ReplaceBoardPendingSuspension] CheckUserMinWorkspaceRole failed: %v", err)
		return err
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		subscription, snapshot, err := s.pendingSelectionSnapshot(ctx, workspaceID)
		if err != nil {
			log.Printf("[DEBUG ReplaceBoardPendingSuspension] pendingSelectionSnapshot failed: %v", err)
			return err
		}
		log.Printf("[DEBUG ReplaceBoardPendingSuspension] snapshot: plan=%s status=%s cancelAtPeriodEnd=%v pendingPlan=%v",
			snapshot.PlanCode, snapshot.Status, snapshot.CancelAtPeriodEnd, subscription.PendingPlan)

		boardCandidates, err := s.Repo.ListWorkspaceBoardsForSuspension(ctx, workspaceID)
		if err != nil {
			log.Printf("[DEBUG ReplaceBoardPendingSuspension] ListWorkspaceBoardsForSuspension failed: %v", err)
			return err
		}
		boardLimit := workspaceBoardLimit(snapshot)
		needed := exceededCount(len(boardCandidates), boardLimit)
		log.Printf("[DEBUG ReplaceBoardPendingSuspension] boardCandidates=%d boardLimit=%d needed=%d", len(boardCandidates), boardLimit, needed)
		if err := validatePendingSelectionAllowed(subscription, snapshot, needed); err != nil {
			log.Printf("[DEBUG ReplaceBoardPendingSuspension] validatePendingSelectionAllowed failed: %v", err)
			return err
		}

		pendingIDs, err := validateBoardPendingSelection(boardCandidates, markedBoardIDs, unmarkedBoardIDs, needed)
		if err != nil {
			log.Printf("[DEBUG ReplaceBoardPendingSuspension] validateBoardPendingSelection failed: %v", err)
			return err
		}

		return s.Repo.ApplyWorkspaceBoardSuspensionState(ctx, tx, workspaceID, nil, pendingIDs)
	})
}

func (s *WorkspaceSuspensionService) ReplaceMemberPendingSuspensionSelection(ctx context.Context, workspaceID, actorUserID uuid.UUID, markedUserIDs, unmarkedUserIDs []uuid.UUID) error {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, actorUserID, workspaceID, rbac.Owner, s.IncludeDeleted); err != nil {
		return err
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		subscription, snapshot, err := s.pendingSelectionSnapshot(ctx, workspaceID)
		if err != nil {
			return err
		}

		memberCandidates, err := s.Repo.ListWorkspaceMembersForSuspension(ctx, workspaceID)
		if err != nil {
			return err
		}
		needed := exceededCount(countSuspensibleMembers(memberCandidates), workspaceMemberLimit(snapshot))
		if err := validatePendingSelectionAllowed(subscription, snapshot, needed); err != nil {
			return err
		}

		pendingIDs, err := validateMemberPendingSelection(memberCandidates, markedUserIDs, unmarkedUserIDs, needed)
		if err != nil {
			return err
		}

		return s.Repo.ApplyWorkspaceMemberSuspensionState(ctx, tx, workspaceID, nil, pendingIDs)
	})
}

func (s *WorkspaceSuspensionService) pendingSelectionSnapshot(ctx context.Context, workspaceID uuid.UUID) (*models.WorkspaceSubscription, ProviderSubscriptionSnapshot, error) {
	subscription, err := s.Repo.GetWorkspaceSubscription(ctx, workspaceID)
	if err != nil {
		return nil, ProviderSubscriptionSnapshot{}, domainerr.Wrap(err, "failed to fetch workspace subscription")
	}
	if subscription == nil {
		return nil, ProviderSubscriptionSnapshot{}, domainerr.WithKind(domainerr.New(nil, "workspace subscription not found"), domainerr.ErrNotFound)
	}

	return subscription, providerSnapshotFromSubscription(subscription), nil
}

func providerSnapshotFromSubscription(subscription *models.WorkspaceSubscription) ProviderSubscriptionSnapshot {
	if subscription == nil {
		return ProviderSubscriptionSnapshot{}
	}

	status := BillingStatus(subscription.Status)
	priceID := valueOrStringPtr(subscription.ProviderPriceID)
	customerID := valueOrStringPtr(subscription.ProviderCustomerID)
	subscriptionID := valueOrStringPtr(subscription.ProviderSubscriptionID)
	planCode := subscription.Plan
	seatQuantity := subscription.SeatQuantity

	if subscription.PendingPlan != nil {
		planCode = *subscription.PendingPlan
	}
	if subscription.PendingSeatQuantity != nil {
		seatQuantity = *subscription.PendingSeatQuantity
	}
	if subscription.CancelAtPeriodEnd {
		planCode = subscriptionplan.Free
		seatQuantity = 0
	}

	return ProviderSubscriptionSnapshot{
		CustomerID:         customerID,
		SubscriptionID:     subscriptionID,
		SeatQuantity:       seatQuantity,
		PlanCode:           planCode,
		Status:             status,
		PriceID:            priceID,
		CancelAtPeriodEnd:  subscription.CancelAtPeriodEnd,
		CurrentPeriodStart: &subscription.CurrentPeriodStart,
		CurrentPeriodEnd:   subscription.CurrentPeriodEnd,
	}
}

func validatePendingSelectionAllowed(subscription *models.WorkspaceSubscription, snapshot ProviderSubscriptionSnapshot, needed int) error {
	if subscription == nil {
		return domainerr.WithKind(domainerr.New(nil, "workspace subscription not found"), domainerr.ErrNotFound)
	}
	if isImmediateSuspensionStatus(snapshot.Status) {
		return domainerr.WithKind(domainerr.New(nil, "cannot modify suspension selection for a canceled subscription"), domainerr.ErrValidation)
	}
	if needed <= 0 {
		return domainerr.WithKind(domainerr.New(nil, "workspace is not over the effective subscription limits"), domainerr.ErrValidation)
	}
	return nil
}

func workspaceBoardLimit(snapshot ProviderSubscriptionSnapshot) int {
	plan := effectiveSubscriptionPlan(snapshot)
	return MaxBoardsForWorkspaceSubscription(plan)
}

func workspaceMemberLimit(snapshot ProviderSubscriptionSnapshot) int {
	plan := effectiveSubscriptionPlan(snapshot)
	if plan != subscriptionplan.Free && snapshot.SeatQuantity > 0 {
		return snapshot.SeatQuantity
	}
	return MaxMembersForWorkspaceSubscription(plan)
}

func effectiveSubscriptionPlan(snapshot ProviderSubscriptionSnapshot) subscriptionplan.Plan {
	if isImmediateSuspensionStatus(snapshot.Status) {
		return subscriptionplan.Free
	}
	return snapshot.PlanCode
}

func isImmediateSuspensionStatus(status BillingStatus) bool {
	return status == BillingStatusCanceled
}

func exceededCount(total int, limit int) int {
	if limit < 0 || total <= limit {
		return 0
	}
	return total - limit
}

func countSuspensibleMembers(candidates []WorkspaceMemberSuspensionCandidate) int {
	count := 0
	for _, candidate := range candidates {
		if candidate.Role == rbac.Owner.String() {
			continue
		}
		count++
	}
	return count
}

func selectBoardSuspensionCandidates(candidates []WorkspaceBoardSuspensionCandidate, needed int) []uuid.UUID {
	if needed <= 0 || len(candidates) == 0 {
		return nil
	}

	sorted := sortBoardSuspensionCandidates(candidates)
	return selectIDsPreservingCurrentSelection(sorted, needed, func(candidate WorkspaceBoardSuspensionCandidate) uuid.UUID {
		return candidate.ID
	}, func(candidate WorkspaceBoardSuspensionCandidate) bool {
		return candidate.IsPendingSuspend
	})
}

func selectMemberSuspensionCandidates(candidates []WorkspaceMemberSuspensionCandidate, needed int) []uuid.UUID {
	if needed <= 0 || len(candidates) == 0 {
		return nil
	}

	filtered := make([]WorkspaceMemberSuspensionCandidate, 0, len(candidates))
	for _, candidate := range candidates {
		if candidate.Role == rbac.Owner.String() {
			continue
		}
		filtered = append(filtered, candidate)
	}
	if len(filtered) == 0 {
		return nil
	}

	sorted := sortMemberSuspensionCandidates(filtered)
	return selectIDsPreservingCurrentSelection(sorted, needed, func(candidate WorkspaceMemberSuspensionCandidate) uuid.UUID {
		return candidate.ID
	}, func(candidate WorkspaceMemberSuspensionCandidate) bool {
		return candidate.IsPendingSuspend
	})
}

func sortBoardSuspensionCandidates(candidates []WorkspaceBoardSuspensionCandidate) []WorkspaceBoardSuspensionCandidate {
	sorted := append([]WorkspaceBoardSuspensionCandidate(nil), candidates...)
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].CreatedAt.Equal(sorted[j].CreatedAt) {
			return sorted[i].ID.String() > sorted[j].ID.String()
		}
		return sorted[i].CreatedAt.After(sorted[j].CreatedAt)
	})
	return sorted
}

func sortMemberSuspensionCandidates(candidates []WorkspaceMemberSuspensionCandidate) []WorkspaceMemberSuspensionCandidate {
	sorted := append([]WorkspaceMemberSuspensionCandidate(nil), candidates...)
	sort.Slice(sorted, func(i, j int) bool {
		left := suspensionRolePriority(sorted[i].Role)
		right := suspensionRolePriority(sorted[j].Role)
		if left != right {
			return left < right
		}
		if sorted[i].CreatedAt.Equal(sorted[j].CreatedAt) {
			return sorted[i].ID.String() > sorted[j].ID.String()
		}
		return sorted[i].CreatedAt.After(sorted[j].CreatedAt)
	})
	return sorted
}

func suspensionRolePriority(role string) int {
	switch role {
	case rbac.Viewer.String():
		return 0
	case rbac.Member.String():
		return 1
	case rbac.Admin.String():
		return 2
	case rbac.Owner.String():
		return 3
	default:
		return 4
	}
}

func validateBoardPendingSelection(candidates []WorkspaceBoardSuspensionCandidate, markedBoardIDs, unmarkedBoardIDs []uuid.UUID, needed int) ([]uuid.UUID, error) {
	allowed := make(map[uuid.UUID]struct{}, len(candidates))
	for _, candidate := range candidates {
		allowed[candidate.ID] = struct{}{}
	}

	markedSet, err := validateSelectionPartition(markedBoardIDs, unmarkedBoardIDs, allowed)
	if err != nil {
		return nil, err
	}
	if len(markedSet) != needed {
		return nil, domainerr.WithKind(domainerr.New(nil, "marked boards count does not match required suspension count"), domainerr.ErrValidation)
	}

	ordered := sortBoardSuspensionCandidates(candidates)
	return orderedIDsBySelection(ordered, markedSet), nil
}

func validateMemberPendingSelection(candidates []WorkspaceMemberSuspensionCandidate, markedUserIDs, unmarkedUserIDs []uuid.UUID, needed int) ([]uuid.UUID, error) {
	allowedByUserID := make(map[uuid.UUID]WorkspaceMemberSuspensionCandidate, len(candidates))
	for _, candidate := range candidates {
		allowedByUserID[candidate.UserID] = candidate
	}

	markedSet, err := validateSelectionPartition(markedUserIDs, unmarkedUserIDs, keysFromMemberCandidates(allowedByUserID))
	if err != nil {
		return nil, err
	}
	if len(markedSet) != needed {
		return nil, domainerr.WithKind(domainerr.New(nil, "marked members count does not match required suspension count"), domainerr.ErrValidation)
	}
	for userID := range markedSet {
		candidate := allowedByUserID[userID]
		if candidate.Role == rbac.Owner.String() {
			return nil, domainerr.WithKind(domainerr.New(nil, "workspace owner cannot be selected for suspension"), domainerr.ErrValidation)
		}
	}

	ordered := sortMemberSuspensionCandidates(candidates)
	selected := make([]uuid.UUID, 0, len(markedSet))
	for _, candidate := range ordered {
		if _, exists := markedSet[candidate.UserID]; exists {
			selected = append(selected, candidate.ID)
		}
	}
	return selected, nil
}

func validateSelectionPartition(markedIDs, unmarkedIDs []uuid.UUID, allowed map[uuid.UUID]struct{}) (map[uuid.UUID]struct{}, error) {
	markedSet := make(map[uuid.UUID]struct{}, len(markedIDs))
	seen := make(map[uuid.UUID]struct{}, len(markedIDs)+len(unmarkedIDs))

	for _, id := range markedIDs {
		if _, ok := allowed[id]; !ok {
			return nil, domainerr.WithKind(domainerr.New(nil, "selection contains an unknown id"), domainerr.ErrValidation)
		}
		if _, exists := seen[id]; exists {
			return nil, domainerr.WithKind(domainerr.New(nil, "selection contains duplicate ids"), domainerr.ErrValidation)
		}
		seen[id] = struct{}{}
		markedSet[id] = struct{}{}
	}

	for _, id := range unmarkedIDs {
		if _, ok := allowed[id]; !ok {
			return nil, domainerr.WithKind(domainerr.New(nil, "selection contains an unknown id"), domainerr.ErrValidation)
		}
		if _, exists := seen[id]; exists {
			return nil, domainerr.WithKind(domainerr.New(nil, "selection contains duplicate ids"), domainerr.ErrValidation)
		}
		seen[id] = struct{}{}
	}

	return markedSet, nil
}

func orderedIDsBySelection[T interface{ GetID() uuid.UUID }](ordered []T, selectedSet map[uuid.UUID]struct{}) []uuid.UUID {
	selected := make([]uuid.UUID, 0, len(selectedSet))
	for _, candidate := range ordered {
		candidateID := candidate.GetID()
		if _, exists := selectedSet[candidateID]; exists {
			selected = append(selected, candidateID)
		}
	}
	return selected
}

func keysFromMemberCandidates(candidates map[uuid.UUID]WorkspaceMemberSuspensionCandidate) map[uuid.UUID]struct{} {
	out := make(map[uuid.UUID]struct{}, len(candidates))
	for userID := range candidates {
		out[userID] = struct{}{}
	}
	return out
}

func selectIDsPreservingCurrentSelection[T any](candidates []T, needed int, getID func(T) uuid.UUID, isSelected func(T) bool) []uuid.UUID {
	if needed <= 0 || len(candidates) == 0 {
		return nil
	}
	selected := make([]uuid.UUID, 0, minInt(needed, len(candidates)))
	selectedSet := map[uuid.UUID]struct{}{}

	for _, candidate := range candidates {
		if len(selected) >= needed || !isSelected(candidate) {
			continue
		}
		id := getID(candidate)
		selected = append(selected, id)
		selectedSet[id] = struct{}{}
	}

	for _, candidate := range candidates {
		if len(selected) >= needed {
			break
		}
		id := getID(candidate)
		if _, exists := selectedSet[id]; exists {
			continue
		}
		selected = append(selected, id)
		selectedSet[id] = struct{}{}
	}

	return selected
}

func minInt(left, right int) int {
	if left < right {
		return left
	}
	return right
}

func (c WorkspaceBoardSuspensionCandidate) GetID() uuid.UUID {
	return c.ID
}

func (c WorkspaceMemberSuspensionCandidate) GetID() uuid.UUID {
	return c.ID
}
