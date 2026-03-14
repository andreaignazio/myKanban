package userNotification

import (
	"GoGORM/internal/dto"
	EventRegistry "GoGORM/internal/eventregistry"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
)

type UserNotificationService struct {
	repo          UserNotificationRepo
	EventRegistry *EventRegistry.EventRegistryService
}

func NewUserNotificationService(repo UserNotificationRepo, eventRegistry *EventRegistry.EventRegistryService) *UserNotificationService {
	return &UserNotificationService{repo: repo, EventRegistry: eventRegistry}
}

type UserNotificationRepo interface {
	GetUserNotifications(ctx context.Context, userID uuid.UUID) ([]dto.UserNotificationRow, error)
	GetUserNotificationsPaginated(ctx context.Context, userID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.NotificationPage, error)
	GetEntitiesDetails(ctx context.Context, entitiesIdsMap map[string][]uuid.UUID) ([]models.Workspace, []models.Board, []models.List, []models.Card, error)
	MarkNotifications(ctx context.Context, userID uuid.UUID, notificationIDs []uuid.UUID, read bool) error
}

func (s *UserNotificationService) GetUserNotifications(ctx context.Context, userID uuid.UUID) (*dto.UserNotificationResponse, error) {
	return s.GetUserNotificationsPaginated(ctx, userID, 30, nil)
}

func (s *UserNotificationService) GetUserNotificationsPaginated(ctx context.Context, userID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.UserNotificationResponse, error) {
	page, err := s.repo.GetUserNotificationsPaginated(ctx, userID, limit, cursor)
	if err != nil {
		return nil, err
	}
	notifications := page.Rows

	unreadCount := 0
	for _, n := range notifications {
		if !n.Read {
			unreadCount++
		}
	}
	notificationsResponse := make([]dto.UserAuditNotificationResponse, 0, len(notifications))
	for _, n := range notifications {
		notificationsResponse = append(notificationsResponse, dto.UserAuditNotificationRowToResponse(n))
	}

	entitiesIdsMap := make(map[string][]uuid.UUID)
	for _, n := range notifications {
		key := n.MainEntityType
		if _, exists := entitiesIdsMap[key]; !exists {
			entitiesIdsMap[key] = []uuid.UUID{}
		}
		entitiesIdsMap[key] = append(entitiesIdsMap[key], n.MainEntityID)
	}
	workspaces, boards, lists, cards, err := s.repo.GetEntitiesDetails(ctx, entitiesIdsMap)
	if err != nil {
		return nil, err
	}
	workspaceResponse := make([]dto.WorkspaceResponse, 0, len(workspaces))
	for _, workspace := range workspaces {
		workspaceResponse = append(workspaceResponse, dto.WorkspaceToResponse(&workspace))
	}
	boardResponse := make([]dto.BoardResponse, 0, len(boards))
	for _, board := range boards {
		boardResponse = append(boardResponse, dto.BoardToResponse(&board))
	}
	listResponse := make([]dto.ListResponse, 0, len(lists))
	for _, list := range lists {
		listResponse = append(listResponse, dto.ListToResponse(&list))
	}
	cardResponse := make([]dto.CardResponse, 0, len(cards))
	for _, card := range cards {
		cardResponse = append(cardResponse, dto.CardToResponse(&card))
	}

	response := &dto.UserNotificationResponse{
		UnreadCount:       unreadCount,
		UserNotifications: notificationsResponse,
		Workspaces:        workspaceResponse,
		Boards:            boardResponse,
		Lists:             listResponse,
		Cards:             cardResponse,
		NextCursor:        page.NextCursor,
		HasMore:           page.HasMore,
	}
	return response, nil
}

func (s *UserNotificationService) MarkNotificationsAsRead(ctx context.Context, userID uuid.UUID, notificationIDs []uuid.UUID) error {
	if err := s.repo.MarkNotifications(ctx, userID, notificationIDs, true); err != nil {
		return err
	}

	s.EventRegistry.EmitNotifcationReadEvent(ctx, userID, notificationIDs, true)

	return nil

}

func (s *UserNotificationService) MarkNotificationsAsUnread(ctx context.Context, userID uuid.UUID, notificationIDs []uuid.UUID) error {
	if err := s.repo.MarkNotifications(ctx, userID, notificationIDs, false); err != nil {
		return err
	}

	s.EventRegistry.EmitNotifcationReadEvent(ctx, userID, notificationIDs, false)

	return nil
}
