package inbox

import (
	"GoGORM/internal/domainerr"
	"GoGORM/models"
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func (s *InboxService) getRootBoardIDForMirrorCard(ctx context.Context, inboxCard models.UserInboxCard) (*uuid.UUID, error) {
	rootBoardList, err := s.getRootBoardListForMirrorCard(ctx, inboxCard)
	if err != nil {
		return nil, err
	}
	return &rootBoardList.BoardID, nil
}

func (s *InboxService) getRootBoardListForMirrorCard(ctx context.Context, inboxCard models.UserInboxCard) (*models.BoardList, error) {
	var sourceListID uuid.UUID
	if inboxCard.RootListCardID != nil {
		rootListCard, err := s.ListCardsRepo.GetListCardByIDTX(ctx, s.db, *inboxCard.RootListCardID, s.includeDeleted)
		if err == nil && rootListCard != nil {
			sourceListID = rootListCard.ListID
		} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
	}

	if sourceListID == uuid.Nil {
		if inboxCard.RootListCardID != nil {
			fmt.Println("getRootBoardListForMirrorCard: falling back from stale root_list_card_id", *inboxCard.RootListCardID, "for inbox card", inboxCard.CardID)
		}
		fallbackListCard, found, err := s.ListCardsRepo.FindAnyListCardByCardIDTX(ctx, s.db, inboxCard.CardID, s.includeDeleted)
		if err != nil {
			return nil, err
		}
		if !found || fallbackListCard == nil {
			return nil, domainerr.ErrNotFound
		}
		sourceListID = fallbackListCard.ListID
	}

	boardLists, err := s.BoardListRepo.GetBoardListsByListIdTX(ctx, s.db, sourceListID, s.includeDeleted)
	if err != nil {
		return nil, err
	}
	if len(boardLists) == 0 {
		return nil, domainerr.ErrNotFound
	}
	var rootBoardList *models.BoardList
	if inboxCard.SourceBoardID != nil {
		var firstBoardMatch *models.BoardList
		for _, bl := range boardLists {
			if bl.BoardID == *inboxCard.SourceBoardID {
				if firstBoardMatch == nil {
					firstBoardMatch = &bl
				}
				if bl.ID == bl.RootID {
					rootBoardList = &bl
					break
				}
			}
		}
		if rootBoardList == nil {
			rootBoardList = firstBoardMatch
		}
	}
	if rootBoardList == nil {
		for _, bl := range boardLists {
			if bl.ID == bl.RootID {
				rootBoardList = &bl
				break
			}
		}
	}
	if rootBoardList == nil {
		for _, bl := range boardLists {
			rootBoardList = &bl
			break
		}
	}
	if rootBoardList == nil {
		return nil, domainerr.ErrNotFound
	}
	return rootBoardList, nil
}

func (s *InboxService) getSourceWorkspaceIDForMirrorCard(ctx context.Context, inboxCard models.UserInboxCard) (*uuid.UUID, error) {
	rootBoardList, err := s.getRootBoardListForMirrorCard(ctx, inboxCard)
	if err != nil {
		return nil, err
	}
	board, err := s.BoardsRepo.GetBoard(ctx, rootBoardList.BoardID, s.includeDeleted)
	if err != nil {
		return nil, err
	}
	if board == nil {
		return nil, domainerr.ErrNotFound
	}
	return &board.WorkspaceID, nil
}

func (s *InboxService) getRootBoardAndBoardListForMirrorCard(ctx context.Context, inboxCard models.UserInboxCard) (*models.Board, *models.BoardList, error) {
	rootBoardList, err := s.getRootBoardListForMirrorCard(ctx, inboxCard)
	if err != nil {
		return nil, nil, err
	}
	board, err := s.BoardsRepo.GetBoard(ctx, rootBoardList.BoardID, s.includeDeleted)
	if err != nil {
		return nil, nil, err
	}
	if board == nil {
		return nil, nil, domainerr.ErrNotFound
	}
	return board, rootBoardList, nil
}
