package models

import (
	"GoGORM/internal/rbac"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type ShareOfferStatus string

const (
	Pending  ShareOfferStatus = "pending"
	Accepted ShareOfferStatus = "accepted"
	Rejected ShareOfferStatus = "rejected"
	Revoked  ShareOfferStatus = "revoked"
)

type ShareOfferKind string

const (
	ShareOfferKindInvite  ShareOfferKind = "invite"
	ShareOfferKindRequest ShareOfferKind = "request"
)

type ShareLinkMode string

const (
	ShareLinkModeAutoJoin    ShareLinkMode = "autojoin"
	ShareLinkModeSendRequest ShareLinkMode = "sendrequest"
)

type BoardListShareOffer struct {
	ID                 uuid.UUID                `gorm:"type:uuid;primaryKey"`
	TargetBoardID      uuid.UUID                `gorm:"type:uuid;not null;uniqueIndex:uq_share"`
	SourceBoardID      uuid.UUID                `gorm:"type:uuid;not null;uniqueIndex:uq_share"`
	ListID             uuid.UUID                `gorm:"type:uuid;not null;uniqueIndex:uq_share"`
	Status             ShareOfferStatus         `gorm:"type:text;not null;"` // pending/accepted/rejected
	ProposedAccessMode rbac.BoardListAccessMode `gorm:"type:text;not null"`
	CreatedByUserID    uuid.UUID                `gorm:"type:uuid;not null;"`
	DecidedByUserID    *uuid.UUID               `gorm:"type:uuid;"`
	DecidedAt          *time.Time               `gorm:"type:timestamptz"`
	TimeStamps
}

type ShareOffer struct {
	ID              uuid.UUID        `gorm:"type:uuid;primaryKey"`
	TargetType      string           `gorm:"type:text;not null;"`
	TargetID        uuid.UUID        `gorm:"type:uuid;not null;"`
	FromUserID      uuid.UUID        `gorm:"type:uuid;not null;"`
	ToUserID        *uuid.UUID       `gorm:"type:uuid;"`
	OfferedRole     rbac.Role        `gorm:"type:text;not null;"`
	Status          ShareOfferStatus `gorm:"type:text;not null;"` // pending/accepted/rejected
	Kind            ShareOfferKind   `gorm:"type:text;not null;default:'invite'"`
	DecidedByUserID *uuid.UUID       `gorm:"type:uuid;"`
	DecidedAt       *time.Time       `gorm:"type:timestamptz"`
	Message         string           `gorm:"type:text;"`
	TimeStamps
}

type ShareOfferEvent struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey"`
	OfferID    uuid.UUID      `gorm:"type:uuid;not null;"`
	TargetType string         `gorm:"type:text;not null;"`
	TargetID   uuid.UUID      `gorm:"type:uuid;not null;"`
	EventType  string         `gorm:"type:text;not null;"` // created/updated/deleted
	Payload    datatypes.JSON `gorm:"type:jsonb;"`
	CreatedAt  time.Time      `gorm:"type:timestamptz;not null;"`
}

type PublicShareLink struct {
	ID              uuid.UUID     `gorm:"type:uuid;primaryKey"`
	Token           string        `gorm:"type:text;not null;uniqueIndex"`
	TargetType      string        `gorm:"type:text;not null;"`
	TargetID        uuid.UUID     `gorm:"type:uuid;not null;"`
	Mode            ShareLinkMode `gorm:"type:text;not null;default:'autojoin'"`
	Role            rbac.Role     `gorm:"type:text;not null;"`
	ExpiresAt       *time.Time    `gorm:"type:timestamptz;"`
	RevokedAt       *time.Time    `gorm:"type:timestamptz;"`
	CreatedByUserID uuid.UUID     `gorm:"type:uuid;not null;"`
	TimeStamps
}
