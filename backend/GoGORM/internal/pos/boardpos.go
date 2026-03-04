package pos

import (
	"GoGORM/internal/domainerr"
	"context"

	"github.com/google/uuid"
)

func (s *Service) BoardPosAtEnd(ctx context.Context, userID uuid.UUID) (string, error) {
	userBoards, err := s.BoardPosRepo.GetUserBoardsFast(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return "", err
	}
	if len(userBoards) > 0 {
		lastPos := userBoards[len(userBoards)-1].Pos
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

func (s *Service) BoardPosAtStart(ctx context.Context, userID uuid.UUID) (string, error) {
	userBoards, err := s.BoardPosRepo.GetUserBoardsFast(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return "", err
	}
	if len(userBoards) > 0 {
		firstPos := userBoards[0].Pos
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

func (s *Service) BoardPosAfterID(ctx context.Context, userID, afterID uuid.UUID) (string, error) {
	userBoards, err := s.BoardPosRepo.GetUserBoardsFast(ctx, userID, s.IncludeDeleted)
	//fmt.Println("Cards in list:", userBoards)
	if err != nil {
		return "", err
	}
	idx := -1
	for i, userBoardRow := range userBoards {
		if userBoardRow.BoardID == afterID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return "", domainerr.ErrValidation
	}
	prevPos := userBoards[idx].Pos
	if len(userBoards) > idx+1 {
		nextPos := userBoards[idx+1].Pos
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
