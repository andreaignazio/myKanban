package pos

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rank"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
)

type InboxPosRepo interface {
	GetUserInboxCards(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.UserInboxCard, error)
}

type InboxPositionHelper struct {
	generator      *rank.RankGenerator
	repo           InboxPosRepo
	IncludeDeleted bool
}

func NewInboxPositionHelper(generator *rank.RankGenerator, repo InboxPosRepo, includeDeleted bool) *InboxPositionHelper {
	return &InboxPositionHelper{
		generator:      generator,
		repo:           repo,
		IncludeDeleted: includeDeleted,
	}
}

func (h *InboxPositionHelper) InboxPosAtEnd(ctx context.Context, userID uuid.UUID) (string, error) {
	inboxCards, err := h.repo.GetUserInboxCards(ctx, userID, h.IncludeDeleted)
	if err != nil {
		return "", err
	}

	if len(inboxCards) > 0 {
		lastPos := inboxCards[len(inboxCards)-1].Pos
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

func (h *InboxPositionHelper) InboxPosAtStart(ctx context.Context, userID uuid.UUID) (string, error) {
	inboxCards, err := h.repo.GetUserInboxCards(ctx, userID, h.IncludeDeleted)
	if err != nil {
		return "", err
	}

	if len(inboxCards) > 0 {
		firstPos := inboxCards[0].Pos
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

func (h *InboxPositionHelper) InboxPosBeforeID(ctx context.Context, userID, beforeID uuid.UUID) (string, error) {
	inboxCards, err := h.repo.GetUserInboxCards(ctx, userID, h.IncludeDeleted)
	if err != nil {
		return "", err
	}

	idx := -1
	for i := range inboxCards {
		if inboxCards[i].ID == beforeID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return "", domainerr.ErrValidation
	}

	nextPos := inboxCards[idx].Pos
	if idx > 0 {
		prevPos := inboxCards[idx-1].Pos
		newPos, err := h.generator.GenerateRankBetween(prevPos, nextPos)
		if err != nil {
			return "", domainerr.ErrValidation
		}
		return newPos, nil
	}

	newPos, err := h.generator.GenerateRankBetween("", nextPos)
	if err != nil {
		return "", err
	}
	return newPos, nil
}
