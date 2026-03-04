package shares

import (
	"GoGORM/internal/rbac"
	"time"

	"github.com/google/uuid"
)

type ShareOfferDomain struct {
	UserID        uuid.UUID
	SourceBoardID uuid.UUID
	TargetBoardID uuid.UUID
	ListID 	  uuid.UUID
	ProposedAccessMode rbac.BoardListAccessMode
}

type ShareOfferRespondDomain struct{
	UserID uuid.UUID
	TargetBoardID uuid.UUID
	ShareID uuid.UUID
	Decision string
	AccessMode rbac.BoardListAccessMode
}

type ShareOfferUpdate struct {
	ID *uuid.UUID
	Status *string
	DecidedByUserID *uuid.UUID
	DecidedAt *time.Time
}

type ShareOfferRevokeDomain struct {
	RequesterBoardID uuid.UUID
	RequesterUserID uuid.UUID
	ShareID uuid.UUID
	Reason string
}


