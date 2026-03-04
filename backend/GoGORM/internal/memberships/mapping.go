package memberships

import (
	"GoGORM/internal/dto"
	"GoGORM/models"
	"time"

	"gorm.io/gorm"
)

func deletedAtPtr(deletedAt gorm.DeletedAt) *time.Time {
	if deletedAt.Valid {
		return &deletedAt.Time
	}
	return nil
}

func MappingUserBoardToResponse(userBoard models.UserBoard) dto.UserBoardResponse {
	return dto.UserBoardResponse{
		UserID:    userBoard.UserID,
		BoardID:   userBoard.BoardID,
		Role:      userBoard.Role,
		Position:  userBoard.Pos,
		CreatedAt: userBoard.CreatedAt,
		UpdatedAt: userBoard.UpdatedAt,
		DeletedAt: deletedAtPtr(userBoard.DeletedAt),
	}
}
