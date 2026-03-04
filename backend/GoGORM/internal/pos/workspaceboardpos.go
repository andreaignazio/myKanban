package pos

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/models/boards"
	"GoGORM/internal/rank"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
)

type WorkspaceBoardPosRepo interface {
	GetWorkspaceBoardsForUserID(ctx context.Context, userID, workspaceID uuid.UUID) ([]boards.UserBoardRow, error)
}

type WorkspaceBoardPositionHelper struct {
	generator *rank.RankGenerator
	repo      WorkspaceBoardPosRepo
}

func NewWorkspaceBoardPositionHelper(generator *rank.RankGenerator, repo WorkspaceBoardPosRepo) *WorkspaceBoardPositionHelper {
	return &WorkspaceBoardPositionHelper{generator: generator, repo: repo}
}

func (h *WorkspaceBoardPositionHelper) WorkspaceBoardPosAtEnd(ctx context.Context, userID, workspaceID uuid.UUID) (string, error) {
	userBoards, err := h.getUserBoards(ctx, userID, workspaceID)
	if err != nil {
		return "", err
	}
	if len(userBoards) > 0 {
		lastPos := userBoards[len(userBoards)-1].Pos
		newPos, err := h.generator.GenerateRankBetween(lastPos, "")
		if err != nil {
			return "", err
		}
		return newPos, nil
	}
	newPos, err := h.generator.GenerateRankBetween("", "")
	if err != nil {
		return "", err
	}
	return newPos, nil
}

func (h *WorkspaceBoardPositionHelper) WorkspaceBoardPosAtStart(ctx context.Context, userID, workspaceID uuid.UUID) (string, error) {
	userBoards, err := h.getUserBoards(ctx, userID, workspaceID)
	if err != nil {
		return "", err
	}
	if len(userBoards) > 0 {
		firstPos := userBoards[0].Pos
		newPos, err := h.generator.GenerateRankBetween("", firstPos)
		if err != nil {
			return "", err
		}
		return newPos, nil
	}
	newPos, err := h.generator.GenerateRankBetween("", "")
	if err != nil {
		return "", err
	}
	return newPos, nil
}

func (h *WorkspaceBoardPositionHelper) WorkspaceBoardPosAfterID(ctx context.Context, userID, workspaceID, afterID uuid.UUID) (string, error) {
	userBoards, err := h.getUserBoards(ctx, userID, workspaceID)
	if err != nil {
		return "", err
	}
	idx := -1
	for i, userBoard := range userBoards {
		if userBoard.BoardID == afterID {
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
		newPos, err := h.generator.GenerateRankBetween(prevPos, nextPos)
		if err != nil {
			return "", domainerr.ErrValidation
		}
		return newPos, nil
	}
	newPos, err := h.generator.GenerateRankBetween(prevPos, "")
	if err != nil {
		return "", err
	}
	return newPos, nil
}

func (h *WorkspaceBoardPositionHelper) getUserBoards(ctx context.Context, userID, workspaceID uuid.UUID) ([]models.UserBoard, error) {
	rows, err := h.repo.GetWorkspaceBoardsForUserID(ctx, userID, workspaceID)
	if err != nil {
		return nil, err
	}

	userBoards := make([]models.UserBoard, 0, len(rows))
	for _, row := range rows {
		if row.UserBoard.UserID == uuid.Nil || row.UserBoard.BoardID == uuid.Nil {
			continue
		}
		userBoards = append(userBoards, row.UserBoard)
	}
	return userBoards, nil
}
