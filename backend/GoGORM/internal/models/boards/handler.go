package boards

import (
	EventRegistry "GoGORM/internal/eventregistry"
	//"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	"GoGORM/internal/server/httperr"
	"errors"
	"sort"
	"strings"
	"time"

	//"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type BoardsHandler struct {
	svc           *BoardsService
	eventRegistry *EventRegistry.EventRegistryService
}

func NewBoardsHandler(boardsService *BoardsService, eventRegistry *EventRegistry.EventRegistryService) *BoardsHandler {
	return &BoardsHandler{svc: boardsService, eventRegistry: eventRegistry}
}

func getIdFromHeader(c *gin.Context) (uuid.UUID, error) {
	sid := c.GetHeader("x-userID")
	if sid == "" {
		return uuid.Nil, errors.New("Header not valid")
	}
	id, err := uuid.Parse(sid)
	if err != nil {
		return uuid.Nil, err
	}
	return id, nil
}

func (h *BoardsHandler) CreateBoard(c *gin.Context) {

	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	var req CreateBoardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "boards.handler.CreateBoard")
		return
	}

	board, userBoard, err := h.svc.CreteBoardWithOwner(ctx, userID, req)
	if err != nil {
		httperr.WriteOp(c, err, "boards.handler.CreateBoard")
		return
	}

	res := BoardForUserResponse{
		BoardResponse: dto.BoardToResponse(board),
		UserBoardResponse: dto.UserBoardResponse{
			UserID:    userBoard.UserID,
			BoardID:   userBoard.BoardID,
			Role:      userBoard.Role,
			CreatedAt: userBoard.CreatedAt,
			UpdatedAt: userBoard.UpdatedAt,
			Position:  userBoard.Pos,
			Props:     dto.UserBoardToResponse(userBoard).Props,
			DeletedAt: deletedAtPtr(userBoard.DeletedAt),
		},
	}

	c.JSON(http.StatusCreated, res)
}

func (h *BoardsHandler) GetUserBoard(c *gin.Context) {

	ctx := c.Request.Context()

	userID := c.MustGet("userID").(uuid.UUID)

	id := c.Param("boardID")
	boardID, err := uuid.Parse(id)
	if err != nil {
		httperr.WriteParamsError(c, err, "boards.handler.GetBoard")
		return
	}
	userBoardRow, boardListRows, cardsByListID, err := h.svc.GetUserBoardDetail(ctx, userID, boardID)
	if err != nil {
		httperr.WriteOp(c, err, "boards.handler.GetBoard")
		return
	}

	//fmt.Println(boardListRows)
	response := MapUserBoardDetailResponse(userBoardRow, boardListRows, cardsByListID)

	c.JSON(http.StatusOK, response)

}

func (h *BoardsHandler) GetUserBoards(c *gin.Context) {

	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	userBoards, err := h.svc.GetUserBoards(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "boards.handler.GetUserBoards")
		return
	}
	userBoardsResponse := make([]BoardForUserResponse, 0, len(userBoards))
	for _, userBoard := range userBoards {
		res := BoardForUserResponse{
			BoardResponse: dto.BoardToResponse(&userBoard.Board),
			UserBoardResponse: dto.UserBoardResponse{
				UserID:    userBoard.UserBoard.UserID,
				BoardID:   userBoard.UserBoard.BoardID,
				Role:      userBoard.UserBoard.Role,
				Position:  userBoard.UserBoard.Pos,
				Props:     dto.UserBoardToResponse(&userBoard.UserBoard).Props,
				CreatedAt: userBoard.UserBoard.CreatedAt,
				UpdatedAt: userBoard.UserBoard.UpdatedAt,
				DeletedAt: deletedAtPtr(userBoard.UserBoard.DeletedAt),
			},
		}
		userBoardsResponse = append(userBoardsResponse, res)
	}

	c.JSON(http.StatusOK, userBoardsResponse)
}

func (h *BoardsHandler) PatchBoard(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	ctx := c.Request.Context()
	id := c.Param("boardID")
	boardID, err := uuid.Parse(id)
	if err != nil {
		httperr.WriteParamsError(c, err, "boards.handler.PatchBoard")
		return
	}

	var payload PatchBoardReqest

	if err := c.ShouldBindJSON(&payload); err != nil {
		httperr.WriteBindingError(c, err, "boards.handler.PatchBoard")
		return
	}

	board, err := h.svc.PatchBoard(ctx, userID, boardID, payload)
	if err != nil {
		httperr.WriteOp(c, err, "boards.handler.PatchBoard")
		return
	}

	response := dto.BoardToResponse(board)

	changedFields := collectBoardChangedFields(payload)
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	workspaceID := board.WorkspaceID

	statePayload := dto.BoardDetailResponse{
		Board: response,
	}
	domainPayload := EventRegistry.EventPayloadEnvelope{
		StatePayload:    &statePayload,
		RealtimePayload: dto.BoardPatchedEventPayload{ChangedFields: changedFields},
	}
	targets := []EventRegistry.TargetRef{
		{
			EntityType:  "board",
			EntityID:    boardID,
			BoardID:     &boardID,
			WorkspaceID: &workspaceID,
		},
	}
	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardPatched,
		WorkspaceID:   &workspaceID,
		BoardID:       &boardID,
		ActorUserID:   &userID,
		CorrelationID: &correlationID,
		Payload:       domainPayload,
		OccurredAt:    time.Now(),
		Targets:       targets,
	}
	if h.eventRegistry != nil && h.svc != nil {
		h.eventRegistry.Emit(ctx, h.svc.db, domainEvent)
	}

	c.JSON(http.StatusOK, response)

}

func (h *BoardsHandler) PatchMyUserBoardProps(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	ctx := c.Request.Context()
	id := c.Param("boardID")
	boardID, err := uuid.Parse(id)
	if err != nil {
		httperr.WriteParamsError(c, err, "boards.handler.PatchMyUserBoardProps")
		return
	}

	var req PatchMyUserBoardPropsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "boards.handler.PatchMyUserBoardProps")
		return
	}

	updated, err := h.svc.PatchMyUserBoardProps(ctx, userID, boardID, req)
	if err != nil {
		httperr.WriteOp(c, err, "boards.handler.PatchMyUserBoardProps")
		return
	}

	response := dto.UserBoardToResponse(updated)
	c.JSON(http.StatusOK, response)
}

func collectBoardChangedFields(payload PatchBoardReqest) []string {
	fieldSet := map[string]struct{}{}

	if payload.Name != nil {
		fieldSet["name"] = struct{}{}
	}
	if payload.Visibility != nil {
		fieldSet["visibility"] = struct{}{}
	}
	if payload.Props != nil {
		for key := range payload.Props {
			normalized := strings.ToLower(strings.TrimSpace(key))
			switch normalized {
			case "description":
				fieldSet["description"] = struct{}{}
			case "background":
				fieldSet["background"] = struct{}{}
			default:
				if normalized != "" {
					fieldSet["props."+normalized] = struct{}{}
				}
			}
		}
	}

	fields := make([]string, 0, len(fieldSet))
	for field := range fieldSet {
		fields = append(fields, field)
	}
	sort.Strings(fields)
	if len(fields) == 0 {
		return []string{"board settings"}
	}
	return fields
}

func (h *BoardsHandler) DeleteBoard(c *gin.Context) {
	userID := c.MustGet("userID").(uuid.UUID)
	ctx := c.Request.Context()
	id := c.Param("boardID")
	boardID, err := uuid.Parse(id)
	if err != nil {
		httperr.WriteParamsError(c, err, "boards.handler.DeleteBoard")
		return
	}
	err = h.svc.DeleteBoard(ctx, userID, boardID)
	if err != nil {
		httperr.WriteOp(c, err, "boards.handler.DeleteBoard")
		return
	}

	c.JSON(http.StatusNoContent, gin.H{"message": "board deleted"})

}
