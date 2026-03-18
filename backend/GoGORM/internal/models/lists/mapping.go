package lists

import (
	"GoGORM/internal/dto"
	"GoGORM/models"
)

func mappingListToListResponse(list *models.List) dto.ListResponse {
	return dto.ListResponse{
		ID:               list.ID,
		Title:            list.Title,
		Props:            list.Props,
		CreatedByUserID:  list.CreatedByUserID,
		CreatedInBoardID: list.CreatedInBoardID,
		ExternalAccess:   list.ExternalAccess,
		CreatedAt:        list.CreatedAt,
		UpdatedAt:        list.UpdatedAt,
		DeletedAt:        deletedAtPtr(list.DeletedAt),
	}
}
