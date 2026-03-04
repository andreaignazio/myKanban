package models

import (
	"time"

	"github.com/google/uuid"
)

type Checklist struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	Title           string    `gorm:"not null"`
	CreatedByUserID uuid.UUID `gorm:"type:uuid;not null"`
	CreatedInCardID uuid.UUID `gorm:"type:uuid;not null"`
	TimeStamps
}

type Entry struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	Title           string    `gorm:"not null"`
	Done            bool      `gorm:"not null;default:false"`
	DueDate         *time.Time
	CreatedByUserID uuid.UUID `gorm:"type:uuid;not null"`
	TimeStamps
}

type ChecklistEntry struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	ChecklistID uuid.UUID `gorm:"type:uuid;not null"`
	EntryID     uuid.UUID `gorm:"type:uuid;not null"`
	Pos         string    `gorm:"type:text;not null;index"`
	TimeStamps
}

type CardChecklist struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	CardID      uuid.UUID `gorm:"type:uuid;not null"`
	ChecklistID uuid.UUID `gorm:"type:uuid;not null"`
	Pos         string    `gorm:"type:text;not null;index"`
	TimeStamps
}

type EntryMember struct {
	ID      uuid.UUID `gorm:"type:uuid;primaryKey"`
	EntryID uuid.UUID `gorm:"type:uuid;not null"`
	UserID  uuid.UUID `gorm:"type:uuid;not null"`
	TimeStamps
}
