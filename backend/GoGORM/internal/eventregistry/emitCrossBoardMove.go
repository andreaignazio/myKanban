package EventRegistry

import (
	"GoGORM/internal/dto"
	"GoGORM/internal/ws"
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

func (s *EventRegistryService) EmitCrossBoardMove(ctx context.Context, req CrossBoardMoveEmitRequest) error {
	if req.OccurredAt.IsZero() {
		req.OccurredAt = time.Now()
	}

	if req.SourceBoardID == uuid.Nil || req.TargetBoardID == uuid.Nil {
		return fmt.Errorf("event registry cross-board move: invalid identifiers")
	}

	effectiveRootListCardID := req.RootListCardID
	if effectiveRootListCardID == uuid.Nil {
		effectiveRootListCardID = req.MovedListCardID
	}
	if effectiveRootListCardID == uuid.Nil {
		return fmt.Errorf("event registry cross-board move: missing root list card identifier")
	}

	if req.WorkspaceID == nil {
		if s.workspaceResolver == nil {
			return fmt.Errorf("event registry cross-board move: workspace resolver unavailable")
		}
		workspaceID, err := s.workspaceResolver.ResolveWorkspaceID(ctx, req.SourceBoardID)
		if err != nil {
			return err
		}
		req.WorkspaceID = &workspaceID
	}

	boardConsumers, err := s.repo.ResolveBoardConsumersForRootListCard(ctx, effectiveRootListCardID, req.SourceBoardID, req.TargetBoardID)
	if err != nil {
		return err
	}

	externalRootRows, err := s.repo.GetExternalRootRefsByIDs(ctx, []uuid.UUID{effectiveRootListCardID})
	if err != nil {
		return err
	}

	boardsRows, err := s.repo.GetBoardsByIDs(ctx, []uuid.UUID{req.SourceBoardID, req.TargetBoardID})
	if err != nil {
		return err
	}
	boardsPayload := make(map[uuid.UUID]dto.BoardResponse, len(boardsRows))
	for i := range boardsRows {
		boardRow := boardsRows[i]
		boardsPayload[boardRow.ID] = dto.BoardToResponse(&boardRow)
	}

	mapIDs := func(listCards []dto.ListCardResponse) []string {
		ids := make([]string, 0, len(listCards))
		for _, lc := range listCards {
			ids = append(ids, lc.ID.String())
		}
		return ids
	}

	var Invalidations EventInvalidations

	if req.MovedListCardID == req.RootListCardID {
		listCardIds, err := s.repo.ResolveListCardIDsByRootID(ctx, req.RootListCardID)
		if err != nil {
			return err
		}
		Invalidations.RootBoardListCardIds = make([]string, 0, len(listCardIds))
		for _, id := range listCardIds {
			if id == uuid.Nil {
				continue
			}
			Invalidations.RootBoardListCardIds = append(Invalidations.RootBoardListCardIds, id.String())
		}
	}

	buildBoardPayload := func(boardID uuid.UUID) CrossBoardMoveBoardPayload {
		invalidatedListCardIDs := []string{}
		if req.MovedListCardID != uuid.Nil {
			invalidatedListCardIDs = append(invalidatedListCardIDs, req.MovedListCardID.String())
		}

		cards := map[uuid.UUID]dto.CardResponse{}
		if req.CardPatch.ID != uuid.Nil {
			cards[req.CardID] = req.CardPatch
		}

		payload := CrossBoardMoveBoardPayload{
			RootListCardID:      effectiveRootListCardID.String(),
			MovedListCardID:     req.MovedListCardID.String(),
			CardID:              req.CardID.String(),
			Cards:               cards,
			Boards:              boardsPayload,
			SourceBoardID:       req.SourceBoardID.String(),
			TargetBoardID:       req.TargetBoardID.String(),
			FromListID:          req.SourceListID.String(),
			ToListID:            req.TargetListID.String(),
			ListCardPatch:       req.ListCardPatch,
			FromListCards:       []dto.ListCardResponse{},
			ToListCards:         []dto.ListCardResponse{},
			ListCardIdsByListID: map[string][]string{},

			Invalidations: &Invalidations,
		}

		if boardID == req.SourceBoardID {
			payload.FromListCards = req.FromListCards
			payload.ListCardIdsByListID[req.SourceListID.String()] = mapIDs(req.FromListCards)
		}
		if boardID == req.TargetBoardID {
			payload.ToListCards = req.ToListCards
			payload.ListCardIdsByListID[req.TargetListID.String()] = mapIDs(req.ToListCards)
		}

		return payload
	}

	for _, boardID := range boardConsumers {
		if boardID == uuid.Nil {
			continue
		}
		s.Hub.BroadCastToBoard(ws.Event{
			Type:          string(EventListCardCrossBoardMoved),
			BoardID:       boardID,
			Payload:       buildBoardPayload(boardID),
			TS:            req.OccurredAt,
			ActorUserID:   req.ActorUserID,
			CorrelationID: req.CorrelationID,
		})
	}

	externalRootsByID := make(map[uuid.UUID]dto.ExternalRootRefResponse)
	for i := range externalRootRows {
		row := externalRootRows[i]
		if row.RootListCardID == uuid.Nil {
			continue
		}
		if _, exists := externalRootsByID[row.RootListCardID]; exists {
			continue
		}
		externalRootsByID[row.RootListCardID] = dto.ExternalRootRefToResponse(&row)
	}

	s.ResolveCrossBoardMoveInboxFanout(ctx, effectiveRootListCardID, externalRootsByID, req)

	return nil
}

func (s *EventRegistryService) ResolveCrossBoardMoveInboxFanout(ctx context.Context, effectiveRootListCardID uuid.UUID,
	externalRootsByID map[uuid.UUID]dto.ExternalRootRefResponse, req CrossBoardMoveEmitRequest) error {
	inboxUsers, err := s.repo.ResolveInboxUserConsumersForRootListCard(ctx, effectiveRootListCardID)
	if err != nil {
		return err
	}

	for _, userID := range inboxUsers {
		if userID == uuid.Nil {
			continue
		}
		affectedInboxCardIDs, err := s.repo.ResolveInboxCardIDsForUserAndRootListCard(ctx, userID, effectiveRootListCardID)
		if err != nil {
			return err
		}

		payload := ws.InboxRootCardMovedPayload{
			RootListCardID:       effectiveRootListCardID,
			CardID:               req.CardID,
			SourceBoardID:        req.SourceBoardID,
			TargetBoardID:        req.TargetBoardID,
			SourceListID:         req.SourceListID,
			TargetListID:         req.TargetListID,
			AffectedInboxCardIDs: affectedInboxCardIDs,
			ExternalRootsByID:    externalRootsByID,
		}

		s.Hub.BroadCastToUser(ws.UserEvent{
			Type:            string(ws.EventInboxRootCardMoved),
			RecipientUserID: userID,
			WorkspaceID:     req.WorkspaceID,
			Payload: ws.UserEventPayload{
				InboxRootCardMovedPayload: &payload,
			},
			TS:            req.OccurredAt,
			ActorUserID:   req.ActorUserID,
			CorrelationID: req.CorrelationID,
		})
	}
	return nil

}
