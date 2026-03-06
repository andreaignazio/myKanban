package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"context"
	"fmt"

	"github.com/google/uuid"
)

// BoardListDetatchedHandler handles EventBoardListDetatched.
// It derives the primary list ID from StatePayload.BoardListRelations instead of
// Targets[1], because DetatchList may detach a root + all its mirrors at once and
// only populates board-typed targets.  MoveList also works here since it populates
// BoardListRelations with the detached entry.
type BoardListDetatchedHandler struct {
	auditRepo auditcontext.Reader
}

func NewBoardListDetatchedHandler(auditRepo auditcontext.Reader) *BoardListDetatchedHandler {
	return &BoardListDetatchedHandler{auditRepo: auditRepo}
}

func (h *BoardListDetatchedHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	statePayload := evt.Payload.StatePayload
	if statePayload == nil || len(statePayload.BoardListRelations) == 0 {
		return EventBuildResult{}, fmt.Errorf("board.list.detatched: missing BoardListRelations in state payload")
	}

	// Prefer the relation belonging to evt.BoardID (the board the user acted on).
	var listID uuid.UUID
	for _, bl := range statePayload.BoardListRelations {
		if bl.BoardID == *evt.BoardID {
			listID = bl.ListID
			break
		}
	}
	if listID == uuid.Nil {
		listID = statePayload.BoardListRelations[0].ListID
	}

	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	boardMeta, err := h.auditRepo.GetBoardMeta(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	listMeta, err := h.auditRepo.GetListMeta(ctx, listID)
	if err != nil {
		return EventBuildResult{}, err
	}

	boardLists, err := h.auditRepo.GetBoardListsByBoardID(ctx, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}
	boardListIDs := make([]uuid.UUID, 0, len(boardLists))
	for _, bl := range boardLists {
		boardListIDs = append(boardListIDs, bl.ID)
	}

	if statePayload.Lists == nil {
		statePayload.Lists = make(map[uuid.UUID]dto.ListResponse)
	}
	if statePayload.Boards == nil {
		statePayload.Boards = make(map[uuid.UUID]dto.BoardResponse)
	}
	if statePayload.BoardListIdsByBoardID == nil {
		statePayload.BoardListIdsByBoardID = make(map[uuid.UUID][]uuid.UUID)
	}
	statePayload.Lists[listID] = dto.ListToResponse(listMeta)
	statePayload.Board = dto.BoardToResponse(boardMeta)
	statePayload.Boards[*evt.BoardID] = dto.BoardToResponse(boardMeta)
	statePayload.BoardListIdsByBoardID[*evt.BoardID] = boardListIDs

	links := map[string]AuditEntityLink{
		"board": {
			EntityType:  "board",
			EntityID:    *evt.BoardID,
			BoardID:     evt.BoardID,
			WorkspaceID: evt.WorkspaceID,
		},
		"list": {
			EntityType:  "list",
			EntityID:    listID,
			BoardID:     evt.BoardID,
			WorkspaceID: evt.WorkspaceID,
		},
	}

	feed := AuditRenderPayload{
		TemplateKey: AuditTemplateBoardListDetached,
		Actor:       *actor,
		Params: map[string]interface{}{
			"listTitle": listMeta.Title,
			"boardName": boardMeta.Name,
		},
		Links: links,
	}

	return EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      evt.Targets,
		MainEntity: MainEntityRef{
			EntityType: "board",
			EntityID:   *evt.BoardID,
		},
	}, nil
}
