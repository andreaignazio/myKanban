package server

import (
	BoardLabels "GoGORM/internal/boardlabels"
	"GoGORM/internal/cardcomments"
	"GoGORM/internal/cardmembers"
	"GoGORM/internal/checklists"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/internal/health"
	"GoGORM/internal/inbox"
	"GoGORM/internal/links"
	"GoGORM/internal/listcards"
	"GoGORM/internal/media"
	"GoGORM/internal/memberships"
	"GoGORM/internal/models/boards"
	"GoGORM/internal/models/cards"
	"GoGORM/internal/models/lists"
	"GoGORM/internal/models/workspaces"
	"GoGORM/internal/server/middleware"
	"GoGORM/internal/sharelinks"
	"GoGORM/internal/shares"
	"GoGORM/internal/subscription"
	userNotification "GoGORM/internal/usernotification"
	userWatch "GoGORM/internal/userwatch"
	"GoGORM/internal/ws"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func NewRouter(db *gorm.DB,
	healthHandler *health.Handler,
	boardsHandler *boards.BoardsHandler,
	listsHandler *lists.ListsHandler, linksHandler *links.LinksHandler,
	shareHandler *shares.ShareHandler,
	cardsHandler *cards.CardsHandler,
	listCardsHandler *listcards.ListCardsHandler,
	eventRegistryHandler *EventRegistry.EventRegistryHandler,
	membersHandler *memberships.MembershipHandler,
	wsHandler *ws.WsHandler,
	workspacesHandler *workspaces.WorkspacesHandler,
	shareLinksHandler *sharelinks.ShareLinksHandler,
	userWatchHandler *userWatch.UserWatchHandler,
	userNotificationHandler *userNotification.UserNotificationHandler,
	boardLabelsHandler *BoardLabels.BoardLabelsHandler,
	mediaHandler *media.MediaHandler,
	cardMembersHandler *cardmembers.CardMembersHandler,
	checklistHandler *checklists.ChecklistHandler,
	cardCommentsHandler *cardcomments.CardCommentsHandler,
	inboxHandler *inbox.InboxHandler,
	subscriptionHandler *subscription.SubscriptionHandler,
) *gin.Engine {

	r := gin.Default()
	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
			"http://localhost:5174",
			"http://127.0.0.1:5174",
		},
		AllowOriginFunc: func(origin string) bool {
			return true
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "x-userID"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	r.GET("/status", healthHandler.GetStatus)
	r.POST("/auth/register", membersHandler.RegisterUser)
	r.GET("/sharelinks/:token", shareLinksHandler.GetPublicShareLinkByToken)
	r.GET("/api/public/sharelinks/:token", shareLinksHandler.GetPublicShareLinkByToken)

	r.POST("/webhooks/stripe", subscriptionHandler.HandleStripeBillingWebhook)

	api := r.Group("/api", middleware.AuthFromHeader(), middleware.CorrelationID())
	api.Use(middleware.ResolveWorkspaceFromBoardID(db))
	{
		api.GET("/ws", wsHandler.ServeWs)
		api.GET("/media/providers/unsplash/search", mediaHandler.SearchUnsplash)

		users := api.Group("/users")
		{
			users.GET("/me", membersHandler.GetMe)
			users.PATCH("/me/props", membersHandler.PatchMeProps)
			users.PATCH("/me/detail", membersHandler.PatchMeDetail)
			users.GET("/search", membersHandler.SearchUsers)
			users.POST("/lookup", membersHandler.GetUsersByIDs)
			users.GET("/notifications", userNotificationHandler.GetUserNotifications)
			users.PATCH("/notifications/markread", userNotificationHandler.MarkNotificationsAsRead)
			users.PATCH("/notifications/markunread", userNotificationHandler.MarkNotificationsAsUnread)
		}
		inbox := api.Group("/inbox")
		{
			inbox.GET("/cards", inboxHandler.GetInboxCards)
			inbox.GET("/cards/:cardID/activity", eventRegistryHandler.GetInboxCardActivity)
			inbox.POST("/cards", inboxHandler.CreateInboxCard)

			inbox.DELETE("/cards/:cardID", inboxHandler.DetatchInboxCard)
			inbox.PATCH("/cards/:cardID/move", inboxHandler.MoveInboxCard)
		}

		boards := api.Group("/boards")
		{
			boards.GET("/", boardsHandler.GetUserBoards)
			boards.POST("/", boardsHandler.CreateBoard)

			//boards.GET("/:boardID", boardsHandler.GetUserBoard)
			boards.GET("/:boardID", linksHandler.GetUserBoardDetail)

			boards.PATCH("/:boardID", boardsHandler.PatchBoard) //PATCH BOARD METADATA (TITLE, ETC)
			boards.PATCH("/:boardID/me/props", boardsHandler.PatchMyUserBoardProps)

			boards.DELETE("/:boardID", boardsHandler.DeleteBoard)

			//duplicate board with lists and cards (deep and shallow) (POST)

			//MEMBERSHIP
			boards.GET("/:boardID/members", membersHandler.GetBoardMembers)
			boards.POST("/:boardID/members", membersHandler.AddBoardMember)
			boards.PATCH("/:boardID/members/:memberID", membersHandler.ChangeBoardMemberRole)
			boards.DELETE("/:boardID/members/:memberID", membersHandler.DeleteBoardMember)

			//LISTS IN BOARDS
			boards.POST("/:boardID/lists/", linksHandler.CreateListInBoard)
			boards.GET("/:boardID/lists/", linksHandler.GetListsByBoardId)
			boards.GET("/:boardID/boardlists/:boardListID/mirrors", linksHandler.GetBoardListMirrors)
			boards.GET("/:boardID/lists/deleted", linksHandler.GetDeletedBoardLists)
			boards.GET("/:boardID/listcards/deleted", linksHandler.GetDeletedListCards)
			boards.GET("/:boardID/relations/deleted", linksHandler.GetDeletedBoardRelations)
			boards.DELETE("/:boardID/lists/:listID", linksHandler.DetatchList)
			boards.POST("/:boardID/lists/:listID/restore", linksHandler.RestoreListToBoard)
			boards.POST("/:boardID/lists/restorebulk", linksHandler.RestoreBoardLists)
			boards.POST("/:boardID/listcards/restorebulk", linksHandler.RestoreListCards)
			boards.POST("/:boardID/lists/purgebulk", linksHandler.PurgeBoardLists)
			boards.POST("/:boardID/listcards/purgebulk", linksHandler.PurgeListCards)
			boards.GET("/:boardID/lists/:listID/listcards", listCardsHandler.GetListCardsByListId)
			boards.DELETE("/:boardID/lists/:listID/listcards", listCardsHandler.BulkDetatchCardsFromList)
			boards.PATCH("/:boardID/lists/:listID/move", linksHandler.MoveListInBoard)
			boards.PATCH("/:boardID/lists/:listID/moveto", linksHandler.MoveBoardList)
			boards.POST("/:boardID/lists/:listID/mirror", linksHandler.MirrorBoardList)
			boards.PATCH("/:boardID/lists/movebulk", linksHandler.MoveBulkListInBoard)
			boards.POST("/:boardID/lists/copybulk", linksHandler.CopyBulkListsInBoard)

			boards.PATCH("/:boardID/lists/:listID/access", linksHandler.PatchListAccessMode)
			boards.PATCH("/:boardID/lists/:listID/props", listsHandler.PatchListProps)
			boards.PATCH("/:boardID/lists/:listID", listsHandler.PatchListDetails)

			//boards.PATCH("/:boardID/lists/:listID", linksHandler.PatchList) //(PATCH LIST METADATA - TITLE, ETC)
			//DETATCH LIST FROM BOARD (CHECK )

			//move list to another board - require editable access to both boards (detach + attach)(POST/DELETE)

			//duplicate list with cards (deep and shallow) (POST) - CAN BE PROBLEMATIC (KEEP SHARES?)

			//CARDS
			boards.GET("/:boardID/lists/:listID/cards", listCardsHandler.GetListDetail)
			boards.POST("/:boardID/lists/:listID/cards", listCardsHandler.CreateCardInList)
			boards.PATCH("/:boardID/cards/:cardID/moveto", listCardsHandler.MoveCardToBoard)
			//boards.POST("/:boardID/lists/:listID/cards/inbox", inboxHandler.MirrorCardToInbox)

			boards.POST("/:boardID/cards/:cardID/mirror", listCardsHandler.MirrorCardToList)
			boards.POST("/:boardID/cards/:cardID/copy", listCardsHandler.CopyCardToList)
			boards.POST("/:boardID/cards/:cardID/mirrortoinbox", inboxHandler.MirrorCardToInbox)

			boards.PATCH("/:boardID/cards/:cardID/crossmove", listCardsHandler.CrossMoveCard)
			boards.PATCH("/:boardID/cards/crossmovebulk", listCardsHandler.BulkCrossMoveCards)
			boards.PATCH("/:boardID/listcards/movebulk", listCardsHandler.BulkMoveListCardsInBoard)
			boards.GET("/:boardID/listcards/:listCardID/mirrors", listCardsHandler.GetListCardMirrors)
			boards.PATCH("/:boardID/cards/:cardID", cardsHandler.PatchCardDetails)
			boards.PATCH("/:boardID/cards/:cardID/props", cardsHandler.PatchCardProps)
			//boards.PATCH("/:boardID/cards/:cardID/labels", cardsHandler.PatchCardLabels)
			boards.DELETE("/:boardID/lists/:listID/cards/:cardID", listCardsHandler.DetatchCardFromList)

			boards.GET("/:boardID/labels", boardLabelsHandler.GetBoardLabels)
			boards.POST("/:boardID/labels", boardLabelsHandler.CreateBoardLabel)
			boards.PATCH("/:boardID/labels/:labelID", boardLabelsHandler.PatchBoardLabel)
			boards.DELETE("/:boardID/labels/:labelID", boardLabelsHandler.DeleteBoardLabel)
			boards.POST("/:boardID/cards/:cardID/labels/:labelID", boardLabelsHandler.AddLabelToCard)
			boards.DELETE("/:boardID/cards/:cardID/labels/:labelID", boardLabelsHandler.RemoveLabelFromCard)

			boards.GET("/:boardID/cards/members/", cardMembersHandler.GetCardMembersForBoard)
			boards.POST("/:boardID/cards/:cardID/members/", cardMembersHandler.AddCardMember)
			boards.GET("/:boardID/cards/:cardID/members/", cardMembersHandler.GetCardMembersForCard)
			boards.DELETE("/:boardID/cards/:cardID/members/:memberID", cardMembersHandler.RemoveCardMember)
			//delete card + bulk ? (DELETE)
			//patch card position in a list -> single + bulk (PATCH)

			boards.POST("/:boardID/cards/:cardID/checklists", checklistHandler.CreateChecklist)
			boards.POST("/:boardID/cards/:cardID/checklists/clone", checklistHandler.CloneChecklist)
			boards.PATCH("/:boardID/cards/:cardID/checklists/:checklistID", checklistHandler.PatchChecklist)
			boards.DELETE("/:boardID/cards/:cardID/checklists/:checklistID", checklistHandler.DeleteChecklist)
			boards.PATCH("/:boardID/cards/:cardID/checklists/:checklistID/move", checklistHandler.MoveChecklist)

			boards.POST("/:boardID/cards/:cardID/checklists/:checklistID/entries", checklistHandler.CreateChecklistEntry)
			boards.PATCH("/:boardID/cards/:cardID/checklists/:checklistID/entries/:entryID", checklistHandler.PatchChecklistEntry)
			boards.DELETE("/:boardID/cards/:cardID/checklists/:checklistID/entries/:entryID", checklistHandler.DeleteChecklistEntry)
			boards.POST("/:boardID/cards/:cardID/checklists/:checklistID/entries/:entryID/convert", checklistHandler.ConvertChecklistEntryToCard)
			boards.PATCH("/:boardID/cards/:cardID/checklists/:checklistID/entries/:entryID/move", checklistHandler.MoveChecklistEntry)
			boards.PATCH("/:boardID/cards/:cardID/checklists/:checklistID/entries/:entryID/crossmove", checklistHandler.CrossMoveChecklistEntry)

			boards.POST("/:boardID/cards/:cardID/checklists/:checklistID/entries/:entryID/members", checklistHandler.AddMemberToChecklistEntry)
			boards.DELETE("/:boardID/cards/:cardID/checklists/:checklistID/entries/:entryID/members/:memberID", checklistHandler.RemoveMemberFromChecklistEntry)

			boards.POST("/:boardID/cards/:cardID/comments", cardCommentsHandler.CreateCardComment)
			boards.GET("/:boardID/cards/:cardID/comments", cardCommentsHandler.GetCardComments)
			boards.DELETE("/:boardID/cards/:cardID/comments/:commentID", cardCommentsHandler.DeleteCardComment)
			boards.PATCH("/:boardID/cards/:cardID/comments/:commentID", cardCommentsHandler.EditCardComment)
			//detatch card from list (DELETE)
			//attach card to list (POST)
			//duplicate card (in same list) (POST)

			//move card to another list - require editable access to both lists (detach + attach)(POST/DELETE)

			//patch card details (done, title, color, description, due date, etc) (PATCH)

			//SHARE OFFERS SOURCE
			boards.POST("/:boardID/lists/:listID/shareoffer", shareHandler.CreateListShareOffer)
			boards.POST("/:boardID/lists/shareoffers/:shareID/revoke", shareHandler.RevokeListShareOffer)

			//SHARE OFFERS TARGET

			boards.GET("/:boardID/lists/shareoffers", shareHandler.GetListOffers)
			boards.POST("/:boardID/lists/shareoffers/:shareID/respond", shareHandler.RespondToListShareOffer)

			boards.POST("/:boardID/shareoffers", shareHandler.CreateBoardShareOffer)
			boards.GET("/:boardID/shareoffers", shareHandler.GetBoardInvitesOutgoing)

			//WATCHES
			boards.POST("/:boardID/watch", userWatchHandler.CreateBoardWatch)
			boards.POST("/:boardID/lists/:listID/watch", userWatchHandler.CreateListWatch)
			boards.POST("/:boardID/cards/:cardID/watch", userWatchHandler.CreateCardWatch)

			watches := api.Group("/watches")
			{
				watches.GET("/", userWatchHandler.GetAllWatches)
				watches.GET("/boards", userWatchHandler.GetBoardWatch)
				watches.GET("/lists", userWatchHandler.GetListWatch)
				watches.GET("/cards", userWatchHandler.GetCardWatch)

				watches.DELETE("/boards/:watchID", userWatchHandler.DeleteBoardWatch)
				watches.DELETE("/lists/:watchID", userWatchHandler.DeleteListWatch)
				watches.DELETE("/cards/:watchID", userWatchHandler.DeleteCardWatch)

				watches.PATCH("/boards/:watchID/active", userWatchHandler.PatchBoardWatch)
				watches.PATCH("/lists/:watchID/active", userWatchHandler.PatchListWatch)
				watches.PATCH("/cards/:watchID/active", userWatchHandler.PatchCardWatch)

				watches.PATCH("/boards/:watchID/move", userWatchHandler.MoveBoardWatch)
				watches.PATCH("/lists/:watchID/move", userWatchHandler.MoveListWatch)
				watches.PATCH("/cards/:watchID/move", userWatchHandler.MoveCardWatch)
				//AUDIT LOGS
				boards.GET("/:boardID/auditlog", eventRegistryHandler.GetBoardAuditLog)

				//boards.POST("/:targetBoardID/lists", linksHandler.MountListToBoard)

				//boards.POST("/:boardID/lists", listsHandler.CreateList)

			}
			lists := api.Group("/lists")
			{
				lists.GET("/", listsHandler.GetUserLists)
				//lists.POST("/", listsHandler.CreateList )
				lists.GET("/:listID", listsHandler.GetListMeta)
				lists.GET("/:listID/cards", listsHandler.GetListDetail)
				//lists.DELETE("/:listID/", listsHandler.DeleteList)
				//lists.PATCH("/:listID", listsHandler.PatchList)
			}
			cards := api.Group("/cards")
			{
				cards.GET("/", cardsHandler.GetUserCards)
				cards.GET("/user/:userID/membercards", cardsHandler.GetCardsWhereUserIsMember)
				cards.GET("/user/me/membercards", cardsHandler.GetCardsWhereIAmMember)
				//cards.PATCH("/:cardID", cardsHandler.PatchCardDetails)
				//cards.GET("/:cardID", cardsHandler.GetCardDetails)
			}
			workspaces := api.Group("/workspaces")
			{
				workspaces.POST("/", workspacesHandler.CreateUserWorkspace)
				workspaces.GET("/", workspacesHandler.GetUserWorkspaces)
				workspaces.GET("/search", workspacesHandler.SearchPublicWorkspaces)
				workspaces.GET("/pending-offers/targets", workspacesHandler.GetPendingOfferTargetWorkspacesForUser)
				workspaces.GET("/:workspaceID/auditlog", eventRegistryHandler.GetWorkspaceAuditLog)
				workspaces.GET("/:workspaceID/cards/:cardID/activity", eventRegistryHandler.GetWorkspaceCardActivity)
				workspaces.GET("/:workspaceID/activity/users/:userID", eventRegistryHandler.GetWorkspaceUserActivity)
				workspaces.GET("/:workspaceID/activity/me", eventRegistryHandler.GetWorkspaceMyActivity)
				workspaces.PATCH("/:workspaceID/props", workspacesHandler.PatchWorkspaceProps)
				workspaces.GET("/:workspaceID/boards", workspacesHandler.GetWorkspaceBoardsForUserID)
				workspaces.POST("/:workspaceID/boards", workspacesHandler.CreateBoardInWorkspace)

				workspaces.DELETE("/:workspaceID/boards/:boardID", workspacesHandler.CloseBoardInWorkspace)
				workspaces.POST("/:workspaceID/boards/:boardID/restore", workspacesHandler.RestoreBoardInWorkspace)
				workspaces.DELETE("/:workspaceID/boards/:boardID/purge", workspacesHandler.PurgeBoardInWorkspace)
				workspaces.GET("/:workspaceID/boards/closed", workspacesHandler.GetClosedBoardsInWorkspace)

				workspaces.GET("/:workspaceID/members", workspacesHandler.GetWorkspaceMembers)
				workspaces.POST("/:workspaceID/members", workspacesHandler.AddWorkspaceMember)
				workspaces.PATCH("/:workspaceID/members/:memberID", workspacesHandler.ChangeWorkspaceMemberRole)
				workspaces.DELETE("/:workspaceID/members/:memberID", workspacesHandler.DeleteWorkspaceMember)

				workspaces.POST("/:workspaceID/shareoffers", shareHandler.CreateWorkspaceShareOffer)
				workspaces.GET("/:workspaceID/shareoffers", shareHandler.GetWorkspaceOutgoingShareOffers)

				workspaces.POST("/:workspaceID/subscription/checkout", subscriptionHandler.StartCheckoutForWorkspace)
			}
			activity := api.Group("/activity")
			{
				activity.GET("/users/:userID", eventRegistryHandler.GetUserActivity)
				activity.GET("/me", eventRegistryHandler.GetMyActivity)
			}
			shareoffers := api.Group("/shareoffers")
			{
				//DEPRECATED
				shareoffers.GET("/incoming", shareHandler.GetUserIncomingShareOffers)

				//USER-CENTERED VIEWS
				shareoffers.GET("/incoming/details", shareHandler.GetUserIncomingShareOffersDetails)
				shareoffers.GET("/boards/outgoing/requests", shareHandler.GetUserBoardRequestsOutgoing) // richieste di accesso fatte dall'utente a board, visible to the user who made the requests
				shareoffers.GET("/boards/incoming/invites", shareHandler.GetUserBoardInvitesIncoming)   //inviti a partecipare a board ricevuti dall'utente, visible to the user who made the invites
				shareoffers.GET("/workspaces/outgoing/requests", shareHandler.GetUserWorkspaceRequestsOutgoing)

				//CRATE REQUEST TO JOIN A BOARD
				shareoffers.POST("/boards/:boardID/request", shareHandler.CreateBoardAccessRequest)
				shareoffers.POST("/workspaces/:workspaceID/request", shareHandler.CreateWorkspaceAccessRequest)

				//BOARD-CENTERED VIEWS
				shareoffers.GET("/boards/:boardID/incoming/requests", shareHandler.GetBoardRequestsIncomingWithUsers) // richieste di partecipare a una board, visible to members with role >= admin
				shareoffers.GET("/boards/:boardID/outgoing/invites/", shareHandler.GetBoardInvitesOutgoingWithUsers)  //inviti a partecipare a un board (non ancora accettati)
				shareoffers.GET("/workspaces/:workspaceID/incoming/requests", shareHandler.GetWorkspaceRequestsIncomingWithUsers)
				shareoffers.GET("/workspaces/:workspaceID/pending/boards", shareHandler.GetPendingOfferTargetBoardsByWorkspaceForUser)
				shareoffers.GET("/workspaces/:workspaceID/pending/board-access-requests", shareHandler.GetPendingBoardAccessRequestCountsByWorkspaceForAdminOwner)

				shareoffers.GET("/outgoing", shareHandler.GetUserOutgoingShareOffers)
				shareoffers.GET("/:shareID", shareHandler.GetShareOfferDetails)

				shareoffers.POST("/:shareID/revoke", shareHandler.RevokeShareOffer)
				shareoffers.POST("/:shareID/respond", shareHandler.RespondToShareOffer)
			}
			sharelinks := api.Group("/sharelinks")
			{
				sharelinks.POST("/", shareLinksHandler.CreateShareLink)
				sharelinks.POST("/:token/claim", shareLinksHandler.ClaimShareLink)
				sharelinks.POST("/:token/revoke", shareLinksHandler.RevokeShareLink)
				sharelinks.POST("/join/:token", shareLinksHandler.JoinViaShareLink)
				sharelinks.GET("/token/:token", shareLinksHandler.GetAuthenticatedShareLinkByToken)
				sharelinks.GET("/:targetID", shareLinksHandler.GetShareLinksByTargetID)
			}

		}

		return r

	}
}
