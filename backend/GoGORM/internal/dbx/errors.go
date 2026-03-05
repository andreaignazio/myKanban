package dbx

import (
	"GoGORM/internal/domainerr"
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

func WrapDBErr(err error, msg string) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return domainerr.New(domainerr.ErrNotFound, msg, "repo")
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return domainerr.New(domainerr.ErrConflict, msg, "repo")
	}
	// pgx/v5 does not always wrap into gorm.ErrDuplicatedKey — check SQLSTATE directly
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return domainerr.New(domainerr.ErrConflict, msg, "repo")
	}
	return domainerr.New(domainerr.ErrInternal, msg, "repo")
}
