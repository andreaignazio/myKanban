package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
)

type ShareOfferEventType string

const (
	EventOffered          ShareOfferEventType = "offered"
	EventeRespondAccepted ShareOfferEventType = "respond_accepted"
	EventRespondRejected  ShareOfferEventType = "respond_rejected"
	EventRevoked          ShareOfferEventType = "revoked"
	EventAutoMounted      ShareOfferEventType = "auto_mounted"
	EventAutoUnMounted    ShareOfferEventType = "auto_unmounted"
)

type BoardListOfferEvent struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey"`
	OfferID      uuid.UUID	`gorm:"type:uuid;not null;index:idx_offer_events_offer_created,priority:1;"`
	EventType    ShareOfferEventType `gorm:"type:text;not null"`
	ActorUserID  uuid.UUID `gorm:"type:uuid;not null"`
	ActorBoardID uuid.UUID 	`gorm:"type:uuid;not null"`
	Payload      datatypes.JSON `gorm:"type:jsonb"`
	CreatedAt    time.Time 	`gorm:"type:timestamp;not null;default:now();index:idx_offer_events_offer_created,priority:2;"`
	UpdatedAt	time.Time 	`gorm:"type:timestamp;not null;default:now();"`
	DeletedAt *time.Time `gorm:"index"`
}