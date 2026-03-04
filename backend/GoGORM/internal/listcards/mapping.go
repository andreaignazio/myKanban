package listcards

import (
	"GoGORM/internal/dto"
	"GoGORM/models"
)

func mappingListCardToResponse(listCard *models.ListCard) *dto.ListCardResponse {
	if listCard == nil {
		return nil
	}
	return &dto.ListCardResponse{
		ID:        listCard.ID,
		ListID:    listCard.ListID,
		CardID:    listCard.CardID,
		RootID:    listCard.RootID,
		Position:  listCard.Pos,
		CreatedAt: listCard.CreatedAt,
		UpdatedAt: listCard.UpdatedAt,
		DeletedAt: dto.DeletedAtPtr(listCard.DeletedAt),
	}
}
