package pos

import (
	"GoGORM/internal/domainerr"
	"context"
	"fmt"

	"github.com/google/uuid"
)

func (s *Service) CardPosAtListEnd(ctx context.Context, listID uuid.UUID) (string, error) {
	cardsInList, err := s.CardPosRepo.GetCardsInList(ctx, listID, s.IncludeDeleted)
	if err != nil {
		return "", err
	}
	if len(cardsInList) > 0 {
		lastPos := cardsInList[len(cardsInList)-1].Pos
		newPos, err := s.generator.GenerateRankBetween(lastPos, "")
		if err != nil {
			return "", err
		}
		return newPos, nil
	}
	newPos, err := s.generator.GenerateRankBetween("", "")
	if err != nil {
		return "", err
	}
	return newPos, nil

}

func (s *Service) CardPosAtListStart(ctx context.Context, listID uuid.UUID) (string, error) {
	cardsInList, err := s.CardPosRepo.GetCardsInList(ctx, listID, s.IncludeDeleted)
	if err != nil {
		return "", err
	}
	if len(cardsInList) > 0 {
		firstPos := cardsInList[0].Pos
		newPos, err := s.generator.GenerateRankBetween("", firstPos)
		if err != nil {
			return "", err
		}
		return newPos, nil
	}
	newPos, err := s.generator.GenerateRankBetween("", "")
	if err != nil {
		return "", err
	}
	return newPos, nil

}

func (s *Service) CardPosAfterID(ctx context.Context, listID, afterID uuid.UUID) (string, error) {
	cardsInList, err := s.CardPosRepo.GetCardsInList(ctx, listID, s.IncludeDeleted)
	//fmt.Println("Cards in list:", cardsInList)
	if err != nil {
		return "", err
	}
	idx := -1
	for i, list := range cardsInList {
		if list.CardID == afterID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return "", domainerr.ErrValidation
	}
	prevPos := cardsInList[idx].Pos
	if len(cardsInList) > idx+1 {
		nextPos := cardsInList[idx+1].Pos
		newPos, err := s.generator.GenerateRankBetween(prevPos, nextPos)
		if err != nil {
			return "", domainerr.ErrValidation
		}
		return newPos, nil
	}
	newPos, err := s.generator.GenerateRankBetween(prevPos, "")
	if err != nil {
		return "", err
	}
	return newPos, nil
}

func (s *Service) CardPosBeforeID(ctx context.Context, listID, afterID uuid.UUID) (string, error) {
	cardsInList, err := s.CardPosRepo.GetCardsInList(ctx, listID, s.IncludeDeleted)
	//fmt.Println("Cards in list:", cardsInList)
	if err != nil {
		fmt.Println("errore 6.1", err)
		return "", err
	}
	idx := -1
	for i, list := range cardsInList {
		if list.ID == afterID {
			idx = i
			break
		}
	}
	if idx == -1 {
		fmt.Println("errore 6.2", err)
		return "", domainerr.ErrValidation
	}
	nextPos := cardsInList[idx].Pos
	if idx > 0 {
		prevPos := cardsInList[idx-1].Pos
		newPos, err := s.generator.GenerateRankBetween(prevPos, nextPos)
		if err != nil {
			fmt.Println("errore 6.3", err)
			return "", domainerr.ErrValidation
		}
		return newPos, nil
	}
	newPos, err := s.generator.GenerateRankBetween("", nextPos)
	if err != nil {
		fmt.Println("errore 6.4", err)
		return "", err
	}
	return newPos, nil
}

func (s *Service) BulkCardPosAfterID(ctx context.Context, cardIDs []uuid.UUID, sourceListId uuid.UUID, targetListID, afterID uuid.UUID, isCrossList bool) ([]string, error) {

	cardsInList, err := s.CardPosRepo.GetCardsInList(ctx, targetListID, s.IncludeDeleted)
	if err != nil {
		return nil, err
	}
	cardIDsMap := make(map[uuid.UUID]struct{})
	for _, id := range cardIDs {
		cardIDsMap[id] = struct{}{}
	}

	idx := -1
	for i, list := range cardsInList {
		if list.CardID == afterID {
			idx = i
			break
		}
	}
	if idx == -1 {
		return nil, domainerr.ErrNotFound
	}

	//checkk if afterID is in cardIDs
	if _, ok := cardIDsMap[afterID]; ok {
		return nil, domainerr.ErrValidation
	}

	prevPos := cardsInList[idx].Pos
	var nextPos string
	if len(cardsInList) > idx+1 {
		if !isCrossList {
			for i := idx + 1; i < len(cardsInList); i++ {
				if _, ok := cardIDsMap[cardsInList[i].CardID]; ok {
					continue
				} else {
					nextPos = cardsInList[i].Pos
					break
				}
			}
		} else {
			nextPos = cardsInList[idx+1].Pos
		}

	} else {
		nextPos = ""
	}

	positions, err := s.generator.GenerateNRankBetween(prevPos, nextPos, len(cardIDs))
	if err != nil {
		return nil, err
	}
	return positions, nil

}
