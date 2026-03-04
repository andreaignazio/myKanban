package listcards

import (
	"time"

	"github.com/google/uuid"
)

type PositionDefaults string

const (
	PositionEnd   PositionDefaults = "end"
	PositionStart PositionDefaults = "start"
)

type ListCardDetailDomain struct {
	CardID            uuid.UUID
	ListID            uuid.UUID
	Title             string
	Done              bool
	Pos               string
	CreatedAt         time.Time
	UpdatedAt         time.Time
	InsertedAt        time.Time
	CardListUpdatedAt time.Time
}
