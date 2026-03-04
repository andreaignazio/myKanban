package sharelinks

import (
	"GoGORM/internal/authz"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/rbac"
	"GoGORM/models"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgconn"
	"gorm.io/gorm"
)

type ShareLinkRepository interface {
	CreateShareLink(ctx context.Context, shareLink *models.PublicShareLink) error
	GetShareLinkByToken(ctx context.Context, token string) (*models.PublicShareLink, error)
	RevokeShareLink(ctx context.Context, shareLink *models.PublicShareLink) error
	GetShareLinksByTargetID(ctx context.Context, targetID uuid.UUID, includeDeleted bool) ([]models.PublicShareLink, error)
	GetBoardByID(ctx context.Context, boardID uuid.UUID, includeDeleted bool) (*models.Board, error)
	GetWorkspaceByID(ctx context.Context, workspaceID uuid.UUID, includeDeleted bool) (*models.Workspace, error)
	GetUserBoardsByBoardID(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.UserBoard, error)
	GetUserWorkspacesByWorkspaceID(ctx context.Context, workspaceID uuid.UUID, includeDeleted bool) ([]models.UserWorkspace, error)
}

type ShareLinkService struct {
	db                      *gorm.DB
	repo                    ShareLinkRepository
	EventRegistry           *EventRegistry.EventRegistryService
	MembershipRepo          MembershipRepo
	PositionHelper          PositionHelper
	WorkspacePositionHelper WorkspacePositionHelper
	WorkspaceRepo           WorkspaceRepo
	MembershipService       MembeshipService
	IncludeDeleted          bool
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUserWorkspaceRole(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (string, error)
	CreateUserBoardTX(ctx context.Context, db *gorm.DB, userBoard *models.UserBoard) error
	GetUsersByIDs(ctx context.Context, userIDs []uuid.UUID) ([]models.User, error)
}

type MembeshipService interface {
	CanJoinBoard(ctx context.Context, userID, targetID uuid.UUID) (bool, bool, uuid.UUID, error)
	CanJoinWorkspace(ctx context.Context, userID, workspaceID uuid.UUID) (bool, error)
}

type PositionHelper interface {
	UserWorkspacePosAtEnd(ctx context.Context, userID uuid.UUID) (string, error)
}

type WorkspacePositionHelper interface {
	WorkspaceBoardPosAtEnd(ctx context.Context, userID, workspaceID uuid.UUID) (string, error)
}

type WorkspaceRepo interface {
	CreateUserWorkspaceTX(ctx context.Context, tx *gorm.DB, userWorkspace *models.UserWorkspace) error
}

func NewPublicToken() (string, error) {
	b := make([]byte, 32) // 256-bit
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return false
	}
	return pgErr.Code == "23505"
}

func NewShareLinkService(db *gorm.DB, repo ShareLinkRepository, eventRegistry *EventRegistry.EventRegistryService, membershipRepo MembershipRepo, membershipService MembeshipService, workspaceRepo WorkspaceRepo, positionHelper PositionHelper, workspacePositionHelper WorkspacePositionHelper, includeDeleted bool) *ShareLinkService {
	return &ShareLinkService{
		db:                      db,
		repo:                    repo,
		EventRegistry:           eventRegistry,
		MembershipRepo:          membershipRepo,
		MembershipService:       membershipService,
		WorkspaceRepo:           workspaceRepo,
		PositionHelper:          positionHelper,
		WorkspacePositionHelper: workspacePositionHelper,
		IncludeDeleted:          includeDeleted,
	}
}

func (s *ShareLinkService) CreateShareLink(ctx context.Context, userID uuid.UUID, req CreateShareLinkRequest) (*models.PublicShareLink, error) {

	if req.TargetType == "board" {
		if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, req.TargetID, rbac.Admin, s.IncludeDeleted); err != nil {
			return nil, err
		}

	} else if req.TargetType == "workspace" {
		if err := authz.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, req.TargetID, rbac.Admin, s.IncludeDeleted); err != nil {
			return nil, err
		}
	}

	parsedRole, ok := rbac.ParseRole(req.Role)
	if !ok {
		return nil, domainerr.ErrValidation
	}

	mode := models.ShareLinkModeAutoJoin
	if req.Mode != "" {
		mode = models.ShareLinkMode(req.Mode)
	}
	if mode != models.ShareLinkModeAutoJoin && mode != models.ShareLinkModeSendRequest {
		return nil, domainerr.ErrValidation
	}

	const maxTokenRetries = 3
	shareLink := &models.PublicShareLink{
		ID:              uuid.New(),
		TargetID:        req.TargetID,
		TargetType:      req.TargetType,
		Mode:            mode,
		CreatedByUserID: userID,
		Role:            parsedRole,
	}
	if !req.ExpiresAt.IsZero() {
		expiresAt := req.ExpiresAt
		shareLink.ExpiresAt = &expiresAt
	}

	for attempt := 0; attempt < maxTokenRetries; attempt++ {
		token, err := NewPublicToken()
		if err != nil {
			return nil, err
		}
		shareLink.Token = token
		if err := s.repo.CreateShareLink(ctx, shareLink); err != nil {
			if isUniqueViolation(err) {
				continue
			}
			return nil, err
		}
		return shareLink, nil
	}
	return nil, domainerr.ErrConflict
}

func (s *ShareLinkService) ClaimShareLink(ctx context.Context, userID uuid.UUID, correlationID uuid.UUID, token string) (*ClaimShareLinkResponse, error) {
	shareLink, err := s.repo.GetShareLinkByToken(ctx, token)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	if shareLink.Mode != models.ShareLinkModeAutoJoin {
		return nil, domainerr.ErrForbidden
	}
	if shareLink.ExpiresAt != nil && !shareLink.ExpiresAt.IsZero() && shareLink.ExpiresAt.Before(time.Now()) {
		return nil, domainerr.ErrForbidden
	}
	if shareLink.RevokedAt != nil {
		return nil, domainerr.ErrForbidden
	}
	switch shareLink.TargetType {
	case "board":
		canJoin, isAlreadyAWorkspaceMember, workspaceID, err := s.MembershipService.CanJoinBoard(ctx, userID, shareLink.TargetID)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
		if !canJoin {
			return nil, domainerr.ErrForbidden
		}

		pos, err := s.WorkspacePositionHelper.WorkspaceBoardPosAtEnd(ctx, userID, workspaceID)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
		userBoard := &models.UserBoard{
			UserID:  userID,
			BoardID: shareLink.TargetID,
			Role:    shareLink.Role.String(),
			Pos:     pos,
		}
		wspos, err := s.PositionHelper.UserWorkspacePosAtEnd(ctx, userID)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
		userWorkspace := &models.UserWorkspace{
			ID:          uuid.New(),
			UserID:      userID,
			WorkspaceID: workspaceID,
			Role:        rbac.Member,
			Pos:         wspos,
		}

		if isAlreadyAWorkspaceMember {

			if err := s.MembershipRepo.CreateUserBoardTX(ctx, s.db, userBoard); err != nil {
				return nil, domainerr.MapRepoErr(err, false)
			}
			if err := s.emitBoardAccessClaimedEvent(ctx, userID, correlationID, workspaceID, shareLink.TargetID, userBoard); err != nil {
				fmt.Println("failed to emit board access claimed event:", err)
			}
			userBoardRes := dto.UserBoardToResponse(userBoard)

			response := &ClaimShareLinkResponse{
				PublicShareLink: dto.PublicShareLinkToResponse(shareLink),
				UserBoard:       &userBoardRes,
			}
			return response, nil

		} else {

			if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
				if err := s.WorkspaceRepo.CreateUserWorkspaceTX(ctx, tx, userWorkspace); err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				if err := s.MembershipRepo.CreateUserBoardTX(ctx, tx, userBoard); err != nil {
					return domainerr.MapRepoErr(err, false)
				}
				return nil
			}); err != nil {
				return nil, err
			}
			if err := s.emitWorkspaceAccessClaimedEvent(ctx, userID, correlationID, workspaceID, userWorkspace); err != nil {
				fmt.Println("failed to emit workspace access claimed event:", err)
			}
			if err := s.emitBoardAccessClaimedEvent(ctx, userID, correlationID, workspaceID, shareLink.TargetID, userBoard); err != nil {
				fmt.Println("failed to emit board access claimed event:", err)
			}
			userBoardRes := dto.UserBoardToResponse(userBoard)
			userWorkspaceRes := dto.UserWorkspaceToResponse(userWorkspace)
			response := &ClaimShareLinkResponse{
				PublicShareLink: dto.PublicShareLinkToResponse(shareLink),
				UserBoard:       &userBoardRes,
				UserWorkspace:   &userWorkspaceRes,
			}
			return response, nil

		}

	case "workspace":
		canJoin, err := s.MembershipService.CanJoinWorkspace(ctx, userID, shareLink.TargetID)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
		if !canJoin {
			return nil, domainerr.ErrForbidden
		}
		pos, err := s.PositionHelper.UserWorkspacePosAtEnd(ctx, userID)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
		userWorkspace := &models.UserWorkspace{
			ID:          uuid.New(),
			UserID:      userID,
			WorkspaceID: shareLink.TargetID,
			Role:        shareLink.Role,
			Pos:         pos,
		}
		if err := s.WorkspaceRepo.CreateUserWorkspaceTX(ctx, s.db, userWorkspace); err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		if err := s.emitWorkspaceAccessClaimedEvent(ctx, userID, correlationID, shareLink.TargetID, userWorkspace); err != nil {
			fmt.Println("failed to emit workspace access claimed event:", err)
		}
		userWorkspaceRes := dto.UserWorkspaceToResponse(userWorkspace)
		response := &ClaimShareLinkResponse{
			PublicShareLink: dto.PublicShareLinkToResponse(shareLink),
			UserWorkspace:   &userWorkspaceRes,
		}
		return response, nil
	default:
		return nil, domainerr.ErrValidation
	}

}

func (s *ShareLinkService) usersByIDForEvent(ctx context.Context, userID uuid.UUID) (map[uuid.UUID]dto.UserResponse, error) {
	users, err := s.MembershipRepo.GetUsersByIDs(ctx, []uuid.UUID{userID})
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	if len(users) == 0 {
		return nil, domainerr.ErrNotFound
	}

	userMap := make(map[uuid.UUID]dto.UserResponse, len(users))
	for _, user := range users {
		userMap[user.ID] = dto.UserToResponse(&user)
	}

	return userMap, nil
}

func (s *ShareLinkService) emitWorkspaceAccessClaimedEvent(ctx context.Context, actorUserID, correlationID, workspaceID uuid.UUID, userWorkspace *models.UserWorkspace) error {
	if s.EventRegistry == nil {
		return nil
	}
	usersByID, err := s.usersByIDForEvent(ctx, userWorkspace.UserID)
	if err != nil {
		return err
	}

	state := &dto.BoardDetailResponse{
		Users:                  usersByID,
		UserWorkspaceRelations: []dto.UserWorkspaceResponse{dto.UserWorkspaceToResponse(userWorkspace)},
	}

	evt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventWorkspaceAccessClaimed,
		WorkspaceID:   &workspaceID,
		ActorUserID:   &actorUserID,
		CorrelationID: &correlationID,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: state,
		},
		Targets: []EventRegistry.TargetRef{
			{EntityType: "workspace", EntityID: workspaceID, WorkspaceID: &workspaceID},
			{EntityType: "user", EntityID: userWorkspace.UserID, WorkspaceID: &workspaceID},
		},
		OccurredAt: time.Now(),
	}

	return s.EventRegistry.Emit(ctx, s.db, evt)
}

func (s *ShareLinkService) emitBoardAccessClaimedEvent(ctx context.Context, actorUserID, correlationID, workspaceID, boardID uuid.UUID, userBoard *models.UserBoard) error {
	if s.EventRegistry == nil {
		return nil
	}
	usersByID, err := s.usersByIDForEvent(ctx, userBoard.UserID)
	if err != nil {
		return err
	}

	state := &dto.BoardDetailResponse{
		Users:              usersByID,
		UserBoardRelations: []dto.UserBoardResponse{dto.UserBoardToResponse(userBoard)},
	}

	evt := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardAccessClaimed,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &actorUserID,
		CorrelationID: &correlationID,
		Payload: EventRegistry.EventPayloadEnvelope{
			StatePayload: state,
		},
		Targets: []EventRegistry.TargetRef{
			{EntityType: "workspace", EntityID: workspaceID, WorkspaceID: &workspaceID},
			{EntityType: "board", EntityID: boardID, BoardID: &boardID, WorkspaceID: &workspaceID},
			{EntityType: "user", EntityID: userBoard.UserID, BoardID: &boardID, WorkspaceID: &workspaceID},
		},
		OccurredAt: time.Now(),
	}

	return s.EventRegistry.Emit(ctx, s.db, evt)
}

func (s *ShareLinkService) RevokeShareLink(ctx context.Context, userID uuid.UUID, token string) (*models.PublicShareLink, error) {
	shareLink, err := s.repo.GetShareLinkByToken(ctx, token)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	switch shareLink.TargetType {
	case "board":
		if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, shareLink.TargetID, rbac.Admin, s.IncludeDeleted); err != nil {
			return nil, err
		}
	case "workspace":
		if err := authz.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, shareLink.TargetID, rbac.Admin, s.IncludeDeleted); err != nil {
			return nil, err
		}
	default:
		return nil, domainerr.ErrValidation
	}
	now := time.Now()
	shareLink.RevokedAt = &now
	if err := s.repo.RevokeShareLink(ctx, shareLink); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	return shareLink, nil
}

func extractDescription(props []byte) string {
	if len(props) == 0 {
		return ""
	}
	var payload map[string]any
	if err := json.Unmarshal(props, &payload); err != nil {
		return ""
	}
	if value, ok := payload["Description"].(string); ok {
		return value
	}
	if value, ok := payload["description"].(string); ok {
		return value
	}
	return ""
}

func toUserResponses(users []models.User) []dto.UserResponse {
	userResponses := make([]dto.UserResponse, 0, len(users))
	for _, user := range users {
		userResponses = append(userResponses, dto.UserToResponse(&user))
	}
	return userResponses
}

func (s *ShareLinkService) GetPublicShareLinkByToken(ctx context.Context, token string) (*PublicShareLinkPreviewResponse, error) {
	shareLink, err := s.repo.GetShareLinkByToken(ctx, token)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	target := ShareLinkTargetLiteResponse{EntityType: shareLink.TargetType}
	switch shareLink.TargetType {
	case "board":
		board, err := s.repo.GetBoardByID(ctx, shareLink.TargetID, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
		target.Name = board.Name
		target.Description = extractDescription(board.Props)
	case "workspace":
		workspace, err := s.repo.GetWorkspaceByID(ctx, shareLink.TargetID, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
		target.Name = workspace.Name
		target.Description = extractDescription(workspace.Props)
	default:
		return nil, domainerr.ErrValidation
	}

	response := &PublicShareLinkPreviewResponse{
		PublicShareLink: dto.PublicShareLinkToResponse(shareLink),
		Target:          target,
	}

	return response, nil
}

func (s *ShareLinkService) GetAuthenticatedShareLinkByToken(ctx context.Context, userID uuid.UUID, token string) (*AuthenticatedShareLinkResponse, error) {
	shareLink, err := s.repo.GetShareLinkByToken(ctx, token)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	response := &AuthenticatedShareLinkResponse{
		PublicShareLink: dto.PublicShareLinkToResponse(shareLink),
		EntityType:      shareLink.TargetType,
		Users:           []dto.UserResponse{},
	}

	switch shareLink.TargetType {
	case "board":
		if err := authz.CheckUserMinRole(ctx, s.MembershipRepo, userID, shareLink.TargetID, rbac.Viewer, s.IncludeDeleted); err != nil {
			return nil, err
		}

		board, err := s.repo.GetBoardByID(ctx, shareLink.TargetID, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
		boardResponse := dto.BoardToResponse(board)
		response.Board = &boardResponse

		userBoards, err := s.repo.GetUserBoardsByBoardID(ctx, board.ID, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
		response.UserBoards = make([]dto.UserBoardResponse, 0, len(userBoards))
		userIDs := make([]uuid.UUID, 0, len(userBoards))
		for _, userBoard := range userBoards {
			response.UserBoards = append(response.UserBoards, dto.UserBoardToResponse(&userBoard))
			userIDs = append(userIDs, userBoard.UserID)
		}

		if len(userIDs) > 0 {
			users, err := s.MembershipRepo.GetUsersByIDs(ctx, userIDs)
			if err != nil {
				return nil, domainerr.MapRepoErr(err, true)
			}
			response.Users = toUserResponses(users)
		}

	case "workspace":
		if err := authz.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, shareLink.TargetID, rbac.Viewer, s.IncludeDeleted); err != nil {
			return nil, err
		}

		workspace, err := s.repo.GetWorkspaceByID(ctx, shareLink.TargetID, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
		workspaceResponse := dto.WorkspaceToResponse(workspace)
		response.Workspace = &workspaceResponse

		userWorkspaces, err := s.repo.GetUserWorkspacesByWorkspaceID(ctx, workspace.ID, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, true)
		}
		response.UserWorkspaces = make([]dto.UserWorkspaceResponse, 0, len(userWorkspaces))
		userIDs := make([]uuid.UUID, 0, len(userWorkspaces))
		for _, userWorkspace := range userWorkspaces {
			response.UserWorkspaces = append(response.UserWorkspaces, dto.UserWorkspaceToResponse(&userWorkspace))
			userIDs = append(userIDs, userWorkspace.UserID)
		}

		if len(userIDs) > 0 {
			users, err := s.MembershipRepo.GetUsersByIDs(ctx, userIDs)
			if err != nil {
				return nil, domainerr.MapRepoErr(err, true)
			}
			response.Users = toUserResponses(users)
		}
	default:
		return nil, domainerr.ErrValidation
	}

	return response, nil
}

func (s *ShareLinkService) GetShareLinksByTargetID(ctx context.Context, userID uuid.UUID, targetID uuid.UUID) (*PublicShareLinkResponse, error) {
	shareLinks, err := s.repo.GetShareLinksByTargetID(ctx, targetID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	userIdsMap := make(map[uuid.UUID]struct{})
	for _, link := range shareLinks {
		userIdsMap[link.CreatedByUserID] = struct{}{}
	}
	userIds := make([]uuid.UUID, 0, len(userIdsMap))
	for id := range userIdsMap {
		userIds = append(userIds, id)
	}
	users, err := s.MembershipRepo.GetUsersByIDs(ctx, userIds)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	userResponses := make([]dto.UserResponse, 0, len(users))
	for _, user := range users {
		userResponses = append(userResponses, dto.UserToResponse(&user))
	}
	linksResponse := make([]dto.PublicShareLinkResponse, 0, len(shareLinks))
	for _, link := range shareLinks {
		linksResponse = append(linksResponse, dto.PublicShareLinkToResponse(&link))
	}
	response := &PublicShareLinkResponse{
		ShareLinks: linksResponse,
		Users:      userResponses,
	}

	return response, nil
}
