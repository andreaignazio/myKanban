package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type BoardAuditEvent struct {
	ID             uuid.UUID      `gorm:"type:uuid;primaryKey"`
	BoardID        *uuid.UUID     `gorm:"type:uuid;index"`
	WorkspaceID    *uuid.UUID     `gorm:"type:uuid;index"`
	ActorUserID    uuid.UUID      `gorm:"type:uuid;not null;index"`
	ActionType     string         `gorm:"type:text;not null"`
	MainEntityID   uuid.UUID      `gorm:"type:uuid;not null;index"`
	MainEntityType string         `gorm:"type:text;not null"`
	Payload        datatypes.JSON `gorm:"type:jsonb;default:'{}'"`
	CreatedAt      time.Time      `gorm:"type:timestamptz;not null;default:now()"`
	TimeStamps
}

type AuditEventTargets struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey"`
	AuditID     uuid.UUID  `gorm:"type:uuid;not null;index"`
	BoardID     uuid.UUID  `gorm:"type:uuid;not null;index"`
	WorkspaceID *uuid.UUID `gorm:"type:uuid;index"`
	EntityType  string     `gorm:"type:text;not null"`
	EntityID    uuid.UUID  `gorm:"type:uuid;not null;index"`
	CreatedAt   time.Time  `gorm:"type:timestamptz;not null;default:now()"`
}

type UserAuditNotification struct {
	ID      uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID  uuid.UUID `gorm:"type:uuid;not null;index"`
	AuditID uuid.UUID `gorm:"type:uuid;not null;index"`
	Read    bool      `gorm:"type:boolean;not null;default:false"`
	TimeStamps
}
