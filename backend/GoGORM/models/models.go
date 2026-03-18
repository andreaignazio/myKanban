package models

import (
	"GoGORM/internal/rbac"
	"database/sql/driver"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// models.go

type TimeStamps struct {
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}

type Board struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey"`
	Name             string
	CreatedByUserID  uuid.UUID       `gorm:"type:uuid;"`
	WorkspaceID      uuid.UUID       `gorm:"type:uuid;"`
	Visibility       BoardVisibility `gorm:"type:text;not null;default:'private'"`
	PublicToken      string          `gorm:"type:text;unique;index"`
	Props            datatypes.JSON  `gorm:"type:jsonb;default:'{}'"`
	IsSuspended      bool            `gorm:"type:boolean;not null;default:false"`
	IsPendingSuspend bool            `gorm:"type:boolean;not null;default:false"`
	TimeStamps
}

type BoardVisibility string

const (
	BoardVisibilityPrivate   BoardVisibility = "private"
	BoardVisibilityPublic    BoardVisibility = "public"
	BoardVisibilityWorkspace BoardVisibility = "workspace"
)

type WorkspaceVisibility string

const (
	WorkspaceVisibilityPrivate   WorkspaceVisibility = "private"
	WorkspaceVisibilityPublic    WorkspaceVisibility = "public"
	WorkspaceVisibilityWorkspace WorkspaceVisibility = "workspace"
)

func (v BoardVisibility) String() string {
	return string(v)
}

func ParseBoardVisibility(value string) (BoardVisibility, bool) {
	switch value {
	case string(BoardVisibilityPrivate):
		return BoardVisibilityPrivate, true
	case string(BoardVisibilityPublic):
		return BoardVisibilityPublic, true
	case string(BoardVisibilityWorkspace):
		return BoardVisibilityWorkspace, true
	default:
		return BoardVisibilityPrivate, false
	}
}

func (v BoardVisibility) Value() (driver.Value, error) {
	return v.String(), nil
}

func (v *BoardVisibility) Scan(value interface{}) error {
	if value == nil {
		*v = BoardVisibilityPrivate
		return nil
	}

	switch raw := value.(type) {
	case string:
		parsed, ok := ParseBoardVisibility(raw)
		if !ok {
			return fmt.Errorf("invalid board visibility: %q", raw)
		}
		*v = parsed
		return nil
	case []byte:
		parsed, ok := ParseBoardVisibility(string(raw))
		if !ok {
			return fmt.Errorf("invalid board visibility: %q", string(raw))
		}
		*v = parsed
		return nil
	default:
		return fmt.Errorf("unsupported board visibility type: %T", value)
	}
}

type List struct {
	ID               uuid.UUID `gorm:"type:uuid;primaryKey"`
	Title            string
	Props            datatypes.JSON `gorm:"type:jsonb;default:'{}'"`
	CreatedByUserID  uuid.UUID      `gorm:"type:uuid;"`
	CreatedInBoardID uuid.UUID      `gorm:"type:uuid;"`
	ExternalAccess   string         `gorm:"type:varchar(32);default:'open'"`
	TimeStamps
}

// join tables (esplicite)
type UserBoard struct {
	UserID  uuid.UUID      `gorm:"type:uuid;primaryKey"`
	BoardID uuid.UUID      `gorm:"type:uuid;primaryKey"`
	Role    string         // owner/admin/member/viewer
	Pos     string         `gorm:"type:text;not null;index"`
	Props   datatypes.JSON `gorm:"type:jsonb;default:'{}'"`
	TimeStamps
}

type BoardList struct {
	ID         uuid.UUID                `gorm:"type:uuid;primaryKey"`
	RootID     uuid.UUID                `gorm:"type:uuid;not null;index"`
	BoardID    uuid.UUID                `gorm:"type:uuid;not null;index"`
	ListID     uuid.UUID                `gorm:"type:uuid;not null;index"`
	Pos        string                   `gorm:"type:text;not null;index"`
	AccessMode rbac.BoardListAccessMode `gorm:"type:text;not null;default:'editable'"`
	TimeStamps
}

type ListCard struct {
	ID     uuid.UUID `gorm:"type:uuid;primaryKey"`
	ListID uuid.UUID `gorm:"type:uuid;not null;index"`
	CardID uuid.UUID `gorm:"type:uuid;not null;index"`
	RootID uuid.UUID `gorm:"type:uuid;not null;index"`
	Pos    string    `gorm:"type:text;not null;index"`
	TimeStamps
}

type ExternalRootRefRow struct {
	RootListCardID uuid.UUID `gorm:"column:root_list_card_id"`
	CardID         uuid.UUID `gorm:"column:card_id"`
	BoardID        uuid.UUID `gorm:"column:board_id"`
	WorkspaceID    uuid.UUID `gorm:"column:workspace_id"`
	WorkspaceName  string    `gorm:"column:workspace_name"`
	ListID         uuid.UUID `gorm:"column:list_id"`
	BoardName      string    `gorm:"column:board_name"`
	ListTitle      string    `gorm:"column:list_title"`
	CardTitle      string    `gorm:"column:card_title"`
	UpdatedAt      time.Time `gorm:"column:updated_at"`
}
