package boards

import (
	"GoGORM/internal/dbx"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	"GoGORM/internal/rbac"
	"GoGORM/models"
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type BoardRepo interface {
	CreateBoardTX(ctx context.Context, db *gorm.DB, board *models.Board) error
	GetBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) (*models.Board, error)
	GetUserBoard(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (*UserBoardRow, error)
	//GetBoardDetail(ctx context.Context,userID, boardID uuid.UUID) (*BoardDetail, error)
	GetUserBoards(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]UserBoardRow, error)
	PatchBoard(ctx context.Context, boardID uuid.UUID, payload UpdateBoardsInput) (*models.Board, error)
	PatchUserBoardProps(ctx context.Context, userID, boardID uuid.UUID, payload UpdateUserBoardInput) (*models.UserBoard, error)
	DeleteBoard(ctx context.Context, boardID uuid.UUID) error
}

type BoardListRepo interface {
	GetBoardListRows(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]BoardListRow, error)
}

type ListCardRepo interface {
	GetListCardRows(ctx context.Context, listIDs []uuid.UUID, includeDeleted bool) ([]ListCardRow, error)
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	CreateUserBoardTX(ctx context.Context, db *gorm.DB, userBoard *models.UserBoard) error
}

type PositionHelper interface {
	BoardPosAtEnd(ctx context.Context, userID uuid.UUID) (string, error)
	BoardPosAtStart(ctx context.Context, userID uuid.UUID) (string, error)
	BoardPosAfterID(ctx context.Context, userID, afterID uuid.UUID) (string, error)
}

type BoardsService struct {
	db *gorm.DB

	BoardRepo      BoardRepo
	BoardListRepo  BoardListRepo
	ListCardRepo   ListCardRepo
	MembershipRepo MembershipRepo
	PositionHelper PositionHelper
	IncludeDeleted bool
}

func NewBoardsService(db *gorm.DB, BoardRepo BoardRepo, BoardListRepo BoardListRepo, ListCardRepo ListCardRepo, MembershipRepo MembershipRepo, PositionHelper PositionHelper) *BoardsService {
	return &BoardsService{db: db, BoardRepo: BoardRepo, BoardListRepo: BoardListRepo, ListCardRepo: ListCardRepo, MembershipRepo: MembershipRepo, PositionHelper: PositionHelper, IncludeDeleted: false}
}

type ListWithCards struct {
	List  models.List
	Cards []models.Card
}

type BoardDetail struct {
	Board      models.Board
	ViewerRole rbac.Role
	Lists      []ListWithCards
}

type UserBoardView struct {
	Board     models.Board
	UserBoard models.UserBoard
}

func mapRepoErr(err error, notFoundAsForbidden bool) error {
	return domainerr.MapRepoErr(err, notFoundAsForbidden)
}

func parseAndCheckRole(roleStr string, minRole rbac.Role) (rbac.Role, error) {
	role, ok := rbac.ParseRole(roleStr)
	if !ok {
		return 0, domainerr.ErrValidation
	}
	if !rbac.AtLeast(role, minRole) {
		return 0, domainerr.ErrForbidden
	}
	return role, nil
}

func (s *BoardsService) CreteBoardWithOwner(ctx context.Context, userID uuid.UUID, request CreateBoardRequest) (*models.Board, *models.UserBoard, error) {

	var position string
	var err error
	if request.AfterID != nil {
		position, err = s.PositionHelper.BoardPosAfterID(ctx, userID, *request.AfterID)
		if err != nil {
			return nil, nil, err
		}
	} else if request.InsertAt != nil && *request.InsertAt == "start" {
		position, err = s.PositionHelper.BoardPosAtStart(ctx, userID)
		if err != nil {
			return nil, nil, err
		}
	} else {
		position, err = s.PositionHelper.BoardPosAtEnd(ctx, userID)
		if err != nil {
			return nil, nil, err
		}
	}
	//fmt.Println("Position for new board:", position)

	newBoard := &models.Board{
		ID:              uuid.New(),
		Name:            request.Name,
		CreatedByUserID: userID,
	}
	parsedVisibility, ok := models.ParseBoardVisibility(request.Visibility)
	if !ok {
		return nil, nil, domainerr.ErrValidation
	}
	newBoard.Visibility = parsedVisibility

	if request.Props != nil {
		propsMap, err := dto.ToMap(request.Props)
		if err != nil {
			return nil, nil, domainerr.ErrValidation
		}
		jsonProps, err := json.Marshal(propsMap)
		if err != nil {
			return nil, nil, domainerr.ErrValidation
		}
		boardProps := datatypes.JSON(jsonProps)
		newBoard.Props = boardProps
	}
	newUserBoard := &models.UserBoard{
		UserID:  userID,
		BoardID: newBoard.ID,
		Role:    "owner",
		Pos:     position,
	}
	//fmt.Println("New Board:", newBoard, "New UserBoard:", newUserBoard)
	s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := s.BoardRepo.CreateBoardTX(ctx, tx, newBoard); err != nil {
			return dbx.WrapDBErr(err, "error in transaction")
		}
		if err := s.MembershipRepo.CreateUserBoardTX(ctx, tx, newUserBoard); err != nil {
			return dbx.WrapDBErr(err, "error in transaction")
		}
		return nil
	})

	return newBoard, newUserBoard, nil
}

func (s *BoardsService) GetUserBoardDetail(ctx context.Context, userID, boardID uuid.UUID) (*UserBoardRow,
	[]BoardListRow, map[uuid.UUID][]ListCardRow, error) {

	includeDeleted := s.IncludeDeleted
	r, err := s.MembershipRepo.GetUserRole(ctx, userID, boardID, includeDeleted)
	if err != nil {
		return nil, nil, nil, mapRepoErr(err, true)
	}

	_, err = parseAndCheckRole(r, rbac.Viewer)
	if err != nil {
		return nil, nil, nil, err
	}

	userBoardRow, err := s.BoardRepo.GetUserBoard(ctx, userID, boardID, includeDeleted)
	if err != nil {
		return nil, nil, nil, mapRepoErr(err, false)
	}
	boardListRows, err := s.BoardListRepo.GetBoardListRows(ctx, boardID, includeDeleted)
	if err != nil {
		return nil, nil, nil, mapRepoErr(err, false)
	}

	var listIDs []uuid.UUID
	for _, blr := range boardListRows {
		listIDs = append(listIDs, blr.List.ID)
	}

	listCardRows, err := s.ListCardRepo.GetListCardRows(ctx, listIDs, includeDeleted)
	if err != nil {
		return nil, nil, nil, mapRepoErr(err, false)
	}

	cardsByListID := make(map[uuid.UUID][]ListCardRow, len(listIDs))
	for _, row := range listCardRows {
		cardsByListID[row.ListCard.ListID] = append(cardsByListID[row.ListCard.ListID], row)
	}
	return userBoardRow, boardListRows, cardsByListID, nil

}

func (s *BoardsService) GetUserBoards(ctx context.Context, userID uuid.UUID) ([]UserBoardRow, error) {

	boardsRows, err := s.BoardRepo.GetUserBoards(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return nil, mapRepoErr(err, false)
	}

	//fmt.Println(userBoards)
	return boardsRows, nil

}

func (s *BoardsService) PatchBoard(ctx context.Context, userID, boardID uuid.UUID, payload PatchBoardReqest) (*models.Board, error) {
	userRoleString, err := s.MembershipRepo.GetUserRole(ctx, userID, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, mapRepoErr(err, true)
	}
	_, err = parseAndCheckRole(userRoleString, rbac.Admin)
	if err != nil {
		return nil, err
	}
	currentBoard, err := s.BoardRepo.GetBoard(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, mapRepoErr(err, false)
	}

	updateInput := UpdateBoardsInput{}
	if payload.Name != nil {
		updateInput.Name = payload.Name
	}
	if payload.Visibility != nil {
		parsedVisibility, ok := models.ParseBoardVisibility(*payload.Visibility)
		if !ok {
			return nil, domainerr.ErrValidation
		}
		updateInput.Visibility = &parsedVisibility
	}
	if payload.Props != nil {
		mergedProps, err := dto.MergeNestedProps(payload.Props, currentBoard.Props)
		if err != nil {
			return nil, domainerr.ErrValidation
		}
		jsonProps, err := json.Marshal(mergedProps)
		if err != nil {
			return nil, domainerr.ErrValidation
		}
		boardProps := datatypes.JSON(jsonProps)
		updateInput.Props = &boardProps
	}

	if updateInput.Name == nil && updateInput.Visibility == nil && updateInput.Props == nil {
		return nil, domainerr.ErrValidation
	}

	board, err := s.BoardRepo.PatchBoard(ctx, boardID, updateInput)
	if err != nil {
		return nil, mapRepoErr(err, false)
	}

	return board, nil

}

func (s *BoardsService) PatchMyUserBoardProps(ctx context.Context, userID, boardID uuid.UUID, req PatchMyUserBoardPropsRequest) (*models.UserBoard, error) {
	currentRelation, err := s.BoardRepo.GetUserBoard(ctx, userID, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, mapRepoErr(err, true)
	}

	propsPatch := map[string]any{}
	if req.Props.Starred != nil {
		propsPatch["Starred"] = *req.Props.Starred
	}
	if len(propsPatch) == 0 {
		return nil, domainerr.ErrValidation
	}

	mergedProps, err := dto.MergeNestedProps(propsPatch, currentRelation.UserBoard.Props)
	if err != nil {
		return nil, domainerr.ErrValidation
	}

	jsonProps, err := json.Marshal(mergedProps)
	if err != nil {
		return nil, domainerr.ErrValidation
	}

	payload := UpdateUserBoardInput{Props: func() *datatypes.JSON {
		v := datatypes.JSON(jsonProps)
		return &v
	}()}

	updated, err := s.BoardRepo.PatchUserBoardProps(ctx, userID, boardID, payload)
	if err != nil {
		return nil, mapRepoErr(err, false)
	}

	return updated, nil
}

func (s *BoardsService) DeleteBoard(ctx context.Context, userID, boardID uuid.UUID) error {
	userRoleString, err := s.MembershipRepo.GetUserRole(ctx, userID, boardID, s.IncludeDeleted)
	if err != nil {
		return mapRepoErr(err, true)
	}
	_, err = parseAndCheckRole(userRoleString, rbac.Admin)
	if err != nil {
		return err
	}

	err = s.BoardRepo.DeleteBoard(ctx, boardID)
	if err != nil {
		return mapRepoErr(err, false)
	}
	return nil

}
