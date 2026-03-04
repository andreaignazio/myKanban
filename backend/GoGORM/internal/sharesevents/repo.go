package sharesevents

import (
	"GoGORM/internal/dbx"
	"GoGORM/models"
	"context"

	"gorm.io/gorm"
)

type ShareEventsRepo struct {
	db *gorm.DB
}

func NewSharesEventsRepo(db *gorm.DB) *ShareEventsRepo {

	return &ShareEventsRepo{db: db}
}

func (r *ShareEventsRepo) CreateShareEvent(ctx context.Context, db *gorm.DB, event *models.BoardListOfferEvent) error {

	if err := db.WithContext(ctx).
		Table("board_list_offer_events").
		Create(event).Error; err != nil {
		return dbx.WrapDBErr(err, "error creating event")
	}
	return nil

}
