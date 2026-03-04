package pos

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rank"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
)

type Service struct {
	generator            *rank.RankGenerator
	PosRepo              PosRepo
	CardPosRepo          CardPosRepo
	BoardPosRepo         BoardPosRepo
	UserWorkspacePosRepo UserWorkspacePosRepo
	IncludeDeleted       bool
}

type PosRepo interface {
	GetListsInBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.BoardList, error)
}

type CardPosRepo interface {
	GetCardsInList(ctx context.Context, listID uuid.UUID, includeDeleted bool) ([]models.ListCard, error)
}

type BoardPosRepo interface {
	GetUserBoardsFast(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.UserBoard, error)
}

type UserWorkspacePosRepo interface {
	GetUserWorkspacesByUserID(ctx context.Context, userID uuid.UUID) ([]models.UserWorkspace, error)
}

func NewPositionService(generator *rank.RankGenerator, posRepo PosRepo, cardPosRepo CardPosRepo, boardPosRepo BoardPosRepo, userWorkspacePosRepo UserWorkspacePosRepo) *Service {
	return &Service{generator: generator, PosRepo: posRepo, CardPosRepo: cardPosRepo, BoardPosRepo: boardPosRepo, UserWorkspacePosRepo: userWorkspacePosRepo, IncludeDeleted: false}
}

func (s *Service) ListPosAtBoardEnd(ctx context.Context, boardID uuid.UUID) (string, error) {
	listsInBoard, err := s.PosRepo.GetListsInBoard(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return "", err
	}
	if len(listsInBoard) > 0 {
		lastPos := listsInBoard[len(listsInBoard)-1].Pos
		newPos, err := s.generator.GenerateRankBetween(lastPos, "")
		if err != nil {
			return "", err
		}
		return newPos, nil
	}
	newPos, err := s.generator.GenerateRankBetween("", "")
	if err != nil {
		return "", err
	}
	return newPos, nil

}

func (s *Service) ListPosAtBoardStart(ctx context.Context, boardID uuid.UUID) (string, error) {
	listsInBoard, err := s.PosRepo.GetListsInBoard(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return "", err
	}
	if len(listsInBoard) > 0 {
		firstPos := listsInBoard[0].Pos
		newPos, err := s.generator.GenerateRankBetween("", firstPos)
		if err != nil {
			return "", err
		}
		return newPos, nil
	}
	newPos, err := s.generator.GenerateRankBetween("", "")
	if err != nil {
		return "", err
	}
	return newPos, nil

}

func (s *Service) ListPosAfterID(ctx context.Context, boardID, afterID uuid.UUID) (string, error) {
	listsInBoard, err := s.PosRepo.GetListsInBoard(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return "", err
	}
	idx := -1
	for i, list := range listsInBoard {
		if list.ListID == afterID || list.ID == afterID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return "", domainerr.ErrValidation
	}
	prevPos := listsInBoard[idx].Pos
	if len(listsInBoard) > idx+1 {
		nextPos := listsInBoard[idx+1].Pos
		newPos, err := s.generator.GenerateRankBetween(prevPos, nextPos)
		if err != nil {
			return "", domainerr.ErrValidation
		}
		return newPos, nil
	}
	newPos, err := s.generator.GenerateRankBetween(prevPos, "")
	if err != nil {
		return "", err
	}
	return newPos, nil
}

func (s *Service) ListPosBeforeID(ctx context.Context, boardID, beforeID uuid.UUID) (string, error) {
	listsInBoard, err := s.PosRepo.GetListsInBoard(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return "", err
	}
	idx := -1
	for i, list := range listsInBoard {
		if list.ListID == beforeID || list.ID == beforeID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return "", domainerr.ErrValidation
	}

	nextPos := listsInBoard[idx].Pos
	if idx > 0 {
		prevPos := listsInBoard[idx-1].Pos
		newPos, err := s.generator.GenerateRankBetween(prevPos, nextPos)
		if err != nil {
			return "", domainerr.ErrValidation
		}
		return newPos, nil
	}
	newPos, err := s.generator.GenerateRankBetween("", nextPos)
	if err != nil {
		return "", err
	}
	return newPos, nil
}
