package pos

import (
	"GoGORM/internal/domainerr"
	"GoGORM/internal/rank"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
)

type CardChecklistPosRepo interface {
	GetCardChecklists(ctx context.Context, cardID uuid.UUID, includeDeleted bool) ([]models.CardChecklist, error)
}

type ChecklistEntryPosRepo interface {
	GetChecklistEntries(ctx context.Context, checklistID uuid.UUID, includeDeleted bool) ([]models.ChecklistEntry, error)
}

type ChecklistPositionHelper struct {
	generator          *rank.RankGenerator
	cardChecklistRepo  CardChecklistPosRepo
	checklistEntryRepo ChecklistEntryPosRepo
	IncludeDeleted     bool
}

func NewChecklistPositionHelper(generator *rank.RankGenerator, cardChecklistRepo CardChecklistPosRepo, checklistEntryRepo ChecklistEntryPosRepo, includeDeleted bool) *ChecklistPositionHelper {
	return &ChecklistPositionHelper{
		generator:          generator,
		cardChecklistRepo:  cardChecklistRepo,
		checklistEntryRepo: checklistEntryRepo,
		IncludeDeleted:     includeDeleted,
	}
}

func (h *ChecklistPositionHelper) ChecklistPosAtCardEnd(ctx context.Context, cardID uuid.UUID) (string, error) {
	cardChecklists, err := h.cardChecklistRepo.GetCardChecklists(ctx, cardID, h.IncludeDeleted)
	if err != nil {
		return "", err
	}
	if len(cardChecklists) > 0 {
		lastPos := cardChecklists[len(cardChecklists)-1].Pos
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

func (h *ChecklistPositionHelper) ChecklistPosAtCardStart(ctx context.Context, cardID uuid.UUID) (string, error) {
	cardChecklists, err := h.cardChecklistRepo.GetCardChecklists(ctx, cardID, h.IncludeDeleted)
	if err != nil {
		return "", err
	}
	if len(cardChecklists) > 0 {
		firstPos := cardChecklists[0].Pos
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

func (h *ChecklistPositionHelper) ChecklistPosBeforeID(ctx context.Context, cardID, beforeChecklistID uuid.UUID) (string, error) {
	cardChecklists, err := h.cardChecklistRepo.GetCardChecklists(ctx, cardID, h.IncludeDeleted)
	if err != nil {
		return "", err
	}

	idx := -1
	for i := range cardChecklists {
		if cardChecklists[i].ChecklistID == beforeChecklistID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return "", domainerr.ErrValidation
	}

	nextPos := cardChecklists[idx].Pos
	if idx > 0 {
		prevPos := cardChecklists[idx-1].Pos
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

func (h *ChecklistPositionHelper) EntryPosAtChecklistEnd(ctx context.Context, checklistID uuid.UUID) (string, error) {
	checklistEntries, err := h.checklistEntryRepo.GetChecklistEntries(ctx, checklistID, h.IncludeDeleted)
	if err != nil {
		return "", err
	}
	if len(checklistEntries) > 0 {
		lastPos := checklistEntries[len(checklistEntries)-1].Pos
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

func (h *ChecklistPositionHelper) EntryPosAtChecklistStart(ctx context.Context, checklistID uuid.UUID) (string, error) {
	checklistEntries, err := h.checklistEntryRepo.GetChecklistEntries(ctx, checklistID, h.IncludeDeleted)
	if err != nil {
		return "", err
	}
	if len(checklistEntries) > 0 {
		firstPos := checklistEntries[0].Pos
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

func (h *ChecklistPositionHelper) EntryPosBeforeID(ctx context.Context, checklistID, beforeEntryID uuid.UUID) (string, error) {
	checklistEntries, err := h.checklistEntryRepo.GetChecklistEntries(ctx, checklistID, h.IncludeDeleted)
	if err != nil {
		return "", err
	}

	idx := -1
	for i := range checklistEntries {
		if checklistEntries[i].EntryID == beforeEntryID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return "", domainerr.ErrValidation
	}

	nextPos := checklistEntries[idx].Pos
	if idx > 0 {
		prevPos := checklistEntries[idx-1].Pos
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
