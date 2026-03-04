package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type BoardListCardArchiveHandlerMode string

const (
	BoardListCardArchiveHandlerModeDetatched BoardListCardArchiveHandlerMode = "detatched"
	BoardListCardArchiveHandlerModeRestored  BoardListCardArchiveHandlerMode = "restored"
	BoardListCardArchiveHandlerModePurged    BoardListCardArchiveHandlerMode = "purged"
)

type BoardListCardArchiveHandler struct {
	auditRepo auditcontext.Reader
	mode      BoardListCardArchiveHandlerMode
}

func NewBoardListCardRestoredHandler(auditRepo auditcontext.Reader) *BoardListCardArchiveHandler {
	return &BoardListCardArchiveHandler{auditRepo: auditRepo, mode: BoardListCardArchiveHandlerModeRestored}
}

func NewBoardListCardDetatchedHandler(auditRepo auditcontext.Reader) *BoardListCardArchiveHandler {
	return &BoardListCardArchiveHandler{auditRepo: auditRepo, mode: BoardListCardArchiveHandlerModeDetatched}
}

func NewBoardListCardPurgedHandler(auditRepo auditcontext.Reader) *BoardListCardArchiveHandler {
	return &BoardListCardArchiveHandler{auditRepo: auditRepo, mode: BoardListCardArchiveHandlerModePurged}
}

func (h *BoardListCardArchiveHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.BoardID == nil || evt.ActorUserID == nil || evt.WorkspaceID == nil {
		return EventBuildResult{}, fmt.Errorf("board.listcard.archive: missing boardID/actorUserID/workspaceID")
	}

	statePayload := evt.Payload.StatePayload
	if statePayload == nil || len(statePayload.ListCardRelations) == 0 {
		return EventBuildResult{}, fmt.Errorf("board.listcard.archive: invalid state payload")
	}

	rel := statePayload.ListCardRelations[0]

	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	boardMeta, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	cardMeta, err := h.auditRepo.GetCardMeta(ctx, rel.CardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	listMeta, err := h.auditRepo.GetListMeta(ctx, rel.ListID)
	if err != nil {
		return EventBuildResult{}, err
	}

	if statePayload.Cards == nil {
		statePayload.Cards = make(map[uuid.UUID]dto.CardResponse)
	}
	if statePayload.Lists == nil {
		statePayload.Lists = make(map[uuid.UUID]dto.ListResponse)
	}
	statePayload.Cards[rel.CardID] = dto.CardToResponse(cardMeta)
	statePayload.Lists[rel.ListID] = dto.ListToResponse(listMeta)

	templateKey := AuditTemplateBoardListCardRestored
	verb := "ha ripristinato la card"
	if h.mode == BoardListCardArchiveHandlerModeDetatched {
		templateKey = AuditTemplateBoardListCardDetatched
		verb = "ha archiviato la card"
	}
	if h.mode == BoardListCardArchiveHandlerModePurged {
		templateKey = AuditTemplateBoardListCardPurged
		verb = "ha eliminato definitivamente la card"
	}

	feed := AuditRenderPayload{
		TemplateKey: templateKey,
		Actor:       *actor,
		Params: map[string]interface{}{
			"boardName": boardMeta.Name,
			"cardTitle": cardMeta.Title,
			"listTitle": listMeta.Title,
			"verb":      verb,
		},
		Links: map[string]AuditEntityLink{
			"board": {
				EntityType:  "board",
				EntityID:    *evt.BoardID,
				BoardID:     evt.BoardID,
				WorkspaceID: evt.WorkspaceID,
			},
			"card": {
				EntityType:  "card",
				EntityID:    rel.CardID,
				BoardID:     evt.BoardID,
				WorkspaceID: evt.WorkspaceID,
			},
			"list": {
				EntityType:  "list",
				EntityID:    rel.ListID,
				BoardID:     evt.BoardID,
				WorkspaceID: evt.WorkspaceID,
			},
		},
	}

	targets := []TargetRef{
		{EntityType: "card", EntityID: rel.CardID, BoardID: evt.BoardID},
		{EntityType: "list", EntityID: rel.ListID, BoardID: evt.BoardID},
	}

	return EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      targets,
		MainEntity: MainEntityRef{
			EntityType: "card",
			EntityID:   rel.CardID,
		},
	}, nil
}
