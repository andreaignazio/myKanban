package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type Card struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	Title           string
	Done            bool
	Description     string         `gorm:"type:text;default:''"`
	StartDate       *time.Time     `gorm:"type:timestamptz;"`
	EndDate         *time.Time     `gorm:"type:timestamptz;"`
	Props           datatypes.JSON `gorm:"type:jsonb;default:'{}'"`
	CreatedByUserID uuid.UUID      `gorm:"type:uuid;"`
	CreatedInListID uuid.UUID      `gorm:"type:uuid;"`
	Labels          []Label        `gorm:"foreignKey:CardID;constraint:OnDelete:CASCADE;"`
	CardComments    []CardComment  `gorm:"foreignKey:CardID;constraint:OnDelete:CASCADE;"`
	TimeStamps
}

type Label struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	CardID          uuid.UUID `gorm:"type:uuid;not null;index"`
	Title           string    `gorm:"type:text;not null"`
	Color           string    `gorm:"type:text;not null"`
	CreatedByUserID uuid.UUID `gorm:"type:uuid;"`
	TimeStamps
}

type CardComment struct {
	ID              uuid.UUID        `gorm:"type:uuid;primaryKey"`
	CardID          uuid.UUID        `gorm:"type:uuid;not null;index"`
	CommentMentions []CommentMention `gorm:"foreignKey:CardCommentID;constraint:OnDelete:CASCADE;"`
	Content         string           `gorm:"type:text;not null"`
	CreatedByUserID uuid.UUID        `gorm:"type:uuid;"`
	TimeStamps
}

type CommentMention struct {
	CardCommentID   uuid.UUID `gorm:"type:uuid;"`
	MentionedUserID uuid.UUID `gorm:"type:uuid;"`
	CreatedByUserID uuid.UUID `gorm:"type:uuid;"`
	TimeStamps
}

type CardMember struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	CardID          uuid.UUID `gorm:"type:uuid;not null;index"`
	UserID          uuid.UUID `gorm:"type:uuid;not null;index"`
	CreatedByUserID uuid.UUID `gorm:"type:uuid;"`
	TimeStamps
}

type BoardLabel struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	BoardID         uuid.UUID `gorm:"type:uuid;not null;index"`
	Title           *string   `gorm:"type:text;"`
	Color           *string   `gorm:"type:text;"`
	CreatedByUserID uuid.UUID `gorm:"type:uuid;"`
	TimeStamps
}

type CardLabelLink struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey"`
	CardID       uuid.UUID `gorm:"type:uuid;not null;index"`
	BoardID      uuid.UUID `gorm:"type:uuid;not null;index"`
	BoardLabelID uuid.UUID `gorm:"type:uuid;not null;index"`
	TimeStamps
}

type UserInboxCard struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey"`
	UserID         uuid.UUID  `gorm:"type:uuid;not null;index"`
	CardID         uuid.UUID  `gorm:"type:uuid;not null;index"`
	Pos            string     `gorm:"type:text;not null;"`
	SourceBoardID  *uuid.UUID `gorm:"type:uuid;index"`
	RootListCardID *uuid.UUID `gorm:"type:uuid;index"`
	TimeStamps
}
