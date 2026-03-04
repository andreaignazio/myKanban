package userWatch

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	"GoGORM/internal/rank"
	"GoGORM/internal/server/middleware"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserWatchService struct {
	db         *gorm.DB
	repo       UserWatchRepository
	BoardsRepo BoardsRepo
	ListsRepo  ListsRepo
	CardsRepo  CardsRepo
	generator  *rank.RankGenerator
}

type UserWatchRepository interface {
	GetUserBoardWatches(ctx context.Context, userID uuid.UUID) ([]models.BoardWatch, error)
	GetUserCardWatches(ctx context.Context, userID uuid.UUID) ([]models.CardWatch, error)
	GetUserListWatches(ctx context.Context, userID uuid.UUID) ([]models.ListWatch, error)

	CreateBoardWatch(ctx context.Context, boardWatch *models.BoardWatch) error
	CreateCardWatch(ctx context.Context, cardWatch *models.CardWatch) error
	CreateListWatch(ctx context.Context, listWatch *models.ListWatch) error

	DeleteBoardWatch(ctx context.Context, id uuid.UUID) error
	DeleteCardWatch(ctx context.Context, id uuid.UUID) error
	DeleteListWatch(ctx context.Context, id uuid.UUID) error

	PatchBoardWatch(ctx context.Context, id uuid.UUID, payload map[string]any) (*models.BoardWatch, error)
	PatchCardWatch(ctx context.Context, id uuid.UUID, payload map[string]any) (*models.CardWatch, error)
	PatchListWatch(ctx context.Context, id uuid.UUID, payload map[string]any) (*models.ListWatch, error)
}

type CardsRepo interface {
	GetCardsByIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.Card, error)
}

type ListsRepo interface {
	GetListsByIDs(ctx context.Context, listIDs []uuid.UUID, includeDeleted bool) ([]models.List, error)
}
type BoardsRepo interface {
	GetBoardsByIDs(ctx context.Context, boardIDs []uuid.UUID, includeDeleted bool) ([]models.Board, error)
}

// WatchCreationResult is a single return envelope for handlers.
// Exactly one of BoardWatch/ListWatch/CardWatch is expected to be non-nil.
type WatchCreationResult struct {
	EntityType string             `json:"EntityType"`
	BoardWatch *models.BoardWatch `json:"BoardWatch,omitempty"`
	ListWatch  *models.ListWatch  `json:"ListWatch,omitempty"`
	CardWatch  *models.CardWatch  `json:"CardWatch,omitempty"`
}

type WatchCreationResultResponse struct {
	EntityType string                 `json:"EntityType"`
	BoardWatch dto.BoardWatchResponse `json:"BoardWatch,omitempty"`
	ListWatch  dto.ListWatchResponse  `json:"ListWatch,omitempty"`
	CardWatch  dto.CardWatchResponse  `json:"CardWatch,omitempty"`
}

func NewUserWatchService(db *gorm.DB, repo UserWatchRepository, boardsRepo BoardsRepo, listsRepo ListsRepo, cardsRepo CardsRepo) *UserWatchService {
	return &UserWatchService{
		db:         db,
		repo:       repo,
		BoardsRepo: boardsRepo,
		ListsRepo:  listsRepo,
		CardsRepo:  cardsRepo,
		generator:  rank.NewRankGenerator(),
	}
}

func (s *UserWatchService) CreateUserWatchRelation(
	ctx context.Context,
	userID, boardID, entityID uuid.UUID,
	entityType string,
) (*WatchCreationResultResponse, error) {
	workspaceID, ok := middleware.WorkspaceIDFromContext(ctx)
	if !ok {
		return nil, domainerr.ErrValidation
	}
	switch entityType {
	case "card":
		pos, err := s.CardWatchPosAtEnd(ctx, userID)
		if err != nil {
			return nil, err
		}
		cardWatch := &models.CardWatch{
			ID:          uuid.New(),
			UserID:      userID,
			WorkspaceID: workspaceID,
			CardID:      entityID,
			BoardID:     boardID,
			Pos:         pos,
		}
		if err := s.repo.CreateCardWatch(ctx, cardWatch); err != nil {
			return nil, err
		}
		return &WatchCreationResultResponse{EntityType: "card", CardWatch: dto.CardWatchToResponse(cardWatch)}, nil
	case "list":
		pos, err := s.ListWatchPosAtEnd(ctx, userID)
		if err != nil {
			return nil, err
		}
		listWatch := &models.ListWatch{
			ID:          uuid.New(),
			UserID:      userID,
			WorkspaceID: workspaceID,
			ListID:      entityID,
			BoardID:     boardID,
			Pos:         pos,
		}
		if err := s.repo.CreateListWatch(ctx, listWatch); err != nil {
			return nil, err
		}
		return &WatchCreationResultResponse{EntityType: "list", ListWatch: dto.ListWatchToResponse(listWatch)}, nil
	case "board":
		pos, err := s.BoardWatchPosAtEnd(ctx, userID)
		if err != nil {
			return nil, err
		}
		boardWatch := &models.BoardWatch{
			ID:          uuid.New(),
			UserID:      userID,
			WorkspaceID: workspaceID,
			BoardID:     entityID,
			Pos:         pos,
		}
		if err := s.repo.CreateBoardWatch(ctx, boardWatch); err != nil {
			return nil, err
		}
		return &WatchCreationResultResponse{EntityType: "board", BoardWatch: dto.BoardWatchToResponse(boardWatch)}, nil
	default:
		return nil, domainerr.ErrValidation
	}
}

func (s *UserWatchService) GetUserWatchesByType(ctx context.Context, userID uuid.UUID, entityType string) (*UserWatchResponses, error) {
	return s.CardUserWatchesByType(ctx, userID, entityType)
}

func (s *UserWatchService) GetAllUserWatches(ctx context.Context, userID uuid.UUID) (*UserWatchResponses, error) {
	cardWatches, err := s.repo.GetUserCardWatches(ctx, userID)
	if err != nil {
		return nil, err
	}
	listWatches, err := s.repo.GetUserListWatches(ctx, userID)
	if err != nil {
		return nil, err
	}
	boardWatches, err := s.repo.GetUserBoardWatches(ctx, userID)
	if err != nil {
		return nil, err
	}

	cardResponses := make([]dto.CardResponse, 0, len(cardWatches))
	cardWatchResponses := make([]dto.CardWatchResponse, 0, len(cardWatches))
	if len(cardWatches) > 0 {
		cardIDs := make([]uuid.UUID, 0, len(cardWatches))
		for _, watch := range cardWatches {
			cardWatchResponses = append(cardWatchResponses, dto.CardWatchToResponse(&watch))
			cardIDs = append(cardIDs, watch.CardID)
		}
		cards, err := s.CardsRepo.GetCardsByIDs(ctx, cardIDs, false)
		if err != nil {
			return nil, err
		}
		for _, card := range cards {
			cardResponses = append(cardResponses, dto.CardToResponse(&card))
		}
	}

	listResponses := make([]dto.ListResponse, 0, len(listWatches))
	listWatchResponses := make([]dto.ListWatchResponse, 0, len(listWatches))
	if len(listWatches) > 0 {
		listIDs := make([]uuid.UUID, 0, len(listWatches))
		for _, watch := range listWatches {
			listWatchResponses = append(listWatchResponses, dto.ListWatchToResponse(&watch))
			listIDs = append(listIDs, watch.ListID)
		}
		lists, err := s.ListsRepo.GetListsByIDs(ctx, listIDs, false)
		if err != nil {
			return nil, err
		}
		for _, list := range lists {
			listResponses = append(listResponses, dto.ListToResponse(&list))
		}
	}

	boardResponses := make([]dto.BoardResponse, 0, len(boardWatches))
	boardWatchResponses := make([]dto.BoardWatchResponse, 0, len(boardWatches))
	if len(boardWatches) > 0 {
		boardIDs := make([]uuid.UUID, 0, len(boardWatches))
		for _, watch := range boardWatches {
			boardWatchResponses = append(boardWatchResponses, dto.BoardWatchToResponse(&watch))
			boardIDs = append(boardIDs, watch.BoardID)
		}
		boards, err := s.BoardsRepo.GetBoardsByIDs(ctx, boardIDs, false)
		if err != nil {
			return nil, err
		}
		for _, board := range boards {
			boardResponses = append(boardResponses, dto.BoardToResponse(&board))
		}
	}

	return &UserWatchResponses{
		BoardWatches: boardWatchResponses,
		Boards:       boardResponses,
		ListWatches:  listWatchResponses,
		Lists:        listResponses,
		CardWatches:  cardWatchResponses,
		Cards:        cardResponses,
	}, nil
}

func (s *UserWatchService) DeleteUserWatchRelation(ctx context.Context, userID, watchID uuid.UUID, entityType string) error {
	switch entityType {
	case "card":
		if err := s.repo.DeleteCardWatch(ctx, watchID); err != nil {
			return err
		}
		return nil
	case "list":
		if err := s.repo.DeleteListWatch(ctx, watchID); err != nil {
			return err
		}
		return nil
	case "board":
		if err := s.repo.DeleteBoardWatch(ctx, watchID); err != nil {
			return err
		}
		return nil
	default:
		return domainerr.ErrValidation
	}

}

func (s *UserWatchService) MoveUserWatchRelation(ctx context.Context, userID, watchID uuid.UUID, entityType string, req MoveWatchRequest) (*WatchCreationResultResponse, error) {
	if req.BeforeID != nil && req.InsertAt != nil {
		return nil, domainerr.ErrValidation
	}

	switch entityType {
	case "board":
		watches, err := s.repo.GetUserBoardWatches(ctx, userID)
		if err != nil {
			return nil, err
		}
		newPos, err := s.computeMovePosForBoardWatches(watches, watchID, req)
		if err != nil {
			return nil, err
		}
		updated, err := s.repo.PatchBoardWatch(ctx, watchID, map[string]any{"pos": newPos})
		if err != nil {
			return nil, err
		}
		return &WatchCreationResultResponse{EntityType: "board", BoardWatch: dto.BoardWatchToResponse(updated)}, nil
	case "list":
		watches, err := s.repo.GetUserListWatches(ctx, userID)
		if err != nil {
			return nil, err
		}
		newPos, err := s.computeMovePosForListWatches(watches, watchID, req)
		if err != nil {
			return nil, err
		}
		updated, err := s.repo.PatchListWatch(ctx, watchID, map[string]any{"pos": newPos})
		if err != nil {
			return nil, err
		}
		return &WatchCreationResultResponse{EntityType: "list", ListWatch: dto.ListWatchToResponse(updated)}, nil
	case "card":
		watches, err := s.repo.GetUserCardWatches(ctx, userID)
		if err != nil {
			return nil, err
		}
		newPos, err := s.computeMovePosForCardWatches(watches, watchID, req)
		if err != nil {
			return nil, err
		}
		updated, err := s.repo.PatchCardWatch(ctx, watchID, map[string]any{"pos": newPos})
		if err != nil {
			return nil, err
		}
		return &WatchCreationResultResponse{EntityType: "card", CardWatch: dto.CardWatchToResponse(updated)}, nil
	default:
		return nil, domainerr.ErrValidation
	}
}

func (s *UserWatchService) PatchUserWatchRelation(ctx context.Context, userID, watchID uuid.UUID, entityType string, req PatchWatchActiveRequest) (*WatchCreationResultResponse, error) {
	switch entityType {
	case "board":
		watches, err := s.repo.GetUserBoardWatches(ctx, userID)
		if err != nil {
			return nil, err
		}
		if !containsBoardWatchID(watches, watchID) {
			return nil, domainerr.ErrNotFound
		}
		updated, err := s.repo.PatchBoardWatch(ctx, watchID, map[string]any{"active": req.Active})
		if err != nil {
			return nil, err
		}
		return &WatchCreationResultResponse{EntityType: "board", BoardWatch: dto.BoardWatchToResponse(updated)}, nil
	case "list":
		watches, err := s.repo.GetUserListWatches(ctx, userID)
		if err != nil {
			return nil, err
		}
		if !containsListWatchID(watches, watchID) {
			return nil, domainerr.ErrNotFound
		}
		updated, err := s.repo.PatchListWatch(ctx, watchID, map[string]any{"active": req.Active})
		if err != nil {
			return nil, err
		}
		return &WatchCreationResultResponse{EntityType: "list", ListWatch: dto.ListWatchToResponse(updated)}, nil
	case "card":
		watches, err := s.repo.GetUserCardWatches(ctx, userID)
		if err != nil {
			return nil, err
		}
		if !containsCardWatchID(watches, watchID) {
			return nil, domainerr.ErrNotFound
		}
		updated, err := s.repo.PatchCardWatch(ctx, watchID, map[string]any{"active": req.Active})
		if err != nil {
			return nil, err
		}
		return &WatchCreationResultResponse{EntityType: "card", CardWatch: dto.CardWatchToResponse(updated)}, nil
	default:
		return nil, domainerr.ErrValidation
	}
}

func containsBoardWatchID(watches []models.BoardWatch, watchID uuid.UUID) bool {
	for _, watch := range watches {
		if watch.ID == watchID {
			return true
		}
	}
	return false
}

func containsListWatchID(watches []models.ListWatch, watchID uuid.UUID) bool {
	for _, watch := range watches {
		if watch.ID == watchID {
			return true
		}
	}
	return false
}

func containsCardWatchID(watches []models.CardWatch, watchID uuid.UUID) bool {
	for _, watch := range watches {
		if watch.ID == watchID {
			return true
		}
	}
	return false
}

func (s *UserWatchService) computeMovePosForBoardWatches(watches []models.BoardWatch, watchID uuid.UUID, req MoveWatchRequest) (string, error) {
	ordered := sortedByPos(watches, func(item models.BoardWatch) string { return item.Pos })
	withoutCurrent := make([]models.BoardWatch, 0, len(ordered))
	found := false
	for _, watch := range ordered {
		if watch.ID == watchID {
			found = true
			continue
		}
		withoutCurrent = append(withoutCurrent, watch)
	}
	if !found {
		return "", domainerr.ErrNotFound
	}
	return s.computeMovePosBoardWithoutCurrent(withoutCurrent, req)
}

func (s *UserWatchService) computeMovePosForListWatches(watches []models.ListWatch, watchID uuid.UUID, req MoveWatchRequest) (string, error) {
	ordered := sortedByPos(watches, func(item models.ListWatch) string { return item.Pos })
	withoutCurrent := make([]models.ListWatch, 0, len(ordered))
	found := false
	for _, watch := range ordered {
		if watch.ID == watchID {
			found = true
			continue
		}
		withoutCurrent = append(withoutCurrent, watch)
	}
	if !found {
		return "", domainerr.ErrNotFound
	}
	return s.computeMovePosListWithoutCurrent(withoutCurrent, req)
}

func (s *UserWatchService) computeMovePosForCardWatches(watches []models.CardWatch, watchID uuid.UUID, req MoveWatchRequest) (string, error) {
	ordered := sortedByPos(watches, func(item models.CardWatch) string { return item.Pos })
	withoutCurrent := make([]models.CardWatch, 0, len(ordered))
	found := false
	for _, watch := range ordered {
		if watch.ID == watchID {
			found = true
			continue
		}
		withoutCurrent = append(withoutCurrent, watch)
	}
	if !found {
		return "", domainerr.ErrNotFound
	}
	return s.computeMovePosCardWithoutCurrent(withoutCurrent, req)
}

func (s *UserWatchService) computeMovePosBoardWithoutCurrent(watches []models.BoardWatch, req MoveWatchRequest) (string, error) {
	if req.BeforeID != nil {
		idx := -1
		for i, watch := range watches {
			if watch.ID == *req.BeforeID {
				idx = i
				break
			}
		}
		if idx == -1 {
			return "", domainerr.ErrValidation
		}
		nextPos := watches[idx].Pos
		if idx == 0 {
			return s.generator.GenerateRankBetween("", nextPos)
		}
		return s.generator.GenerateRankBetween(watches[idx-1].Pos, nextPos)
	}

	if req.InsertAt != nil && *req.InsertAt == "start" {
		if len(watches) == 0 {
			return s.generator.GenerateRankBetween("", "")
		}
		return s.generator.GenerateRankBetween("", watches[0].Pos)
	}

	if len(watches) == 0 {
		return s.generator.GenerateRankBetween("", "")
	}
	return s.generator.GenerateRankBetween(watches[len(watches)-1].Pos, "")
}

func (s *UserWatchService) computeMovePosListWithoutCurrent(watches []models.ListWatch, req MoveWatchRequest) (string, error) {
	if req.BeforeID != nil {
		idx := -1
		for i, watch := range watches {
			if watch.ID == *req.BeforeID {
				idx = i
				break
			}
		}
		if idx == -1 {
			return "", domainerr.ErrValidation
		}
		nextPos := watches[idx].Pos
		if idx == 0 {
			return s.generator.GenerateRankBetween("", nextPos)
		}
		return s.generator.GenerateRankBetween(watches[idx-1].Pos, nextPos)
	}

	if req.InsertAt != nil && *req.InsertAt == "start" {
		if len(watches) == 0 {
			return s.generator.GenerateRankBetween("", "")
		}
		return s.generator.GenerateRankBetween("", watches[0].Pos)
	}

	if len(watches) == 0 {
		return s.generator.GenerateRankBetween("", "")
	}
	return s.generator.GenerateRankBetween(watches[len(watches)-1].Pos, "")
}

func (s *UserWatchService) computeMovePosCardWithoutCurrent(watches []models.CardWatch, req MoveWatchRequest) (string, error) {
	if req.BeforeID != nil {
		idx := -1
		for i, watch := range watches {
			if watch.ID == *req.BeforeID {
				idx = i
				break
			}
		}
		if idx == -1 {
			return "", domainerr.ErrValidation
		}
		nextPos := watches[idx].Pos
		if idx == 0 {
			return s.generator.GenerateRankBetween("", nextPos)
		}
		return s.generator.GenerateRankBetween(watches[idx-1].Pos, nextPos)
	}

	if req.InsertAt != nil && *req.InsertAt == "start" {
		if len(watches) == 0 {
			return s.generator.GenerateRankBetween("", "")
		}
		return s.generator.GenerateRankBetween("", watches[0].Pos)
	}

	if len(watches) == 0 {
		return s.generator.GenerateRankBetween("", "")
	}
	return s.generator.GenerateRankBetween(watches[len(watches)-1].Pos, "")
}

func (s *UserWatchService) CardUserWatchesByType(ctx context.Context, userID uuid.UUID, entityType string) (*UserWatchResponses, error) {
	switch entityType {
	case "card":
		watches, err := s.repo.GetUserCardWatches(ctx, userID)
		if err != nil {
			return nil, err
		}
		responses := make([]dto.CardWatchResponse, 0, len(watches))
		for _, watch := range watches {
			responses = append(responses, dto.CardWatchToResponse(&watch))
		}
		cardIds := make([]uuid.UUID, 0, len(watches))
		for _, watch := range watches {
			cardIds = append(cardIds, watch.CardID)
		}
		cards, err := s.CardsRepo.GetCardsByIDs(ctx, cardIds, false)
		if err != nil {
			return nil, err
		}
		cardResponses := make([]dto.CardResponse, 0, len(cards))
		for _, card := range cards {
			cardResponses = append(cardResponses, dto.CardToResponse(&card))
		}
		return &UserWatchResponses{Cards: cardResponses, CardWatches: responses}, nil
	case "list":
		watches, err := s.repo.GetUserListWatches(ctx, userID)
		if err != nil {
			return nil, err
		}
		responses := make([]dto.ListWatchResponse, 0, len(watches))
		for _, watch := range watches {
			responses = append(responses, dto.ListWatchToResponse(&watch))
		}
		listIds := make([]uuid.UUID, 0, len(watches))
		for _, watch := range watches {
			listIds = append(listIds, watch.ListID)
		}
		lists, err := s.ListsRepo.GetListsByIDs(ctx, listIds, false)
		if err != nil {
			return nil, err
		}
		listResponses := make([]dto.ListResponse, 0, len(lists))
		for _, list := range lists {
			listResponses = append(listResponses, dto.ListToResponse(&list))
		}
		return &UserWatchResponses{Lists: listResponses, ListWatches: responses}, nil
	case "board":
		watches, err := s.repo.GetUserBoardWatches(ctx, userID)
		if err != nil {
			return nil, err
		}
		responses := make([]dto.BoardWatchResponse, 0, len(watches))
		for _, watch := range watches {
			responses = append(responses, dto.BoardWatchToResponse(&watch))
		}
		boardIds := make([]uuid.UUID, 0, len(watches))
		for _, watch := range watches {
			boardIds = append(boardIds, watch.BoardID)
		}
		boards, err := s.BoardsRepo.GetBoardsByIDs(ctx, boardIds, false)
		if err != nil {
			return nil, err
		}
		boardResponses := make([]dto.BoardResponse, 0, len(boards))
		for _, board := range boards {
			boardResponses = append(boardResponses, dto.BoardToResponse(&board))
		}
		return &UserWatchResponses{Boards: boardResponses, BoardWatches: responses}, nil
	default:
		return &UserWatchResponses{}, domainerr.ErrValidation
	}
}
