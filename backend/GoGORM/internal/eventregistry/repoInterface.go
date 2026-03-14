package EventRegistry

import (
	"GoGORM/internal/dto"
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EventRepository interface {
	CreateAuditEvent(ctx context.Context, tx *gorm.DB, event *models.BoardAuditEvent) error
	CreateAuditEventTargets(ctx context.Context, tx *gorm.DB, targets []models.AuditEventTargets) error
	GetBoardAuditLog(ctx context.Context, boardID uuid.UUID) ([]models.BoardAuditEvent, error)
	GetBoardAuditLogPaginated(ctx context.Context, boardID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.AuditPage, error)
	GetWorkspaceAuditLog(ctx context.Context, workspaceID uuid.UUID) ([]models.BoardAuditEvent, error)
	GetCardActivity(ctx context.Context, cardID uuid.UUID) ([]models.BoardAuditEvent, error)
	GetWorkspaceCardActivity(ctx context.Context, workspaceID, cardID uuid.UUID) ([]models.BoardAuditEvent, error)
	IsInboxCardOwnedByUser(ctx context.Context, userID, cardID uuid.UUID) (bool, error)
	GetWorkspaceUserActivity(ctx context.Context, workspaceID, actorUserID uuid.UUID) ([]models.BoardAuditEvent, error)
	GetWorkspaceUserActivityPaginated(ctx context.Context, workspaceID, actorUserID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.AuditPage, error)
	GetUserActivity(ctx context.Context, actorUserID uuid.UUID) ([]models.BoardAuditEvent, error)
	GetUserActivityPaginated(ctx context.Context, actorUserID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.AuditPage, error)
	GetAuditEntitiesDetails(ctx context.Context, entityIDsByType map[string][]uuid.UUID) (AuditEntityRows, error)
	GetAffectedBoardIDsForTargets(ctx context.Context, targetIDsByEntity map[string][]uuid.UUID) ([]uuid.UUID, error)
	ResolveBoardConsumersForSourceBoardMirrors(ctx context.Context, sourceBoardID uuid.UUID) ([]uuid.UUID, error)
	ResolveBoardConsumersForSourceBoardCardMirrors(ctx context.Context, sourceBoardID uuid.UUID) ([]uuid.UUID, error)
	ResolveBoardConsumersForRootListCard(ctx context.Context, rootListCardID, sourceBoardID, targetBoardID uuid.UUID) ([]uuid.UUID, error)
	GetBoardsByIDs(ctx context.Context, boardIDs []uuid.UUID) ([]models.Board, error)
	ResolveInboxUserConsumersForRootListCard(ctx context.Context, rootListCardID uuid.UUID) ([]uuid.UUID, error)
	ResolveInboxCardIDsForUserAndRootListCard(ctx context.Context, userID, rootListCardID uuid.UUID) ([]uuid.UUID, error)
	ResolveRootListCardIDsByBoardID(ctx context.Context, boardID uuid.UUID) ([]uuid.UUID, error)
	ResolveListCardIDsByBoardID(ctx context.Context, boardID uuid.UUID) ([]uuid.UUID, error)
	ResolveListCardIDsByRootID(ctx context.Context, rootListCardID uuid.UUID) ([]uuid.UUID, error)
	ResolveRootListCardIDsByListID(ctx context.Context, listID uuid.UUID) ([]uuid.UUID, error)
	GetExternalRootRefsByIDs(ctx context.Context, rootIDs []uuid.UUID) ([]models.ExternalRootRefRow, error)
	GetUsersToBeNotifiedSingleQuery(ctx context.Context, targetIDsByEntity map[string][]uuid.UUID) (map[string][]uuid.UUID, error)
	GetUsersToBeNotifiedFlatSingleQuery(ctx context.Context, targetIDsByEntity map[string][]uuid.UUID) ([]uuid.UUID, error)
	CreateUserAuditNotifications(ctx context.Context, notifications []models.UserAuditNotification) error
	GetUserUnreadNotificationCount(ctx context.Context, userID uuid.UUID) (int, error)
	GetWorkspaceCardActivityPaginated(ctx context.Context,
		workspaceID, cardID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.AuditPage, error)
	GetBoardListsByListIds(ctx context.Context, listIDs []uuid.UUID) ([]models.BoardList, error)
}

type MembershipRepo interface {
	GetUserRole(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (string, error)
	GetUserWorkspaceRole(ctx context.Context, userID, workspaceID uuid.UUID, includeDeleted bool) (string, error)
}
