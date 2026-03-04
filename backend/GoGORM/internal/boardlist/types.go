package boardlist

import "GoGORM/models"

type BoardListRow struct {
	List      models.List      `gorm:"embedded;embeddedPrefix:list_"`
	BoardList models.BoardList `gorm:"embedded;embeddedPrefix:bl_"`
}