package lists

import (
	"GoGORM/internal/authz"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/rbac"
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

type ListsService struct {
	db               *gorm.DB
	Hub              *ws.Hub
	EventRegistry    *EventRegistry.EventRegistryService
	ListsRepo        ListsRepo
	MembershipRepo   MembershipRepo
	CapabilitiesRepo CapabilitiesRepo
	IncludeDeleted   bool
}

func NewListsService(db *gorm.DB, hub *ws.Hub, eventRegistry *EventRegistry.EventRegistryService, listsRepo ListsRepo, membershipRepo MembershipRepo, capabilitiesRepo CapabilitiesRepo) *ListsService {
	return &ListsService{db: db, Hub: hub, EventRegistry: eventRegistry, ListsRepo: listsRepo, MembershipRepo: membershipRepo, CapabilitiesRepo: capabilitiesRepo, IncludeDeleted: false}
}

type ListsRepo interface {
	GetListMeta(ctx context.Context, listID uuid.UUID, includeDeleted bool) (*models.List, error)
	GetListDetail(ctx context.Context, listID uuid.UUID, includeDeleted bool) (*ListDetailDomain, error)
	GetUserLists(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.List, error)
	PatchListDetails(ctx context.Context, listID uuid.UUID, updateMap map[string]any) (*models.List, error)
}
type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetBoardsOfListWithUserRole(ctx context.Context, userID, listID uuid.UUID, AllowedRoles []string, includeDeleted bool) ([]models.UserBoard, error)
}

type CapabilitiesRepo interface {
	CanAccessListInBoard(ctx context.Context, db *gorm.DB,
		userID, boardID, listID uuid.UUID, roles []string, accessMode string, includeDeleted bool) (*bool, error)
}

func (s *ListsService) GetListMeta(ctx context.Context, userID, listID uuid.UUID) (*ListDomain, error) {

	//Check viewer+ in almeno una board dove è linkata la list
	allowedRoles := rbac.AllowedAtLeast(rbac.Viewer)
	userBoards, err := s.MembershipRepo.GetBoardsOfListWithUserRole(ctx, userID, listID, allowedRoles, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	if len(userBoards) < 1 {
		return nil, domainerr.MapRepoErr(err, true)
	}

	list, err := s.ListsRepo.GetListMeta(ctx, listID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	listDomain := ListDomain{
		ID:               list.ID,
		Title:            list.Title,
		Props:            list.Props,
		CreatedByUserID:  list.CreatedByUserID,
		CreatedInBoardID: list.CreatedInBoardID,
		CreatedAt:        list.CreatedAt,
		UpdatedAt:        list.UpdatedAt,
		DeletedAt:        list.DeletedAt,
	}

	return &listDomain, nil
}

func (s *ListsService) GetListDetail(ctx context.Context, userID, listID uuid.UUID) (*ListDetailDomain, error) {
	//Check viewer+ in almeno una board dove è linkata la list
	allowedRoles := rbac.AllowedAtLeast(rbac.Viewer)
	userBoards, err := s.MembershipRepo.GetBoardsOfListWithUserRole(ctx, userID, listID, allowedRoles, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	if len(userBoards) < 1 {
		return nil, domainerr.MapRepoErr(err, true)
	}

	listDetail, err := s.ListsRepo.GetListDetail(ctx, listID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return listDetail, nil

}

func (s *ListsService) GetUserLists(ctx context.Context, userID uuid.UUID) ([]models.List, error) {
	lists, err := s.ListsRepo.GetUserLists(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return lists, nil
}

func (s *ListsService) PatchListProps(ctx context.Context, userID, workspaceID, boardID, listID, correlationID uuid.UUID,
	req PatchListPropsRequest) (*models.List, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}

	allowedRoles := rbac.AllowedAtLeast(rbac.Member)
	if ok, err := s.CapabilitiesRepo.CanAccessListInBoard(ctx, s.db,
		userID, boardID, listID, allowedRoles, rbac.BoardListEditable.String(), s.IncludeDeleted); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	} else if !*ok {
		return nil, domainerr.ErrForbidden
	}

	var list models.List
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		existingList, err := s.ListsRepo.GetListMeta(ctx, listID, s.IncludeDeleted)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		mergedProps, err := dto.MergeNestedProps(req.Props, existingList.Props)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		jsonProps, err := json.Marshal(mergedProps)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		updateMap := map[string]any{
			"props": datatypes.JSON(jsonProps),
		}
		updatedList, err := s.ListsRepo.PatchListDetails(ctx, listID, updateMap)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		list = *updatedList
		return nil
	})
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	listResponse := dto.ListToResponse(&list)
	listResponseMap := map[uuid.UUID]dto.ListResponse{}
	listResponseMap[list.ID] = listResponse

	statePayload := dto.BoardDetailResponse{
		Lists: listResponseMap,
	}
	payload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}

	listRef := EventRegistry.TargetRef{
		EntityType: "list",
		EntityID:   list.ID,
		BoardID:    &boardID,
	}

	targets := []EventRegistry.TargetRef{listRef}

	event := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventListPatched,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Targets:       targets,
		Payload:       payload,
		OccurredAt:    time.Now(),
	}

	if err := s.EventRegistry.Emit(ctx, s.db, event); err != nil {
		fmt.Println("Failed to emit event:", err)
	}

	return &list, nil
}

func (s *ListsService) PatchListDetails(ctx context.Context, userID, workspaceID, boardID, listID, correlationID uuid.UUID,
	req PatchListDetailsRequest) (*models.List, error) {
	if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}

	allowedRoles := rbac.AllowedAtLeast(rbac.Member)
	if ok, err := s.CapabilitiesRepo.CanAccessListInBoard(ctx, s.db,
		userID, boardID, listID, allowedRoles, rbac.BoardListEditable.String(), s.IncludeDeleted); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	} else if !*ok {
		return nil, domainerr.ErrForbidden
	}

	updateMap := map[string]any{}
	if req.Title != nil {
		updateMap["title"] = *req.Title
	}

	updatedList, err := s.ListsRepo.PatchListDetails(ctx, listID, updateMap)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	listResponse := dto.ListToResponse(updatedList)
	listResponseMap := map[uuid.UUID]dto.ListResponse{}
	listResponseMap[updatedList.ID] = listResponse

	statePayload := dto.BoardDetailResponse{
		Lists: listResponseMap,
	}
	payload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}

	listRef := EventRegistry.TargetRef{
		EntityType: "list",
		EntityID:   updatedList.ID,
		BoardID:    &boardID,
	}

	targets := []EventRegistry.TargetRef{listRef}

	evetn := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventListPatched,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Targets:       targets,
		Payload:       payload,
		OccurredAt:    time.Now(),
	}
	if err := s.EventRegistry.Emit(ctx, s.db, evetn); err != nil {
		fmt.Println("Failed to emit event:", err)
	}

	return updatedList, nil
}
