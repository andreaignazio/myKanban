package dbx

import (
	"GoGORM/internal/domainerr"
	"errors"

	"gorm.io/gorm"
)

func WrapDBErr(err error, msg string) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return domainerr.New(domainerr.ErrNotFound, msg, "repo")
	}
	if errors.Is(err, gorm.ErrDuplicatedKey){
		return domainerr.New(domainerr.ErrConflict, msg, "repo")
	}
	
	return domainerr.New(domainerr.ErrInternal, msg, "repo")
}