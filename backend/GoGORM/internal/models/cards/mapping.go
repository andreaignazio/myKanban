package cards

import (
	"GoGORM/internal/dto"
	"GoGORM/models"
)

func mappingCardToResponse(card *models.Card) *dto.CardResponse {
	return &dto.CardResponse{
		ID:              card.ID,
		Title:           card.Title,
		Done:            card.Done,
		Description:     card.Description,
		StartDate:       card.StartDate,
		EndDate:         card.EndDate,
		CreatedByUserID: card.CreatedByUserID,
		CreatedInListID: card.CreatedInListID,
		CreatedAt:       card.CreatedAt,
		UpdatedAt:       card.UpdatedAt,
		DeletedAt:       deletedAtPtr(card.DeletedAt),
	}
}
