package boards

import (
	"GoGORM/internal/dto"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func deletedAtPtr(deletedAt gorm.DeletedAt) *time.Time {
	if deletedAt.Valid {
		return &deletedAt.Time
	}
	return nil
}

func MapUserBoardDetailResponse(userBoardRow *UserBoardRow, boardListRows []BoardListRow, cardsByListID map[uuid.UUID][]ListCardRow) UserBoardDetailResponse {
	lists := make([]BoardListDetailResponse, 0, len(boardListRows))
	for _, row := range boardListRows {
		cardRows := cardsByListID[row.List.ID]
		cards := make([]ListCardDetailResponse, 0, len(cardRows))
		for _, cardRow := range cardRows {
			cards = append(cards, ListCardDetailResponse{
				Card: dto.CardResponse{
					ID:              cardRow.Card.ID,
					Title:           cardRow.Card.Title,
					Done:            cardRow.Card.Done,
					Description:     cardRow.Card.Description,
					Props:           cardRow.Card.Props,
					StartDate:       cardRow.Card.StartDate,
					EndDate:         cardRow.Card.EndDate,
					CreatedByUserID: cardRow.Card.CreatedByUserID,
					CreatedInListID: cardRow.Card.CreatedInListID,
					CreatedAt:       cardRow.Card.CreatedAt,
					UpdatedAt:       cardRow.Card.UpdatedAt,
					DeletedAt:       deletedAtPtr(cardRow.Card.DeletedAt),
				},
				Relation: dto.ListCardResponse{
					ID:        cardRow.ListCard.ID,
					CardID:    cardRow.ListCard.CardID,
					ListID:    cardRow.ListCard.ListID,
					Position:  cardRow.ListCard.Pos,
					CreatedAt: cardRow.ListCard.CreatedAt,
					UpdatedAt: cardRow.ListCard.UpdatedAt,
					DeletedAt: deletedAtPtr(cardRow.ListCard.DeletedAt),
				},
			})
		}

		lists = append(lists, BoardListDetailResponse{
			List: dto.ListResponse{
				ID:               row.List.ID,
				Title:            row.List.Title,
				CreatedByUserID:  row.List.CreatedByUserID,
				CreatedInBoardID: row.List.CreatedInBoardID,
				CreatedAt:        row.List.CreatedAt,
				UpdatedAt:        row.List.UpdatedAt,
				DeletedAt:        deletedAtPtr(row.List.DeletedAt),
			},
			Relation: dto.BoardListResponse{
				ID:         row.BoardList.ID,
				BoardID:    row.BoardList.BoardID,
				ListID:     row.BoardList.ListID,
				Position:   row.BoardList.Pos,
				AccessMode: row.BoardList.AccessMode,
				CreatedAt:  row.BoardList.CreatedAt,
				UpdatedAt:  row.BoardList.UpdatedAt,
				DeletedAt:  deletedAtPtr(row.BoardList.DeletedAt),
			},
			Cards: cards,
		})
	}

	return UserBoardDetailResponse{
		Board: dto.BoardResponse{
			ID:              userBoardRow.Board.ID,
			Name:            userBoardRow.Board.Name,
			CreatedByUserID: userBoardRow.Board.CreatedByUserID,
			WorkspaceID:     userBoardRow.Board.WorkspaceID,
			Visibility:      userBoardRow.Board.Visibility.String(),
			PublicToken:     userBoardRow.Board.PublicToken,
			Props:           userBoardRow.Board.Props,
			CreatedAt:       userBoardRow.Board.CreatedAt,
			UpdatedAt:       userBoardRow.Board.UpdatedAt,
			DeletedAt:       deletedAtPtr(userBoardRow.Board.DeletedAt),
		},
		Relation: dto.UserBoardToResponse(&userBoardRow.UserBoard),
		Lists:    lists,
	}
}
