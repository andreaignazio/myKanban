package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	auditcontext "GoGORM/internal/auditcontext"
	"GoGORM/internal/authz"
	"GoGORM/internal/authzcontext"
	BoardLabels "GoGORM/internal/boardlabels"
	"GoGORM/internal/boardlist"
	"GoGORM/internal/capabilities"
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
	"GoGORM/internal/pos"
	"GoGORM/internal/rank"
	"GoGORM/internal/server"
	"GoGORM/internal/sharelinks"
	"GoGORM/internal/shares"
	"GoGORM/internal/sharesevents"
	"GoGORM/internal/subscription"
	userNotification "GoGORM/internal/usernotification"
	userWatch "GoGORM/internal/userwatch"
	"GoGORM/internal/ws"
	"GoGORM/models"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	envPaths := []string{".env", "backend/GoGORM/.env", "../.env"}
	envLoaded := false
	for _, envPath := range envPaths {
		if err := godotenv.Load(envPath); err == nil {
			envLoaded = true
			break
		}
	}
	if !envLoaded {
		log.Printf("warning: .env not loaded from known paths")
	}

	dsn := "host=localhost user=postgres password=fARADAY212 dbname=goTestDB port=5432 sslmode=disable"

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		fmt.Println("Error:", err)
	}

	//db.Migrator().DropTable(&models.User{}, &models.Board{}, &models.List{}, &models.Card{}, &models.UserBoard{}, &models.BoardList{} ,&models.ListCard{})
	//db.Migrator().DropTable(&models.BoardListShareOffer{})
	db.AutoMigrate(&models.User{}, &models.Board{},
		&models.List{}, &models.Card{}, &models.UserBoard{},
		&models.BoardList{}, &models.ListCard{},
		&models.BoardListShareOffer{}, &models.BoardListOfferEvent{},
		&models.CardComment{}, &models.CommentMention{},
		&models.Label{},
		&models.Checklist{}, &models.Entry{}, &models.ChecklistEntry{}, &models.CardChecklist{}, &models.EntryMember{},
		&models.Workspace{}, &models.UserWorkspace{},
		&models.WorkspaceSubscription{}, &models.BillingWebhookEvent{},
		&models.ShareOffer{}, &models.ShareOfferEvent{},
		&models.PublicShareLink{}, &models.CardMember{}, &models.BoardLabel{}, &models.CardLabelLink{},
		&models.ListWatch{}, &models.CardWatch{}, &models.BoardWatch{},
		&models.BoardAuditEvent{}, &models.AuditEventTargets{}, &models.UserAuditNotification{},
		&models.UserInboxCard{})

	wsHub := ws.NewHub()
	healthService := health.NewService()
	healthHandler := health.NewHandler(healthService)

	eventRegistruRepo := EventRegistry.NewGormEventRepository(db)
	auditContextRepo := auditcontext.NewAuditContextRepo(db)

	workspacesRepo := workspaces.NewGormWorkspaceRepo(db)

	boardsRepo := boards.NewGormBoardsRepo(db)
	workspaceResolver := EventRegistry.NewCachedWorkspaceResolver(boardsRepo, 5*time.Minute, 10000, false)
	membarshipsRepo := memberships.NewGormRepo(db)
	eventRegistryService := EventRegistry.NewEventRegistryService(eventRegistruRepo, wsHub, workspaceResolver, membarshipsRepo, auditContextRepo)
	eventRegistryHandler := EventRegistry.NewEventRegistryHandler(eventRegistryService)
	capabilitiesRepo := capabilities.NewGormCapabilitiesRepo(db)

	listsRepo := lists.NewGormListsRepo(db)
	listsService := lists.NewListsService(db, wsHub, eventRegistryService, listsRepo, membarshipsRepo, capabilitiesRepo)

	cardsRepo := cards.NewGormCardsRepo(db)
	inboxRepo := inbox.NewGormInboxRepo(db)
	boardListRepo := boardlist.NewBoardListRepo(db)
	listCardsRepo := listcards.NewGormListCardsRepo(db)
	boardLabelsRepo := BoardLabels.NewGormBoardLabelsRepo(db)
	cardsService := cards.NewCardsService(
		db,
		cardsRepo,
		listCardsRepo,
		listsRepo,
		boardListRepo,
		boardsRepo,
		boardLabelsRepo,
		workspacesRepo,
		membarshipsRepo,
		capabilitiesRepo,
		inboxRepo,
		wsHub,
		eventRegistryService,
	)
	cardsHandler := cards.NewCardsHandler(cardsService)

	linksRepo := links.NewGormLinksRepo(db)
	listShareRepo := shares.NewGormListShareRepo(db)
	shareRepo := shares.NewGormShareRepo(db)
	shareEventsRepo := sharesevents.NewSharesEventsRepo(db)
	subscriptionRepo := subscription.NewGormSubscriptionRepo(db)
	//subscriptionService := &subscription.SubscriptionService{SubscriptionRepo: subscriptionRepo}

	stripeBuillingProvider := subscription.NewStripeProvider(os.Getenv("STRIPE_SECRET_KEY"), os.Getenv("STRIPE_WEBHOOK_SECRET"), nil)

	webhookRepo := subscription.NewGormWebhookInboxRepo(db)
	subscriptionService := subscription.NewSubscriptionService(db, subscriptionRepo, membarshipsRepo, stripeBuillingProvider, webhookRepo, false)
	authzRepo := authzcontext.NewGormRepo(db)
	authzContextService := authzcontext.NewService(authzRepo)
	authzService := authz.NewService(authzContextService)

	positionGenerator := rank.NewRankGenerator()
	positionService := pos.NewPositionService(positionGenerator, linksRepo, listCardsRepo, membarshipsRepo, workspacesRepo)
	cardMembersRepo := cardmembers.NewGormCardMembersRepo(db)
	cardCommentRepo := cardcomments.NewGormCardCommentsRepository(db)
	checklistRepo := checklists.NewGormChecklistRepo(db)
	listCardsService := listcards.NewListCardsService(db, wsHub, eventRegistryService, listCardsRepo, cardsRepo, cardCommentRepo,
		cardMembersRepo, boardLabelsRepo, checklistRepo, listsRepo, boardListRepo, positionService, membarshipsRepo, capabilitiesRepo, boardsRepo)
	listCardsHandler := listcards.NewListCardsHandler(listCardsService, eventRegistryService)

	workspaceBoardPositionHelper := pos.NewWorkspaceBoardPositionHelper(positionGenerator, workspacesRepo)
	workspacesService := workspaces.NewWorkspaceService(db, workspacesRepo, membarshipsRepo, boardsRepo, authzService, positionService, workspaceBoardPositionHelper, subscriptionService, eventRegistryService)
	workspacesHandler := workspaces.NewWorkspacesHandler(workspacesService)

	linksService := links.NewLinksServiceWithListCards(db, eventRegistryService, wsHub, linksRepo, boardsRepo, listsRepo, cardsRepo, listCardsService, positionService, membarshipsRepo, listShareRepo, boardLabelsRepo)
	listsHandler := lists.NewListsHandler(listsService, linksService)
	linksHandler := links.NewLinksHandler(linksService)

	boardsService := boards.NewBoardsService(db, boardsRepo, boardListRepo, listCardsRepo, membarshipsRepo, positionService)
	boardsHandler := boards.NewBoardsHandler(boardsService, eventRegistryService)

	shareService := shares.NewShareService(
		db,
		listShareRepo,
		shareRepo,
		boardsRepo,
		membarshipsRepo,
		linksRepo,
		positionService,
		workspaceBoardPositionHelper,
		shareEventsRepo,
		workspacesRepo,
		subscriptionService,
		*eventRegistryService,
	)
	shareHandler := shares.NewShareHandler(shareService)
	shareLinksRepo := sharelinks.NewGormShareLinksRepo(db)
	membershipService := memberships.NewMembershipService(db, membarshipsRepo, subscriptionService, workspacesRepo, wsHub, eventRegistryService)
	shareLinksService := sharelinks.NewShareLinkService(
		db,
		shareLinksRepo,
		eventRegistryService,
		membarshipsRepo,
		membershipService,
		workspacesRepo,
		positionService,
		workspaceBoardPositionHelper,
		false,
	)
	shareLinksHandler := sharelinks.NewShareLinksHandler(shareLinksService)

	userWatchRepo := userWatch.NewGormRepo(db)
	userWatchService := userWatch.NewUserWatchService(db, userWatchRepo, boardsRepo, listsRepo, cardsRepo)
	userWatchHandler := userWatch.NewUserWatchHandler(userWatchService)

	userNotificationRepo := userNotification.NewGormNotificationRepo(db)
	userNotificationService := userNotification.NewUserNotificationService(
		userNotificationRepo,
		eventRegistryService,
	)
	userNotificationHandler := userNotification.NewUserNotificationHandler(userNotificationService)

	boardLabelsService := BoardLabels.NewBoardLabelsService(db, boardLabelsRepo, membarshipsRepo, false, eventRegistryService)
	boardLabelsHandler := BoardLabels.NewBoardLabelsHandler(boardLabelsService)

	membersHandler := memberships.NewMembershipHandler(membershipService)

	wsService := ws.NewWsService(membarshipsRepo, workspacesRepo)
	wsHandler := ws.NewWsHandler(wsHub, wsService)

	mediaCache := media.NewSearchCache(60*time.Second, 300)
	mediaHTTPClient := &http.Client{Timeout: 5 * time.Second}
	mediaAccessKey := os.Getenv("UNSPLASH_ACCESS_KEY")
	mediaService := media.NewUnsplashService(mediaHTTPClient, mediaAccessKey, mediaCache)
	mediaHandler := media.NewMediaHandler(mediaService)

	cardMembersService := cardmembers.NewCardMemberService(
		cardMembersRepo,
		cardsRepo,
		listCardsRepo,
		listsRepo,
		boardListRepo,
		boardsRepo,
		boardLabelsRepo,
		workspacesRepo,
		db,
		membarshipsRepo,
		eventRegistryService,
		false,
	)
	cardMembersHandler := cardmembers.NewCardMembersHandler(cardMembersService)

	checklistPositionHelper := pos.NewChecklistPositionHelper(positionGenerator, checklistRepo, checklistRepo, false)

	checklistService := checklists.NewChecklistsService(checklistRepo, db, membarshipsRepo, checklistPositionHelper, eventRegistryService)
	checklistHandler := checklists.NewChecklistHandler(checklistService)

	cardCommentService := cardcomments.NewCardCommentsService(db, cardCommentRepo, membarshipsRepo, false, eventRegistryService)
	cardCommentsHandler := cardcomments.NewCardCommentsHandler(cardCommentService)

	inboxPositionHelper := pos.NewInboxPositionHelper(positionGenerator, inboxRepo, false)
	inboxService := inbox.NewInboxService(inboxRepo, eventRegistryService, membarshipsRepo, listCardsRepo, listCardsService, inboxPositionHelper, cardsRepo, linksRepo, db, false)
	inboxHandler := inbox.NewInboxHandler(inboxService)

	subscriptionhandler := subscription.NewSubscriptionHandler(subscriptionService)

	go wsHub.Run()

	r := server.NewRouter(
		db,
		healthHandler,
		boardsHandler,
		listsHandler,
		linksHandler,
		shareHandler,
		cardsHandler,
		listCardsHandler,
		eventRegistryHandler,
		membersHandler,
		wsHandler,
		workspacesHandler,
		shareLinksHandler,
		userWatchHandler,
		userNotificationHandler,
		boardLabelsHandler,
		mediaHandler,
		cardMembersHandler,
		checklistHandler,
		cardCommentsHandler,
		inboxHandler,
		subscriptionhandler,
	)

	if err := r.Run("localhost:8090"); err != nil {
		log.Fatal(err)
	}
}
