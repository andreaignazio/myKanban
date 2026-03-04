package EventRegistry

import (
	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/dto"
	"GoGORM/internal/rbac"
	"GoGORM/internal/ws"
	"GoGORM/models"
	"context"
	"fmt"

	"github.com/google/uuid"
)

type ShareOfferHandlerMode string

const (
	WorkspaceShareOfferCreatedHandlerMode        ShareOfferHandlerMode = "workspace_shareoffer_created"
	WorkspaceShareOfferInviteAcceptedHandlerMode ShareOfferHandlerMode = "workspace_shareoffer_invite_accepted"
	WorkspaceShareOfferInviteRejectedHandlerMode ShareOfferHandlerMode = "workspace_shareoffer_invite_rejected"
	WorkspaceShareOfferInviteRevokedHandlerMode  ShareOfferHandlerMode = "workspace_shareoffer_invite_revoked"
	WorkspaceShareRequestAcceptedHandlerMode     ShareOfferHandlerMode = "workspace_shareoffer_request_accepted"
	WorkspaceShareRequestRejectedHandlerMode     ShareOfferHandlerMode = "workspace_shareoffer_request_rejected"
	WorkspaceShareRequestRevokedHandlerMode      ShareOfferHandlerMode = "workspace_shareoffer_request_revoked"
	BoardShareInviteCreatedHandlerMode           ShareOfferHandlerMode = "board_shareoffer_invite_created"
	BoardShareInviteAcceptedHandlerMode          ShareOfferHandlerMode = "board_shareoffer_invite_accepted"
	BoardShareInviteRejectedHandlerMode          ShareOfferHandlerMode = "board_shareoffer_invite_rejected"
	BoardShareInviteRevokedHandlerMode           ShareOfferHandlerMode = "board_shareoffer_invite_revoked"
	BoardShareRequestCreatedHandlerMode          ShareOfferHandlerMode = "board_shareoffer_request_created"
	BoardShareRequestAcceptedHandlerMode         ShareOfferHandlerMode = "board_shareoffer_request_accepted"
	BoardShareRequestRejectedHandlerMode         ShareOfferHandlerMode = "board_shareoffer_request_rejected"
	BoardShareRequestRevokedHandlerMode          ShareOfferHandlerMode = "board_shareoffer_request_revoked"
)

type ShareOfferHandler struct {
	auditRepo auditcontext.Reader
	mode      ShareOfferHandlerMode
}

func NewWorkspaceShareOfferCreatedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: WorkspaceShareOfferCreatedHandlerMode}
}

func NewWorkspaceShareOfferInviteAcceptedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: WorkspaceShareOfferInviteAcceptedHandlerMode}
}

func NewWorkspaceShareOfferInviteRejectedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: WorkspaceShareOfferInviteRejectedHandlerMode}
}

func NewWorkspaceShareOfferInviteRevokedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: WorkspaceShareOfferInviteRevokedHandlerMode}
}

func NewWorkspaceShareOfferRequestAcceptedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: WorkspaceShareRequestAcceptedHandlerMode}
}

func NewWorkspaceShareOfferRequestRejectedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: WorkspaceShareRequestRejectedHandlerMode}
}

func NewWorkspaceShareOfferRequestRevokedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: WorkspaceShareRequestRevokedHandlerMode}
}

func NewBoardShareInviteCreatedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: BoardShareInviteCreatedHandlerMode}
}

func NewBoardShareInviteAcceptedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: BoardShareInviteAcceptedHandlerMode}
}

func NewBoardShareInviteRejectedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: BoardShareInviteRejectedHandlerMode}
}

func NewBoardShareInviteRevokedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: BoardShareInviteRevokedHandlerMode}
}

func NewBoardShareRequestCreatedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: BoardShareRequestCreatedHandlerMode}
}

func NewBoardShareRequestAcceptedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: BoardShareRequestAcceptedHandlerMode}
}
func NewBoardShareRequestRejectedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: BoardShareRequestRejectedHandlerMode}
}
func NewBoardShareRequestRevokedHandler(auditRepo auditcontext.Reader) *ShareOfferHandler {
	return &ShareOfferHandler{auditRepo: auditRepo, mode: BoardShareRequestRevokedHandlerMode}
}

func (h *ShareOfferHandler) Build(ctx context.Context, evt DomainEvent) (EventBuildResult, error) {
	if evt.WorkspaceID == nil || evt.ActorUserID == nil {
		return EventBuildResult{}, fmt.Errorf("workspace.shareoffer.created: missing workspaceID/actorUserID")
	}

	statePayload := evt.Payload.StatePayload
	if statePayload == nil || len(statePayload.ShareOffers) == 0 {
		return EventBuildResult{}, fmt.Errorf("workspace.shareoffer.created: invalid state payload")
	}

	firstOffer := statePayload.ShareOffers[0]

	var actor *models.UserLite
	var err error
	switch h.mode {
	case WorkspaceShareOfferCreatedHandlerMode:
		if firstOffer.Kind == string(models.ShareOfferKindRequest) {
			actor, err = h.auditRepo.GetUserLite(ctx, *evt.ActorUserID)
			if err != nil {
				fmt.Println("Error fetching actor user details:", err)
				return EventBuildResult{}, err
			}
		} else {
			actor, err = h.auditRepo.GetUserLiteOnlyWorkspaceRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID)
			if err != nil {
				fmt.Println("Error fetching actor user details:", err)
				return EventBuildResult{}, err
			}
		}
	case WorkspaceShareOfferInviteAcceptedHandlerMode,
		WorkspaceShareRequestAcceptedHandlerMode,
		WorkspaceShareRequestRejectedHandlerMode,
		WorkspaceShareOfferInviteRevokedHandlerMode,
		BoardShareInviteCreatedHandlerMode,
		BoardShareInviteRejectedHandlerMode,
		BoardShareInviteRevokedHandlerMode,
		BoardShareRequestRejectedHandlerMode:
		actor, err = h.auditRepo.GetUserLiteOnlyWorkspaceRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID)
		if err != nil {
			fmt.Println("Error fetching actor user details:", err)
			return EventBuildResult{}, err
		}
	case BoardShareRequestCreatedHandlerMode,
		BoardShareRequestRevokedHandlerMode:
		actor, err = h.auditRepo.GetUserLiteOnlyWorkspaceRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID)
		if err != nil {
			actor, err = h.auditRepo.GetUserLite(ctx, *evt.ActorUserID)
			if err != nil {
				fmt.Println("Error fetching actor user details:", err)
				return EventBuildResult{}, err
			}
		}
	case WorkspaceShareOfferInviteRejectedHandlerMode,
		WorkspaceShareRequestRevokedHandlerMode:
		actor, err = h.auditRepo.GetUserLite(ctx, *evt.ActorUserID)
		if err != nil {
			fmt.Println("Error fetching actor user details:", err)
			return EventBuildResult{}, err
		}
	case BoardShareRequestAcceptedHandlerMode,
		BoardShareInviteAcceptedHandlerMode:
		actor, err = h.auditRepo.GetUserLiteWithBoardRoleByID(ctx, *evt.ActorUserID, *evt.WorkspaceID, statePayload.ShareOffers[0].TargetID)
		if err != nil {
			fmt.Println("Error fetching actor user details:", err)
			return EventBuildResult{}, err
		}
	}

	workspaceData, err := h.auditRepo.GetWorkspaceDetailsByID(ctx, *evt.WorkspaceID)
	if err != nil {
		return EventBuildResult{}, err
	}

	shareOfferDetailResponse := dto.ShareOfferDetailsResponse{
		ShareOffer:             statePayload.ShareOffers[0],
		TargetWorkspaceDetails: *workspaceData,
	}

	userIds := map[uuid.UUID]struct{}{}
	for _, shareOffer := range statePayload.ShareOffers {
		if shareOffer.ToUserID != nil {
			userIds[*shareOffer.ToUserID] = struct{}{}
		}
		userIds[shareOffer.FromUserID] = struct{}{}
	}

	userIdList := make([]uuid.UUID, 0, len(userIds))
	for userID := range userIds {
		userIdList = append(userIdList, userID)
	}

	usersMeta, err := h.auditRepo.GetUsersByIDs(ctx, userIdList)
	if err != nil {
		return EventBuildResult{}, err
	}
	usersMap := make(map[uuid.UUID]dto.UserResponse, len(usersMeta))
	for _, user := range usersMeta {
		userResponse := dto.UserToResponse(user)
		usersMap[user.ID] = userResponse
	}
	statePayload.Users = usersMap

	var targetUserName string
	var targetUserID uuid.UUID
	hasTargetUser := false
	if firstOffer.ToUserID != nil {
		targetUserID = *firstOffer.ToUserID
		hasTargetUser = true
		if targetUserMeta, ok := usersMap[targetUserID]; ok {
			targetUserName = targetUserMeta.Name
		}
	}
	if targetUserName == "" {
		targetUserName = "utente"
	}

	var boardAmdminsUserIds []uuid.UUID
	var targetBoard dto.BoardResponse

	params := map[string]any{
		"workspaceName":  workspaceData.Workspace.Name,
		"targetUserName": targetUserName,
		"offeredRole":    firstOffer.OfferedRole,
		"offersCount":    len(statePayload.ShareOffers),
	}

	links := map[string]AuditEntityLink{
		"workspace": {
			EntityType:  "workspace",
			EntityID:    *evt.WorkspaceID,
			WorkspaceID: evt.WorkspaceID,
		},
		"actor": {
			EntityType:  "user",
			EntityID:    *evt.ActorUserID,
			WorkspaceID: evt.WorkspaceID,
		},
	}

	if h.mode == BoardShareInviteCreatedHandlerMode || h.mode == BoardShareInviteAcceptedHandlerMode || h.mode == BoardShareInviteRejectedHandlerMode || h.mode == BoardShareInviteRevokedHandlerMode || h.mode == BoardShareRequestCreatedHandlerMode || h.mode == BoardShareRequestAcceptedHandlerMode || h.mode == BoardShareRequestRejectedHandlerMode || h.mode == BoardShareRequestRevokedHandlerMode {
		boardMembers, memberErr := h.auditRepo.GetUserBoardsByBoardID(ctx, statePayload.ShareOffers[0].TargetID)
		if memberErr != nil {
			return EventBuildResult{}, memberErr
		}
		for _, member := range boardMembers {
			if member == nil {
				continue
			}
			if member.Role == "admin" || member.Role == "owner" {
				boardAmdminsUserIds = append(boardAmdminsUserIds, member.UserID)
			}
		}

		targetBoardData, err := h.auditRepo.GetBoardMeta(ctx, statePayload.ShareOffers[0].TargetID)
		if err != nil {
			return EventBuildResult{}, err
		}

		targetBoard = dto.BoardToResponse(targetBoardData)
		if statePayload.Boards == nil {
			statePayload.Boards = make(map[uuid.UUID]dto.BoardResponse)
		}
		statePayload.Boards[targetBoard.ID] = targetBoard
		params["boardName"] = targetBoard.Name

		links["board"] = AuditEntityLink{
			EntityType:  "board",
			EntityID:    statePayload.ShareOffers[0].TargetID,
			WorkspaceID: evt.WorkspaceID,
		}

	}

	if hasTargetUser {
		links["target_user"] = AuditEntityLink{
			EntityType:  "user",
			EntityID:    targetUserID,
			WorkspaceID: evt.WorkspaceID,
		}
	}

	var templateKey AuditTemplateKey
	switch h.mode {
	case WorkspaceShareOfferCreatedHandlerMode:
		templateKey = AuditTemplateWorkspaceShareOfferCreated
	case WorkspaceShareOfferInviteAcceptedHandlerMode:
		templateKey = AuditTemplateWorkspaceShareOfferInviteAccepted
	case WorkspaceShareRequestAcceptedHandlerMode:
		templateKey = AuditTemplateWorkspaceShareOfferInviteAccepted
	case WorkspaceShareOfferInviteRejectedHandlerMode:
		templateKey = AuditTemplateWorkspaceShareOfferInviteRejected
	case WorkspaceShareRequestRejectedHandlerMode:
		templateKey = AuditTemplateWorkspaceShareOfferInviteRejected
	case WorkspaceShareOfferInviteRevokedHandlerMode:
		templateKey = AuditTemplateWorkspaceShareOfferInviteRevoked
	case WorkspaceShareRequestRevokedHandlerMode:
		templateKey = AuditTemplateWorkspaceShareOfferInviteRevoked
	case BoardShareInviteCreatedHandlerMode:
		templateKey = AuditTemplateBoardShareRequestCreated
	case BoardShareInviteAcceptedHandlerMode:
		templateKey = AuditTemplateBoardShareRequestAccepted
	case BoardShareInviteRejectedHandlerMode:
		templateKey = AuditTemplateBoardShareRequestRejected
	case BoardShareInviteRevokedHandlerMode:
		templateKey = AuditTemplateBoardShareRequestRejected
	case BoardShareRequestCreatedHandlerMode:
		templateKey = AuditTemplateBoardShareRequestCreated
	case BoardShareRequestAcceptedHandlerMode:
		templateKey = AuditTemplateBoardShareRequestAccepted
	case BoardShareRequestRejectedHandlerMode:
		templateKey = AuditTemplateBoardShareRequestRejected
	case BoardShareRequestRevokedHandlerMode:
		templateKey = AuditTemplateBoardShareRequestRejected
	}

	feed := AuditRenderPayload{
		TemplateKey: templateKey,
		Actor:       *actor,
		Params:      params,
		Links:       links,
	}

	userPayloadMap := make(map[uuid.UUID]ws.UserEventPayload)
	userEventTypeByUserID := make(map[uuid.UUID]ws.UserEventType)

	if h.mode == WorkspaceShareOfferCreatedHandlerMode {
		if firstOffer.Kind == string(models.ShareOfferKindRequest) {
			fmt.Printf("[eventregistry][workspace.request.created][build.start] workspace=%s offer=%s actor=%s correlation=%v\n", evt.WorkspaceID.String(), firstOffer.ID.String(), evt.ActorUserID.String(), evt.CorrelationID)
			payload := ws.WorkspaceShareOfferCreatedPayload{
				ShareOffer: firstOffer,
				Users:      usersMap,
				Workspace:  *workspaceData,
			}

			if len(workspaceData.WorkspaceMembers) > 0 {
				memberRows := workspaceData.WorkspaceMembers[0]
				adminRecipients := 0
				for i := range memberRows.UsersWorkspace {
					if i >= len(memberRows.User) {
						continue
					}
					workspaceRole, ok := rbac.ParseRole(memberRows.UsersWorkspace[i].Role)
					if !ok || workspaceRole < rbac.Admin {
						continue
					}
					adminUserID := memberRows.User[i].ID
					userPayloadMap[adminUserID] = ws.UserEventPayload{
						WorkspaceShareOfferCreatedPayload: &payload,
					}
					userEventTypeByUserID[adminUserID] = ws.EventUserWorkspaceShareRequestCreatedAdmin
					adminRecipients++
				}
				fmt.Printf("[eventregistry][workspace.request.created][admins] workspace=%s offer=%s adminRecipients=%d\n", evt.WorkspaceID.String(), firstOffer.ID.String(), adminRecipients)
			}

			userPayloadMap[*evt.ActorUserID] = ws.UserEventPayload{
				WorkspaceShareOfferCreatedPayload: &payload,
			}
			userEventTypeByUserID[*evt.ActorUserID] = ws.EventUserWorkspaceShareRequestCreatedNonAdmin
			fmt.Printf("[eventregistry][workspace.request.created][build.done] workspace=%s offer=%s totalRecipients=%d actorRecipient=%s\n", evt.WorkspaceID.String(), firstOffer.ID.String(), len(userPayloadMap), evt.ActorUserID.String())
		} else {
			for _, shareOffer := range statePayload.ShareOffers {
				payload := ws.WorkspaceShareOfferCreatedPayload{
					ShareOffer: shareOffer,
					Users:      usersMap,
					Workspace:  *workspaceData,
				}
				if shareOffer.ToUserID != nil {
					userPayloadMap[*shareOffer.ToUserID] = ws.UserEventPayload{
						WorkspaceShareOfferCreatedPayload: &payload,
					}
					userEventTypeByUserID[*shareOffer.ToUserID] = ws.EventUserWorkspaceShareInviteCreatedNonAdmin
				}
				userPayloadMap[shareOffer.FromUserID] = ws.UserEventPayload{
					WorkspaceShareOfferCreatedPayload: &payload,
				}
				userEventTypeByUserID[shareOffer.FromUserID] = ws.EventUserWorkspaceShareInviteCreatedAdmin
			}
		}
	} else if h.mode == WorkspaceShareRequestAcceptedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		userWorkspace := dto.UserWorkspaceResponse{}
		if len(statePayload.UserWorkspaceRelations) > 0 {
			userWorkspace = statePayload.UserWorkspaceRelations[0]
		}
		payload := ws.WorkspaceShareOfferInviteAcceptedPayload{
			ShareOffer:    shareOfferDetailResponse,
			Workspace:     *workspaceData,
			UserWorkspace: userWorkspace,
			Users:         usersMap,
		}

		if len(workspaceData.WorkspaceMembers) > 0 {
			memberRows := workspaceData.WorkspaceMembers[0]
			for i := range memberRows.UsersWorkspace {
				if i >= len(memberRows.User) {
					continue
				}
				workspaceRole, ok := rbac.ParseRole(memberRows.UsersWorkspace[i].Role)
				if !ok || workspaceRole < rbac.Admin {
					continue
				}
				adminUserID := memberRows.User[i].ID
				userPayloadMap[adminUserID] = ws.UserEventPayload{
					WorkspaceShareOfferInviteAcceptedPayload: &payload,
				}
				userEventTypeByUserID[adminUserID] = ws.EventUserWorkspaceShareRequestAcceptedAdmin
			}
		}

		fromUserID := shareOffer.FromUserID
		userPayloadMap[fromUserID] = ws.UserEventPayload{
			WorkspaceShareOfferInviteAcceptedPayload: &payload,
		}
		userEventTypeByUserID[fromUserID] = ws.EventUserWorkspaceShareRequestAcceptedNonAdmin
	} else if h.mode == WorkspaceShareOfferInviteAcceptedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		payload := ws.WorkspaceShareOfferInviteAcceptedPayload{
			ShareOffer:    shareOfferDetailResponse,
			Workspace:     *workspaceData,
			UserWorkspace: statePayload.UserWorkspaceRelations[0],
			Users:         usersMap,
		}
		userPayloadMap[*shareOffer.ToUserID] = ws.UserEventPayload{
			WorkspaceShareOfferInviteAcceptedPayload: &payload,
		}
		userEventTypeByUserID[*shareOffer.ToUserID] = ws.EventUserWorkspaceShareOfferInviteAccepted
	} else if h.mode == WorkspaceShareRequestRejectedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		payload := ws.WorkspaceShareOfferInviteRejectedPayload{
			ShareOffer:  shareOfferDetailResponse,
			WorkspaceID: *evt.WorkspaceID,
			Users:       usersMap,
		}

		if len(workspaceData.WorkspaceMembers) > 0 {
			memberRows := workspaceData.WorkspaceMembers[0]
			for i := range memberRows.UsersWorkspace {
				if i >= len(memberRows.User) {
					continue
				}
				workspaceRole, ok := rbac.ParseRole(memberRows.UsersWorkspace[i].Role)
				if !ok || workspaceRole < rbac.Admin {
					continue
				}
				adminUserID := memberRows.User[i].ID
				userPayloadMap[adminUserID] = ws.UserEventPayload{
					WorkspaceShareOfferInviteRejectedPayload: &payload,
				}
				userEventTypeByUserID[adminUserID] = ws.EventUserWorkspaceShareRequestRejectedAdmin
			}
		}

		fromUserID := shareOffer.FromUserID
		userPayloadMap[fromUserID] = ws.UserEventPayload{
			WorkspaceShareOfferInviteRejectedPayload: &payload,
		}
		userEventTypeByUserID[fromUserID] = ws.EventUserWorkspaceShareRequestRejectedNonAdmin
	} else if h.mode == WorkspaceShareOfferInviteRejectedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		payload := ws.WorkspaceShareOfferInviteRejectedPayload{
			ShareOffer:  shareOfferDetailResponse,
			WorkspaceID: *evt.WorkspaceID,
			Users:       usersMap,
		}
		userPayloadMap[*shareOffer.ToUserID] = ws.UserEventPayload{
			WorkspaceShareOfferInviteRejectedPayload: &payload,
		}
		userEventTypeByUserID[*shareOffer.ToUserID] = ws.EventUserWorkspaceShareOfferInviteRejected
	} else if h.mode == WorkspaceShareRequestRevokedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		payload := ws.WorkspaceShareOfferInviteRevokedPayload{
			ShareOffer:  shareOfferDetailResponse,
			WorkspaceID: *evt.WorkspaceID,
			Users:       usersMap,
		}

		if len(workspaceData.WorkspaceMembers) > 0 {
			memberRows := workspaceData.WorkspaceMembers[0]
			for i := range memberRows.UsersWorkspace {
				if i >= len(memberRows.User) {
					continue
				}
				workspaceRole, ok := rbac.ParseRole(memberRows.UsersWorkspace[i].Role)
				if !ok || workspaceRole < rbac.Admin {
					continue
				}
				adminUserID := memberRows.User[i].ID
				userPayloadMap[adminUserID] = ws.UserEventPayload{
					WorkspaceShareOfferInviteRevokedPayload: &payload,
				}
				userEventTypeByUserID[adminUserID] = ws.EventUserWorkspaceShareRequestRevokedAdmin
			}
		}

		fromUserID := shareOffer.FromUserID
		userPayloadMap[fromUserID] = ws.UserEventPayload{
			WorkspaceShareOfferInviteRevokedPayload: &payload,
		}
		userEventTypeByUserID[fromUserID] = ws.EventUserWorkspaceShareRequestRevokedNonAdmin
	} else if h.mode == WorkspaceShareOfferInviteRevokedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		if shareOffer.ToUserID != nil {
			payload := ws.WorkspaceShareOfferInviteRejectedPayload{
				ShareOffer:  shareOfferDetailResponse,
				WorkspaceID: *evt.WorkspaceID,
				Users:       usersMap,
			}
			userPayloadMap[*shareOffer.ToUserID] = ws.UserEventPayload{
				WorkspaceShareOfferInviteRejectedPayload: &payload,
			}
			userEventTypeByUserID[*shareOffer.ToUserID] = ws.EventUserWorkspaceShareOfferInviteRevoked
		}
	} else if h.mode == BoardShareInviteCreatedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		payload := ws.BoardShareInviteCreatedPayload{
			ShareOffer: shareOffer,
			Users:      usersMap,
			Board:      targetBoard,
			Workspace:  *workspaceData,
		}
		if shareOffer.ToUserID != nil {
			userPayloadMap[*shareOffer.ToUserID] = ws.UserEventPayload{
				BoardShareInviteCreatedPayload: &payload,
			}
			userEventTypeByUserID[*shareOffer.ToUserID] = ws.EventUserBoardShareInviteCreatedNonAdmin
		}
		userPayloadMap[shareOffer.FromUserID] = ws.UserEventPayload{
			BoardShareInviteCreatedPayload: &payload,
		}
		userEventTypeByUserID[shareOffer.FromUserID] = ws.EventUserBoardShareInviteCreatedAdmin
	} else if h.mode == BoardShareRequestCreatedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		payload := ws.BoardShareRequestCreatedPayload{
			ShareOffer: shareOffer,
			Users:      usersMap,
			Board:      targetBoard,
			Workspace:  *workspaceData,
		}
		for _, userID := range boardAmdminsUserIds {
			userPayloadMap[userID] = ws.UserEventPayload{
				BoardShareRequestCreatedPayload: &payload,
			}
			userEventTypeByUserID[userID] = ws.EventUserBoardShareRequestCreatedAdmin
		}
		userEventTypeByUserID[*evt.ActorUserID] = ws.EventUserBoardShareRequestCreatedNonAdmin
		userPayloadMap[*evt.ActorUserID] = ws.UserEventPayload{
			BoardShareRequestCreatedPayload: &payload,
		}

	} else if h.mode == BoardShareInviteAcceptedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		userBoard := dto.UserBoardResponse{}
		if len(evt.Payload.StatePayload.UserBoardRelations) > 0 {
			userBoard = evt.Payload.StatePayload.UserBoardRelations[0]
		}
		payload := ws.BoardShareInviteAcceptedPayload{
			ShareOffer: shareOfferDetailResponse,
			Board:      targetBoard,
			Workspace:  *workspaceData,
			Users:      usersMap,
			UserBoard:  userBoard,
		}
		if shareOffer.ToUserID != nil {
			userPayloadMap[*shareOffer.ToUserID] = ws.UserEventPayload{
				BoardShareInviteAcceptedPayload: &payload,
			}
			userEventTypeByUserID[*shareOffer.ToUserID] = ws.EventUserBoardShareInviteAcceptedNonAdmin
		}
		userPayloadMap[shareOffer.FromUserID] = ws.UserEventPayload{
			BoardShareInviteAcceptedPayload: &payload,
		}
		userEventTypeByUserID[shareOffer.FromUserID] = ws.EventUserBoardShareInviteAcceptedAdmin
	} else if h.mode == BoardShareRequestAcceptedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		fmt.Printf("[eventregistry][shareoffer.accepted][build] workspace=%s board=%s offer=%s actor=%s fromUser=%s\n", evt.WorkspaceID.String(), shareOffer.TargetID.String(), shareOffer.ID.String(), evt.ActorUserID.String(), shareOffer.FromUserID.String())
		userBoard := dto.UserBoardResponse{}
		if len(evt.Payload.StatePayload.UserBoardRelations) > 0 {
			userBoard = evt.Payload.StatePayload.UserBoardRelations[0]
		}
		payload := ws.BoardShareRequestAcceptedPayload{
			ShareOffer: shareOfferDetailResponse,
			Board:      targetBoard,
			Workspace:  *workspaceData,
			Users:      usersMap,
			UserBoard:  userBoard,
		}
		for _, userID := range boardAmdminsUserIds {
			userPayloadMap[userID] = ws.UserEventPayload{
				BoardShareRequestAcceptedPayload: &payload,
			}
			userEventTypeByUserID[userID] = ws.EventUserBoardShareRequestAcceptedAdmin
			fmt.Printf("[eventregistry][shareoffer.accepted][fanout] recipient=%s type=%s\n", userID.String(), ws.EventUserBoardShareRequestAcceptedAdmin)
		}
		fromUserID := shareOffer.FromUserID
		userPayloadMap[fromUserID] = ws.UserEventPayload{
			BoardShareRequestAcceptedPayload: &payload,
		}
		userEventTypeByUserID[fromUserID] = ws.EventUserBoardShareRequestAcceptedNonAdmin
		fmt.Printf("[eventregistry][shareoffer.accepted][fanout] recipient=%s type=%s\n", fromUserID.String(), ws.EventUserBoardShareRequestAcceptedNonAdmin)
	} else if h.mode == BoardShareInviteRejectedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		payload := ws.BoardShareInviteRejectedPayload{
			ShareOffer: shareOfferDetailResponse,
			Board:      targetBoard,
			Workspace:  *workspaceData,
			Users:      usersMap,
		}
		if shareOffer.ToUserID != nil {
			userPayloadMap[*shareOffer.ToUserID] = ws.UserEventPayload{
				BoardShareInviteRejectedPayload: &payload,
			}
			userEventTypeByUserID[*shareOffer.ToUserID] = ws.EventUserBoardShareInviteRejectedNonAdmin
		}
		userPayloadMap[shareOffer.FromUserID] = ws.UserEventPayload{
			BoardShareInviteRejectedPayload: &payload,
		}
		userEventTypeByUserID[shareOffer.FromUserID] = ws.EventUserBoardShareInviteRejectedAdmin
	} else if h.mode == BoardShareRequestRejectedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		payload := ws.BoardShareRequestRejectedPayload{
			ShareOffer: shareOfferDetailResponse,
			Board:      targetBoard,
			Workspace:  *workspaceData,
			Users:      usersMap,
		}
		for _, userID := range boardAmdminsUserIds {
			userPayloadMap[userID] = ws.UserEventPayload{
				BoardShareRequestRejectedPayload: &payload,
			}
			userEventTypeByUserID[userID] = ws.EventUserBoardShareRequestRejectedAdmin
		}
		fromUserID := shareOffer.FromUserID
		userPayloadMap[fromUserID] = ws.UserEventPayload{
			BoardShareRequestRejectedPayload: &payload,
		}
		userEventTypeByUserID[fromUserID] = ws.EventUserBoardShareRequestRejectedNonAdmin
	} else if h.mode == BoardShareInviteRevokedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		payload := ws.BoardShareInviteRevokedPayload{
			ShareOffer: shareOfferDetailResponse,
			Board:      targetBoard,
			Workspace:  *workspaceData,
			Users:      usersMap,
		}
		if shareOffer.ToUserID != nil {
			userPayloadMap[*shareOffer.ToUserID] = ws.UserEventPayload{
				BoardShareInviteRevokedPayload: &payload,
			}
			userEventTypeByUserID[*shareOffer.ToUserID] = ws.EventUserBoardShareInviteRevokedNonAdmin
		}
		userPayloadMap[shareOffer.FromUserID] = ws.UserEventPayload{
			BoardShareInviteRevokedPayload: &payload,
		}
		userEventTypeByUserID[shareOffer.FromUserID] = ws.EventUserBoardShareInviteRevokedAdmin
	} else if h.mode == BoardShareRequestRevokedHandlerMode {
		shareOffer := statePayload.ShareOffers[0]
		payload := ws.BoardShareRequestRevokedPayload{
			ShareOffer: shareOfferDetailResponse,
			Board:      targetBoard,
			Workspace:  *workspaceData,
			Users:      usersMap,
		}
		for _, userID := range boardAmdminsUserIds {
			userPayloadMap[userID] = ws.UserEventPayload{
				BoardShareRequestRevokedPayload: &payload,
			}
			userEventTypeByUserID[userID] = ws.EventUserBoardShareRequestRevokedAdmin
		}
		fromUserID := shareOffer.FromUserID
		userPayloadMap[fromUserID] = ws.UserEventPayload{
			BoardShareRequestRevokedPayload: &payload,
		}
		userEventTypeByUserID[fromUserID] = ws.EventUserBoardShareRequestRevokedNonAdmin
	}

	result := EventBuildResult{
		StatePayload: statePayload,
		FeedPayload:  feed,
		Targets:      evt.Targets,
		MainEntity: MainEntityRef{
			EntityType: "workspace",
			EntityID:   *evt.WorkspaceID,
		},
		UserPayload:           userPayloadMap,
		UserEventTypeByUserID: userEventTypeByUserID,
	}
	return result, nil
}
