package workspaces

import (
	"GoGORM/internal/authz"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/guard"
	"GoGORM/internal/models/boards"
	"GoGORM/internal/rbac"
	"GoGORM/internal/subscriptionplan"
	"GoGORM/internal/tokens"
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

type WorkspaceService struct {
	db                           *gorm.DB
	authz                        *authz.Service
	EventRegistry                *EventRegistry.EventRegistryService
	WorkspaceRepo                WorkspaceRepo
	MembershipRepo               MembershipRepo
	BoardsRepo                   BoardsRepo
	UserWorkspacePositionHelper  UserWorkspacePositionHelper
	WorkspaceBoardPositionHelper WorkspaceBoardPositionHelper
	IncludeDeleted               bool
	SubscriptionService
}

func NewWorkspaceService(
	db *gorm.DB,
	workspaceRepo WorkspaceRepo,
	membershipRepo MembershipRepo,
	boardsRepo BoardsRepo,
	authzService *authz.Service,
	userWorkspacePositionHelper UserWorkspacePositionHelper,
	workspaceBoardPositionHelper WorkspaceBoardPositionHelper,
	subscriptionService SubscriptionService,
	eventRegistry *EventRegistry.EventRegistryService,
) *WorkspaceService {
	return &WorkspaceService{
		db:                           db,
		authz:                        authzService,
		WorkspaceRepo:                workspaceRepo,
		MembershipRepo:               membershipRepo,
		BoardsRepo:                   boardsRepo,
		UserWorkspacePositionHelper:  userWorkspacePositionHelper,
		WorkspaceBoardPositionHelper: workspaceBoardPositionHelper,
		SubscriptionService:          subscriptionService,
		EventRegistry:                eventRegistry,
		IncludeDeleted:               false,
	}
}

type WorkspaceRepo interface {
	CreateWorkspaceTX(ctx context.Context, tx *gorm.DB, workspace *models.Workspace) error
	CreateUserWorkspaceTX(ctx context.Context, tx *gorm.DB, userWorkspace *models.UserWorkspace) error
	GetWorkspaceByID(ctx context.Context, workspaceID uuid.UUID, includeDeleted bool) (*models.Workspace, error)
	PatchWorkspaceByID(ctx context.Context, workspaceID uuid.UUID, updateMap map[string]any) (*models.Workspace, error)
	GetWorkspacesByUserID(ctx context.Context, userID uuid.UUID) ([]models.UserWorkspaceRow, error)
	GetWorkspaceIDsByUserID(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error)
	GetUserWorkspacesByIDs(ctx context.Context, userID uuid.UUID, workspaceDs []uuid.UUID) ([]models.UserWorkspace, error)

	GetWorkspaceBoardsForUserID(ctx context.Context, userID, workspaceID uuid.UUID) ([]boards.UserBoardRow, error)
	GetUserWorkspace(ctx context.Context, userID, workspaceID uuid.UUID) (*models.UserWorkspace, error)
	GetWorkspaceMembersByWorkspaceID(ctx context.Context, workspaceID uuid.UUID, includeDeleted bool) ([]WorkspaceMemberRow, error)
	SearchPublicWorkspaces(ctx context.Context, query string, page, limit int, sort string, includeDeleted bool) ([]models.Workspace, int64, error)
	GetWorkspacesByIDs(ctx context.Context, workspaceIDs []uuid.UUID, includeDeleted bool) ([]models.Workspace, error)
	GetPendingOfferTargetWorkspaceIDsByUserID(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]uuid.UUID, error)
	GetPendingWorkspaceShareOffersForUser(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error)
	GetWorkspaceSubscriptionsByWorkspaceIDs(ctx context.Context, workspaceIDs []uuid.UUID, includeDeleted bool) ([]models.WorkspaceSubscription, error)
	GetClosedWorkspaceBoardsForUserID(ctx context.Context, userID, workspaceID uuid.UUID) ([]boards.UserBoardRow, error)
	UpdateUserWorkspaceRoleTX(ctx context.Context, tx *gorm.DB, userID, workspaceID uuid.UUID, updateMap map[string]interface{}) (*models.UserWorkspace, error)
	DeleteUserWorkspaceTX(ctx context.Context, tx *gorm.DB, userID, workspaceID uuid.UUID) (*models.UserWorkspace, error)
	DeleteUserBaordsWhereWorkspaceIDTX(ctx context.Context, tx *gorm.DB, userID, workspaceID uuid.UUID) error

	GetWorkspacesBoardsForUserID(ctx context.Context, userID uuid.UUID, workspaceIDs []uuid.UUID) ([]boards.UserBoardRow, error)
}

type MembershipRepo interface {
	CreateUserBoardTX(ctx context.Context, db *gorm.DB, userBoard *models.UserBoard) error
	GetUser(ctx context.Context, userID uuid.UUID) (*models.User, error)
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUserWorkspaceRole(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (string, error)
}

type BoardsRepo interface {
	CreateBoardTX(ctx context.Context, db *gorm.DB, board *models.Board) error
	DeleteBoardTX(ctx context.Context, db *gorm.DB, boardID uuid.UUID) (*models.Board, error)
	RestoreBoardTX(ctx context.Context, db *gorm.DB, boardID uuid.UUID) (*models.Board, error)
	PurgeBoardTX(ctx context.Context, db *gorm.DB, boardID uuid.UUID) error
	PurgeUserBoardsByBoardIDTX(ctx context.Context, db *gorm.DB, boardID uuid.UUID, deleteUnscoped bool) error
	GetBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) (*models.Board, error)
	GetUserBoardTX(ctx context.Context, db *gorm.DB, userID, boardID uuid.UUID, includeDeleted bool) (*models.UserBoard, error)
}

type UserWorkspacePositionHelper interface {
	UserWorkspacePosAtEnd(ctx context.Context, userID uuid.UUID) (string, error)
}

type WorkspaceBoardPositionHelper interface {
	WorkspaceBoardPosAtEnd(ctx context.Context, userID, workspaceID uuid.UUID) (string, error)
}

type SubscriptionService interface {
	CheckWorkspaceMembershipLimit(ctx context.Context, userID uuid.UUID) (bool, error)
}

func (s *WorkspaceService) CreateWorkspace(ctx context.Context, userID uuid.UUID, req CreateWorkspaceRequest) (*dto.WorkspaceResponse, *dto.UserWorkspaceResponse, error) {
	position, err := s.UserWorkspacePositionHelper.UserWorkspacePosAtEnd(ctx, userID)
	if err != nil {
		return nil, nil, domainerr.Wrap(err, "workspaces.service.CreateWorkspace.position")
	}
	token, err := tokens.NewPublicToken()
	if err != nil {
		return nil, nil, domainerr.Wrap(err, "workspaces.service.CreateWorkspace.publicToken")
	}
	ok, err := s.SubscriptionService.CheckWorkspaceMembershipLimit(ctx, userID)
	if err != nil {
		return nil, nil, domainerr.Wrap(err, "workspaces.service.CreateWorkspace.membershipLimit")
	} else if !ok {
		return nil, nil, domainerr.New(domainerr.ErrForbidden, "workspace membership limit reached")
	}

	initProps := req.Props
	if initProps == nil {
		initProps = &WorkspaceProps{}
	}
	if req.Description != nil && initProps.Description == nil {
		initProps.Description = req.Description
	}
	propsJSON, err := json.Marshal(initProps)
	if err != nil {
		return nil, nil, domainerr.Wrap(err, "workspaces.service.CreateWorkspace.serializeProps")
	}

	workspace := &models.Workspace{
		ID:                  uuid.New(),
		Name:                req.Name,
		WorkspaceVisibility: models.WorkspaceVisibilityPrivate,
		PublicToken:         token,
		CreatedByUserID:     userID,
		Props:               datatypes.JSON(propsJSON),
	}
	userWorkspace := &models.UserWorkspace{
		ID:          uuid.New(),
		WorkspaceID: workspace.ID,
		UserID:      userID,
		Role:        rbac.Owner,
		Pos:         position,
	}
	workspaceSubscription := &models.WorkspaceSubscription{
		WorkspaceID: workspace.ID,
		Plan:        subscriptionplan.Free,
		Status:      "active",
		Provider:    "stripe",
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.WorkspaceRepo.CreateWorkspaceTX(ctx, tx, workspace); err != nil {
			return domainerr.Wrap(err, "workspaces.service.CreateWorkspace.insertWorkspace")
		}
		if err := s.WorkspaceRepo.CreateUserWorkspaceTX(ctx, tx, userWorkspace); err != nil {
			return domainerr.Wrap(err, "workspaces.service.CreateWorkspace.insertUserWorkspace")
		}
		if err := tx.WithContext(ctx).Create(workspaceSubscription).Error; err != nil {
			return domainerr.Wrap(err, "workspaces.service.CreateWorkspace.insertWorkspaceSubscription")
		}
		return nil
	})
	if err != nil {
		return nil, nil, domainerr.Wrap(err, "workspaces.service.CreateWorkspace.tx")
	}

	workspaceResponse := dto.WorkspaceToResponse(workspace)
	userWorkspaceResponse := dto.UserWorkspaceToResponse(userWorkspace)

	return &workspaceResponse, &userWorkspaceResponse, nil
}

func (s *WorkspaceService) GetUserWorkspaces(ctx context.Context, userID uuid.UUID) ([]dto.WorkspaceResponse, []dto.UserWorkspaceResponse, []dto.SubscriptionResponse, error) {

	rows, err := s.WorkspaceRepo.GetWorkspacesByUserID(ctx, userID)
	if err != nil {
		return nil, nil, nil, err
	}

	workspaces := make([]dto.WorkspaceResponse, 0, len(rows))
	userWorkspaces := make([]dto.UserWorkspaceResponse, 0, len(rows))
	subscriptions := make([]dto.SubscriptionResponse, 0, len(rows))
	for _, row := range rows {
		w, uw := row.ToWorkspaceAndUser()
		workspaces = append(workspaces, dto.WorkspaceToResponse(&w))
		userWorkspaces = append(userWorkspaces, dto.UserWorkspaceToResponse(&uw))
		if row.SubscriptionWorkspaceID != nil {
			subscription := dto.UserWorkspaceRowSubscriptionToResponse(&row)
			subscriptions = append(subscriptions, subscription)
		} else {
			subscriptions = append(subscriptions, dto.SubscriptionResponse{
				WorkspaceID:        w.ID,
				Plan:               string(subscriptionplan.Free),
				Status:             "none",
				Provider:           "stripe",
				SeatQuantity:       0,
				CancelAtPeriodEnd:  false,
				CurrentPeriodStart: time.Time{},
				CurrentPeriodEnd:   nil,
				CreatedAt:          time.Time{},
				UpdatedAt:          time.Time{},
				DeletedAt:          nil,
			})
		}
	}

	return workspaces, userWorkspaces, subscriptions, nil
}

func (s *WorkspaceService) SearchPublicWorkspaces(ctx context.Context, query string, page, limit int, sort string) ([]dto.WorkspaceResponse, []dto.SubscriptionResponse, int64, error) {
	workspaceModels, total, err := s.WorkspaceRepo.SearchPublicWorkspaces(ctx, query, page, limit, sort, s.IncludeDeleted)
	if err != nil {
		return nil, nil, 0, err
	}

	workspaces := make([]dto.WorkspaceResponse, 0, len(workspaceModels))
	workspaceIDs := make([]uuid.UUID, 0, len(workspaceModels))
	for i := range workspaceModels {
		workspaces = append(workspaces, dto.WorkspaceToResponse(&workspaceModels[i]))
		workspaceIDs = append(workspaceIDs, workspaceModels[i].ID)
	}

	subscriptionModels, err := s.WorkspaceRepo.GetWorkspaceSubscriptionsByWorkspaceIDs(ctx, workspaceIDs, s.IncludeDeleted)
	if err != nil {
		return nil, nil, 0, err
	}

	subscriptionMap := make(map[uuid.UUID]models.WorkspaceSubscription, len(subscriptionModels))
	for i := range subscriptionModels {
		subscriptionMap[subscriptionModels[i].WorkspaceID] = subscriptionModels[i]
	}

	subscriptions := make([]dto.SubscriptionResponse, 0, len(workspaceModels))
	for i := range workspaceModels {
		workspaceID := workspaceModels[i].ID
		if sub, ok := subscriptionMap[workspaceID]; ok {
			subscriptions = append(subscriptions, dto.WorkspaceSubscriptionToResponse(&sub))
		} else {
			subscriptions = append(subscriptions, dto.SubscriptionResponse{
				WorkspaceID:        workspaceID,
				Plan:               string(subscriptionplan.Free),
				Status:             "none",
				Provider:           "stripe",
				SeatQuantity:       0,
				CancelAtPeriodEnd:  false,
				CurrentPeriodStart: time.Time{},
				CurrentPeriodEnd:   nil,
				CreatedAt:          time.Time{},
				UpdatedAt:          time.Time{},
				DeletedAt:          nil,
			})
		}
	}

	return workspaces, subscriptions, total, nil
}

func (s *WorkspaceService) GetPendingOfferTargetWorkspacesForUser(ctx context.Context, userID uuid.UUID) ([]dto.WorkspaceResponse, []dto.SubscriptionResponse, []dto.ShareOfferResponse, error) {
	shareOffers, err := s.WorkspaceRepo.GetPendingWorkspaceShareOffersForUser(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return nil, nil, nil, err
	}
	if len(shareOffers) == 0 {
		return []dto.WorkspaceResponse{}, []dto.SubscriptionResponse{}, []dto.ShareOfferResponse{}, nil
	}

	workspaceIDSet := make(map[uuid.UUID]struct{}, len(shareOffers))
	for i := range shareOffers {
		workspaceIDSet[shareOffers[i].TargetID] = struct{}{}
	}

	workspaceIDs := make([]uuid.UUID, 0, len(workspaceIDSet))
	for workspaceID := range workspaceIDSet {
		workspaceIDs = append(workspaceIDs, workspaceID)
	}

	workspaceModels, err := s.WorkspaceRepo.GetWorkspacesByIDs(ctx, workspaceIDs, s.IncludeDeleted)
	if err != nil {
		return nil, nil, nil, err
	}

	workspaces := make([]dto.WorkspaceResponse, 0, len(workspaceModels))
	for i := range workspaceModels {
		workspaces = append(workspaces, dto.WorkspaceToResponse(&workspaceModels[i]))
	}

	subscriptionModels, err := s.WorkspaceRepo.GetWorkspaceSubscriptionsByWorkspaceIDs(ctx, workspaceIDs, s.IncludeDeleted)
	if err != nil {
		return nil, nil, nil, err
	}

	subscriptionMap := make(map[uuid.UUID]models.WorkspaceSubscription, len(subscriptionModels))
	for i := range subscriptionModels {
		subscriptionMap[subscriptionModels[i].WorkspaceID] = subscriptionModels[i]
	}

	subscriptions := make([]dto.SubscriptionResponse, 0, len(workspaceModels))
	for i := range workspaceModels {
		workspaceID := workspaceModels[i].ID
		if sub, ok := subscriptionMap[workspaceID]; ok {
			subscriptions = append(subscriptions, dto.WorkspaceSubscriptionToResponse(&sub))
		} else {
			subscriptions = append(subscriptions, dto.SubscriptionResponse{
				WorkspaceID:        workspaceID,
				Plan:               string(subscriptionplan.Free),
				Status:             "none",
				Provider:           "stripe",
				SeatQuantity:       0,
				CancelAtPeriodEnd:  false,
				CurrentPeriodStart: time.Time{},
				CurrentPeriodEnd:   nil,
				CreatedAt:          time.Time{},
				UpdatedAt:          time.Time{},
				DeletedAt:          nil,
			})
		}
	}

	shareOfferResponses := dto.ShareOffersToResponses(shareOffers)

	return workspaces, subscriptions, shareOfferResponses, nil
}

func (s *WorkspaceService) GetWorkspaceBoardsForUserID(ctx context.Context, userID uuid.UUID, workspaceID uuid.UUID) ([]dto.BoardResponse, []dto.UserBoardResponse, error) {
	userworkspace, err := s.WorkspaceRepo.GetUserWorkspace(ctx, userID, workspaceID)
	if err != nil {
		return nil, nil, err
	}
	if userworkspace == nil {
		return nil, nil, domainerr.ErrForbidden
	}

	if !rbac.AtLeast(userworkspace.Role, rbac.Viewer) {
		return nil, nil, domainerr.ErrForbidden
	}

	rows, err := s.WorkspaceRepo.GetWorkspaceBoardsForUserID(ctx, userID, workspaceID)
	if err != nil {
		return nil, nil, err
	}
	boards, userboards := boards.UserBoardRowsToModels(rows)

	boardResponses := make([]dto.BoardResponse, 0, len(boards))
	userBoardResponses := make([]dto.UserBoardResponse, 0, len(userboards))

	for i := range boards {
		boardResponses = append(boardResponses, dto.BoardToResponse(&boards[i]))
		userBoardResponses = append(userBoardResponses, dto.UserBoardToResponse(&userboards[i]))
	}

	return boardResponses, userBoardResponses, nil
}

func (s *WorkspaceService) GetWorkspacesBoardsForUserID(ctx context.Context, userID uuid.UUID) (*dto.BoardsAccrossWorkspacesResponse, error) {

	//workspaceIds, err := s.WorkspaceRepo.GetWorkspaceIDsByUserID(ctx, userID)

	workspaces, userworkspaces, subscriptions, err := s.GetUserWorkspaces(ctx, userID)
	if err != nil {
		return nil, err
	}

	workspaceIds := make([]uuid.UUID, 0, len(workspaces))
	for _, workspace := range workspaces {
		workspaceIds = append(workspaceIds, workspace.ID)
	}

	userWorkspaces, err := s.WorkspaceRepo.GetUserWorkspacesByIDs(ctx, userID, workspaceIds)

	for _, userWorkspace := range userWorkspaces {

		if !rbac.AtLeast(userWorkspace.Role, rbac.Viewer) {
			return nil, domainerr.ErrForbidden
		}
	}

	rows, err := s.WorkspaceRepo.GetWorkspacesBoardsForUserID(ctx, userID, workspaceIds)
	if err != nil {
		return nil, err
	}
	boards, userboards := boards.UserBoardRowsToModels(rows)

	boardResponses := make([]dto.BoardResponse, 0, len(boards))
	userBoardResponses := make([]dto.UserBoardResponse, 0, len(userboards))

	for i := range boards {
		boardResponses = append(boardResponses, dto.BoardToResponse(&boards[i]))
		userBoardResponses = append(userBoardResponses, dto.UserBoardToResponse(&userboards[i]))
	}
	BoardIDsByWorkspaceID := make(map[uuid.UUID][]uuid.UUID)
	for _, board := range boards {
		BoardIDsByWorkspaceID[board.WorkspaceID] = append(BoardIDsByWorkspaceID[board.WorkspaceID], board.ID)
	}

	boardsAccrossWorkspacesResponse := &dto.BoardsAccrossWorkspacesResponse{
		Workspaces:             workspaces,
		UserWorkspaces:         userworkspaces,
		WorkspaceSubscriptions: subscriptions,
		Boards:                 boardResponses,
		UserBoards:             userBoardResponses,
		BoardIDsByWorkspaceID:  BoardIDsByWorkspaceID,
	}

	return boardsAccrossWorkspacesResponse, nil
}

func (s *WorkspaceService) CreateBoardInWorkspace(ctx context.Context, userID, workspaceID, correlationID uuid.UUID, request CreateBoardInWorkspaceRequest) (*dto.BoardResponse, *dto.UserBoardResponse, error) {
	userworkspace, err := s.WorkspaceRepo.GetUserWorkspace(ctx, userID, workspaceID)
	if err != nil {
		return nil, nil, err
	}
	if userworkspace == nil {
		return nil, nil, domainerr.ErrForbidden
	}
	if !rbac.AtLeast(userworkspace.Role, rbac.Member) {
		return nil, nil, domainerr.ErrForbidden
	}
	ok, err := s.SubscriptionService.CheckWorkspaceMembershipLimit(ctx, userID)
	if err != nil {
		return nil, nil, err
	} else if !ok {
		return nil, nil, domainerr.New(domainerr.ErrForbidden, "workspace membership limit reached")
	}

	position, err := s.WorkspaceBoardPositionHelper.WorkspaceBoardPosAtEnd(ctx, userID, workspaceID)
	if err != nil {
		return nil, nil, err
	}
	token, err := tokens.NewPublicToken()
	if err != nil {
		return nil, nil, err
	}

	jsonProps, err := json.Marshal(request.Props)
	if err != nil {
		return nil, nil, err
	}
	dataProps := datatypes.JSON(jsonProps)

	board := &models.Board{
		ID:              uuid.New(),
		WorkspaceID:     workspaceID,
		Name:            request.Name,
		CreatedByUserID: userID,
		Visibility:      models.BoardVisibility(request.Visibility),
		Props:           dataProps,
		PublicToken:     token,
	}
	userBoard := &models.UserBoard{

		BoardID: board.ID,
		UserID:  userID,
		Role:    rbac.Owner.String(),
		Pos:     position,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.BoardsRepo.CreateBoardTX(ctx, tx, board); err != nil {
			return err
		}
		if err := s.MembershipRepo.CreateUserBoardTX(ctx, tx, userBoard); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}

	boardResponse := dto.BoardToResponse(board)
	userBoardResponse := dto.UserBoardToResponse(userBoard)

	responseMap := map[uuid.UUID]dto.BoardResponse{
		board.ID: boardResponse,
	}
	statePayload := dto.BoardDetailResponse{
		Boards: responseMap,
	}
	domainPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	targets := []EventRegistry.TargetRef{
		{
			EntityType: "workspace",
			EntityID:   workspaceID,
		},
		{
			EntityType: "board",
			EntityID:   board.ID,
		},
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventWorkspaceBoardCreated,
		BoardID:       &board.ID,
		WorkspaceID:   &workspaceID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       domainPayload,
		Targets:       targets,
		OccurredAt:    time.Now(),
	}

	s.EventRegistry.Emit(ctx, s.db, domainEvent)

	return &boardResponse, &userBoardResponse, nil
}

func (s *WorkspaceService) GetWorkspaceMembers(ctx context.Context, userID, workspaceID uuid.UUID) ([]dto.UserResponse, []dto.UserWorkspaceResponse, error) {
	userworkspace, err := s.WorkspaceRepo.GetUserWorkspace(ctx, userID, workspaceID)
	if err != nil {
		return nil, nil, err
	}
	if userworkspace == nil {
		return nil, nil, domainerr.ErrForbidden
	}
	if !rbac.AtLeast(userworkspace.Role, rbac.Viewer) {
		return nil, nil, domainerr.ErrForbidden
	}

	rows, err := s.WorkspaceRepo.GetWorkspaceMembersByWorkspaceID(ctx, workspaceID, false)
	if err != nil {
		return nil, nil, err
	}

	users := make([]dto.UserResponse, 0, len(rows))
	userWorkspaces := make([]dto.UserWorkspaceResponse, 0, len(rows))
	for i := range rows {
		users = append(users, dto.UserToResponse(&rows[i].User))
		userWorkspaces = append(userWorkspaces, dto.UserWorkspaceToResponse(&rows[i].UserWorkspace))
	}

	return users, userWorkspaces, nil
}

func (s *WorkspaceService) AddWorkspaceMember(ctx context.Context, userID, workspaceID uuid.UUID, req AddWorkspaceMemberRequest) (*dto.UserResponse, *dto.UserWorkspaceResponse, error) {
	userworkspace, err := s.WorkspaceRepo.GetUserWorkspace(ctx, userID, workspaceID)
	if err != nil {
		return nil, nil, err
	}
	if userworkspace == nil {
		return nil, nil, domainerr.ErrForbidden
	}
	if !rbac.AtLeast(userworkspace.Role, rbac.Admin) {
		return nil, nil, domainerr.ErrForbidden
	}
	ok, err := s.SubscriptionService.CheckWorkspaceMembershipLimit(ctx, req.TargetUserID)
	if err != nil {
		return nil, nil, err
	} else if !ok {
		return nil, nil, domainerr.New(domainerr.ErrForbidden, "workspace membership limit reached")
	}
	position, err := s.UserWorkspacePositionHelper.UserWorkspacePosAtEnd(ctx, req.TargetUserID)
	if err != nil {
		return nil, nil, err
	}
	role, ok := rbac.ParseRole(req.Role)
	if !ok {
		return nil, nil, domainerr.New(domainerr.ErrValidation, "invalid role")
	}
	newUserWorkspace := &models.UserWorkspace{
		ID:          uuid.New(),
		UserID:      req.TargetUserID,
		WorkspaceID: workspaceID,
		Role:        role,
		Pos:         position,
	}
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.WorkspaceRepo.CreateUserWorkspaceTX(ctx, tx, newUserWorkspace); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, nil, err
	}
	user, err := s.MembershipRepo.GetUser(ctx, req.TargetUserID)
	if err != nil {
		return nil, nil, err
	}
	userResponse := dto.UserToResponse(user)
	userWorkspaceResponse := dto.UserWorkspaceToResponse(newUserWorkspace)
	return &userResponse, &userWorkspaceResponse, nil
}

func (s *WorkspaceService) CloseBoardInWorkspace(ctx context.Context, userID, workspaceID, boardID, correlationID uuid.UUID) (*dto.BoardResponse, error) {
	userworkspace, err := s.WorkspaceRepo.GetUserWorkspace(ctx, userID, workspaceID)
	if err != nil {
		fmt.Println("Error fetching user workspace:", err)
		return nil, err
	}
	if userworkspace == nil {
		fmt.Println("User workspace not found for user:", userID, "workspace:", workspaceID)
		return nil, domainerr.ErrForbidden
	}
	if !rbac.AtLeast(userworkspace.Role, rbac.Member) {
		fmt.Println("User does not have permission to close board. User role:", userworkspace.Role)
		return nil, domainerr.ErrForbidden
	}
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		fmt.Println("User does not have minimum role to perform this action:", err)
		return nil, err
	}
	board, err := s.BoardsRepo.GetBoard(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		fmt.Println("Error fetching board:", err)
		return nil, err
	}
	if board.WorkspaceID != workspaceID {
		fmt.Println("Board does not belong to the workspace. Board workspaceID:", board.WorkspaceID, "Expected workspaceID:", workspaceID)
		return nil, domainerr.ErrForbidden
	}
	var closedBoard *models.Board

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		closedBoard, err = s.BoardsRepo.DeleteBoardTX(ctx, tx, boardID)
		if err != nil {
			fmt.Println("Error deleting board in transaction:", err)
			return err
		}
		if closedBoard == nil {
			fmt.Println("Board not found for deletion. Board ID:", boardID)
			return domainerr.ErrNotFound
		}
		return nil
	}); err != nil {
		return nil, err
	}

	boardResponse := dto.BoardToResponse(closedBoard)
	statePayload := dto.BoardDetailResponse{
		Boards: map[uuid.UUID]dto.BoardResponse{
			closedBoard.ID: boardResponse,
		},
	}
	domainPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	targets := []EventRegistry.TargetRef{
		{
			EntityType: "workspace",
			EntityID:   workspaceID,
		},
		{
			EntityType: "board",
			EntityID:   boardID,
		},
	}
	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventWorkspaceBoardClosed,
		BoardID:       &boardID,
		WorkspaceID:   &workspaceID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       domainPayload,
		OccurredAt:    time.Now(),
		Targets:       targets,
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvent)

	return &boardResponse, nil
}

func (s *WorkspaceService) RestoreBoardInWorkspace(ctx context.Context, userID, workspaceID, boardID, correlationID uuid.UUID) (*dto.UserBoardRowsResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, workspaceID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	board, err := s.BoardsRepo.GetBoard(ctx, boardID, true)
	if err != nil {
		return nil, err
	}
	if board.WorkspaceID != workspaceID {
		return nil, domainerr.ErrForbidden
	}
	var restoredBoard *models.Board
	var userBoard *models.UserBoard
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		restoredBoard, err = s.BoardsRepo.RestoreBoardTX(ctx, tx, boardID)
		if err != nil {
			return err
		}
		if restoredBoard == nil {
			return domainerr.ErrNotFound
		}
		userBoard, err = s.BoardsRepo.GetUserBoardTX(ctx, tx, userID, boardID, true)
		if err != nil {
			return err
		}

		return nil
	}); err != nil {
		return nil, err
	}

	boardResponse := dto.BoardToResponse(restoredBoard)
	userBoardResponse := dto.UserBoardToResponse(userBoard)
	statePayload := dto.BoardDetailResponse{
		Boards: map[uuid.UUID]dto.BoardResponse{
			restoredBoard.ID: boardResponse,
		},
	}
	domainPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	targets := []EventRegistry.TargetRef{
		{
			EntityType: "workspace",
			EntityID:   workspaceID,
		},
		{
			EntityType: "board",
			EntityID:   boardID,
		},
	}

	userEventType := ws.EventUserWorkspaceBoardRestored
	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventWorkspaceBoardRestored,
		UserEventType: &userEventType,
		BoardID:       &boardID,
		WorkspaceID:   &workspaceID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       domainPayload,
		OccurredAt:    time.Now(),
		Targets:       targets,
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvent)

	response := dto.UserBoardRowsResponse{
		Boards:     []dto.BoardResponse{boardResponse},
		UserBoards: []dto.UserBoardResponse{userBoardResponse},
	}

	return &response, nil
}

func (s *WorkspaceService) PurgeBoardInWorkspace(ctx context.Context, userID, workspaceID, boardID, correlationID uuid.UUID) (map[uuid.UUID]dto.BoardResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, workspaceID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	board, err := s.BoardsRepo.GetBoard(ctx, boardID, true)
	if err != nil {
		return nil, err
	}
	if board.WorkspaceID != workspaceID {
		return nil, domainerr.ErrForbidden
	}
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		err := s.BoardsRepo.PurgeUserBoardsByBoardIDTX(ctx, tx, boardID, true)
		if err != nil {
			return err
		}
		err = s.BoardsRepo.PurgeBoardTX(ctx, tx, boardID)
		if err != nil {
			return err
		}
		return nil
	}); err != nil {
		return nil, err
	}

	response := map[uuid.UUID]dto.BoardResponse{
		board.ID: {}, // empty board response indicates deletion
	}

	statePayload := dto.BoardDetailResponse{
		Boards: map[uuid.UUID]dto.BoardResponse{
			board.ID: {}, // empty board response indicates deletion
		},
	}
	domainPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	targets := []EventRegistry.TargetRef{
		{
			EntityType: "workspace",
			EntityID:   workspaceID,
		},
		{
			EntityType: "board",
			EntityID:   boardID,
		},
	}
	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventWorkspaceBoardPurged,
		BoardID:       &boardID,
		WorkspaceID:   &workspaceID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       domainPayload,
		OccurredAt:    time.Now(),
		Targets:       targets,
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvent)
	return response, nil

}

func (s *WorkspaceService) GetClosedBoardsInWorkspace(ctx context.Context, userID, workspaceID uuid.UUID) ([]dto.BoardResponse, []dto.UserBoardResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, workspaceID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}
	rows, err := s.WorkspaceRepo.GetClosedWorkspaceBoardsForUserID(ctx, userID, workspaceID)
	if err != nil {
		return nil, nil, err
	}
	boards, userboards := boards.UserBoardRowsToModels(rows)

	boardResponses := make([]dto.BoardResponse, len(boards))
	for i, board := range boards {
		boardResponses[i] = dto.BoardToResponse(&board)
	}
	userBoardResponses := make([]dto.UserBoardResponse, len(userboards))
	for i, userboard := range userboards {
		userBoardResponses[i] = dto.UserBoardToResponse(&userboard)
	}

	return boardResponses, userBoardResponses, nil
}

func (s *WorkspaceService) ChangeWorkspaceMemberRole(ctx context.Context, userID, workspaceID, targetUserID, correlationID uuid.UUID, req ChangeWorkspaceMemberRoleRequest) (*dto.UserWorkspaceResponse, error) {
	userworkspace, err := s.WorkspaceRepo.GetUserWorkspace(ctx, userID, workspaceID)
	if err != nil {
		return nil, err
	}
	if userworkspace == nil {
		return nil, domainerr.ErrForbidden
	}
	if !rbac.AtLeast(userworkspace.Role, rbac.Admin) {
		return nil, domainerr.ErrForbidden
	}

	updateMap := make(map[string]interface{})
	role, ok := rbac.ParseRole(req.Role)
	if !ok {
		return nil, domainerr.New(domainerr.ErrValidation, "invalid role")
	}
	updateMap["role"] = role

	var updatedUserWorkspace *models.UserWorkspace
	err = s.db.Transaction(func(tx *gorm.DB) error {
		var err error
		updatedUserWorkspace, err = s.WorkspaceRepo.UpdateUserWorkspaceRoleTX(ctx, tx, targetUserID, workspaceID, updateMap)
		return err
	})
	if err != nil {
		return nil, err
	}
	if updatedUserWorkspace == nil {
		return nil, domainerr.ErrNotFound
	}
	userWorkspaceResponse := dto.UserWorkspaceToResponse(updatedUserWorkspace)

	statePayload := dto.BoardDetailResponse{
		UserWorkspaceRelations: []dto.UserWorkspaceResponse{userWorkspaceResponse},
	}
	domainPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	targets := []EventRegistry.TargetRef{
		{
			EntityType: "workspace",
			EntityID:   workspaceID,
		},
		{
			EntityType: "user",
			EntityID:   targetUserID,
		},
	}
	userEventType := ws.EventUserWorkspaceMemberRoleChanged
	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventWorkspaceMemberRoleChanged,
		UserEventType: &userEventType,
		WorkspaceID:   &workspaceID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       domainPayload,
		OccurredAt:    time.Now(),
		Targets:       targets,
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvent)
	return &userWorkspaceResponse, nil
}

func (s *WorkspaceService) DeleteWorkspaceMember(ctx context.Context, userID, workspaceID, memberID, correlationID uuid.UUID) (*dto.UserWorkspaceResponse, error) {

	tagetUserWorkspace, err := s.WorkspaceRepo.GetUserWorkspace(ctx, memberID, workspaceID)
	if err != nil {
		return nil, err
	}
	if tagetUserWorkspace == nil {
		return nil, domainerr.ErrForbidden
	}
	requesterUserWorkspace, err := s.WorkspaceRepo.GetUserWorkspace(ctx, userID, workspaceID)
	if err != nil {
		return nil, err
	}
	if requesterUserWorkspace == nil {
		return nil, domainerr.ErrForbidden
	}

	if memberID != userID {
		if !rbac.AtLeast(requesterUserWorkspace.Role, rbac.Admin) {
			return nil, domainerr.ErrForbidden
		}
	}
	if memberID == userID {
		if requesterUserWorkspace.Role == rbac.Owner {
			return nil, domainerr.ErrForbidden
		}
	}
	var userWokspace *models.UserWorkspace
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error
		userWokspace, err = s.WorkspaceRepo.DeleteUserWorkspaceTX(ctx, tx, memberID, workspaceID)
		if err != nil {
			return err
		}
		err = s.WorkspaceRepo.DeleteUserBaordsWhereWorkspaceIDTX(ctx, tx, memberID, workspaceID)
		if err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return nil, err
	}
	if userWokspace == nil {
		return nil, domainerr.ErrNotFound
	}
	userWorkspaceResponse := dto.UserWorkspaceToResponse(userWokspace)

	statePayload := dto.BoardDetailResponse{
		UserWorkspaceRelations: []dto.UserWorkspaceResponse{userWorkspaceResponse},
	}
	domainPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}

	targets := []EventRegistry.TargetRef{
		{
			EntityType: "workspace",
			EntityID:   workspaceID,
		},
		{
			EntityType: "user",
			EntityID:   memberID,
		},
	}
	userEventType := ws.EventUserWorkspaceMemberRemoved
	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventWorkspaceMemberRemoved,
		UserEventType: &userEventType,
		WorkspaceID:   &workspaceID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       domainPayload,
		OccurredAt:    time.Now(),
		Targets:       targets,
	}
	s.EventRegistry.Emit(ctx, s.db, domainEvent)
	return &userWorkspaceResponse, nil
}
