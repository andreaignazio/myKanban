package boards

import "GoGORM/models"

type UserBoardRow struct {
	Board     models.Board     `gorm:"embedded;embeddedPrefix:board_"`
	UserBoard models.UserBoard `gorm:"embedded;embeddedPrefix:ub_"`
}

func (r UserBoardRow) ToBoardAndUserBoard() (models.Board, models.UserBoard) {
	return r.Board, r.UserBoard
}

func UserBoardRowsToModels(rows []UserBoardRow) ([]models.Board, []models.UserBoard) {
	boards := make([]models.Board, 0, len(rows))
	userBoards := make([]models.UserBoard, 0, len(rows))
	for _, row := range rows {
		boards = append(boards, row.Board)
		userBoards = append(userBoards, row.UserBoard)
	}
	return boards, userBoards
}

type BoardListRow struct {
	List      models.List      `gorm:"embedded;embeddedPrefix:list_"`
	BoardList models.BoardList `gorm:"embedded;embeddedPrefix:bl_"`
}

type ListCardRow struct {
	Card     models.Card     `gorm:"embedded;embeddedPrefix:card_"`
	ListCard models.ListCard `gorm:"embedded;embeddedPrefix:lc_"`
}
