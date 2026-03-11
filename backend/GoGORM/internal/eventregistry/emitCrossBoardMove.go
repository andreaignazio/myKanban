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

	propagationResult, err := s.resolveMirrorPropagation(ctx, MirrorPropagationInput{
		Event:           DomainEvent{Type: EventListCardCrossBoardMoved},
		RootListCardID:  effectiveRootListCardID,
		MovedListCardID: req.MovedListCardID,
		SourceBoardID:   req.SourceBoardID,
		TargetBoardID:   req.TargetBoardID,
	})
	if err != nil {
		return err
	}
	if propagationResult == nil {
		return fmt.Errorf("event registry cross-board move: missing mirror propagation result")
	}

	externalRootRows, err := s.repo.GetExternalRootRefsByIDs(ctx, propagationResult.RootListCardIDs)
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

	invalidations := &EventInvalidations{RootBoardListCardIds: uuidListToStrings(propagationResult.InvalidatedListCardIDs)}

	buildBoardPayload := func(boardID uuid.UUID) CrossBoardMoveBoardPayload {
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

			Invalidations: invalidations,
		}

		if boardID == req.SourceBoardID {
			payload.FromListCards = req.FromListCards
			payload.ListCardIdsByListID[req.SourceListID.String()] = mapIDs(req.FromListCards)
		}
		if boardID == req.TargetBoardID {
			payload.ToListCards = req.ToListCards
			payload.ListCardIdsByListID[req.TargetListID.String()] = mapIDs(req.ToListCards)
		}
		payload.FromListCards = req.FromListCards
		payload.ToListCards = req.ToListCards
		payload.ListCardIdsByListID[req.TargetListID.String()] = mapIDs(req.ToListCards)
		payload.ListCardIdsByListID[req.SourceListID.String()] = mapIDs(req.FromListCards)

		return payload
	}

	mirrorListsBoardIds, err := s.ResolveBoardIDsForMirroredLists(ctx, []uuid.UUID{req.TargetListID})
	if err != nil {
		return err
	}

	targetBoardIdsMap := make(map[uuid.UUID]struct{})
	for _, boardID := range mirrorListsBoardIds {
		if boardID == uuid.Nil {
			continue
		}
		targetBoardIdsMap[boardID] = struct{}{}
	}
	for _, boardID := range propagationResult.AffectedBoardIDs {
		if boardID == uuid.Nil {
			continue
		}
		targetBoardIdsMap[boardID] = struct{}{}
	}

	targetBoardIDs := make([]uuid.UUID, 0, len(targetBoardIdsMap))
	for boardID := range targetBoardIdsMap {
		targetBoardIDs = append(targetBoardIDs, boardID)
	}

	for _, boardID := range targetBoardIDs {
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

	if err := s.emitCrossBoardMoveUserEvents(propagationResult.UserTargets, externalRootsByID, req); err != nil {
		return err
	}

	return nil
}

func (s *EventRegistryService) emitCrossBoardMoveUserEvents(userTargets []MirrorUserTarget,
	externalRootsByID map[uuid.UUID]dto.ExternalRootRefResponse, req CrossBoardMoveEmitRequest) error {
	effectiveRootListCardID := req.RootListCardID
	if effectiveRootListCardID == uuid.Nil {
		effectiveRootListCardID = req.MovedListCardID
	}

	userEvents := make([]ws.UserEvent, 0, len(userTargets)*2)
	for _, userTarget := range userTargets {
		if userTarget.UserID == uuid.Nil {
			continue
		}
		if len(userTarget.AffectedInboxCardIDs) > 0 || len(userTarget.InvalidatedListCardIDs) > 0 {
			userEvents = append(userEvents, ws.UserEvent{
				Type:            string(ws.EventInboxCardsInvalidated),
				RecipientUserID: userTarget.UserID,
				WorkspaceID:     req.WorkspaceID,
				Payload: ws.UserEventPayload{
					InboxCardsInvalidatedPayload: &ws.InboxCardsInvalidatedPayload{
						AffectedInboxCardIDs:   userTarget.AffectedInboxCardIDs,
						InvalidatedListCardIDs: userTarget.InvalidatedListCardIDs,
					},
				},
				TS:            req.OccurredAt,
				ActorUserID:   req.ActorUserID,
				CorrelationID: req.CorrelationID,
			})
		}

		payload := ws.InboxRootCardMovedPayload{
			RootListCardID:       effectiveRootListCardID,
			CardID:               req.CardID,
			SourceBoardID:        req.SourceBoardID,
			TargetBoardID:        req.TargetBoardID,
			SourceListID:         req.SourceListID,
			TargetListID:         req.TargetListID,
			AffectedInboxCardIDs: userTarget.AffectedInboxCardIDs,
			ExternalRootsByID:    externalRootsByID,
		}

		userEvents = append(userEvents, ws.UserEvent{
			Type:            string(ws.EventInboxRootCardMoved),
			RecipientUserID: userTarget.UserID,
			WorkspaceID:     req.WorkspaceID,
			Payload: ws.UserEventPayload{
				InboxRootCardMovedPayload: &payload,
			},
			TS:            req.OccurredAt,
			ActorUserID:   req.ActorUserID,
			CorrelationID: req.CorrelationID,
		})
	}
	s.emitUserEvents(userEvents)
	return nil

}

func (s *EventRegistryService) ResolveBoardIDsForMirroredLists(ctx context.Context, listIDs []uuid.UUID) ([]uuid.UUID, error) {

	boardLists, err := s.repo.GetBoardListsByListIds(ctx, listIDs)
	if err != nil {
		return nil, err
	}

	boardIDs := make(map[uuid.UUID]struct{})

	for _, boardList := range boardLists {
		if boardList.BoardID != uuid.Nil {
			boardIDs[boardList.BoardID] = struct{}{}
		}
	}

	result := make([]uuid.UUID, 0, len(boardIDs))
	for boardID := range boardIDs {
		result = append(result, boardID)
	}
	return result, nil
}
