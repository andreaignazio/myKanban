package memberships

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/guard"
	"GoGORM/internal/rbac"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type MembershipService struct {
	MembershipRepo      MembershipRepo
	SubscriptionService SubscriptionService
	WorkspaceRepo       WorkspaceRepo
	Hub                 WorkspaceEventBroadcaster
	EventRegistry       *EventRegistry.EventRegistryService
	db                  *gorm.DB
	IncludeDeleted      bool
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUsersBoardRows(ctx context.Context, boardID, workspaceID uuid.UUID, includeDeleted bool) ([]BoardUserRow, error)
	CreateUserBoardLink(ctx context.Context, userBoard *models.UserBoard) error
	UpdateUserBoardRole(ctx context.Context, userBoard *models.UserBoard) error
	DeleteUserBoardLink(ctx context.Context, userID, boardID uuid.UUID) error
	SearchUsers(ctx context.Context, query string) ([]models.User, error)
	GetUsersByIDs(ctx context.Context, userIDs []uuid.UUID) ([]models.User, error)
	GetUser(ctx context.Context, userID uuid.UUID) (*models.User, error)
	GetUserByClerkUserID(ctx context.Context, clerkUserID string) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	CreateUser(ctx context.Context, user *models.User) error
	PatchUserByID(ctx context.Context, userID uuid.UUID, updates map[string]any) (*models.User, error)
	GetUserWorkspaceIDs(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error)
}

type WorkspaceEventBroadcaster interface {
	BroadCastToWorkspace(evt ws.WorkspaceEvent)
}

type SubscriptionService interface {
	CheckWorkspaceMembershipLimit(ctx context.Context, userID uuid.UUID) (bool, error)
}

type WorkspaceRepo interface {
	GetWorkspaceIDByBoardID(ctx context.Context, boardID uuid.UUID) (uuid.UUID, error)
	CheckUserWorkspaceMembership(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (bool, error)
}

func NewMembershipService(db *gorm.DB, MembershipRepo MembershipRepo, SubscriptionService SubscriptionService, WorkspaceRepo WorkspaceRepo, Hub WorkspaceEventBroadcaster, eventRegistry *EventRegistry.EventRegistryService) *MembershipService {
	return &MembershipService{db: db, MembershipRepo: MembershipRepo, SubscriptionService: SubscriptionService, WorkspaceRepo: WorkspaceRepo, Hub: Hub, EventRegistry: eventRegistry, IncludeDeleted: false}
}

func (s *MembershipService) GetBoardMembers(ctx context.Context, userID, boardID, workspaceID uuid.UUID) ([]BoardUserRow, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return nil, err
	}
	boardUserRows, err := s.MembershipRepo.GetUsersBoardRows(ctx, boardID, workspaceID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	return boardUserRows, nil
}

func (s *MembershipService) AddBoardMember(ctx context.Context, userID, boardID uuid.UUID,
	req AddBoardMemberRequest) (*models.UserBoard, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	if req.Role == rbac.Owner.String() {
		return nil, domainerr.New(domainerr.ErrForbidden, "cannot assign owner role to another user")
	}
	userBoard := &models.UserBoard{
		UserID:  req.TargetUserID,
		BoardID: boardID,
		Role:    req.Role}

	// Check workspace membership limit
	if ok, err := s.SubscriptionService.CheckWorkspaceMembershipLimit(ctx, req.TargetUserID); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	} else if !ok {
		return nil, domainerr.New(domainerr.ErrForbidden, "workspace membership limit reached")
	}

	if err := s.MembershipRepo.CreateUserBoardLink(ctx, userBoard); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return userBoard, nil
}

func (s *MembershipService) ChangeBoardMemberRole(ctx context.Context, userID, boardID, workspaceID, targetMemberID, correlationID uuid.UUID,
	req ChangeBoardMemberRoleRequest) (*models.UserBoard, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	if req.Role == rbac.Owner.String() {
		return nil, domainerr.New(domainerr.ErrForbidden, "cannot assign owner role to another user")
	}
	//TO DO: check if targetMemberID is member of the board
	if _, err := s.MembershipRepo.GetUserRole(ctx, targetMemberID, boardID, s.IncludeDeleted); err != nil {
		return nil, domainerr.New(domainerr.ErrNotFound, "target member is not part of the board")
	}
	userBoard := &models.UserBoard{
		UserID:  targetMemberID,
		BoardID: boardID,
		Role:    req.Role}
	if err := s.MembershipRepo.UpdateUserBoardRole(ctx, userBoard); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	statePayload := dto.BoardDetailResponse{
		Boards: map[uuid.UUID]dto.BoardResponse{
			boardID: {
				ID:          boardID,
				WorkspaceID: workspaceID,
			},
		},
		UserBoardRelations: []dto.UserBoardResponse{
			dto.UserBoardToResponse(userBoard),
		},
	}

	envelope := EventRegistry.EventPayloadEnvelope{StatePayload: &statePayload}
	targets := []EventRegistry.TargetRef{
		{EntityType: "board", EntityID: boardID},
		{EntityType: "user", EntityID: targetMemberID},
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardMemberRoleChanged,
		ActorUserID:   &userID,
		BoardID:       &boardID,
		WorkspaceID:   &workspaceID,
		Payload:       envelope,
		CorrelationID: &correlationID,
		Targets:       targets,
		OccurredAt:    time.Now(),
	}

	if s.EventRegistry != nil {
		if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
			return nil, err
		}
	}
	return userBoard, nil
}

func (s *MembershipService) DeleteBoardMember(ctx context.Context, userID, boardID, workspaceID, targetMemberID, correlationID uuid.UUID) error {
	actorRole, err := s.MembershipRepo.GetUserRole(ctx, userID, boardID, s.IncludeDeleted)
	if err != nil {
		return domainerr.MapRepoErr(err, true)
	}
	if targetMemberID == userID {
		parsedRole, ok := rbac.ParseRole(actorRole)
		if !ok {
			return domainerr.ErrForbidden
		}
		if parsedRole == rbac.Owner {
			return domainerr.New(domainerr.ErrForbidden, "board owner cannot leave board")
		}
	} else {
		if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
			return err
		}
	}

	targetRole, err := s.MembershipRepo.GetUserRole(ctx, targetMemberID, boardID, s.IncludeDeleted)
	if err != nil {
		return domainerr.MapRepoErr(err, true)
	}

	if err := s.MembershipRepo.DeleteUserBoardLink(ctx, targetMemberID, boardID); err != nil {
		return domainerr.MapRepoErr(err, false)
	}

	statePayload := dto.BoardDetailResponse{
		Boards: map[uuid.UUID]dto.BoardResponse{
			boardID: {
				ID:          boardID,
				WorkspaceID: workspaceID,
			},
		},
		UserBoardRelations: []dto.UserBoardResponse{
			dto.UserBoardToResponse(&models.UserBoard{
				UserID:  targetMemberID,
				BoardID: boardID,
				Role:    targetRole,
			}),
		},
	}

	envelope := EventRegistry.EventPayloadEnvelope{StatePayload: &statePayload}
	targets := []EventRegistry.TargetRef{
		{EntityType: "board", EntityID: boardID},
		{EntityType: "user", EntityID: targetMemberID},
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardMemberRemoved,
		ActorUserID:   &userID,
		BoardID:       &boardID,
		WorkspaceID:   &workspaceID,
		Payload:       envelope,
		CorrelationID: &correlationID,
		Targets:       targets,
		OccurredAt:    time.Now(),
	}

	if s.EventRegistry != nil {
		if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
			return err
		}
	}
	return nil
}

func (s *MembershipService) SearchUsers(ctx context.Context, userID uuid.UUID, query string) ([]dto.UserResponse, error) {
	users, err := s.MembershipRepo.SearchUsers(ctx, query)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	userResponses := make([]dto.UserResponse, len(users))
	for i, user := range users {
		userResponses[i] = dto.UserToResponse(&user)
	}
	return userResponses, nil
}

func (s *MembershipService) GetUsersByIDs(ctx context.Context, req GetUsersByIDsRequest) ([]models.User, error) {
	users, err := s.MembershipRepo.GetUsersByIDs(ctx, req.UserIDs)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return users, nil
}

func (s *MembershipService) GetMe(ctx context.Context, userID uuid.UUID) (*dto.DetailedUserResponse, error) {
	user, err := s.MembershipRepo.GetUsersByIDs(ctx, []uuid.UUID{userID})
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return &dto.DetailedUserResponse{
		User: dto.UserToResponse(&user[0]),
	}, nil
}

func (s *MembershipService) RegisterUser(ctx context.Context, req RegisterUserRequest) (*dto.UserResponse, error) {
	name := strings.TrimSpace(req.Name)
	username := strings.TrimSpace(req.Username)
	email := strings.ToLower(strings.TrimSpace(req.Email))

	if name == "" || username == "" || email == "" || strings.TrimSpace(req.Password) == "" {
		return nil, domainerr.New(domainerr.ErrValidation, "name, username, email and password are required")
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, domainerr.New(domainerr.ErrInternal, "unable to hash password")
	}

	user := &models.User{
		ID:           uuid.New(),
		Name:         name,
		Username:     username,
		Email:        email,
		PasswordHash: string(passwordHash),
	}

	if err := s.MembershipRepo.CreateUser(ctx, user); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	response := dto.UserToResponse(user)
	return &response, nil
}

func (s *MembershipService) CanJoinBoard(ctx context.Context, userID, targetID uuid.UUID) (bool, bool, uuid.UUID, error) {

	workspaceID, err := s.WorkspaceRepo.GetWorkspaceIDByBoardID(ctx, targetID)
	if err != nil {
		return false, false, uuid.Nil, domainerr.MapRepoErr(err, true)
	}
	ok, err := s.WorkspaceRepo.CheckUserWorkspaceMembership(ctx, userID, workspaceID, s.IncludeDeleted)
	if err != nil {
		return false, false, uuid.Nil, domainerr.MapRepoErr(err, true)
	}
	if !ok { //User is entering in a new workspace
		isInSubscriptionPlanLimit, err := s.SubscriptionService.CheckWorkspaceMembershipLimit(ctx, userID)
		if err != nil {
			return false, false, uuid.Nil, domainerr.MapRepoErr(err, true)
		}
		if !isInSubscriptionPlanLimit {
			return false, false, uuid.Nil, domainerr.ErrForbidden
		} else {
			return true, false, workspaceID, nil
		}
	} else { //User is already member of the workspace, check if he is already member of the board
		_, err := s.MembershipRepo.GetUserRole(ctx, userID, targetID, s.IncludeDeleted)
		if err == nil { //User is already member of the board
			return false, true, uuid.Nil, nil
		} else if errors.Is(err, domainerr.ErrNotFound) { //User is not member of the board, but is member of the workspace
			return true, true, uuid.Nil, nil
		} else {
			return false, false, uuid.Nil, domainerr.MapRepoErr(err, true)
		}
	}

}

func (s *MembershipService) CanJoinWorkspace(ctx context.Context, userID, workspaceID uuid.UUID) (bool, error) {
	isMember, err := s.WorkspaceRepo.CheckUserWorkspaceMembership(ctx, userID, workspaceID, s.IncludeDeleted)
	if err != nil {
		return false, domainerr.MapRepoErr(err, true)
	}
	if isMember {
		return false, domainerr.ErrConflict
	} else {
		isInSubscriptionPlanLimit, err := s.SubscriptionService.CheckWorkspaceMembershipLimit(ctx, userID)
		if err != nil {
			return false, domainerr.MapRepoErr(err, true)
		}
		if !isInSubscriptionPlanLimit {
			return false, domainerr.ErrForbidden
		} else {
			return true, nil
		}
	}
}

func (s *MembershipService) PatchMeProps(ctx context.Context, userID, correlationID uuid.UUID, req PatchMePropsRequest) (*dto.UserResponse, error) {
	currentUser, err := s.MembershipRepo.GetUser(ctx, userID)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	mergedProps, err := dto.MergeNestedProps(req.Props, currentUser.Props)
	if err != nil {
		return nil, domainerr.ErrValidation
	}

	jsonProps, err := json.Marshal(mergedProps)
	if err != nil {
		return nil, domainerr.ErrValidation
	}

	updatedUser, err := s.MembershipRepo.PatchUserByID(ctx, userID, map[string]any{
		"props": datatypes.JSON(jsonProps),
	})
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	response := dto.UserToResponse(updatedUser)
	s.emitWorkspaceUserUpdated(ctx, userID, correlationID, response)
	return &response, nil
}

func (s *MembershipService) PatchMeDetail(ctx context.Context, userID, correlationID uuid.UUID, req PatchMeDetailRequest) (*dto.UserResponse, error) {
	updates := map[string]any{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Username != nil {
		updates["username"] = *req.Username
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}

	if len(updates) == 0 {
		return nil, domainerr.ErrValidation
	}

	updatedUser, err := s.MembershipRepo.PatchUserByID(ctx, userID, updates)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	response := dto.UserToResponse(updatedUser)
	s.emitWorkspaceUserUpdated(ctx, userID, correlationID, response)
	return &response, nil
}

func (s *MembershipService) emitWorkspaceUserUpdated(ctx context.Context, actorUserID, correlationID uuid.UUID, user dto.UserResponse) {
	if s.Hub == nil {
		return
	}
	workspaceIDs, err := s.MembershipRepo.GetUserWorkspaceIDs(ctx, user.ID)
	if err != nil {
		return
	}
	payload := WorkspaceUserUpdatedPayload{User: user}
	for _, workspaceID := range workspaceIDs {
		wsEvent := ws.WorkspaceEvent{
			Type:          "workspace.user.updated",
			WorkspaceID:   workspaceID,
			Payload:       payload,
			TS:            time.Now(),
			ID:            uuid.New(),
			ActorUserID:   &actorUserID,
			CorrelationID: &correlationID,
		}
		s.Hub.BroadCastToWorkspace(wsEvent)
	}
}
