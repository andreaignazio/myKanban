package shares

import (
	"GoGORM/internal/dto"
	"GoGORM/internal/rbac"
	"GoGORM/internal/server/httperr"
	"GoGORM/models"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func deletedAtPtr(deletedAt gorm.DeletedAt) *time.Time {
	if deletedAt.Valid {
		return &deletedAt.Time
	}
	return nil
}

type ShareHandler struct {
	ShareService *ShareService
}

func NewShareHandler(shareService *ShareService) *ShareHandler {
	return &ShareHandler{ShareService: shareService}
}

func shareOfferToDTO(shareOffer models.BoardListShareOffer) RespondToListShareOfferRequest {
	decidedByUserID := shareOffer.DecidedByUserID
	decidedAt := shareOffer.DecidedAt

	return RespondToListShareOfferRequest{
		ID:                 shareOffer.ID,
		SourceBoardID:      shareOffer.SourceBoardID,
		TargetBoardID:      shareOffer.TargetBoardID,
		ListID:             shareOffer.ListID,
		Status:             shareOffer.Status,
		ProposedAccessMode: shareOffer.ProposedAccessMode,
		CreatedByUserID:    shareOffer.CreatedByUserID,
		DecidedByUserID:    decidedByUserID,
		DecidedAt:          decidedAt,
		DeletedAt:          deletedAtPtr(shareOffer.DeletedAt),
	}
}

func (h *ShareHandler) CreateListShareOffer(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	sourceBoardIDStr := c.Param("boardID")
	sourceBoardID, err := uuid.Parse(sourceBoardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.CreateListShareOffer")
		return
	}
	listIDStr := c.Param("listID")
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.CreateListShareOffer")
		return
	}

	var req CreateListShareOfferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "shares.handler.CreateListShareOffer")
		return
	}
	shareOffer := ShareOfferDomain{
		UserID:             userID,
		SourceBoardID:      sourceBoardID,
		TargetBoardID:      req.TargetBoardID,
		ListID:             listID,
		ProposedAccessMode: rbac.BoardListAccessMode(req.ProposedAccessMode),
	}
	shareOfferInput, err := h.ShareService.CreateListShareOffer(ctx, shareOffer)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.CreateListShareOffer")
		return
	}

	res := shareOfferToDTO(*shareOfferInput)

	c.JSON(http.StatusCreated, res)

}

func (h *ShareHandler) GetListOffers(c *gin.Context) {

	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	targetBoardIDStr := c.Param("boardID")
	targetBoardID, err := uuid.Parse(targetBoardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.GetListOffers")
		return
	}
	shareOffersInput, err := h.ShareService.GetListShareOffers(ctx, userID, targetBoardID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetListOffers")
		return
	}

	for _, input := range shareOffersInput {
		res := shareOfferToDTO(input)
		c.JSON(http.StatusOK, res)
	}

}

func (h *ShareHandler) RespondToListShareOffer(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	targetBoardIDStr := c.Param("boardID")
	targetBoardID, err := uuid.Parse(targetBoardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.RespondToListShareOffer")
		return
	}
	shareIDStr := c.Param("shareID")
	shareID, err := uuid.Parse(shareIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.RespondToListShareOffer")
		return
	}

	var req ShareOfferResponse
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "shares.handler.RespondToListShareOffer")
		return
	}

	shareOfferRespondDomain := ShareOfferRespondDomain{
		UserID:        userID,
		TargetBoardID: targetBoardID,
		ShareID:       shareID,
		Decision:      req.Decision,
		AccessMode:    req.AccessMode,
	}

	updatedShareOffer, updatedBoardList, err := h.ShareService.RespondToListShareOffer(ctx, shareOfferRespondDomain)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.RespondToListShareOffer")
		return
	}
	if updatedShareOffer == nil {
		c.Status(http.StatusNoContent)
		return
	}

	var res RespondToListShareOfferDTO
	shareOfferRes := shareOfferToDTO(*updatedShareOffer)

	if updatedShareOffer.Status == "accepted" {

		boardListRes := dto.BoardListResponse{
			ID:         updatedBoardList.ID,
			BoardID:    updatedBoardList.BoardID,
			ListID:     updatedBoardList.ListID,
			Position:   updatedBoardList.Pos,
			AccessMode: updatedBoardList.AccessMode,
			CreatedAt:  updatedBoardList.CreatedAt,
			UpdatedAt:  updatedBoardList.UpdatedAt,
			DeletedAt:  deletedAtPtr(updatedBoardList.DeletedAt),
		}

		res = RespondToListShareOfferDTO{
			ShareOfferResponse: &shareOfferRes,
			BoardListResponse:  &boardListRes,
		}
	} else if updatedShareOffer.Status == "rejected" {
		res = RespondToListShareOfferDTO{
			ShareOfferResponse: &shareOfferRes,
			BoardListResponse:  nil,
		}
	}

	c.JSON(http.StatusOK, res)

}

func (h *ShareHandler) RevokeListShareOffer(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	requesterBoardIDStr := c.Param("boardID")
	requesterBoardID, err := uuid.Parse(requesterBoardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.RevokeListShareOffer")
		return
	}
	shareIDStr := c.Param("shareID")
	shareID, err := uuid.Parse(shareIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.RevokeListShareOffer")
		return
	}
	var req ShareOfferRevokeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "shares.handler.RevokeListShareOffer")
		return
	}

	shareOfferRevokeDomain := ShareOfferRevokeDomain{
		RequesterBoardID: requesterBoardID,
		RequesterUserID:  userID,
		ShareID:          shareID,
		Reason:           req.Reason,
	}

	updatedShareOffer, err := h.ShareService.RevokeListShareOffer(ctx, shareOfferRevokeDomain)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.RevokeListShareOffer")
		return
	}
	if updatedShareOffer == nil {
		c.Status(http.StatusNoContent)
		return
	}
	res := shareOfferToDTO(*updatedShareOffer)
	c.JSON(http.StatusOK, res)
}

func (h *ShareHandler) CreateBoardShareOffer(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	sourceBoardIDStr := c.Param("boardID")
	sourceBoardID, err := uuid.Parse(sourceBoardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.CreateBoardShareOffer")
		return
	}
	var req CreateShareOfferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "shares.handler.CreateBoardShareOffer")
		return
	}
	shareOffer, err := h.ShareService.CreateBoardShareOffer(ctx, userID, sourceBoardID, correlationID, req)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.CreateBoardShareOffer")
		return
	}
	res := dto.ShareOffersToResponses(shareOffer)

	c.JSON(http.StatusCreated, res)

}

func (h *ShareHandler) CreateBoardAccessRequest(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.CreateBoardAccessRequest")
		return
	}
	var req CreateBoardAccessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "shares.handler.CreateBoardAccessRequest")
		return
	}
	shareOffer, err := h.ShareService.CreateBoardAccessRequest(ctx, userID, boardID, req, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.CreateBoardAccessRequest")
		return
	}
	res := dto.ShareOfferToResponse(shareOffer)
	c.JSON(http.StatusCreated, res)
}

func (h *ShareHandler) CreateWorkspaceAccessRequest(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	workspaceIDStr := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.CreateWorkspaceAccessRequest")
		return
	}
	var req CreateWorkspaceAccessRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "shares.handler.CreateWorkspaceAccessRequest")
		return
	}
	shareOffer, err := h.ShareService.CreateWorkspaceAccessRequest(ctx, userID, workspaceID, req, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.CreateWorkspaceAccessRequest")
		return
	}
	res := dto.ShareOfferToResponse(shareOffer)
	c.JSON(http.StatusCreated, res)
}

func (h *ShareHandler) GetBoardRequestsIncoming(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.GetBoardRequestsIncoming")
		return
	}
	shareOffers, err := h.ShareService.GetBoardRequestsIncomingByBoard(ctx, userID, boardID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetBoardRequestsIncoming")
		return
	}
	res := dto.ShareOffersToResponses(shareOffers)
	c.JSON(http.StatusOK, res)
}

func (h *ShareHandler) GetBoardRequestsIncomingWithUsers(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	boardIDStr := c.Param("boardID")
	boardID, err := uuid.Parse(boardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.GetBoardRequestsIncomingWithUsers")
		return
	}
	shareOffers, err := h.ShareService.GetBoardRequestsIncomingByBoardWithUsers(ctx, userID, boardID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetBoardRequestsIncomingWithUsers")
		return
	}
	c.JSON(http.StatusOK, shareOffers)
}

func (h *ShareHandler) GetBoardInvitesOutgoing(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	sourceBoardIDStr := c.Param("boardID")
	sourceBoardID, err := uuid.Parse(sourceBoardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.GetBoardInvitesOutgoing")
		return
	}
	shareOffers, err := h.ShareService.GetBoardInvitesOutgoingByBoard(ctx, userID, sourceBoardID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetBoardInvitesOutgoing")
		return
	}
	res := dto.ShareOffersToResponses(shareOffers)

	c.JSON(http.StatusOK, res)

}

func (h *ShareHandler) GetBoardInvitesOutgoingWithUsers(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	sourceBoardIDStr := c.Param("boardID")
	sourceBoardID, err := uuid.Parse(sourceBoardIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.GetBoardInvitesOutgoingWithUsers")
		return
	}
	shareOffers, err := h.ShareService.GetBoardInvitesOutgoingByBoardWithUsers(ctx, userID, sourceBoardID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetBoardInvitesOutgoingWithUsers")
		return
	}

	c.JSON(http.StatusOK, shareOffers)

}

func (h *ShareHandler) CreateWorkspaceShareOffer(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	sourceWorkspaceIDStr := c.Param("workspaceID")
	sourceWorkspaceID, err := uuid.Parse(sourceWorkspaceIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.CreateWorkspaceShareOffer")
		return
	}
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	var req CreateShareOfferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "shares.handler.CreateWorkspaceShareOffer")
		fmt.Println("Error binding JSON:", err)
		return
	}
	shareOffers, err := h.ShareService.CreateWorkspaceShareOffer(ctx, userID, sourceWorkspaceID, correlationID, req)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.CreateWorkspaceShareOffer")
		fmt.Println("Error creating workspace share offer:", err)
		return
	}
	res := dto.ShareOffersToResponses(shareOffers)

	c.JSON(http.StatusCreated, res)
}

func (h *ShareHandler) GetWorkspaceOutgoingShareOffers(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	sourceWorkspaceIDStr := c.Param("workspaceID")
	sourceWorkspaceID, err := uuid.Parse(sourceWorkspaceIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.GetWorkspaceOutgoingShareOffers")
		return
	}
	shareOffers, err := h.ShareService.GetWorkspaceOutgoingShareOffers(ctx, userID, sourceWorkspaceID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetWorkspaceOutgoingShareOffers")
		return
	}
	//fmt.Println("Fetched workspace outgoing share offers:", shareOffers)

	c.JSON(http.StatusOK, shareOffers)

}

func (h *ShareHandler) GetWorkspaceRequestsIncomingWithUsers(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceIDStr := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.GetWorkspaceRequestsIncomingWithUsers")
		return
	}
	shareOffers, err := h.ShareService.GetWorkspaceRequestsIncomingByWorkspaceWithUsers(ctx, userID, workspaceID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetWorkspaceRequestsIncomingWithUsers")
		return
	}

	c.JSON(http.StatusOK, shareOffers)
}

func (h *ShareHandler) GetUserIncomingShareOffers(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	shareOffers, err := h.ShareService.GetUserIncomingShareOffers(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetUserShareOffers")
		return
	}
	res := dto.ShareOffersToResponses(shareOffers)

	c.JSON(http.StatusOK, res)

}

func (h *ShareHandler) GetUserOutgoingShareOffers(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	shareOffers, err := h.ShareService.GetUserOutgoingShareOffers(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetUserOutgoingShareOffers")
		return
	}
	res := dto.ShareOffersToResponses(shareOffers)

	c.JSON(http.StatusOK, res)

}

func (h *ShareHandler) GetShareOfferDetails(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	shareIDStr := c.Param("shareID")
	shareID, err := uuid.Parse(shareIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.GetShareOfferDetails")
		return
	}

	res, err := h.ShareService.GetShareOfferDetailsByID(ctx, userID, shareID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetShareOfferDetails")
		return
	}

	c.JSON(http.StatusOK, res)
}

func (h *ShareHandler) RespondToShareOffer(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	shareIDStr := c.Param("shareID")
	shareID, err := uuid.Parse(shareIDStr)
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.RespondToShareOffer")
		return
	}
	var req RespondToShareOfferRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "shares.handler.RespondToShareOffer")
		return
	}
	shareOffer, userBoard, userWorkspace, err := h.ShareService.RespondToShareOffer(ctx, userID, shareID, req, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.RespondToShareOffer")
		return
	}
	if shareOffer == nil {
		c.Status(http.StatusNoContent)
		return
	}
	//res := dto.ShareOfferToResponse(shareOffer)
	var ubResponse *dto.UserBoardResponse
	var ukResponse *dto.UserWorkspaceResponse
	if userBoard != nil {
		ub := dto.UserBoardToResponse(userBoard)
		ubResponse = &ub
	}
	if userWorkspace != nil {
		uw := dto.UserWorkspaceToResponse(userWorkspace)
		ukResponse = &uw
	}
	res := dto.RespondToShareOfferResponse{
		ShareOffer: dto.ShareOfferToResponse(shareOffer),
		// Depending on the TargetType and OfferedRole, one of these might be populated
		UserBoard:     ubResponse,
		UserWorkspace: ukResponse,
	}

	c.JSON(http.StatusOK, res)

}

func (h *ShareHandler) RevokeShareOffer(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	shareIDStr := c.Param("shareID")
	shareID, err := uuid.Parse(shareIDStr)
	correlationID := c.MustGet("correlationID").(uuid.UUID)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.RevokeShareOffer")
		fmt.Println("error1:", err)
		return
	}
	var req ShareOfferRevokeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httperr.WriteBindingError(c, err, "shares.handler.RevokeShareOffer")
		fmt.Println("error2:", err)
		return
	}
	shareOffer, err := h.ShareService.RevokeShareOffer(ctx, userID, shareID, req, correlationID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.RevokeShareOffer")
		fmt.Println("error3:", err)
		return
	}
	res := dto.ShareOfferToResponse(shareOffer)

	c.JSON(http.StatusOK, res)

}

func (h *ShareHandler) GetUserIncomingShareOffersDetails(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)

	shareOfferDetails, err := h.ShareService.GetUserIncomingShareOffersDetails(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetUserIncomingShareOffersDetails")
		return
	}

	res := UserIncomingShareOffersDetails{
		DetailedShareOffers: shareOfferDetails,
	}

	c.JSON(http.StatusOK, res)

}

func (h *ShareHandler) GetUserBoardRequestsOutgoing(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	shareOffers, err := h.ShareService.GetUserBoardRequestsOutgoing(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetUserBoardRequestsOutgoing")
		return
	}

	c.JSON(http.StatusOK, shareOffers)

}

func (h *ShareHandler) GetUserBoardInvitesIncoming(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	shareOffers, err := h.ShareService.GetUserBoardInvitesIncoming(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetUserBoardInvitesIncoming")
		return
	}
	c.JSON(http.StatusOK, shareOffers)

}

func (h *ShareHandler) GetUserWorkspaceRequestsOutgoing(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	shareOffers, err := h.ShareService.GetUserWorkspaceRequestsOutgoing(ctx, userID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetUserWorkspaceRequestsOutgoing")
		return
	}
	c.JSON(http.StatusOK, shareOffers)
}

func (h *ShareHandler) GetPendingOfferTargetBoardsByWorkspaceForUser(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceIDStr := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.GetPendingOfferTargetBoardsByWorkspaceForUser")
		return
	}

	response, err := h.ShareService.GetPendingOfferTargetBoardsByWorkspaceForUser(ctx, userID, workspaceID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetPendingOfferTargetBoardsByWorkspaceForUser")
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *ShareHandler) GetPendingBoardAccessRequestCountsByWorkspaceForAdminOwner(c *gin.Context) {
	ctx := c.Request.Context()
	userID := c.MustGet("userID").(uuid.UUID)
	workspaceIDStr := c.Param("workspaceID")
	workspaceID, err := uuid.Parse(workspaceIDStr)
	if err != nil {
		httperr.WriteParamsError(c, err, "shares.handler.GetPendingBoardAccessRequestCountsByWorkspaceForAdminOwner")
		return
	}

	response, err := h.ShareService.GetBoardRequestsByWorkspaceForAdminOwner(ctx, userID, workspaceID)
	if err != nil {
		httperr.WriteOp(c, err, "shares.handler.GetPendingBoardAccessRequestCountsByWorkspaceForAdminOwner")
		return
	}

	c.JSON(http.StatusOK, response)
}
