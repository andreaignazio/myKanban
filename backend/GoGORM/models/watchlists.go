package models

import "github.com/google/uuid"

type ListWatch struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID      uuid.UUID `gorm:"type:uuid;not null;index"`
	WorkspaceID uuid.UUID `gorm:"type:uuid;not null;index"`
	ListID      uuid.UUID `gorm:"type:uuid;not null;index"`
	BoardID     uuid.UUID `gorm:"type:uuid;not null;index"`
	Pos         string    `gorm:"type:text;not null;index"`
	Active      bool      `gorm:"type:boolean;not null;default:true"`
	TimeStamps
}

type CardWatch struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID      uuid.UUID `gorm:"type:uuid;not null;index"`
	WorkspaceID uuid.UUID `gorm:"type:uuid;not null;index"`
	CardID      uuid.UUID `gorm:"type:uuid;not null;index"`
	BoardID     uuid.UUID `gorm:"type:uuid;not null;index"`
	Pos         string    `gorm:"type:text;not null;index"`
	Active      bool      `gorm:"type:boolean;not null;default:true"`
	TimeStamps
}

type BoardWatch struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID      uuid.UUID `gorm:"type:uuid;not null;index"`
	WorkspaceID uuid.UUID `gorm:"type:uuid;not null;index"`
	BoardID     uuid.UUID `gorm:"type:uuid;not null;index"`
	Pos         string    `gorm:"type:text;not null;index"`
	Active      bool      `gorm:"type:boolean;not null;default:true"`
	TimeStamps
}
