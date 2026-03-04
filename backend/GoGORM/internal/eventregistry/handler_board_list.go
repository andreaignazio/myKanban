package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type BoardListHndlerMode string

const (
	BoardListHandlerModeCreated  BoardListHndlerMode = "created"
	BoardListHandlerModeDetached BoardListHndlerMode = "detached"
	BoardListHandlerModeRestored BoardListHndlerMode = "restored"
	BoardListHandlerModePurged   BoardListHndlerMode = "purged"
	BoardListHandlerModeMoved    BoardListHndlerMode = "moved"
	BoardListHandlerModePatched  BoardListHndlerMode = "patched"
)

type BoardListHandler struct {
	auditRepo auditcontext.Reader
	mode      BoardListHndlerMode
}

func NewBoardListCreatedHandler(auditRepo auditcontext.Reader) *BoardListHandler {
	return &BoardListHandler{auditRepo: auditRepo, mode: BoardListHandlerModeCreated}
}

func NewBoardListDetachedHandler(auditRepo auditcontext.Reader) *BoardListHandler {
	return &BoardListHandler{auditRepo: auditRepo, mode: BoardListHandlerModeDetached}
}

func NewBoardListMovedHandler(auditRepo auditcontext.Reader) *BoardListHandler {
	return &BoardListHandler{auditRepo: auditRepo, mode: BoardListHandlerModeMoved}
}

func NewBoardListPatchedHandler(auditRepo auditcontext.Reader) *BoardListHandler {
	return &BoardListHandler{auditRepo: auditRepo, mode: BoardListHandlerModePatched}
}

func NewBoardListRestoredHandler(auditRepo auditcontext.Reader) *BoardListHandler {
	return &BoardListHandler{auditRepo: auditRepo, mode: BoardListHandlerModeRestored}
}

func NewBoardListPurgedHandler(auditRepo auditcontext.Reader) *BoardListHandler {
	return &BoardListHandler{auditRepo: auditRepo, mode: BoardListHandlerModePurged}
}

func (h *BoardListHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {

	statePayload := evt.Payload.StatePayload
	if statePayload == nil || statePayload.BoardListRelations == nil {
		return EventBuildResult{}, fmt.Errorf("board.list.created: invalid state payload type")
	}

	actor, err := h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, *evt.BoardID)
	if err != nil {
		return EventBuildResult{}, err
	}

	listID := evt.Targets[1].EntityID

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
	boardListsIds := make([]uuid.UUID, 0, len(boardLists))
	for _, bl := range boardLists {
		boardListsIds = append(boardListsIds, bl.ID)
	}

	boardLink := AuditEntityLink{
		EntityType:  "board",
		EntityID:    *evt.BoardID,
		BoardID:     evt.BoardID,
		WorkspaceID: evt.WorkspaceID,
	}

	listLink := AuditEntityLink{
		EntityType:  "list",
		EntityID:    listID,
		BoardID:     evt.BoardID,
		WorkspaceID: evt.WorkspaceID,
	}

	if _, ok := statePayload.Lists[listID]; !ok {
		statePayload.Lists = make(map[uuid.UUID]dto.ListResponse)
	}
	if _, ok := statePayload.Boards[*evt.BoardID]; !ok {
		statePayload.Boards = make(map[uuid.UUID]dto.BoardResponse)
	}
	if _, ok := statePayload.BoardListIdsByBoardID[*evt.BoardID]; !ok {
		statePayload.BoardListIdsByBoardID = make(map[uuid.UUID][]uuid.UUID)
	}
	statePayload.Lists[listID] = dto.ListToResponse(listMeta)
	statePayload.Board = dto.BoardToResponse(boardMeta)
	statePayload.Boards[*evt.BoardID] = dto.BoardToResponse(boardMeta)
	statePayload.BoardListIdsByBoardID[*evt.BoardID] = boardListsIds

	links := make(map[string]AuditEntityLink)
	links["board"] = boardLink
	links["list"] = listLink

	params := make(map[string]interface{})
	params["listTitle"] = statePayload.Lists[listID].Title
	params["boardName"] = boardMeta.Name

	var TemplateKey AuditTemplateKey
	switch h.mode {
	case BoardListHandlerModeCreated:
		TemplateKey = AuditTemplateBoardListCreated
	case BoardListHandlerModeDetached:
		TemplateKey = AuditTemplateBoardListDetached
	case BoardListHandlerModeMoved:
		TemplateKey = AuditTemplateBoardListMoved
	case BoardListHandlerModePatched:
		TemplateKey = AuditTemplateBoardListPatched
	case BoardListHandlerModeRestored:
		TemplateKey = AuditTemplateBoardListRestored
	case BoardListHandlerModePurged:
		TemplateKey = AuditTemplateBoardListPurged
	}

	feed := AuditRenderPayload{
		TemplateKey: TemplateKey,
		Actor:       *actor,
		Params:      params,
		Links:       links,
	}

	result := EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      evt.Targets,
		MainEntity: MainEntityRef{
			EntityType: "board",
			EntityID:   *evt.BoardID,
		},
	}

	return result, nil
}
