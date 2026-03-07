package shares

import (
	"GoGORM/internal/dbx"
	"GoGORM/internal/domainerr"
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/guard"
	"GoGORM/internal/memberships"
	"GoGORM/internal/models/workspaces"
	"GoGORM/internal/ws"
	"encoding/json"

	"GoGORM/internal/rbac"
	"GoGORM/models"
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type ShareService struct {
	db                      *gorm.DB
	EventRegistry           EventRegistry.EventRegistryService
	ListShareRepo           ListShareRepo
	ShareRepo               ShareRepo
	BoardRepo               BoardRepo
	MembershipRepo          MembershipRepo
	LinksRepo               LinksRepo
	ShareEventsRepo         ShareEventsRepo
	WorkspaceRepo           WorkspaceRepo
	SubscriptionService     SubscriptionService
	PositionHelper          PositionHelper
	WorkspacePositionHelper WorkspacePositionHelper
	IncludeDeleted          bool
}

type ListShareRepo interface {
	CreateListShareOffer(ctx context.Context, shareOffer models.BoardListShareOffer) error
	GetListShareOffersByTargetBoardID(ctx context.Context, targetBoardID uuid.UUID, includeDeleted bool) ([]models.BoardListShareOffer, error)
	GetListShareOfferDetail(ctx context.Context, shareID uuid.UUID, includeDeleted bool) (models.BoardListShareOffer, error)
	//AcceptListShareOffer(ctx context.Context, respondDomain *ShareOfferUpdate, boardList *models.BoardList) (*models.BoardListShareOffer, *models.BoardList, error)
	UpdateListShareOffer(ctx context.Context, shareOfferUpdate *ShareOfferUpdate) (*models.BoardListShareOffer, error)
	UpdateListShareOfferTx(ctx context.Context, db *gorm.DB, shareOfferUpdate *ShareOfferUpdate) (*models.BoardListShareOffer, error)
}

type ShareRepo interface {
	CreateShareOffer(ctx context.Context, shareOffer models.ShareOffer) error
	CreateBulkShareOffers(ctx context.Context, shareOffers []models.ShareOffer) error
	GetShareOffersByTypeAndTargetID(ctx context.Context, targetType string, targetID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error)
	GetBoardRequestShareOffers(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error)
	GetWorkspaceRequestShareOffers(ctx context.Context, workspaceID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error)
	GetBoardInviteShareOffers(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error)
	GetPendingShareOfferByRequesterAndTarget(ctx context.Context, fromUserID uuid.UUID, targetType string, targetID uuid.UUID, kind models.ShareOfferKind, includeDeleted bool) (*models.ShareOffer, error)
	GetUserIncomingShareOffers(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error)
	GetUserOutgoingShareOffers(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error)
	GetShareOfferByID(ctx context.Context, shareID uuid.UUID, includeDeleted bool) (*models.ShareOffer, error)
	UpdateShareOfferTx(ctx context.Context, db *gorm.DB, shareOfferUpdate *models.ShareOffer) error
	GetUserBoardRequestsOutgoing(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error)
	GetUserBoardInvitesIncoming(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error)
	GetUserWorkspaceRequestsOutgoing(ctx context.Context, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error)
	GetPendingBoardShareOffersByWorkspaceForUser(ctx context.Context, workspaceID, userID uuid.UUID, includeDeleted bool) ([]models.ShareOffer, error)
	GetPendingOfferedBoardIDsByWorkspaceForUser(ctx context.Context, workspaceID, userID uuid.UUID, includeDeleted bool) ([]uuid.UUID, error)
	GetPendingRequestedBoardIDsByWorkspaceForUser(ctx context.Context, workspaceID, userID uuid.UUID, includeDeleted bool) ([]uuid.UUID, error)
	GetPendingBoardAccessRequestCountsByWorkspaceForAdminOwner(ctx context.Context, workspaceID, userID uuid.UUID, includeDeleted bool) (map[uuid.UUID]int, error)
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUserWorkspaceRole(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (string, error)
	CreateUserBoardTX(ctx context.Context, db *gorm.DB, userBoard *models.UserBoard) error
	GetUsersBoardRowsByBoardIDs(ctx context.Context, boardIDs []uuid.UUID, includeDeleted bool) ([]memberships.BoardUserRow, error)
	GetUsersByIDs(ctx context.Context, userIDs []uuid.UUID) ([]models.User, error)
}
type LinksRepo interface {
	GetBoardList(ctx context.Context, boardID, listId uuid.UUID, includeDeleted bool) (*models.BoardList, error)
	GetListsInBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.BoardList, error)
	CreateOrUpdateBoardList(ctx context.Context, db *gorm.DB, boardList *models.BoardList) error
	DeleteBoardList(ctx context.Context, boardID, listID uuid.UUID) error
}

type ShareEventsRepo interface {
	CreateShareEvent(ctx context.Context, db *gorm.DB, event *models.BoardListOfferEvent) error
}

type PositionHelper interface {
	ListPosAtBoardEnd(ctx context.Context, boardID uuid.UUID) (string, error)
	ListPosAtBoardStart(ctx context.Context, boardID uuid.UUID) (string, error)
	ListPosAfterID(ctx context.Context, boardID, afterID uuid.UUID) (string, error)
	UserWorkspacePosAtEnd(ctx context.Context, userID uuid.UUID) (string, error)
}

type WorkspacePositionHelper interface {
	WorkspaceBoardPosAtEnd(ctx context.Context, userID, workspaceID uuid.UUID) (string, error)
}

type SubscriptionService interface {
	CheckWorkspaceMembershipLimit(ctx context.Context, userID uuid.UUID) (bool, error)
}

type WorkspaceRepo interface {
	CheckUserWorkspaceMembershipByBoardID(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (bool, error)
	CheckUserWorkspaceMembership(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (bool, error)
	GetWorkspaceIDByBoardID(ctx context.Context, boardID uuid.UUID) (uuid.UUID, error)
	CreateUserWorkspaceTX(ctx context.Context, tx *gorm.DB, userWorkspace *models.UserWorkspace) error
	GetWorkspacesByIDs(ctx context.Context, workspaceIDs []uuid.UUID, includeDeleted bool) ([]models.Workspace, error)
	GetWorkspaceSubscriptionsByWorkspaceIDs(ctx context.Context, workspaceIDs []uuid.UUID, includeDeleted bool) ([]models.WorkspaceSubscription, error)
	GetWorkspaceMembersByWorkspaceIDs(ctx context.Context, workspaceIDs []uuid.UUID, includeDeleted bool) ([]workspaces.WorkspaceMemberRow, error)
}

type BoardRepo interface {
	GetBoardsByIDs(ctx context.Context, boardIDs []uuid.UUID, includeDeleted bool) ([]models.Board, error)
}

/*type BoardRepo interface {
	GetBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) (*models.Board, error)
}*/

func NewShareService(db *gorm.DB, listShareRepo ListShareRepo, shareRepo ShareRepo, boardRepo BoardRepo, membershipRepo MembershipRepo,
	linksRepo LinksRepo, positionHelper PositionHelper, workspacePositionHelper WorkspacePositionHelper, shareEventsRepo ShareEventsRepo, workspaceRepo WorkspaceRepo,
	subscriptionService SubscriptionService, eventRegistry EventRegistry.EventRegistryService) *ShareService {
	return &ShareService{db: db,
		ListShareRepo:           listShareRepo,
		ShareRepo:               shareRepo,
		BoardRepo:               boardRepo,
		MembershipRepo:          membershipRepo,
		LinksRepo:               linksRepo,
		PositionHelper:          positionHelper,
		WorkspacePositionHelper: workspacePositionHelper,
		ShareEventsRepo:         shareEventsRepo,
		WorkspaceRepo:           workspaceRepo,
		SubscriptionService:     subscriptionService,
		EventRegistry:           eventRegistry, IncludeDeleted: false}
}

func (s *ShareService) CreateListShareOffer(ctx context.Context, shareOffer ShareOfferDomain) (*models.BoardListShareOffer, error) {

	//User board access
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, shareOffer.UserID, shareOffer.SourceBoardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	//Board list access
	boardList, err := s.LinksRepo.GetBoardList(ctx, shareOffer.SourceBoardID, shareOffer.ListID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	proposedAccessMode := "readonly"
	if shareOffer.ProposedAccessMode == "editable" {
		if boardList.AccessMode == rbac.BoardListEditable {
			proposedAccessMode = "editable"
		}
	}

	shareOfferInput := models.BoardListShareOffer{
		ID:                 uuid.New(),
		SourceBoardID:      shareOffer.SourceBoardID,
		TargetBoardID:      shareOffer.TargetBoardID,
		ListID:             shareOffer.ListID,
		Status:             "pending",
		ProposedAccessMode: rbac.BoardListAccessMode(proposedAccessMode),
		CreatedByUserID:    shareOffer.UserID,
	}
	err = s.ListShareRepo.CreateListShareOffer(ctx, shareOfferInput)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	return &shareOfferInput, nil
}

func (s *ShareService) GetListShareOffers(ctx context.Context, userID, targetBoardID uuid.UUID) ([]models.BoardListShareOffer, error) {

	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, targetBoardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}

	shareOffers, err := s.ListShareRepo.GetListShareOffersByTargetBoardID(ctx, targetBoardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	return shareOffers, nil

}

type ShareRespondPayload struct {
	AccessMode rbac.BoardListAccessMode
	Decision   models.ShareOfferStatus
}

type ShareRevokePayload struct {
	Reason     string
	UnMounting string
}

type ShareOfferCreatedPayload struct {
	Reason string
}

/*func buildAcceptPayload(decision, accessMode) datatypes.JSON {

}*/

func toJSON[T any](data T) (datatypes.JSON, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}
	return datatypes.JSON(jsonData), nil

}

func (s *ShareService) RespondToListShareOffer(ctx context.Context, respondDomain ShareOfferRespondDomain) (*models.BoardListShareOffer, *models.BoardList, error) {

	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, respondDomain.UserID, respondDomain.TargetBoardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, nil, err
	}
	if respondDomain.Decision != "accepted" && respondDomain.Decision != "rejected" {
		return nil, nil, domainerr.ErrValidation
	}

	shareOffer, err := s.ListShareRepo.GetListShareOfferDetail(ctx, respondDomain.ShareID, s.IncludeDeleted)
	if err != nil {
		return nil, nil, domainerr.MapRepoErr(err, false)
	}
	if shareOffer.Status != "pending" {
		return nil, nil, domainerr.ErrConflict
	}
	if shareOffer.TargetBoardID != respondDomain.TargetBoardID {
		return nil, nil, domainerr.ErrForbidden
	}

	var accessMode = respondDomain.AccessMode
	if shareOffer.ProposedAccessMode == "readonly" {
		accessMode = "readonly"
	}
	respondDomain.AccessMode = accessMode
	var now = time.Now()

	if respondDomain.Decision == "accepted" {
		var updatedShareOffer *models.BoardListShareOffer
		var updatedBoardList *models.BoardList
		err := s.db.Transaction(func(tx *gorm.DB) error {

			//Check if an existing relationship exist
			boardList, err := s.LinksRepo.GetBoardList(ctx, shareOffer.TargetBoardID, shareOffer.ListID, s.IncludeDeleted)
			//var newBoardList *models.BoardList

			if err != nil {
				//If do not exist any relationship
				if errors.Is(err, domainerr.ErrNotFound) {
					//Crea posizione in fondo
					/*listsInBoard , err := s.LinksRepo.GetListsInBoard(ctx, shareOffer.TargetBoardID)
					if err != nil {
						return domainerr.MapRepoErr(err, false)
					}
					lastPos := ""
					if len(listsInBoard) > 0 {
						lastPos = listsInBoard[len(listsInBoard)-1].Pos
					}
					generator:= rank.NewRankGenerator()
					position, err := generator.GenerateRankBetween(lastPos, "")
					if err != nil {
						return domainerr.MapRepoErr(err, false)
					}*/
					position, err := s.PositionHelper.ListPosAtBoardEnd(ctx, shareOffer.TargetBoardID)
					if err != nil {
						return domainerr.ErrInternal
					}

					rootID := uuid.Nil
					sourceBoardList, srcErr := s.LinksRepo.GetBoardList(ctx, shareOffer.SourceBoardID, shareOffer.ListID, s.IncludeDeleted)
					if srcErr == nil {
						rootID = sourceBoardList.RootID
						if rootID == uuid.Nil {
							rootID = sourceBoardList.ID
						}
					}

					updatedBoardList = &models.BoardList{
						ID:         uuid.New(),
						RootID:     rootID,
						BoardID:    shareOffer.TargetBoardID,
						ListID:     shareOffer.ListID,
						Pos:        position,
						AccessMode: rbac.BoardListAccessMode(accessMode),
					}
					if updatedBoardList.RootID == uuid.Nil {
						updatedBoardList.RootID = updatedBoardList.ID
					}
				} else { //errore not not found
					return domainerr.MapRepoErr(err, false)
				}
			} else { //if an existing relationship exist -> upgrade/modify the accessmode
				updatedBoardList = &models.BoardList{
					ID:         uuid.New(),
					RootID:     boardList.RootID,
					BoardID:    boardList.BoardID,
					ListID:     boardList.ListID,
					AccessMode: rbac.BoardListAccessMode(accessMode),
				}
				if updatedBoardList.RootID == uuid.Nil {
					updatedBoardList.RootID = boardList.ID
				}

			}

			//Creating the offerUpdateObject
			updateOfferInput := ShareOfferUpdate{
				ID:              &respondDomain.ShareID,
				Status:          &respondDomain.Decision,
				DecidedByUserID: &respondDomain.UserID,
				DecidedAt:       &now,
			}

			//Database query for updating share-offer
			updatedShareOffer, err = s.ListShareRepo.UpdateListShareOfferTx(ctx, tx, &updateOfferInput)
			if err != nil {
				return domainerr.MapRepoErr(err, false)
			}

			offerRespondPayload := ShareRespondPayload{
				AccessMode: rbac.BoardListAccessMode(accessMode),
				Decision:   models.ShareOfferStatus(respondDomain.Decision),
			}
			payloadJson, err := toJSON(offerRespondPayload)
			if err != nil {
				return domainerr.ErrInternal
			}

			eventOfferUpdate := models.BoardListOfferEvent{
				ID:           uuid.New(),
				OfferID:      shareOffer.ID,
				EventType:    models.EventeRespondAccepted,
				ActorUserID:  respondDomain.UserID,
				ActorBoardID: respondDomain.TargetBoardID,
				Payload:      payloadJson,
				CreatedAt:    now,
			}

			if err := s.ShareEventsRepo.CreateShareEvent(ctx, tx, &eventOfferUpdate); err != nil {
				return domainerr.MapRepoErr(err, false)
			}

			//Create list-board link
			if err := s.LinksRepo.CreateOrUpdateBoardList(ctx, tx, updatedBoardList); err != nil {
				return domainerr.MapRepoErr(err, false)
			}

			var eventBoardMount = eventOfferUpdate
			eventBoardMount.EventType = models.EventAutoMounted
			eventBoardMount.ID = uuid.New()
			if err := s.ShareEventsRepo.CreateShareEvent(ctx, tx, &eventBoardMount); err != nil {
				return domainerr.MapRepoErr(err, false)
			}

			return nil
		})
		if err != nil {
			return nil, nil, dbx.WrapDBErr(err, "")
		}

		return updatedShareOffer, updatedBoardList, nil

	} else if respondDomain.Decision == "rejected" {
		var updatedShareOffer *models.BoardListShareOffer
		err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {

			updateOffer := ShareOfferUpdate{
				ID:              &respondDomain.ShareID,
				Status:          &respondDomain.Decision,
				DecidedByUserID: &respondDomain.UserID,
				DecidedAt:       &now,
			}
			updatedShareOffer, err = s.ListShareRepo.UpdateListShareOfferTx(ctx, tx, &updateOffer)
			//fmt.Println(updatedShareOffer)
			if err != nil {
				return domainerr.MapRepoErr(err, false)
			}

			offerRespondPayload := ShareRespondPayload{
				Decision: models.ShareOfferStatus(respondDomain.Decision),
			}
			payloadJson, err := toJSON(offerRespondPayload)
			if err != nil {
				return domainerr.ErrInternal
			}
			eventOfferUpdate := models.BoardListOfferEvent{
				ID:           uuid.New(),
				OfferID:      shareOffer.ID,
				EventType:    models.EventRespondRejected,
				ActorUserID:  respondDomain.UserID,
				ActorBoardID: respondDomain.TargetBoardID,
				Payload:      payloadJson,
				CreatedAt:    now,
			}
			if err := s.ShareEventsRepo.CreateShareEvent(ctx, tx, &eventOfferUpdate); err != nil {
				return domainerr.MapRepoErr(err, false)
			}
			return nil

		})
		if err != nil {
			return nil, nil, err
		}

		return updatedShareOffer, nil, nil

	}

	return nil, nil, domainerr.ErrValidation
}

func (s *ShareService) RevokeListShareOffer(ctx context.Context, revokeDomain ShareOfferRevokeDomain) (*models.BoardListShareOffer, error) {

	shareOffer, err := s.ListShareRepo.GetListShareOfferDetail(ctx, revokeDomain.ShareID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	//Do not allow if not offered by requester's board
	if shareOffer.SourceBoardID != revokeDomain.RequesterBoardID {
		return nil, domainerr.ErrForbidden
	}
	//Allow revoke only to admin+
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, revokeDomain.RequesterUserID, revokeDomain.RequesterBoardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	var updatedShareOffer *models.BoardListShareOffer
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		//fmt.Println("enterTransaction")
		status := "revoked"
		now := time.Now()
		updateOffer := ShareOfferUpdate{
			ID:              &revokeDomain.ShareID,
			Status:          &status,
			DecidedByUserID: &revokeDomain.RequesterUserID,
			DecidedAt:       &now,
		}
		updatedShareOffer, err = s.ListShareRepo.UpdateListShareOfferTx(ctx, tx, &updateOffer)
		if err != nil {
			fmt.Println("errore 1")
			return domainerr.MapRepoErr(err, false)
		}
		revokePayload := ShareRevokePayload{
			Reason:     revokeDomain.Reason,
			UnMounting: "automatic",
		}
		payloadJson, err := toJSON(revokePayload)
		if err != nil {
			fmt.Println("errore 2")
			return domainerr.ErrInternal
		}
		eventOfferRevoke := models.BoardListOfferEvent{
			ID:           uuid.New(),
			OfferID:      shareOffer.ID,
			EventType:    models.EventRevoked,
			ActorUserID:  revokeDomain.RequesterUserID,
			ActorBoardID: revokeDomain.RequesterBoardID,
			Payload:      payloadJson,
			CreatedAt:    now,
		}
		if err := s.ShareEventsRepo.CreateShareEvent(ctx, tx, &eventOfferRevoke); err != nil {
			fmt.Println("errore 3")
			return domainerr.MapRepoErr(err, false)
		}
		unmounting := "successful"
		if err := s.LinksRepo.DeleteBoardList(ctx, shareOffer.TargetBoardID, shareOffer.ListID); err != nil {
			fmt.Println("errore 4")
			if errors.Is(err, domainerr.ErrNotFound) {
				fmt.Println("not found, skip")
				unmounting = "not_found"
			} else {
				return domainerr.MapRepoErr(err, false)
			}
		}
		var eventAutoUnmount = eventOfferRevoke
		eventAutoUnmount.EventType = models.EventAutoUnMounted
		eventAutoUnmount.ID = uuid.New()
		revokePayload.UnMounting = unmounting
		payloadJson, err = toJSON(revokePayload)
		if err != nil {
			fmt.Println("errore 5")
			return domainerr.ErrInternal
		}
		eventAutoUnmount.Payload = payloadJson
		if err := s.ShareEventsRepo.CreateShareEvent(ctx, tx, &eventAutoUnmount); err != nil {
			fmt.Println("errore 5")
			return domainerr.MapRepoErr(err, false)
		}
		return nil

	}); err != nil {
		fmt.Println("errore 6")
		return nil, err
	}
	if updatedShareOffer == nil {
		fmt.Println("errore 7")
		return nil, domainerr.ErrInternal
	}
	return updatedShareOffer, nil
}

func (s *ShareService) CreateBoardShareOffer(ctx context.Context, userID uuid.UUID, sourceBoardID uuid.UUID, correlationID uuid.UUID, req CreateShareOfferRequest) ([]models.ShareOffer, error) {

	userRole, err := s.MembershipRepo.GetUserRole(ctx, userID, sourceBoardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	userRbacRole, ok := rbac.ParseRole(userRole)
	if !ok {
		return nil, domainerr.ErrForbidden
	}
	if userRbacRole < rbac.Admin {
		return nil, domainerr.ErrForbidden
	}
	offeredRole, ok := rbac.ParseRole(req.OfferedRole)
	if !ok {
		return nil, domainerr.ErrValidation
	}
	finalOfferedRole := offeredRole
	if offeredRole > userRbacRole {
		finalOfferedRole = userRbacRole
	}

	shareOffers := make([]models.ShareOffer, 0, len(req.ToUserIDs))

	for _, toUserID := range req.ToUserIDs {
		shareOffer := models.ShareOffer{
			ID:          uuid.New(),
			TargetType:  "board",
			TargetID:    sourceBoardID,
			FromUserID:  userID,
			ToUserID:    &toUserID,
			OfferedRole: rbac.Role(finalOfferedRole),
			Status:      "pending",
			Kind:        models.ShareOfferKindInvite,
			Message:     req.Message,
		}
		shareOffers = append(shareOffers, shareOffer)
	}
	if err := s.ShareRepo.CreateBulkShareOffers(ctx, shareOffers); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	workspaceID, err := s.WorkspaceRepo.GetWorkspaceIDByBoardID(ctx, sourceBoardID)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	for i := range shareOffers {
		persistedShareOffer, getErr := s.ShareRepo.GetShareOfferByID(ctx, shareOffers[i].ID, s.IncludeDeleted)
		if getErr != nil {
			return nil, domainerr.MapRepoErr(getErr, false)
		}
		shareOffers[i] = *persistedShareOffer

		statePayload := dto.BoardDetailResponse{
			ShareOffers: []dto.ShareOfferResponse{dto.ShareOfferToResponse(persistedShareOffer)},
		}
		envelope := EventRegistry.EventPayloadEnvelope{StatePayload: &statePayload}
		targets := []EventRegistry.TargetRef{
			{EntityType: "board", EntityID: sourceBoardID},
			{EntityType: "user", EntityID: userID},
		}
		if persistedShareOffer.ToUserID != nil {
			targets = append(targets, EventRegistry.TargetRef{EntityType: "user", EntityID: *persistedShareOffer.ToUserID})
		}

		domainEvent := EventRegistry.DomainEvent{
			Type:          EventRegistry.EventBoardShareInviteCreated,
			ActorUserID:   &userID,
			BoardID:       &sourceBoardID,
			WorkspaceID:   &workspaceID,
			Payload:       envelope,
			CorrelationID: &correlationID,
			Targets:       targets,
			OccurredAt:    time.Now(),
		}
		if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
			fmt.Println("failed to emit board invite created event:", err)
		}
	}
	return shareOffers, nil

}

func (s *ShareService) emitBoardInviteLifecycleEvent(ctx context.Context, actorUserID uuid.UUID, correlationID uuid.UUID, eventType EventRegistry.DomainEventType, workspaceID uuid.UUID, boardID uuid.UUID, shareOffer *models.ShareOffer, userBoard *models.UserBoard, userWorkspace *models.UserWorkspace) {
	if shareOffer == nil {
		return
	}

	persistedShareOffer := shareOffer
	if shareOffer.TargetID == uuid.Nil || shareOffer.FromUserID == uuid.Nil {
		loadedShareOffer, err := s.ShareRepo.GetShareOfferByID(ctx, shareOffer.ID, s.IncludeDeleted)
		if err != nil {
			fmt.Println("failed to load persisted share offer for event emission:", err)
			return
		}
		persistedShareOffer = loadedShareOffer
	}

	statePayload := dto.BoardDetailResponse{
		ShareOffers: []dto.ShareOfferResponse{dto.ShareOfferToResponse(persistedShareOffer)},
	}
	if userBoard != nil {
		statePayload.UserBoardRelations = []dto.UserBoardResponse{dto.UserBoardToResponse(userBoard)}
	}
	if userWorkspace != nil {
		statePayload.UserWorkspaceRelations = []dto.UserWorkspaceResponse{dto.UserWorkspaceToResponse(userWorkspace)}
	}

	targets := []EventRegistry.TargetRef{
		{EntityType: "board", EntityID: boardID},
		{EntityType: "user", EntityID: persistedShareOffer.FromUserID},
	}
	if persistedShareOffer.ToUserID != nil {
		targets = append(targets, EventRegistry.TargetRef{EntityType: "user", EntityID: *persistedShareOffer.ToUserID})
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          eventType,
		ActorUserID:   &actorUserID,
		BoardID:       &boardID,
		WorkspaceID:   &workspaceID,
		Payload:       EventRegistry.EventPayloadEnvelope{StatePayload: &statePayload},
		CorrelationID: &correlationID,
		Targets:       targets,
		OccurredAt:    time.Now(),
	}

	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		fmt.Println("failed to emit board invite lifecycle event:", err)
	}
}

func (s *ShareService) emitWorkspaceRequestLifecycleEvent(ctx context.Context, actorUserID uuid.UUID, correlationID uuid.UUID, eventType EventRegistry.DomainEventType, workspaceID uuid.UUID, shareOffer *models.ShareOffer, userWorkspace *models.UserWorkspace) {
	if shareOffer == nil {
		return
	}

	persistedShareOffer := shareOffer
	if shareOffer.TargetID == uuid.Nil || shareOffer.FromUserID == uuid.Nil {
		loadedShareOffer, err := s.ShareRepo.GetShareOfferByID(ctx, shareOffer.ID, s.IncludeDeleted)
		if err != nil {
			fmt.Println("failed to load persisted workspace share offer for event emission:", err)
			return
		}
		persistedShareOffer = loadedShareOffer
	}

	statePayload := dto.BoardDetailResponse{
		ShareOffers: []dto.ShareOfferResponse{dto.ShareOfferToResponse(persistedShareOffer)},
	}
	if userWorkspace != nil {
		statePayload.UserWorkspaceRelations = []dto.UserWorkspaceResponse{dto.UserWorkspaceToResponse(userWorkspace)}
	}

	targets := []EventRegistry.TargetRef{
		{EntityType: "workspace", EntityID: workspaceID},
		{EntityType: "user", EntityID: persistedShareOffer.FromUserID},
		{EntityType: "user", EntityID: actorUserID},
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          eventType,
		ActorUserID:   &actorUserID,
		WorkspaceID:   &workspaceID,
		Payload:       EventRegistry.EventPayloadEnvelope{StatePayload: &statePayload},
		CorrelationID: &correlationID,
		Targets:       targets,
		OccurredAt:    time.Now(),
	}

	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		fmt.Println("failed to emit workspace request lifecycle event:", err)
	}
}

func (s *ShareService) GetBoardInvitesOutgoingByBoard(ctx context.Context,
	userID uuid.UUID, boardID uuid.UUID) ([]models.ShareOffer, error) {

	userRoleStr, err := s.MembershipRepo.GetUserRole(ctx, userID, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	userRole, ok := rbac.ParseRole(userRoleStr)
	if !ok {
		return nil, domainerr.ErrForbidden
	}
	if userRole < rbac.Admin {
		return nil, domainerr.ErrForbidden
	}
	shareOffers, err := s.ShareRepo.GetBoardInviteShareOffers(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return shareOffers, nil

}

func (s *ShareService) GetBoardInvitesOutgoingByBoardWithUsers(ctx context.Context,
	userID uuid.UUID, boardID uuid.UUID) ([]dto.BoardShareOffersResponse, error) {

	userRoleStr, err := s.MembershipRepo.GetUserRole(ctx, userID, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	userRole, ok := rbac.ParseRole(userRoleStr)
	if !ok {
		return nil, domainerr.ErrForbidden
	}
	if userRole < rbac.Admin {
		return nil, domainerr.ErrForbidden
	}
	shareOffers, err := s.ShareRepo.GetBoardInviteShareOffers(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	return s.buildBoardShareOffersResponse(ctx, shareOffers)
}

func (s *ShareService) CreateBoardAccessRequest(ctx context.Context, userID, boardID uuid.UUID, req CreateBoardAccessRequest, correlationID uuid.UUID) (*models.ShareOffer, error) {
	boards, err := s.BoardRepo.GetBoardsByIDs(ctx, []uuid.UUID{boardID}, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	if len(boards) == 0 {
		return nil, domainerr.ErrNotFound
	}
	if _, err := s.MembershipRepo.GetUserRole(ctx, userID, boardID, s.IncludeDeleted); err == nil {
		return nil, domainerr.New(domainerr.ErrConflict, "user is already a board member")
	} else if !errors.Is(err, domainerr.ErrNotFound) {
		return nil, domainerr.MapRepoErr(err, true)
	}
	if _, err := s.ShareRepo.GetPendingShareOfferByRequesterAndTarget(ctx, userID, "board", boardID, models.ShareOfferKindRequest, s.IncludeDeleted); err == nil {
		return nil, domainerr.New(domainerr.ErrConflict, "a pending access request for this board already exists")
	} else if !errors.Is(err, domainerr.ErrNotFound) {
		return nil, domainerr.MapRepoErr(err, false)
	}

	requestedRole := rbac.Viewer
	if req.RequestedRole != "" {
		parsedRole, ok := rbac.ParseRole(req.RequestedRole)
		if !ok || parsedRole > rbac.Member {
			return nil, domainerr.ErrValidation
		}
		requestedRole = parsedRole
	}

	shareOffer := models.ShareOffer{
		ID:          uuid.New(),
		TargetType:  "board",
		TargetID:    boardID,
		FromUserID:  userID,
		ToUserID:    nil,
		OfferedRole: requestedRole,
		Status:      models.Pending,
		Kind:        models.ShareOfferKindRequest,
		Message:     req.Message,
	}
	if err := s.ShareRepo.CreateShareOffer(ctx, shareOffer); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	persistedShareOffer, err := s.ShareRepo.GetShareOfferByID(ctx, shareOffer.ID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	shareOfferResponse := dto.ShareOfferToResponse(persistedShareOffer)
	workspaceID, err := s.WorkspaceRepo.GetWorkspaceIDByBoardID(ctx, boardID)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}

	statePayload := dto.BoardDetailResponse{
		ShareOffers: []dto.ShareOfferResponse{shareOfferResponse},
	}
	envelope := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	targets := []EventRegistry.TargetRef{
		{
			EntityType: "board",
			EntityID:   boardID,
		},
		{
			EntityType: "user",
			EntityID:   userID,
		},
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventBoardShareRequestCreated,
		ActorUserID:   &userID,
		BoardID:       &persistedShareOffer.TargetID,
		WorkspaceID:   &workspaceID,
		Payload:       envelope,
		CorrelationID: &correlationID,
		Targets:       targets,
		OccurredAt:    time.Now(),
	}

	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		fmt.Println("Failed to emit event:", err)
	}

	return persistedShareOffer, nil
}

func (s *ShareService) CreateWorkspaceAccessRequest(ctx context.Context, userID, workspaceID uuid.UUID, req CreateWorkspaceAccessRequest, correlationID uuid.UUID) (*models.ShareOffer, error) {
	fmt.Printf("[shares][workspace.request.create][start] workspace=%s user=%s correlation=%s requestedRole=%s\n", workspaceID.String(), userID.String(), correlationID.String(), req.RequestedRole)
	workspaces, err := s.WorkspaceRepo.GetWorkspacesByIDs(ctx, []uuid.UUID{workspaceID}, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	if len(workspaces) == 0 {
		return nil, domainerr.ErrNotFound
	}

	isWorkspaceMember, err := s.WorkspaceRepo.CheckUserWorkspaceMembership(ctx, userID, workspaceID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	if isWorkspaceMember {
		return nil, domainerr.ErrConflict
	}
	if _, err := s.ShareRepo.GetPendingShareOfferByRequesterAndTarget(ctx, userID, "workspace", workspaceID, models.ShareOfferKindRequest, s.IncludeDeleted); err == nil {
		return nil, domainerr.ErrConflict
	} else if !errors.Is(err, domainerr.ErrNotFound) {
		return nil, domainerr.MapRepoErr(err, false)
	}

	requestedRole := rbac.Viewer
	if req.RequestedRole != "" {
		parsedRole, ok := rbac.ParseRole(req.RequestedRole)
		if !ok || parsedRole > rbac.Member {
			return nil, domainerr.ErrValidation
		}
		requestedRole = parsedRole
	}

	shareOffer := models.ShareOffer{
		ID:          uuid.New(),
		TargetType:  "workspace",
		TargetID:    workspaceID,
		FromUserID:  userID,
		ToUserID:    nil,
		OfferedRole: requestedRole,
		Status:      models.Pending,
		Kind:        models.ShareOfferKindRequest,
		Message:     req.Message,
	}
	if err := s.ShareRepo.CreateShareOffer(ctx, shareOffer); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	fmt.Printf("[shares][workspace.request.create][persisted] offer=%s workspace=%s fromUser=%s\n", shareOffer.ID.String(), shareOffer.TargetID.String(), shareOffer.FromUserID.String())
	persistedShareOffer, err := s.ShareRepo.GetShareOfferByID(ctx, shareOffer.ID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	shareOfferResponse := dto.ShareOfferToResponse(persistedShareOffer)

	statePayload := dto.BoardDetailResponse{
		ShareOffers: []dto.ShareOfferResponse{shareOfferResponse},
	}
	envelope := EventRegistry.EventPayloadEnvelope{
		StatePayload: &statePayload,
	}
	targets := []EventRegistry.TargetRef{
		{
			EntityType: "workspace",
			EntityID:   workspaceID,
		},
		{
			EntityType: "user",
			EntityID:   userID,
		},
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          EventRegistry.EventWorkspaceShareOfferCreated,
		ActorUserID:   &userID,
		WorkspaceID:   &workspaceID,
		Payload:       envelope,
		CorrelationID: &correlationID,
		Targets:       targets,
	}
	fmt.Printf("[shares][workspace.request.create][emit] event=%s offer=%s workspace=%s actor=%s correlation=%s\n", domainEvent.Type, persistedShareOffer.ID.String(), workspaceID.String(), userID.String(), correlationID.String())

	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		fmt.Printf("[shares][workspace.request.create][emit.error] offer=%s correlation=%s err=%v\n", persistedShareOffer.ID.String(), correlationID.String(), err)
	} else {
		fmt.Printf("[shares][workspace.request.create][emit.ok] offer=%s correlation=%s\n", persistedShareOffer.ID.String(), correlationID.String())
	}

	return persistedShareOffer, nil
}

func (s *ShareService) GetBoardRequestsIncomingByBoard(ctx context.Context, userID, boardID uuid.UUID) ([]models.ShareOffer, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	shareOffers, err := s.ShareRepo.GetBoardRequestShareOffers(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return shareOffers, nil
}

func (s *ShareService) GetBoardRequestsIncomingByBoardWithUsers(ctx context.Context, userID, boardID uuid.UUID) ([]dto.BoardShareOffersResponse, error) {
	if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, boardID, rbac.Admin, s.IncludeDeleted); err != nil {
		return nil, err
	}
	shareOffers, err := s.ShareRepo.GetBoardRequestShareOffers(ctx, boardID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return s.buildBoardShareOffersResponse(ctx, shareOffers)
}

func (s *ShareService) GetWorkspaceRequestsIncomingByWorkspaceWithUsers(ctx context.Context, userID, workspaceID uuid.UUID) ([]dto.BoardShareOffersResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, workspaceID, rbac.Member, s.IncludeDeleted); err != nil {
		return nil, err
	}
	shareOffers, err := s.ShareRepo.GetWorkspaceRequestShareOffers(ctx, workspaceID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return s.buildBoardShareOffersResponse(ctx, shareOffers)
}

func (s *ShareService) buildBoardShareOffersResponse(ctx context.Context, shareOffers []models.ShareOffer) ([]dto.BoardShareOffersResponse, error) {
	if len(shareOffers) == 0 {
		return []dto.BoardShareOffersResponse{}, nil
	}

	userIDSet := make(map[uuid.UUID]struct{})
	for i := range shareOffers {
		userIDSet[shareOffers[i].FromUserID] = struct{}{}
		if shareOffers[i].ToUserID != nil {
			userIDSet[*shareOffers[i].ToUserID] = struct{}{}
		}
	}

	userIDs := make([]uuid.UUID, 0, len(userIDSet))
	for id := range userIDSet {
		userIDs = append(userIDs, id)
	}

	users, err := s.MembershipRepo.GetUsersByIDs(ctx, userIDs)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	userMap := make(map[uuid.UUID]dto.UserResponse, len(users))
	for i := range users {
		userMap[users[i].ID] = dto.UserToResponse(&users[i])
	}

	responses := make([]dto.BoardShareOffersResponse, 0, len(shareOffers))
	for i := range shareOffers {
		users := make([]dto.UserResponse, 0, 2)
		if fromUser, ok := userMap[shareOffers[i].FromUserID]; ok {
			users = append(users, fromUser)
		}
		if shareOffers[i].ToUserID != nil {
			if toUser, ok := userMap[*shareOffers[i].ToUserID]; ok {
				if *shareOffers[i].ToUserID != shareOffers[i].FromUserID {
					users = append(users, toUser)
				}
			}
		}

		responses = append(responses, dto.BoardShareOffersResponse{
			ShareOffer: dto.ShareOfferToResponse(&shareOffers[i]),
			User:       users,
		})
	}

	return responses, nil
}

func (s *ShareService) GetWorkspaceOutgoingShareOffers(ctx context.Context, userID uuid.UUID,
	workspaceID uuid.UUID) ([]WorkspaceOutgoingShareOfferResponse, error) {
	userRoleStr, err := s.MembershipRepo.GetUserWorkspaceRole(ctx, userID, workspaceID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, true)
	}
	userRole, ok := rbac.ParseRole(userRoleStr)
	if !ok {
		return nil, domainerr.ErrForbidden
	}
	if userRole < rbac.Viewer {
		return nil, domainerr.ErrForbidden
	}
	shareOffers, err := s.ShareRepo.GetShareOffersByTypeAndTargetID(ctx, "workspace", workspaceID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	if len(shareOffers) == 0 {
		return []WorkspaceOutgoingShareOfferResponse{}, nil
	}

	userIDSet := make(map[uuid.UUID]struct{})
	for i := range shareOffers {
		userIDSet[shareOffers[i].FromUserID] = struct{}{}
		if shareOffers[i].ToUserID != nil {
			userIDSet[*shareOffers[i].ToUserID] = struct{}{}
		}
	}
	userIDs := make([]uuid.UUID, 0, len(userIDSet))
	for id := range userIDSet {
		userIDs = append(userIDs, id)
	}

	users, err := s.MembershipRepo.GetUsersByIDs(ctx, userIDs)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	userMap := make(map[uuid.UUID]dto.UserResponse, len(users))
	for i := range users {
		userMap[users[i].ID] = dto.UserToResponse(&users[i])
	}

	responses := make([]WorkspaceOutgoingShareOfferResponse, 0, len(shareOffers))
	for i := range shareOffers {
		users := make([]dto.UserResponse, 0, 2)
		if fromUser, ok := userMap[shareOffers[i].FromUserID]; ok {
			users = append(users, fromUser)
		}
		if shareOffers[i].ToUserID != nil {
			if toUser, ok := userMap[*shareOffers[i].ToUserID]; ok {
				if *shareOffers[i].ToUserID != shareOffers[i].FromUserID {
					users = append(users, toUser)
				}
			}
		}

		responses = append(responses, WorkspaceOutgoingShareOfferResponse{
			ShareOffer: dto.ShareOfferToResponse(&shareOffers[i]),
			Users:      users,
		})
	}

	return responses, nil
}

func (s *ShareService) GetUserIncomingShareOffers(ctx context.Context, userID uuid.UUID) ([]models.ShareOffer, error) {
	shareOffers, err := s.ShareRepo.GetUserIncomingShareOffers(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return shareOffers, nil
}

func (s *ShareService) GetUserIncomingShareOffersDetails(ctx context.Context, userID uuid.UUID) ([]dto.ShareOfferDetailsResponse, error) {
	shareOffers, err := s.ShareRepo.GetUserIncomingShareOffers(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	filteredOffers := make([]models.ShareOffer, 0, len(shareOffers))
	workspaceIDSet := make(map[uuid.UUID]struct{})
	for i := range shareOffers {
		if shareOffers[i].TargetType != "workspace" {
			continue
		}
		filteredOffers = append(filteredOffers, shareOffers[i])
		workspaceIDSet[shareOffers[i].TargetID] = struct{}{}
	}

	if len(filteredOffers) == 0 {
		return []dto.ShareOfferDetailsResponse{}, nil
	}

	workspaceIDs := make([]uuid.UUID, 0, len(workspaceIDSet))
	for workspaceID := range workspaceIDSet {
		workspaceIDs = append(workspaceIDs, workspaceID)
	}
	//fmt.Println("filteredOffers: ", filteredOffers, "workspaceIDSet: ", workspaceIDSet, "workspaceIDs: ", workspaceIDs)
	workspaceModels, err := s.WorkspaceRepo.GetWorkspacesByIDs(ctx, workspaceIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	workspaceMap := make(map[uuid.UUID]models.Workspace, len(workspaceModels))
	for i := range workspaceModels {
		workspaceMap[workspaceModels[i].ID] = workspaceModels[i]
	}

	subscriptionModels, err := s.WorkspaceRepo.GetWorkspaceSubscriptionsByWorkspaceIDs(ctx, workspaceIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	//fmt.Println(subscriptionModels)
	subscriptionMap := make(map[uuid.UUID]models.WorkspaceSubscription, len(subscriptionModels))
	for i := range subscriptionModels {
		subscriptionMap[subscriptionModels[i].WorkspaceID] = subscriptionModels[i]
	}

	memberRows, err := s.WorkspaceRepo.GetWorkspaceMembersByWorkspaceIDs(ctx, workspaceIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	memberMap := make(map[uuid.UUID]*workspaceMembersAggregate)
	for i := range memberRows {
		workspaceID := memberRows[i].UserWorkspace.WorkspaceID
		memberSet, ok := memberMap[workspaceID]
		if !ok {
			memberSet = &workspaceMembersAggregate{}
			memberMap[workspaceID] = memberSet
		}
		memberSet.users = append(memberSet.users, dto.UserToResponse(&memberRows[i].User))
		memberSet.userWorkspaces = append(memberSet.userWorkspaces, dto.UserWorkspaceToResponse(&memberRows[i].UserWorkspace))
	}

	responses := make([]dto.ShareOfferDetailsResponse, 0, len(filteredOffers))
	for i := range filteredOffers {
		workspaceID := filteredOffers[i].TargetID
		workspaceModel, ok := workspaceMap[workspaceID]
		if !ok {
			return nil, domainerr.ErrNotFound
		}

		workspaceDetails := dto.WorkspaceDetailsResponse{
			Workspace:             dto.WorkspaceToResponse(&workspaceModel),
			WorkspaceMembers:      []dto.WorkspaceMembersResponse{},
			WorkspaceSubscription: dto.SubscriptionResponse{},
		}

		if memberSet, ok := memberMap[workspaceID]; ok {
			workspaceDetails.WorkspaceMembers = []dto.WorkspaceMembersResponse{
				{
					User:           memberSet.users,
					UsersWorkspace: memberSet.userWorkspaces,
				},
			}
		}
		if subscription, ok := subscriptionMap[workspaceID]; ok {
			workspaceDetails.WorkspaceSubscription = subscriptionToResponse(&subscription)
		}

		responses = append(responses, dto.ShareOfferDetailsResponse{
			ShareOffer:             dto.ShareOfferToResponse(&filteredOffers[i]),
			TargetWorkspaceDetails: workspaceDetails,
		})
	}

	return responses, nil
}

func (s *ShareService) GetUserOutgoingShareOffers(ctx context.Context, userID uuid.UUID) ([]models.ShareOffer, error) {
	shareOffers, err := s.ShareRepo.GetUserOutgoingShareOffers(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return shareOffers, nil
}

func (s *ShareService) GetShareOfferDetailsByID(ctx context.Context, userID, shareID uuid.UUID) (*ShareOfferDetailsByIDResponse, error) {
	shareOffer, err := s.ShareRepo.GetShareOfferByID(ctx, shareID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	isInvolved := shareOffer.FromUserID == userID || (shareOffer.ToUserID != nil && *shareOffer.ToUserID == userID)
	if !isInvolved {
		switch shareOffer.TargetType {
		case "board":
			if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, shareOffer.TargetID, rbac.Admin, s.IncludeDeleted); err != nil {
				return nil, err
			}
		case "workspace":
			if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, shareOffer.TargetID, rbac.Admin, s.IncludeDeleted); err != nil {
				return nil, err
			}
		default:
			return nil, domainerr.ErrValidation
		}
	}

	userIDs := []uuid.UUID{shareOffer.FromUserID}
	if shareOffer.ToUserID != nil && *shareOffer.ToUserID != shareOffer.FromUserID {
		userIDs = append(userIDs, *shareOffer.ToUserID)
	}
	users, err := s.MembershipRepo.GetUsersByIDs(ctx, userIDs)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	involvedUsers := make([]dto.UserResponse, 0, len(users))
	for i := range users {
		involvedUsers = append(involvedUsers, dto.UserToResponse(&users[i]))
	}

	response := &ShareOfferDetailsByIDResponse{
		ShareOffer:    dto.ShareOfferToResponse(shareOffer),
		InvolvedUsers: involvedUsers,
	}

	switch shareOffer.TargetType {
	case "workspace":
		workspaceModels, err := s.WorkspaceRepo.GetWorkspacesByIDs(ctx, []uuid.UUID{shareOffer.TargetID}, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		if len(workspaceModels) == 0 {
			return nil, domainerr.ErrNotFound
		}

		workspaceDetails := dto.WorkspaceDetailsResponse{
			Workspace:             dto.WorkspaceToResponse(&workspaceModels[0]),
			WorkspaceMembers:      []dto.WorkspaceMembersResponse{},
			WorkspaceSubscription: dto.SubscriptionResponse{},
		}

		subscriptionModels, err := s.WorkspaceRepo.GetWorkspaceSubscriptionsByWorkspaceIDs(ctx, []uuid.UUID{shareOffer.TargetID}, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		if len(subscriptionModels) > 0 {
			workspaceDetails.WorkspaceSubscription = subscriptionToResponse(&subscriptionModels[0])
		}

		memberRows, err := s.WorkspaceRepo.GetWorkspaceMembersByWorkspaceIDs(ctx, []uuid.UUID{shareOffer.TargetID}, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		if len(memberRows) > 0 {
			memberUsers := make([]dto.UserResponse, 0, len(memberRows))
			memberUserWorkspaces := make([]dto.UserWorkspaceResponse, 0, len(memberRows))
			for i := range memberRows {
				memberUsers = append(memberUsers, dto.UserToResponse(&memberRows[i].User))
				memberUserWorkspaces = append(memberUserWorkspaces, dto.UserWorkspaceToResponse(&memberRows[i].UserWorkspace))
			}
			workspaceDetails.WorkspaceMembers = []dto.WorkspaceMembersResponse{{
				User:           memberUsers,
				UsersWorkspace: memberUserWorkspaces,
			}}
		}

		response.TargetWorkspaceDetails = &workspaceDetails
	case "board":
		boards, err := s.BoardRepo.GetBoardsByIDs(ctx, []uuid.UUID{shareOffer.TargetID}, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		if len(boards) == 0 {
			return nil, domainerr.ErrNotFound
		}

		workspaceID := boards[0].WorkspaceID
		workspaceModels, err := s.WorkspaceRepo.GetWorkspacesByIDs(ctx, []uuid.UUID{workspaceID}, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		if len(workspaceModels) > 0 {
			workspaceDetails := dto.WorkspaceDetailsResponse{
				Workspace:             dto.WorkspaceToResponse(&workspaceModels[0]),
				WorkspaceMembers:      []dto.WorkspaceMembersResponse{},
				WorkspaceSubscription: dto.SubscriptionResponse{},
			}

			subscriptionModels, err := s.WorkspaceRepo.GetWorkspaceSubscriptionsByWorkspaceIDs(ctx, []uuid.UUID{workspaceID}, s.IncludeDeleted)
			if err != nil {
				return nil, domainerr.MapRepoErr(err, false)
			}
			if len(subscriptionModels) > 0 {
				workspaceDetails.WorkspaceSubscription = subscriptionToResponse(&subscriptionModels[0])
			}

			memberRows, err := s.WorkspaceRepo.GetWorkspaceMembersByWorkspaceIDs(ctx, []uuid.UUID{workspaceID}, s.IncludeDeleted)
			if err != nil {
				return nil, domainerr.MapRepoErr(err, false)
			}
			if len(memberRows) > 0 {
				memberUsers := make([]dto.UserResponse, 0, len(memberRows))
				memberUserWorkspaces := make([]dto.UserWorkspaceResponse, 0, len(memberRows))
				for i := range memberRows {
					memberUsers = append(memberUsers, dto.UserToResponse(&memberRows[i].User))
					memberUserWorkspaces = append(memberUserWorkspaces, dto.UserWorkspaceToResponse(&memberRows[i].UserWorkspace))
				}
				workspaceDetails.WorkspaceMembers = []dto.WorkspaceMembersResponse{{
					User:           memberUsers,
					UsersWorkspace: memberUserWorkspaces,
				}}
			}

			response.TargetWorkspaceDetails = &workspaceDetails
		}

		boardMemberRows, err := s.MembershipRepo.GetUsersBoardRowsByBoardIDs(ctx, []uuid.UUID{shareOffer.TargetID}, s.IncludeDeleted)
		if err != nil {
			return nil, domainerr.MapRepoErr(err, false)
		}
		boardMembers := make([]dto.BoardMemberResponse, 0, len(boardMemberRows))
		for i := range boardMemberRows {
			boardMembers = append(boardMembers, dto.BoardMemberResponse{
				User:      dto.UserToResponse(&boardMemberRows[i].User),
				UserBoard: dto.UserBoardToResponse(&boardMemberRows[i].UserBoard),
			})
		}

		boardDetails := dto.BoardOfferDetailResponse{
			Board:        dto.BoardToResponse(&boards[0]),
			BoardMembers: boardMembers,
		}
		response.TargetBoardDetails = &boardDetails
	default:
		return nil, domainerr.ErrValidation
	}

	return response, nil
}

type workspaceMembersAggregate struct {
	users          []dto.UserResponse
	userWorkspaces []dto.UserWorkspaceResponse
}

func subscriptionToResponse(subscription *models.WorkspaceSubscription) dto.SubscriptionResponse {
	return dto.SubscriptionResponse{
		WorkspaceID: subscription.WorkspaceID,
		Plan:        string(subscription.Plan),
		Status:      subscription.Status,

		CreatedAt: subscription.CreatedAt,
		UpdatedAt: subscription.UpdatedAt,
		DeletedAt: dto.DeletedAtPtr(subscription.DeletedAt),
	}
}

func (s *ShareService) RespondToShareOffer(ctx context.Context, userID uuid.UUID,
	shareID uuid.UUID, req RespondToShareOfferRequest, correlationID uuid.UUID) (*models.ShareOffer, *models.UserBoard, *models.UserWorkspace, error) {
	if req.Decision != "accepted" && req.Decision != "rejected" {
		return nil, nil, nil, domainerr.ErrValidation
	}
	shareoffer, err := s.ShareRepo.GetShareOfferByID(ctx, shareID, s.IncludeDeleted)
	if err != nil {
		return nil, nil, nil, domainerr.MapRepoErr(err, false)
	}
	if shareoffer.Status != "pending" {
		return nil, nil, nil, domainerr.New(domainerr.ErrConflict, "share offer is not pending")
	}
	if shareoffer.Kind == models.ShareOfferKindRequest {
		switch shareoffer.TargetType {
		case "board":
			if err := guard.CheckUserMinRole(ctx, s.MembershipRepo, userID, shareoffer.TargetID, rbac.Admin, s.IncludeDeleted); err != nil {
				return nil, nil, nil, err
			}
		case "workspace":
			if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, shareoffer.TargetID, rbac.Admin, s.IncludeDeleted); err != nil {
				return nil, nil, nil, err
			}
		default:
			return nil, nil, nil, domainerr.ErrValidation
		}
		if req.Decision == "accepted" {
			switch shareoffer.TargetType {
			case "board":
				workspaceID, err := s.WorkspaceRepo.GetWorkspaceIDByBoardID(ctx, shareoffer.TargetID)
				if err != nil {
					return nil, nil, nil, domainerr.MapRepoErr(err, true)
				}

				isWorkspaceMember, err := s.WorkspaceRepo.CheckUserWorkspaceMembership(ctx, shareoffer.FromUserID, workspaceID, s.IncludeDeleted)
				if err != nil {
					return nil, nil, nil, domainerr.MapRepoErr(err, true)
				}

				if _, err := s.MembershipRepo.GetUserRole(ctx, shareoffer.FromUserID, shareoffer.TargetID, s.IncludeDeleted); err == nil {
					now := time.Now()
					shareOfferUpdate := &models.ShareOffer{
						ID:              shareID,
						Status:          models.Accepted,
						DecidedAt:       &now,
						DecidedByUserID: &userID,
					}
					if err := s.ShareRepo.UpdateShareOfferTx(ctx, s.db, shareOfferUpdate); err != nil {
						return nil, nil, nil, domainerr.MapRepoErr(err, false)
					}
					s.emitBoardInviteLifecycleEvent(ctx, userID, correlationID, EventRegistry.EventBoardShareRequestAccepted, workspaceID, shareoffer.TargetID, shareOfferUpdate, nil, nil)
					return shareOfferUpdate, nil, nil, nil
				} else if !errors.Is(err, domainerr.ErrNotFound) {
					return nil, nil, nil, domainerr.MapRepoErr(err, true)
				}

				if !isWorkspaceMember {
					isInSubscriptionPlanLimit, err := s.SubscriptionService.CheckWorkspaceMembershipLimit(ctx, shareoffer.FromUserID)
					if err != nil {
						return nil, nil, nil, domainerr.MapRepoErr(err, true)
					}
					if !isInSubscriptionPlanLimit {
						return nil, nil, nil, domainerr.ErrForbidden
					}
				}

				var userBoard *models.UserBoard
				var userWorkspace *models.UserWorkspace
				var shareOfferUpdate *models.ShareOffer
				err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
					if !isWorkspaceMember {
						workspacePos, err := s.PositionHelper.UserWorkspacePosAtEnd(ctx, shareoffer.FromUserID)
						if err != nil {
							return domainerr.ErrInternal
						}
						userWorkspace = &models.UserWorkspace{
							ID:          uuid.New(),
							UserID:      shareoffer.FromUserID,
							WorkspaceID: workspaceID,
							Role:        rbac.Member,
							Pos:         workspacePos,
						}
						if err := s.WorkspaceRepo.CreateUserWorkspaceTX(ctx, tx, userWorkspace); err != nil {
							return domainerr.MapRepoErr(err, false)
						}
					}

					position, err := s.WorkspacePositionHelper.WorkspaceBoardPosAtEnd(ctx, shareoffer.FromUserID, workspaceID)
					if err != nil {
						return domainerr.ErrInternal
					}
					userBoard = &models.UserBoard{
						UserID:  shareoffer.FromUserID,
						BoardID: shareoffer.TargetID,
						Role:    shareoffer.OfferedRole.String(),
						Pos:     position,
					}
					if err := s.MembershipRepo.CreateUserBoardTX(ctx, tx, userBoard); err != nil {
						return domainerr.MapRepoErr(err, false)
					}
					now := time.Now()
					shareOfferUpdate = &models.ShareOffer{
						ID:              shareID,
						Status:          models.Accepted,
						DecidedAt:       &now,
						DecidedByUserID: &userID,
					}
					if err := s.ShareRepo.UpdateShareOfferTx(ctx, tx, shareOfferUpdate); err != nil {
						return domainerr.MapRepoErr(err, false)
					}
					return nil
				})
				if err != nil {
					return nil, nil, nil, err
				}

				s.emitBoardInviteLifecycleEvent(ctx, userID, correlationID, EventRegistry.EventBoardShareRequestAccepted, workspaceID, shareoffer.TargetID, shareOfferUpdate, userBoard, userWorkspace)

				return shareOfferUpdate, userBoard, userWorkspace, nil
			case "workspace":
				isMember, err := s.WorkspaceRepo.CheckUserWorkspaceMembership(ctx, shareoffer.FromUserID, shareoffer.TargetID, s.IncludeDeleted)
				if err != nil {
					return nil, nil, nil, domainerr.MapRepoErr(err, true)
				}
				if isMember {
					now := time.Now()
					shareOfferUpdate := &models.ShareOffer{
						ID:              shareID,
						Status:          models.Accepted,
						DecidedAt:       &now,
						DecidedByUserID: &userID,
					}
					if err := s.ShareRepo.UpdateShareOfferTx(ctx, s.db, shareOfferUpdate); err != nil {
						return nil, nil, nil, domainerr.MapRepoErr(err, false)
					}
					s.emitWorkspaceRequestLifecycleEvent(ctx, userID, correlationID, EventRegistry.EventWorkspaceShareOfferRequestAccepted, shareoffer.TargetID, shareOfferUpdate, nil)
					return shareOfferUpdate, nil, nil, nil
				}

				isInSubscriptionPlanLimit, err := s.SubscriptionService.CheckWorkspaceMembershipLimit(ctx, shareoffer.FromUserID)
				if err != nil {
					return nil, nil, nil, domainerr.MapRepoErr(err, true)
				}
				if !isInSubscriptionPlanLimit {
					return nil, nil, nil, domainerr.ErrForbidden
				}

				var userWorkspace *models.UserWorkspace
				var shareOfferUpdate *models.ShareOffer
				err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
					position, err := s.PositionHelper.UserWorkspacePosAtEnd(ctx, shareoffer.FromUserID)
					if err != nil {
						return domainerr.ErrInternal
					}
					userWorkspace = &models.UserWorkspace{
						ID:          uuid.New(),
						UserID:      shareoffer.FromUserID,
						WorkspaceID: shareoffer.TargetID,
						Role:        shareoffer.OfferedRole,
						Pos:         position,
					}
					if err := s.WorkspaceRepo.CreateUserWorkspaceTX(ctx, tx, userWorkspace); err != nil {
						return domainerr.MapRepoErr(err, false)
					}
					now := time.Now()
					shareOfferUpdate = &models.ShareOffer{
						ID:              shareID,
						Status:          models.Accepted,
						DecidedAt:       &now,
						DecidedByUserID: &userID,
					}
					if err := s.ShareRepo.UpdateShareOfferTx(ctx, tx, shareOfferUpdate); err != nil {
						return domainerr.MapRepoErr(err, false)
					}
					return nil
				})
				if err != nil {
					return nil, nil, nil, err
				}
				s.emitWorkspaceRequestLifecycleEvent(ctx, userID, correlationID, EventRegistry.EventWorkspaceShareOfferRequestAccepted, shareoffer.TargetID, shareOfferUpdate, userWorkspace)
				return shareOfferUpdate, nil, userWorkspace, nil
			default:
				return nil, nil, nil, domainerr.ErrValidation
			}
		}

		//Request of kind request that is rejected -> only update share offer status
		now := time.Now()
		shareOfferUpdate := &models.ShareOffer{
			ID:              shareID,
			Status:          models.Rejected,
			DecidedAt:       &now,
			DecidedByUserID: &userID,
		}
		if err := s.ShareRepo.UpdateShareOfferTx(ctx, s.db, shareOfferUpdate); err != nil {
			return nil, nil, nil, domainerr.MapRepoErr(err, false)
		}

		switch shareoffer.TargetType {
		case "board":
			statePayload := dto.BoardDetailResponse{
				ShareOffers: []dto.ShareOfferResponse{
					dto.ShareOfferToResponse(shareOfferUpdate),
				},
			}
			envelope := EventRegistry.EventPayloadEnvelope{
				StatePayload: &statePayload,
			}
			targets := []EventRegistry.TargetRef{
				{
					EntityType: "board",
					EntityID:   shareoffer.TargetID,
				},
				{
					EntityType: "user",
					EntityID:   shareoffer.FromUserID,
				},
			}
			domainEvent := EventRegistry.DomainEvent{
				Type:          EventRegistry.EventBoardShareRequestRejected,
				ActorUserID:   &userID,
				BoardID:       &shareoffer.TargetID,
				Payload:       envelope,
				CorrelationID: &correlationID,
				Targets:       targets,
				OccurredAt:    time.Now(),
			}
			if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
				fmt.Println("Failed to emit event:", err)
			}
		case "workspace":
			s.emitWorkspaceRequestLifecycleEvent(ctx, userID, correlationID, EventRegistry.EventWorkspaceShareOfferRequestRejected, shareoffer.TargetID, shareOfferUpdate, nil)
		default:
			return nil, nil, nil, domainerr.ErrValidation
		}

		return shareOfferUpdate, nil, nil, nil
	}
	if shareoffer.ToUserID == nil || *shareoffer.ToUserID != userID {
		return nil, nil, nil, domainerr.ErrForbidden
	}

	shareOfferType := shareoffer.TargetType
	shareOfferTargetID := shareoffer.TargetID

	if req.Decision == "accepted" {
		//Depending on the offer type (board/workspace) create the corresponding relationship and update share offer status
		switch shareOfferType {
		case "board":
			workspaceID, err := s.WorkspaceRepo.GetWorkspaceIDByBoardID(ctx, shareOfferTargetID)
			if err != nil {
				return nil, nil, nil, domainerr.MapRepoErr(err, true)
			}
			ok, err := s.WorkspaceRepo.CheckUserWorkspaceMembership(ctx, userID, workspaceID, s.IncludeDeleted)
			if err != nil {
				return nil, nil, nil, domainerr.MapRepoErr(err, true)
			}
			if !ok { //User is entering in a new workspace
				isInSubscriptionPlanLimit, err := s.SubscriptionService.CheckWorkspaceMembershipLimit(ctx, userID)
				if err != nil {
					return nil, nil, nil, domainerr.MapRepoErr(err, true)
				}
				if !isInSubscriptionPlanLimit {
					return nil, nil, nil, domainerr.ErrForbidden
				} else {
					var userWorkspace *models.UserWorkspace
					var userBoard *models.UserBoard
					var shareOfferUpdate *models.ShareOffer

					err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
						//Create userWorkspace relationship
						position, err := s.PositionHelper.UserWorkspacePosAtEnd(ctx, userID)
						if err != nil {
							return domainerr.ErrInternal
						}
						userWorkspace = &models.UserWorkspace{
							ID:          uuid.New(),
							UserID:      userID,
							WorkspaceID: workspaceID,
							Role:        rbac.Member,
							Pos:         position,
						}
						if err := s.WorkspaceRepo.CreateUserWorkspaceTX(ctx, tx, userWorkspace); err != nil {
							return domainerr.MapRepoErr(err, false)
						}
						//Create userBoard relationship
						boardPos, err := s.WorkspacePositionHelper.WorkspaceBoardPosAtEnd(ctx, userID, workspaceID)
						if err != nil {
							return domainerr.ErrInternal
						}
						userBoard = &models.UserBoard{
							UserID:  userID,
							BoardID: shareOfferTargetID,
							Role:    shareoffer.OfferedRole.String(),
							Pos:     boardPos,
						}
						if err := s.MembershipRepo.CreateUserBoardTX(ctx, tx, userBoard); err != nil {
							return domainerr.MapRepoErr(err, false)
						}
						// Update share offer status
						now := time.Now()
						shareOfferUpdate = &models.ShareOffer{
							ID:              shareID,
							Status:          models.Accepted,
							DecidedByUserID: &userID,
							DecidedAt:       &now,
						}
						err = s.ShareRepo.UpdateShareOfferTx(ctx, tx, shareOfferUpdate)
						if err != nil {
							return domainerr.MapRepoErr(err, false)
						}
						return nil
					})
					if err != nil {
						return nil, nil, nil, err
					}
					s.emitBoardInviteLifecycleEvent(ctx, userID, correlationID, EventRegistry.EventBoardShareInviteAccepted, workspaceID, shareOfferTargetID, shareOfferUpdate, userBoard, userWorkspace)
					return shareOfferUpdate, userBoard, userWorkspace, nil

				}
			} else { //User is already member of the workspace, check if he is already member of the board
				_, err := s.MembershipRepo.GetUserRole(ctx, userID, shareOfferTargetID, s.IncludeDeleted)
				if err == nil { //User is already member -> only update the share offer status
					now := time.Now()
					shareOfferUpdate := &models.ShareOffer{
						ID:              shareID,
						Status:          models.Accepted,
						DecidedByUserID: &userID,
						DecidedAt:       &now,
					}
					err := s.ShareRepo.UpdateShareOfferTx(ctx, s.db, shareOfferUpdate)
					if err != nil {
						return nil, nil, nil, domainerr.MapRepoErr(err, false)
					}
					s.emitBoardInviteLifecycleEvent(ctx, userID, correlationID, EventRegistry.EventBoardShareInviteAccepted, workspaceID, shareOfferTargetID, shareOfferUpdate, nil, nil)
					return shareOfferUpdate, nil, nil, nil

				}
				if !errors.Is(err, domainerr.ErrNotFound) {
					return nil, nil, nil, domainerr.MapRepoErr(err, true)
				}
				//User is not member -> create userBoard relationship and update share offer status
				var userBoard *models.UserBoard
				var shareOfferUpdate *models.ShareOffer
				err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
					//Create userBoard relationship
					position, err := s.WorkspacePositionHelper.WorkspaceBoardPosAtEnd(ctx, userID, workspaceID)
					if err != nil {
						return domainerr.ErrInternal
					}
					userBoard = &models.UserBoard{
						UserID:  userID,
						BoardID: shareOfferTargetID,
						Role:    shareoffer.OfferedRole.String(),
						Pos:     position,
					}
					if err := s.MembershipRepo.CreateUserBoardTX(ctx, tx, userBoard); err != nil {
						return domainerr.MapRepoErr(err, false)
					}
					// Update share offer status
					now := time.Now()
					shareOfferUpdate = &models.ShareOffer{
						ID:              shareID,
						Status:          models.Accepted,
						DecidedByUserID: &userID,
						DecidedAt:       &now,
					}
					err = s.ShareRepo.UpdateShareOfferTx(ctx, tx, shareOfferUpdate)
					if err != nil {
						return domainerr.MapRepoErr(err, false)
					}
					return nil
				})
				if err != nil {
					return nil, nil, nil, err
				}

				s.emitBoardInviteLifecycleEvent(ctx, userID, correlationID, EventRegistry.EventBoardShareInviteAccepted, workspaceID, shareOfferTargetID, shareOfferUpdate, userBoard, nil)

				return shareOfferUpdate, userBoard, nil, nil
			}
		case "workspace":
			isMember, err := s.WorkspaceRepo.CheckUserWorkspaceMembership(ctx, userID, shareOfferTargetID, s.IncludeDeleted)
			if err != nil {
				return nil, nil, nil, domainerr.MapRepoErr(err, true)
			}
			if isMember {
				return nil, nil, nil, domainerr.New(domainerr.ErrConflict, "user is already a workspace member")
			} else {
				isInSubscriptionPlanLimit, err := s.SubscriptionService.CheckWorkspaceMembershipLimit(ctx, userID)
				if err != nil {
					return nil, nil, nil, domainerr.MapRepoErr(err, true)
				}
				if !isInSubscriptionPlanLimit {
					return nil, nil, nil, domainerr.ErrForbidden
				} else {
					var userWorkspace *models.UserWorkspace
					var shareOfferUpdate *models.ShareOffer
					err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
						//Create userWorkspace relationship
						position, err := s.PositionHelper.UserWorkspacePosAtEnd(ctx, userID)
						if err != nil {
							return domainerr.ErrInternal
						}
						userWorkspace = &models.UserWorkspace{
							ID:          uuid.New(),
							UserID:      userID,
							WorkspaceID: shareOfferTargetID,
							Role:        shareoffer.OfferedRole,
							Pos:         position,
						}
						if err := s.WorkspaceRepo.CreateUserWorkspaceTX(ctx, tx, userWorkspace); err != nil {
							return domainerr.MapRepoErr(err, false)
						}
						// Update share offer status
						now := time.Now()
						shareOfferUpdate = &models.ShareOffer{
							ID:              shareID,
							Status:          models.Accepted,
							DecidedByUserID: &userID,
							DecidedAt:       &now,
						}

						err = s.ShareRepo.UpdateShareOfferTx(ctx, tx, shareOfferUpdate)
						if err != nil {
							return domainerr.MapRepoErr(err, false)
						}
						return nil
					})
					if err != nil {
						return nil, nil, nil, err
					}

					offerResponse := dto.ShareOfferToResponse(shareOfferUpdate)
					userWorkspaceResponse := dto.UserWorkspaceToResponse(userWorkspace)
					statePayload := &dto.BoardDetailResponse{
						ShareOffers:            []dto.ShareOfferResponse{offerResponse},
						UserWorkspaceRelations: []dto.UserWorkspaceResponse{userWorkspaceResponse},
					}
					envelope := EventRegistry.EventPayloadEnvelope{
						StatePayload: statePayload,
					}

					targets := []EventRegistry.TargetRef{
						{
							EntityType: "workspace",
							EntityID:   shareoffer.TargetID,
						},
						{
							EntityType: "user",
							EntityID:   shareoffer.FromUserID,
						},
						{
							EntityType: "user",
							EntityID:   userID,
						},
					}

					userEventType := ws.EventUserWorkspaceShareOfferInviteAccepted
					domainEvent := EventRegistry.DomainEvent{
						Type:          EventRegistry.EventWorkspaceShareOfferInviteAccepted,
						UserEventType: &userEventType,
						Payload:       envelope,
						WorkspaceID:   &shareoffer.TargetID,
						CorrelationID: &correlationID,
						ActorUserID:   &userID,
						Targets:       targets,
						OccurredAt:    time.Now(),
					}
					if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
						fmt.Println("failed to emit event: ", err)
					}

					return shareOfferUpdate, nil, userWorkspace, nil

				}
			}
		default:
			return nil, nil, nil, domainerr.ErrValidation
		}
	} else if req.Decision == "rejected" {
		now := time.Now()
		shareOfferUpdate := &models.ShareOffer{
			ID:              shareID,
			Status:          models.ShareOfferStatus(req.Decision),
			DecidedByUserID: &userID,
			DecidedAt:       &now,
		}
		err := s.ShareRepo.UpdateShareOfferTx(ctx, s.db, shareOfferUpdate)
		if err != nil {
			return nil, nil, nil, domainerr.MapRepoErr(err, false)
		}
		if shareoffer.TargetType == "board" {
			workspaceID, resolveErr := s.WorkspaceRepo.GetWorkspaceIDByBoardID(ctx, shareoffer.TargetID)
			if resolveErr != nil {
				return nil, nil, nil, domainerr.MapRepoErr(resolveErr, true)
			}
			s.emitBoardInviteLifecycleEvent(ctx, userID, correlationID, EventRegistry.EventBoardShareInviteRejected, workspaceID, shareoffer.TargetID, shareOfferUpdate, nil, nil)
		} else {
			offerResponse := dto.ShareOfferToResponse(shareOfferUpdate)
			statePayload := &dto.BoardDetailResponse{
				ShareOffers: []dto.ShareOfferResponse{offerResponse},
			}
			envelope := EventRegistry.EventPayloadEnvelope{
				StatePayload: statePayload,
			}
			targets := []EventRegistry.TargetRef{
				{
					EntityType: "workspace",
					EntityID:   shareoffer.TargetID,
				},
				{
					EntityType: "user",
					EntityID:   shareoffer.FromUserID,
				},
				{
					EntityType: "user",
					EntityID:   userID,
				},
			}
			userEventType := ws.EventUserWorkspaceShareOfferInviteRejected
			domainEvent := EventRegistry.DomainEvent{
				Type:          EventRegistry.EventWorkspaceShareOfferInviteRejected,
				UserEventType: &userEventType,
				Payload:       envelope,
				WorkspaceID:   &shareoffer.TargetID,
				ActorUserID:   &userID,
				CorrelationID: &correlationID,
				Targets:       targets,
				OccurredAt:    time.Now(),
			}

			if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
				fmt.Println("failed to emit event: ", err)
			}
		}

		return shareOfferUpdate, nil, nil, nil
	}
	return nil, nil, nil, domainerr.ErrValidation

}

func (s *ShareService) RevokeShareOffer(ctx context.Context, userID uuid.UUID,
	shareID uuid.UUID, req ShareOfferRevokeRequest, correlationID uuid.UUID) (*models.ShareOffer, error) {
	_ = req

	shareOffer, err := s.ShareRepo.GetShareOfferByID(ctx, shareID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	if shareOffer.FromUserID != userID {
		return nil, domainerr.ErrForbidden
	}
	if shareOffer.Status != models.Pending {
		return nil, domainerr.ErrConflict
	}

	now := time.Now()
	update := &models.ShareOffer{
		ID:              shareID,
		Status:          models.Revoked,
		DecidedByUserID: &userID,
		DecidedAt:       &now,
	}
	if err := s.ShareRepo.UpdateShareOfferTx(ctx, s.db, update); err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	statePayload := &dto.BoardDetailResponse{
		ShareOffers: []dto.ShareOfferResponse{dto.ShareOfferToResponse(update)},
	}
	envelope := EventRegistry.EventPayloadEnvelope{
		StatePayload: statePayload,
	}

	var workspaceID uuid.UUID
	var userEventType *ws.UserEventType
	var eventType EventRegistry.DomainEventType
	var boardID *uuid.UUID

	targets := []EventRegistry.TargetRef{
		{
			EntityType: "user",
			EntityID:   shareOffer.FromUserID,
		},
	}
	if shareOffer.ToUserID != nil {
		targets = append(targets, EventRegistry.TargetRef{
			EntityType: "user",
			EntityID:   *shareOffer.ToUserID,
		})
	}

	switch shareOffer.TargetType {

	case "workspace":
		workspaceID = shareOffer.TargetID
		targets = append(targets, EventRegistry.TargetRef{
			EntityType: "workspace",
			EntityID:   shareOffer.TargetID,
		})
		if shareOffer.Kind == models.ShareOfferKindRequest {
			eventType = EventRegistry.EventWorkspaceShareOfferRequestRevoked
		} else {
			evtType := ws.EventUserWorkspaceShareOfferInviteRevoked
			userEventType = &evtType
			eventType = EventRegistry.EventWorkspaceShareOfferInviteRevoked
		}

	case "board":
		resolvedWorkspaceID, resolveErr := s.WorkspaceRepo.GetWorkspaceIDByBoardID(ctx, shareOffer.TargetID)
		if resolveErr != nil {
			return nil, domainerr.MapRepoErr(resolveErr, true)
		}
		workspaceID = resolvedWorkspaceID
		targets = append(targets, EventRegistry.TargetRef{
			EntityType: "board",
			EntityID:   shareOffer.TargetID,
		})
		if shareOffer.Kind == models.ShareOfferKindRequest {
			eventType = EventRegistry.EventBoardShareRequestRevoked
		} else {
			eventType = EventRegistry.EventBoardShareOfferInviteRevoked
		}
		boardID = &shareOffer.TargetID
	default:
		return nil, domainerr.ErrValidation
	}

	domainEvent := EventRegistry.DomainEvent{
		Type:          eventType,
		UserEventType: userEventType,
		Payload:       envelope,
		CorrelationID: &correlationID,
		WorkspaceID:   &workspaceID,
		BoardID:       boardID,
		ActorUserID:   &userID,
		Targets:       targets,
		OccurredAt:    time.Now(),
	}

	if err := s.EventRegistry.Emit(ctx, s.db, domainEvent); err != nil {
		fmt.Println("failed to emit event: ", err)
	}

	return update, nil
}

func (s *ShareService) GetUserBoardRequestsOutgoing(ctx context.Context, userID uuid.UUID) ([]BoardShareOffersDetails, error) {
	shareOffers, err := s.ShareRepo.GetUserBoardRequestsOutgoing(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	return s.buildBoardShareOfferDetails(ctx, shareOffers)
}

func (s *ShareService) GetUserBoardInvitesIncoming(ctx context.Context, userID uuid.UUID) ([]BoardShareOffersDetails, error) {
	shareOffers, err := s.ShareRepo.GetUserBoardInvitesIncoming(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	return s.buildBoardShareOfferDetails(ctx, shareOffers)
}

func (s *ShareService) GetUserWorkspaceRequestsOutgoing(ctx context.Context, userID uuid.UUID) ([]dto.ShareOfferDetailsResponse, error) {
	shareOffers, err := s.ShareRepo.GetUserWorkspaceRequestsOutgoing(ctx, userID, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}

	if len(shareOffers) == 0 {
		return []dto.ShareOfferDetailsResponse{}, nil
	}

	workspaceIDSet := make(map[uuid.UUID]struct{})
	for i := range shareOffers {
		if shareOffers[i].TargetType == "workspace" {
			workspaceIDSet[shareOffers[i].TargetID] = struct{}{}
		}
	}
	workspaceIDs := make([]uuid.UUID, 0, len(workspaceIDSet))
	for workspaceID := range workspaceIDSet {
		workspaceIDs = append(workspaceIDs, workspaceID)
	}
	if len(workspaceIDs) == 0 {
		return []dto.ShareOfferDetailsResponse{}, nil
	}

	workspaceModels, err := s.WorkspaceRepo.GetWorkspacesByIDs(ctx, workspaceIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	workspaceMap := make(map[uuid.UUID]models.Workspace, len(workspaceModels))
	for i := range workspaceModels {
		workspaceMap[workspaceModels[i].ID] = workspaceModels[i]
	}

	subscriptionModels, err := s.WorkspaceRepo.GetWorkspaceSubscriptionsByWorkspaceIDs(ctx, workspaceIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	subscriptionMap := make(map[uuid.UUID]models.WorkspaceSubscription, len(subscriptionModels))
	for i := range subscriptionModels {
		subscriptionMap[subscriptionModels[i].WorkspaceID] = subscriptionModels[i]
	}

	memberRows, err := s.WorkspaceRepo.GetWorkspaceMembersByWorkspaceIDs(ctx, workspaceIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	workspaceMemberMap := make(map[uuid.UUID]*workspaceMembersAggregate)
	for i := range memberRows {
		workspaceID := memberRows[i].UserWorkspace.WorkspaceID
		memberSet, ok := workspaceMemberMap[workspaceID]
		if !ok {
			memberSet = &workspaceMembersAggregate{}
			workspaceMemberMap[workspaceID] = memberSet
		}
		memberSet.users = append(memberSet.users, dto.UserToResponse(&memberRows[i].User))
		memberSet.userWorkspaces = append(memberSet.userWorkspaces, dto.UserWorkspaceToResponse(&memberRows[i].UserWorkspace))
	}

	responses := make([]dto.ShareOfferDetailsResponse, 0, len(shareOffers))
	for i := range shareOffers {
		if shareOffers[i].TargetType != "workspace" {
			continue
		}

		workspaceModel, ok := workspaceMap[shareOffers[i].TargetID]
		if !ok {
			return nil, domainerr.ErrNotFound
		}

		workspaceDetails := dto.WorkspaceDetailsResponse{
			Workspace:             dto.WorkspaceToResponse(&workspaceModel),
			WorkspaceMembers:      []dto.WorkspaceMembersResponse{},
			WorkspaceSubscription: dto.SubscriptionResponse{},
		}
		if memberSet, ok := workspaceMemberMap[shareOffers[i].TargetID]; ok {
			workspaceDetails.WorkspaceMembers = []dto.WorkspaceMembersResponse{
				{
					User:           memberSet.users,
					UsersWorkspace: memberSet.userWorkspaces,
				},
			}
		}
		if subscription, ok := subscriptionMap[shareOffers[i].TargetID]; ok {
			workspaceDetails.WorkspaceSubscription = subscriptionToResponse(&subscription)
		}

		responses = append(responses, dto.ShareOfferDetailsResponse{
			ShareOffer:             dto.ShareOfferToResponse(&shareOffers[i]),
			TargetWorkspaceDetails: workspaceDetails,
		})
	}

	return responses, nil
}

func (s *ShareService) GetPendingOfferTargetBoardsByWorkspaceForUser(ctx context.Context, userID, workspaceID uuid.UUID) (PendingWorkspaceBoardTargetsResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, workspaceID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return PendingWorkspaceBoardTargetsResponse{}, err
	}

	shareOffers, err := s.ShareRepo.GetPendingBoardShareOffersByWorkspaceForUser(ctx, workspaceID, userID, s.IncludeDeleted)
	if err != nil {
		return PendingWorkspaceBoardTargetsResponse{}, domainerr.MapRepoErr(err, false)
	}

	if len(shareOffers) == 0 {
		return PendingWorkspaceBoardTargetsResponse{
			OfferedBoards:   []dto.BoardResponse{},
			RequestedBoards: []dto.BoardResponse{},
			ShareOffers:     []dto.ShareOfferResponse{},
		}, nil
	}

	offeredBoardIDSet := make(map[uuid.UUID]struct{})
	requestedBoardIDSet := make(map[uuid.UUID]struct{})
	allBoardIDSet := make(map[uuid.UUID]struct{})

	for i := range shareOffers {
		boardID := shareOffers[i].TargetID
		allBoardIDSet[boardID] = struct{}{}
		switch shareOffers[i].Kind {
		case models.ShareOfferKindInvite:
			offeredBoardIDSet[boardID] = struct{}{}
		case models.ShareOfferKindRequest:
			requestedBoardIDSet[boardID] = struct{}{}
		}
	}

	allBoardIDs := make([]uuid.UUID, 0, len(allBoardIDSet))
	for boardID := range allBoardIDSet {
		allBoardIDs = append(allBoardIDs, boardID)
	}

	boardModels, err := s.BoardRepo.GetBoardsByIDs(ctx, allBoardIDs, s.IncludeDeleted)
	if err != nil {
		return PendingWorkspaceBoardTargetsResponse{}, domainerr.MapRepoErr(err, false)
	}

	boardByID := make(map[uuid.UUID]models.Board, len(boardModels))
	for i := range boardModels {
		boardByID[boardModels[i].ID] = boardModels[i]
	}

	offeredBoards := make([]dto.BoardResponse, 0, len(offeredBoardIDSet))
	requestedBoards := make([]dto.BoardResponse, 0, len(requestedBoardIDSet))
	seenOffered := make(map[uuid.UUID]struct{})
	seenRequested := make(map[uuid.UUID]struct{})

	for i := range shareOffers {
		boardID := shareOffers[i].TargetID
		boardModel, ok := boardByID[boardID]
		if !ok {
			continue
		}
		switch shareOffers[i].Kind {
		case models.ShareOfferKindInvite:
			if _, already := seenOffered[boardID]; already {
				continue
			}
			seenOffered[boardID] = struct{}{}
			offeredBoards = append(offeredBoards, dto.BoardToResponse(&boardModel))
		case models.ShareOfferKindRequest:
			if _, already := seenRequested[boardID]; already {
				continue
			}
			seenRequested[boardID] = struct{}{}
			requestedBoards = append(requestedBoards, dto.BoardToResponse(&boardModel))
		}
	}

	shareOfferResponses := dto.ShareOffersToResponses(shareOffers)

	return PendingWorkspaceBoardTargetsResponse{
		OfferedBoards:   offeredBoards,
		RequestedBoards: requestedBoards,
		ShareOffers:     shareOfferResponses,
	}, nil
}

func (s *ShareService) GetPendingBoardAccessRequestCountsByWorkspaceForAdminOwner(ctx context.Context, userID, workspaceID uuid.UUID) (PendingWorkspaceBoardAccessRequestsResponse, error) {
	if err := guard.CheckUserMinWorkspaceRole(ctx, s.MembershipRepo, userID, workspaceID, rbac.Viewer, s.IncludeDeleted); err != nil {
		return PendingWorkspaceBoardAccessRequestsResponse{}, err
	}

	countByBoardID, err := s.ShareRepo.GetPendingBoardAccessRequestCountsByWorkspaceForAdminOwner(ctx, workspaceID, userID, s.IncludeDeleted)
	if err != nil {
		return PendingWorkspaceBoardAccessRequestsResponse{}, domainerr.MapRepoErr(err, false)
	}

	if len(countByBoardID) == 0 {
		return PendingWorkspaceBoardAccessRequestsResponse{BoardRequests: []BoardPendingAccessRequestCountResponse{}}, nil
	}

	boardIDs := make([]uuid.UUID, 0, len(countByBoardID))
	for boardID := range countByBoardID {
		boardIDs = append(boardIDs, boardID)
	}

	boardModels, err := s.BoardRepo.GetBoardsByIDs(ctx, boardIDs, s.IncludeDeleted)
	if err != nil {
		return PendingWorkspaceBoardAccessRequestsResponse{}, domainerr.MapRepoErr(err, false)
	}

	responses := make([]BoardPendingAccessRequestCountResponse, 0, len(boardModels))
	for i := range boardModels {
		boardID := boardModels[i].ID
		pendingCount, ok := countByBoardID[boardID]
		if !ok {
			continue
		}
		responses = append(responses, BoardPendingAccessRequestCountResponse{
			Board:                dto.BoardToResponse(&boardModels[i]),
			PendingRequestsCount: pendingCount,
		})
	}

	return PendingWorkspaceBoardAccessRequestsResponse{BoardRequests: responses}, nil
}

func (s *ShareService) buildBoardShareOfferDetails(ctx context.Context, shareOffers []models.ShareOffer) ([]BoardShareOffersDetails, error) {
	if len(shareOffers) == 0 {
		return []BoardShareOffersDetails{}, nil
	}

	boardIDSet := make(map[uuid.UUID]struct{})
	for i := range shareOffers {
		boardIDSet[shareOffers[i].TargetID] = struct{}{}
	}
	boardIDs := make([]uuid.UUID, 0, len(boardIDSet))
	for boardID := range boardIDSet {
		boardIDs = append(boardIDs, boardID)
	}

	boards, err := s.BoardRepo.GetBoardsByIDs(ctx, boardIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	boardMap := make(map[uuid.UUID]models.Board, len(boards))
	workspaceIDSet := make(map[uuid.UUID]struct{})
	for i := range boards {
		boardMap[boards[i].ID] = boards[i]
		workspaceIDSet[boards[i].WorkspaceID] = struct{}{}
	}
	workspaceIDs := make([]uuid.UUID, 0, len(workspaceIDSet))
	for workspaceID := range workspaceIDSet {
		workspaceIDs = append(workspaceIDs, workspaceID)
	}

	workspaceModels, err := s.WorkspaceRepo.GetWorkspacesByIDs(ctx, workspaceIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	workspaceMap := make(map[uuid.UUID]models.Workspace, len(workspaceModels))
	for i := range workspaceModels {
		workspaceMap[workspaceModels[i].ID] = workspaceModels[i]
	}

	subscriptionModels, err := s.WorkspaceRepo.GetWorkspaceSubscriptionsByWorkspaceIDs(ctx, workspaceIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	subscriptionMap := make(map[uuid.UUID]models.WorkspaceSubscription, len(subscriptionModels))
	for i := range subscriptionModels {
		subscriptionMap[subscriptionModels[i].WorkspaceID] = subscriptionModels[i]
	}

	memberRows, err := s.WorkspaceRepo.GetWorkspaceMembersByWorkspaceIDs(ctx, workspaceIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	workspaceMemberMap := make(map[uuid.UUID]*workspaceMembersAggregate)
	for i := range memberRows {
		workspaceID := memberRows[i].UserWorkspace.WorkspaceID
		memberSet, ok := workspaceMemberMap[workspaceID]
		if !ok {
			memberSet = &workspaceMembersAggregate{}
			workspaceMemberMap[workspaceID] = memberSet
		}
		memberSet.users = append(memberSet.users, dto.UserToResponse(&memberRows[i].User))
		memberSet.userWorkspaces = append(memberSet.userWorkspaces, dto.UserWorkspaceToResponse(&memberRows[i].UserWorkspace))
	}

	boardMemberRows, err := s.MembershipRepo.GetUsersBoardRowsByBoardIDs(ctx, boardIDs, s.IncludeDeleted)
	if err != nil {
		return nil, domainerr.MapRepoErr(err, false)
	}
	boardMemberMap := make(map[uuid.UUID][]dto.BoardMemberResponse)
	for i := range boardMemberRows {
		boardID := boardMemberRows[i].UserBoard.BoardID
		boardMemberMap[boardID] = append(boardMemberMap[boardID], dto.BoardMemberResponse{
			User:      dto.UserToResponse(&boardMemberRows[i].User),
			UserBoard: dto.UserBoardToResponse(&boardMemberRows[i].UserBoard),
		})
	}

	responses := make([]BoardShareOffersDetails, 0, len(shareOffers))
	for i := range shareOffers {
		boardID := shareOffers[i].TargetID
		boardModel, ok := boardMap[boardID]
		if !ok {
			continue
		}

		workspaceID := boardModel.WorkspaceID
		workspaceModel, ok := workspaceMap[workspaceID]
		if !ok {
			continue
		}

		workspaceDetails := dto.WorkspaceDetailsResponse{
			Workspace:             dto.WorkspaceToResponse(&workspaceModel),
			WorkspaceMembers:      []dto.WorkspaceMembersResponse{},
			WorkspaceSubscription: dto.SubscriptionResponse{},
		}
		if memberSet, ok := workspaceMemberMap[workspaceID]; ok {
			workspaceDetails.WorkspaceMembers = []dto.WorkspaceMembersResponse{
				{
					User:           memberSet.users,
					UsersWorkspace: memberSet.userWorkspaces,
				},
			}
		}
		if subscription, ok := subscriptionMap[workspaceID]; ok {
			workspaceDetails.WorkspaceSubscription = subscriptionToResponse(&subscription)
		}

		boardDetails := dto.BoardOfferDetailResponse{
			Board:        dto.BoardToResponse(&boardModel),
			BoardMembers: boardMemberMap[boardID],
		}

		responses = append(responses, BoardShareOffersDetails{
			ShareOffer:             dto.ShareOfferToResponse(&shareOffers[i]),
			TargetBoardDetails:     boardDetails,
			TargetWorkspaceDetails: workspaceDetails,
		})
	}

	return responses, nil
}
