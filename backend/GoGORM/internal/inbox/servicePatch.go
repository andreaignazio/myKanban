package inbox

import (
	"GoGORM/internal/actions"
	"GoGORM/internal/authzdto"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	"GoGORM/internal/models/cards"
	"GoGORM/models"
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func (s *InboxService) PatchInboxCardDetails(ctx context.Context, userID, cardID, correlationID uuid.UUID, req cards.PatchCardDetailsRequest) (*dto.CardResponse, error) {
	inboxCard, err := s.repo.GetInboxCardByCardID(ctx, userID, cardID, s.includeDeleted)
	if err != nil {
		return nil, err
	}
	if inboxCard == nil {
		return nil, domainerr.ErrNotFound
	}

	isMirror, _, err := s.isMirrorCard(ctx, cardID)
	if err != nil {
		return nil, err
	}
	if isMirror {
		rootBoardList, err := s.getRootBoardListForMirrorCard(ctx, *inboxCard)
		if err != nil {
			return nil, err
		}
		request := authzdto.Request{
			UserID:        userID,
			CorrelationID: correlationID,
			Action:        actions.PatchInboxMirrorCard,
			Payload: authzdto.RequestPayload{
				InboxMirrorCardPatchPayload: &authzdto.InboxMirrorCardPatchPayload{
					CardID:      cardID,
					BoardListID: rootBoardList.ID,
				},
			},
		}
		authzContext, err := s.authz.AuthorizeRequest(ctx, request)
		if err != nil {
			return nil, err
		}
		if !authzContext.Authorized {
			return nil, domainerr.ErrForbidden
		}
	}

	updateMap := map[string]any{}
	if req.Title != nil {
		updateMap["title"] = *req.Title
	}
	if req.Done != nil {
		updateMap["done"] = *req.Done
	}
	if req.Description != nil {
		updateMap["description"] = *req.Description
	}
	if req.StartDate.Set {
		if req.StartDate.Value == nil {
			updateMap["start_date"] = nil
		} else {
			updateMap["start_date"] = *req.StartDate.Value
		}
	}
	if req.EndDate.Set {
		if req.EndDate.Value == nil {
			updateMap["end_date"] = nil
		} else {
			updateMap["end_date"] = *req.EndDate.Value
		}
	}

	updatedCard, err := s.CardsRepo.PatchCardDetailsTX(ctx, s.db, cardID, updateMap)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	cardResponse := dto.CardToResponse(updatedCard)
	return &cardResponse, nil
}

func (s *InboxService) PatchInboxCardProps(ctx context.Context, userID, cardID, correlationID uuid.UUID, req cards.PatchCardPropsRequest) (*dto.CardResponse, error) {

	inboxCard, err := s.repo.GetInboxCardByCardID(ctx, userID, cardID, s.includeDeleted)
	if err != nil {
		return nil, err
	}
	if inboxCard == nil {
		return nil, domainerr.ErrNotFound
	}

	isMirror, _, err := s.isMirrorCard(ctx, cardID)
	if err != nil {
		return nil, err
	}
	if isMirror {
		rootBoardList, err := s.getRootBoardListForMirrorCard(ctx, *inboxCard)
		if err != nil {
			return nil, err
		}
		request := authzdto.Request{
			UserID: userID,

			CorrelationID: correlationID,
			Action:        actions.PatchInboxMirrorCard,
			Payload: authzdto.RequestPayload{
				InboxMirrorCardPatchPayload: &authzdto.InboxMirrorCardPatchPayload{
					CardID:      cardID,
					BoardListID: rootBoardList.ID,
				},
			},
		}
		authzContext, err := s.authz.AuthorizeRequest(ctx, request)
		if err != nil {
			return nil, err
		}
		if !authzContext.Authorized {
			return nil, domainerr.ErrForbidden
		}
		///check Authz for mirror cards - only allow if user has access to the board the card is on
	} else {
		//we have alredy checked that the card is in the user's inbox, so we can allow the update
	}

	var card *models.Card
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		//Get card props

		card, err = s.CardsRepo.GetCardByIDTX(ctx, tx, cardID, s.includeDeleted)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		mergedProps, err := dto.MergeNestedProps(req, card.Props)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		jsonProps, err := json.Marshal(mergedProps)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}

		jsonProps = datatypes.JSON(jsonProps)
		updateMap := map[string]any{
			"props": jsonProps,
		}
		updatedCard, err := s.CardsRepo.PatchCardDetailsTX(ctx, tx, cardID, updateMap)
		if err != nil {
			return domainerr.MapRepoErr(err, false)
		}
		card = updatedCard
		//fmt.Println(card)
		//Set card props
		return nil
	})
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	cardResponse := dto.CardToResponse(card)

	if isMirror {
		//emit event to update card in board if it's a mirror card

	}

	return &cardResponse, nil

}
