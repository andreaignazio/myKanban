package lists

import (
	"GoGORM/models"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type ListDomain struct {
	ID               uuid.UUID
	Title            string
	Props            datatypes.JSON
	CreatedByUserID  uuid.UUID
	CreatedInBoardID uuid.UUID
	CreatedAt        time.Time
	UpdatedAt        time.Time
	DeletedAt        gorm.DeletedAt
}

type ListDetailDomain struct {
	ID        uuid.UUID
	Title     string
	Cards     []models.Card
	DeletedAt gorm.DeletedAt
}
