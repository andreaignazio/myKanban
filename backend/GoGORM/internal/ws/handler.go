package ws

import (
	"GoGORM/internal/server/httperr"
	"GoGORM/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type WsHandler struct {
	Hub       *Hub
	WsService *WsService
}

func NewWsHandler(hub *Hub, wsService *WsService) *WsHandler {

	return &WsHandler{
		Hub:       hub,
		WsService: wsService,
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func (h *WsHandler) ServeWs(c *gin.Context) {

	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	workspaceIDParam := c.Query("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDParam)
	if err != nil {
		httperr.WriteParamsError(c, err, "ws.handler.ServeWs")
		return
	}
	if err := h.WsService.CanViewWorkspace(ctx, userID, workspaceID); err != nil {
		httperr.WriteOp(c, err, "ws.handler.ServeWs")
		return
	}

	var boardID uuid.UUID
	boardIDParam := c.Query("boardID")
	if boardIDParam != "" {
		parsedBoardID, err := uuid.Parse(boardIDParam)
		if err != nil {
			httperr.WriteParamsError(c, err, "ws.handler.ServeWs")
			return
		}
		if err := h.WsService.CanViewBoard(ctx, userID, parsedBoardID); err != nil {
			httperr.WriteOp(c, err, "ws.handler.ServeWs")
			return
		}
		boardID = parsedBoardID
	}
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		httperr.WriteOp(c, err, "ws.handler.updgradeConnectionError")
		return
	}

	var userLite *models.UserLite
	if boardID != uuid.Nil {
		userLite, err = h.WsService.GetUserLiteWithBoardRoleByID(ctx, userID, workspaceID, boardID)
		if err != nil {
			httperr.WriteOp(c, err, "ws.handler.GetUserLiteWithBoardRoleByID")
			return
		}
	} else {
		userLite, err = h.WsService.GetUserLiteWithWorkspaceRoleByID(ctx, userID, workspaceID)
		if err != nil {
			httperr.WriteOp(c, err, "ws.handler.GetUserLiteWithWorkspaceRoleByID")
			return
		}
	}

	client := &Client{
		hub:         h.Hub,
		conn:        conn,
		send:        make(chan []byte, 256),
		userID:      userID,
		boardID:     boardID,
		workspaceID: workspaceID,
		userLite:    userLite,
	}

	h.Hub.register <- client

	//go routines wrtie/read pump
	go client.ReadPump()
	go client.WritePump()

}
