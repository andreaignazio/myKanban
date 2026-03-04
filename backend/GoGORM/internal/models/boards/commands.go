package boards

import (
	"GoGORM/models"

	"gorm.io/datatypes"
)

type UpdateBoardsInput struct {
	Name       *string
	Visibility *models.BoardVisibility
	Props      *datatypes.JSON
}

type UpdateUserBoardInput struct {
	Props *datatypes.JSON
}
