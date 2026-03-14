package EventRegistry

import (
	"GoGORM/internal/dto"
	"GoGORM/models"
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type GormEventRepository struct {
	db *gorm.DB
}

func NewGormEventRepository(db *gorm.DB) *GormEventRepository {
	return &GormEventRepository{db: db}
}

func (r *GormEventRepository) CreateAuditEvent(ctx context.Context, tx *gorm.DB, event *models.BoardAuditEvent) error {
	if err := tx.WithContext(ctx).Create(event).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormEventRepository) CreateAuditEventTargets(ctx context.Context, tx *gorm.DB, targets []models.AuditEventTargets) error {
	if err := tx.WithContext(ctx).Create(&targets).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormEventRepository) GetBoardAuditLog(ctx context.Context, boardID uuid.UUID) ([]models.BoardAuditEvent, error) {
	var auditLog []models.BoardAuditEvent
	err := r.db.WithContext(ctx).Where("board_id = ?", boardID).Order("created_at DESC").Find(&auditLog).Error
	if err != nil {
		return nil, err
	}
	return auditLog, nil
}

func (r *GormEventRepository) GetBoardAuditLogPaginated(ctx context.Context, boardID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.AuditPage, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	fetch := limit + 1

	query := r.db.WithContext(ctx).
		Table("board_audit_events bae").
		Where("bae.board_id = ?", boardID)

	if cursor != nil {
		query = query.Where(
			`(bae.created_at < ?) 
				OR (bae.created_at = ? 
				AND bae.id < ?)
				`, cursor.CreatedAt, cursor.CreatedAt, cursor.ID)
	}

	var events []models.BoardAuditEvent
	err := query.Order("bae.created_at DESC, bae.id DESC").Limit(fetch).Find(&events).Error
	if err != nil {
		return nil, err
	}

	hasMore := len(events) > limit
	if hasMore {
		events = events[:limit]
	}

	var nextCursor *dto.AuditCursor
	if len(events) > 0 && hasMore {
		lastEvent := events[len(events)-1]
		nextCursor = &dto.AuditCursor{
			CreatedAt: lastEvent.CreatedAt,
			ID:        lastEvent.ID,
		}
	}

	return &dto.AuditPage{
		Events:     events,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

func (r *GormEventRepository) GetWorkspaceAuditLog(ctx context.Context, workspaceID uuid.UUID) ([]models.BoardAuditEvent, error) {
	var auditLog []models.BoardAuditEvent
	err := r.db.WithContext(ctx).
		Where("workspace_id = ?", workspaceID).
		Order("created_at DESC").
		Find(&auditLog).Error
	if err != nil {
		return nil, err
	}
	return auditLog, nil
}

func (r *GormEventRepository) GetCardActivity(ctx context.Context, cardID uuid.UUID) ([]models.BoardAuditEvent, error) {
	var auditLog []models.BoardAuditEvent
	err := r.db.WithContext(ctx).
		Table("board_audit_events bae").
		Where("(bae.main_entity_type = ? AND bae.main_entity_id = ?) OR EXISTS (SELECT 1 FROM audit_event_targets aet WHERE aet.audit_id = bae.id AND aet.entity_type = ? AND aet.entity_id = ?)", "card", cardID, "card", cardID).
		Order("bae.created_at DESC").
		Find(&auditLog).Error
	if err != nil {
		return nil, err
	}
	return auditLog, nil
}

func (r *GormEventRepository) GetWorkspaceCardActivity(ctx context.Context, workspaceID, cardID uuid.UUID) ([]models.BoardAuditEvent, error) {
	var auditLog []models.BoardAuditEvent
	err := r.db.WithContext(ctx).
		Table("board_audit_events bae").
		Where("bae.workspace_id = ?", workspaceID).
		Where("(bae.main_entity_type = ? AND bae.main_entity_id = ?) OR EXISTS (SELECT 1 FROM audit_event_targets aet WHERE aet.audit_id = bae.id AND aet.entity_type = ? AND aet.entity_id = ?)", "card", cardID, "card", cardID).
		Order("bae.created_at DESC").
		Find(&auditLog).Error
	if err != nil {
		return nil, err
	}
	return auditLog, nil
}

func (r *GormEventRepository) GetWorkspaceCardActivityPaginated(ctx context.Context,
	workspaceID, cardID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.AuditPage, error) {

	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	fetch := limit + 1

	query := r.db.WithContext(ctx).
		Table("board_audit_events bae").
		Where("bae.workspace_id = ?", workspaceID).
		Where(`(bae.main_entity_type = ? AND bae.main_entity_id = ?) 
			OR EXISTS 
			(SELECT 1 FROM audit_event_targets aet 
			WHERE aet.audit_id = bae.id 
			AND aet.entity_type = ? 
			AND aet.entity_id = ?)
			`, "card", cardID, "card", cardID)

	if cursor != nil {
		query = query.Where(
			`(bae.created_at < ?) 
				OR (bae.created_at = ? 
				AND bae.id < ?)
				`, cursor.CreatedAt, cursor.CreatedAt, cursor.ID)
	}

	var events []models.BoardAuditEvent
	err := query.Order("bae.created_at DESC, bae.id DESC").Limit(fetch).Find(&events).Error
	if err != nil {
		return nil, err
	}

	hasMore := len(events) > limit
	if hasMore {
		events = events[:limit]
	}

	var nextCursor *dto.AuditCursor
	if len(events) > 0 && hasMore {
		lastEvent := events[len(events)-1]
		nextCursor = &dto.AuditCursor{
			CreatedAt: lastEvent.CreatedAt,
			ID:        lastEvent.ID,
		}
	}

	return &dto.AuditPage{
		Events:     events,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil

}

func (r *GormEventRepository) IsInboxCardOwnedByUser(ctx context.Context, userID, cardID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Table("user_inbox_cards").
		Where("user_id = ?", userID).
		Where("card_id = ?", cardID).
		Where("deleted_at IS NULL").
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *GormEventRepository) GetWorkspaceUserActivity(ctx context.Context, workspaceID, actorUserID uuid.UUID) ([]models.BoardAuditEvent, error) {
	var auditLog []models.BoardAuditEvent
	err := r.db.WithContext(ctx).
		Where("workspace_id = ?", workspaceID).
		Where("actor_user_id = ?", actorUserID).
		Order("created_at DESC").
		Find(&auditLog).Error
	if err != nil {
		return nil, err
	}
	return auditLog, nil
}

func (r *GormEventRepository) GetWorkspaceUserActivityPaginated(ctx context.Context, workspaceID, actorUserID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.AuditPage, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	fetch := limit + 1

	query := r.db.WithContext(ctx).
		Table("board_audit_events bae").
		Where("bae.workspace_id = ?", workspaceID).
		Where("bae.actor_user_id = ?", actorUserID)

	if cursor != nil {
		query = query.Where(
			`(bae.created_at < ?) 
				OR (bae.created_at = ? 
				AND bae.id < ?)
				`, cursor.CreatedAt, cursor.CreatedAt, cursor.ID)
	}

	var events []models.BoardAuditEvent
	err := query.Order("bae.created_at DESC, bae.id DESC").Limit(fetch).Find(&events).Error
	if err != nil {
		return nil, err
	}

	hasMore := len(events) > limit
	if hasMore {
		events = events[:limit]
	}

	var nextCursor *dto.AuditCursor
	if len(events) > 0 && hasMore {
		lastEvent := events[len(events)-1]
		nextCursor = &dto.AuditCursor{
			CreatedAt: lastEvent.CreatedAt,
			ID:        lastEvent.ID,
		}
	}

	return &dto.AuditPage{
		Events:     events,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

func (r *GormEventRepository) GetUserActivity(ctx context.Context, actorUserID uuid.UUID) ([]models.BoardAuditEvent, error) {
	var auditLog []models.BoardAuditEvent
	err := r.db.WithContext(ctx).
		Where("actor_user_id = ?", actorUserID).
		Order("created_at DESC").
		Find(&auditLog).Error
	if err != nil {
		return nil, err
	}
	return auditLog, nil
}

func (r *GormEventRepository) GetUserActivityPaginated(ctx context.Context, actorUserID uuid.UUID, limit int, cursor *dto.AuditCursor) (*dto.AuditPage, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	fetch := limit + 1

	query := r.db.WithContext(ctx).
		Table("board_audit_events bae").
		Where("bae.actor_user_id = ?", actorUserID)

	if cursor != nil {
		query = query.Where(
			`(bae.created_at < ?) 
				OR (bae.created_at = ? 
				AND bae.id < ?)
				`, cursor.CreatedAt, cursor.CreatedAt, cursor.ID)
	}

	var events []models.BoardAuditEvent
	err := query.Order("bae.created_at DESC, bae.id DESC").Limit(fetch).Find(&events).Error
	if err != nil {
		return nil, err
	}

	hasMore := len(events) > limit
	if hasMore {
		events = events[:limit]
	}

	var nextCursor *dto.AuditCursor
	if len(events) > 0 && hasMore {
		lastEvent := events[len(events)-1]
		nextCursor = &dto.AuditCursor{
			CreatedAt: lastEvent.CreatedAt,
			ID:        lastEvent.ID,
		}
	}

	return &dto.AuditPage{
		Events:     events,
		NextCursor: nextCursor,
		HasMore:    hasMore,
	}, nil
}

func (r *GormEventRepository) GetListCardsByCardIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error) {
	if len(cardIDs) == 0 {
		return []models.ListCard{}, nil
	}

	rows := make([]models.ListCard, 0, len(cardIDs))
	query := r.db.WithContext(ctx).Table("list_cards lc")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("lc.deleted_at IS NULL")
	}

	if err := query.
		Where("lc.card_id IN ?", cardIDs).
		Order("lc.card_id, lc.created_at ASC, lc.id ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	return rows, nil
}

func (r *GormEventRepository) GetAuditEntitiesDetails(ctx context.Context, entityIDsByType map[string][]uuid.UUID) (AuditEntityRows, error) {
	rows := AuditEntityRows{}

	if ids := entityIDsByType["workspace"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.Workspaces).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["board"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.Boards).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["list"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.Lists).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["card"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.Cards).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["user"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).
			Table("users").
			Select("id, name, username, avatar_url, props").
			Where("id IN ? AND deleted_at IS NULL", ids).
			Find(&rows.Users).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["user_workspace"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.UserWorkspaces).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["board_list"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.BoardLists).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["list_card"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.ListCards).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["card_member"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.CardMembers).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["card_label_link"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.CardLabelLinks).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["entry_member"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.EntryMembers).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["list_watch"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.ListWatches).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["card_watch"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.CardWatches).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["board_watch"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.BoardWatches).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["checklist"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.Checklists).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["entry"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.Entries).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["checklist_entry"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.ChecklistEntries).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}
	if ids := entityIDsByType["card_checklist"]; len(ids) > 0 {
		if err := r.db.WithContext(ctx).Where("id IN ? AND deleted_at IS NULL", ids).Find(&rows.CardChecklists).Error; err != nil {
			return AuditEntityRows{}, err
		}
	}

	return rows, nil
}

func (r *GormEventRepository) GetAffectedBoardIDsForTargets(ctx context.Context, targetIDsByEntity map[string][]uuid.UUID) ([]uuid.UUID, error) {
	boardSet := make(map[uuid.UUID]struct{})

	for _, boardID := range targetIDsByEntity["board"] {
		if boardID == uuid.Nil {
			continue
		}
		boardSet[boardID] = struct{}{}
	}

	listIDs := targetIDsByEntity["list"]
	if len(listIDs) > 0 {
		var listBoardIDs []uuid.UUID
		if err := r.db.WithContext(ctx).
			Table("board_lists").
			Distinct("board_id").
			Where("list_id IN ?", listIDs).
			Where("deleted_at IS NULL").
			Find(&listBoardIDs).Error; err != nil {
			return nil, err
		}
		for _, boardID := range listBoardIDs {
			if boardID == uuid.Nil {
				continue
			}
			boardSet[boardID] = struct{}{}
		}
	}

	cardIDs := targetIDsByEntity["card"]
	if len(cardIDs) > 0 {
		var cardBoardIDs []uuid.UUID
		if err := r.db.WithContext(ctx).
			Table("list_cards lc").
			Select("DISTINCT bl.board_id").
			Joins("JOIN board_lists bl ON bl.list_id = lc.list_id").
			Where("lc.card_id IN ?", cardIDs).
			Where("lc.deleted_at IS NULL").
			Where("bl.deleted_at IS NULL").
			Find(&cardBoardIDs).Error; err != nil {
			return nil, err
		}
		for _, boardID := range cardBoardIDs {
			if boardID == uuid.Nil {
				continue
			}
			boardSet[boardID] = struct{}{}
		}
	}

	boardIDs := make([]uuid.UUID, 0, len(boardSet))
	for boardID := range boardSet {
		boardIDs = append(boardIDs, boardID)
	}

	return boardIDs, nil
}

func (r *GormEventRepository) ResolveBoardConsumersForRootListCard(ctx context.Context, rootListCardID, sourceBoardID, targetBoardID uuid.UUID) ([]uuid.UUID, error) {
	boardSet := make(map[uuid.UUID]struct{})

	if sourceBoardID != uuid.Nil {
		boardSet[sourceBoardID] = struct{}{}
	}
	if targetBoardID != uuid.Nil {
		boardSet[targetBoardID] = struct{}{}
	}

	if rootListCardID != uuid.Nil {
		var mirroredBoardIDs []uuid.UUID
		if err := r.db.WithContext(ctx).
			Table("list_cards lc").
			Select("DISTINCT bl.board_id").
			Joins("JOIN board_lists bl ON bl.list_id = lc.list_id").
			Where("lc.root_id = ?", rootListCardID).
			Where("lc.deleted_at IS NULL").
			Where("bl.deleted_at IS NULL").
			Find(&mirroredBoardIDs).Error; err != nil {
			return nil, err
		}
		for _, boardID := range mirroredBoardIDs {
			if boardID == uuid.Nil {
				continue
			}
			boardSet[boardID] = struct{}{}
		}
	}

	result := make([]uuid.UUID, 0, len(boardSet))
	for boardID := range boardSet {
		result = append(result, boardID)
	}

	return result, nil
}

func (r *GormEventRepository) ResolveBoardConsumersForSourceBoardMirrors(ctx context.Context, sourceBoardID uuid.UUID) ([]uuid.UUID, error) {
	if sourceBoardID == uuid.Nil {
		return []uuid.UUID{}, nil
	}

	result := make([]uuid.UUID, 0)
	if err := r.db.WithContext(ctx).
		Table("board_lists bl").
		Distinct("bl.board_id").
		Joins("JOIN board_lists root_bl ON root_bl.id = bl.root_id").
		Where("root_bl.board_id = ?", sourceBoardID).
		Where("bl.deleted_at IS NULL").
		Where("root_bl.deleted_at IS NULL").
		Find(&result).Error; err != nil {
		return nil, err
	}

	return result, nil
}

func (r *GormEventRepository) ResolveBoardConsumersForSourceBoardCardMirrors(ctx context.Context, sourceBoardID uuid.UUID) ([]uuid.UUID, error) {
	if sourceBoardID == uuid.Nil {
		return []uuid.UUID{}, nil
	}

	result := make([]uuid.UUID, 0)
	if err := r.db.WithContext(ctx).
		Table("list_cards lc_consumer").
		Distinct("bl_consumer.board_id").
		Joins("JOIN list_cards lc_root ON lc_root.id = lc_consumer.root_id").
		Joins("JOIN board_lists bl_root ON bl_root.list_id = lc_root.list_id").
		Joins("JOIN board_lists bl_consumer ON bl_consumer.list_id = lc_consumer.list_id").
		Where("bl_root.board_id = ?", sourceBoardID).
		Where("lc_consumer.deleted_at IS NULL").
		Where("lc_root.deleted_at IS NULL").
		Where("bl_root.deleted_at IS NULL").
		Where("bl_consumer.deleted_at IS NULL").
		Find(&result).Error; err != nil {
		return nil, err
	}

	return result, nil
}

func (r *GormEventRepository) ResolveListCardIDsByBoardID(ctx context.Context, boardID uuid.UUID) ([]uuid.UUID, error) {
	if boardID == uuid.Nil {
		return []uuid.UUID{}, nil
	}

	result := make([]uuid.UUID, 0)
	if err := r.db.WithContext(ctx).
		Table("board_lists bl").
		Distinct("lc.id").
		Joins("JOIN list_cards lc ON lc.list_id = bl.list_id").
		Where("bl.board_id = ?", boardID).
		Where("bl.deleted_at IS NULL").
		Where("lc.deleted_at IS NULL").
		Find(&result).Error; err != nil {
		return nil, err
	}

	return result, nil
}

func (r *GormEventRepository) ResolveRootListCardIDsByBoardID(ctx context.Context, boardID uuid.UUID) ([]uuid.UUID, error) {
	if boardID == uuid.Nil {
		return []uuid.UUID{}, nil
	}

	result := make([]uuid.UUID, 0)
	if err := r.db.WithContext(ctx).
		Table("board_lists bl").
		Distinct("lc.root_id").
		Joins("JOIN list_cards lc ON lc.list_id = bl.list_id").
		Where("bl.board_id = ?", boardID).
		Where("bl.deleted_at IS NULL").
		Where("lc.deleted_at IS NULL").
		Where("lc.root_id IS NOT NULL").
		Find(&result).Error; err != nil {
		return nil, err
	}

	return result, nil
}

func (r *GormEventRepository) ResolveListCardIDsByRootID(ctx context.Context, rootListCardID uuid.UUID) ([]uuid.UUID, error) {
	if rootListCardID == uuid.Nil {
		return []uuid.UUID{}, nil
	}

	result := make([]uuid.UUID, 0)
	if err := r.db.WithContext(ctx).
		Table("list_cards lc").
		Distinct("lc.id").
		Where("lc.root_id = ?", rootListCardID).
		Where("lc.deleted_at IS NULL").
		Find(&result).Error; err != nil {
		return nil, err
	}

	return result, nil
}

func (r *GormEventRepository) ResolveRootListCardIDsByListID(ctx context.Context, listID uuid.UUID) ([]uuid.UUID, error) {
	if listID == uuid.Nil {
		return []uuid.UUID{}, nil
	}

	result := make([]uuid.UUID, 0)
	if err := r.db.WithContext(ctx).
		Table("list_cards lc").
		Distinct("lc.root_id").
		Where("lc.list_id = ?", listID).
		Where("lc.deleted_at IS NULL").
		Where("lc.root_id IS NOT NULL").
		Find(&result).Error; err != nil {
		return nil, err
	}

	return result, nil
}

func (r *GormEventRepository) GetBoardsByIDs(ctx context.Context, boardIDs []uuid.UUID) ([]models.Board, error) {
	if len(boardIDs) == 0 {
		return []models.Board{}, nil
	}

	rows := make([]models.Board, 0, len(boardIDs))
	if err := r.db.WithContext(ctx).
		Table("boards").
		Where("id IN ?", boardIDs).
		Where("deleted_at IS NULL").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	return rows, nil
}

func (r *GormEventRepository) ResolveInboxUserConsumersForRootListCard(ctx context.Context, rootListCardID uuid.UUID) ([]uuid.UUID, error) {
	if rootListCardID == uuid.Nil {
		return []uuid.UUID{}, nil
	}

	result := make([]uuid.UUID, 0)
	if err := r.db.WithContext(ctx).
		Table("user_inbox_cards").
		Distinct("user_id").
		Where("root_list_card_id = ?", rootListCardID).
		Where("deleted_at IS NULL").
		Find(&result).Error; err != nil {
		return nil, err
	}

	return result, nil
}

func (r *GormEventRepository) ResolveInboxCardIDsForUserAndRootListCard(ctx context.Context, userID, rootListCardID uuid.UUID) ([]uuid.UUID, error) {
	if userID == uuid.Nil || rootListCardID == uuid.Nil {
		return []uuid.UUID{}, nil
	}

	result := make([]uuid.UUID, 0)
	if err := r.db.WithContext(ctx).
		Table("user_inbox_cards").
		Distinct("id").
		Where("user_id = ?", userID).
		Where("root_list_card_id = ?", rootListCardID).
		Where("deleted_at IS NULL").
		Find(&result).Error; err != nil {
		return nil, err
	}

	return result, nil
}

func (r *GormEventRepository) GetExternalRootRefsByIDs(ctx context.Context, rootIDs []uuid.UUID) ([]models.ExternalRootRefRow, error) {
	if len(rootIDs) == 0 {
		return []models.ExternalRootRefRow{}, nil
	}

	rows := []models.ExternalRootRefRow{}
	if err := r.db.WithContext(ctx).
		Table("list_cards lc").
		Select(`
			lc.id AS root_list_card_id,
			lc.card_id AS card_id,
			bl.board_id AS board_id,
			b.workspace_id AS workspace_id,
			w.name AS workspace_name,
			lc.list_id AS list_id,
			b.name AS board_name,
			l.title AS list_title,
			c.title AS card_title,
			lc.updated_at AS updated_at
		`).
		Joins("JOIN board_lists bl ON bl.list_id = lc.list_id").
		Joins("JOIN boards b ON b.id = bl.board_id").
		Joins("JOIN workspaces w ON w.id = b.workspace_id").
		Joins("JOIN lists l ON l.id = lc.list_id").
		Joins("JOIN cards c ON c.id = lc.card_id").
		Where("lc.id IN ?", rootIDs).
		Where("lc.deleted_at IS NULL").
		Where("bl.deleted_at IS NULL").
		Where("b.deleted_at IS NULL").
		Where("w.deleted_at IS NULL").
		Where("l.deleted_at IS NULL").
		Where("c.deleted_at IS NULL").
		Order("lc.updated_at DESC").
		Scan(&rows).Error; err != nil {
		return nil, err
	}

	return rows, nil
}

func (r *GormEventRepository) GetUsersToBeNotified(ctx context.Context, targetIDsByEntity map[string][]uuid.UUID) (map[string][]uuid.UUID, error) {
	results := make(map[string][]uuid.UUID)
	boardUsers := make([]uuid.UUID, 0)
	if err := r.db.WithContext(ctx).
		Select("user_id").
		Table("board_watches").
		Distinct("user_id").
		Where("board_id IN ?", targetIDsByEntity["board"]).
		Find(&boardUsers).Error; err != nil {
		return nil, err
	}
	results["board"] = boardUsers

	listUsers := make([]uuid.UUID, 0)
	if err := r.db.WithContext(ctx).
		Select("user_id").
		Table("list_watches").
		Distinct("user_id").
		Where("list_id IN ?", targetIDsByEntity["list"]).
		Find(&listUsers).Error; err != nil {
		return nil, err
	}
	results["list"] = listUsers

	cardUsers := make([]uuid.UUID, 0)
	if err := r.db.WithContext(ctx).
		Select("user_id").
		Table("card_watches").
		Distinct("user_id").
		Where("card_id IN ?", targetIDsByEntity["card"]).
		Find(&cardUsers).Error; err != nil {
		return nil, err
	}
	results["card"] = cardUsers

	return results, nil

}

func (r *GormEventRepository) GetUsersToBeNotifiedSingleQuery(ctx context.Context, targetIDsByEntity map[string][]uuid.UUID) (map[string][]uuid.UUID, error) {
	results := map[string][]uuid.UUID{
		"board": make([]uuid.UUID, 0),
		"list":  make([]uuid.UUID, 0),
		"card":  make([]uuid.UUID, 0),
	}

	type notificationUser struct {
		Entity string    `gorm:"column:entity"`
		UserID uuid.UUID `gorm:"column:user_id"`
	}

	sources := []struct {
		entity string
		table  string
		idCol  string
	}{
		{entity: "board", table: "board_watches", idCol: "board_id"},
		{entity: "list", table: "list_watches", idCol: "list_id"},
		{entity: "card", table: "card_watches", idCol: "card_id"},
	}

	queryParts := make([]string, 0, len(sources))
	args := make([]any, 0, len(sources))

	for _, src := range sources {
		ids := targetIDsByEntity[src.entity]
		if len(ids) == 0 {
			continue
		}

		queryParts = append(queryParts,
			fmt.Sprintf("SELECT '%s' AS entity, user_id FROM %s WHERE %s IN ?", src.entity, src.table, src.idCol),
		)
		args = append(args, ids)
	}

	if len(queryParts) == 0 {
		return results, nil
	}

	rawQuery := "SELECT DISTINCT entity, user_id FROM (" + strings.Join(queryParts, " UNION ALL ") + ") AS notified_users"

	var users []notificationUser
	if err := r.db.WithContext(ctx).Raw(rawQuery, args...).Scan(&users).Error; err != nil {
		return nil, err
	}

	for _, user := range users {
		results[user.Entity] = append(results[user.Entity], user.UserID)
	}

	return results, nil
}

func (r *GormEventRepository) GetUsersToBeNotifiedFlatSingleQuery(ctx context.Context, targetIDsByEntity map[string][]uuid.UUID) ([]uuid.UUID, error) {
	results := make([]uuid.UUID, 0)

	sources := []struct {
		entity string
		table  string
		idCol  string
	}{
		{entity: "board", table: "board_watches", idCol: "board_id"},
		{entity: "list", table: "list_watches", idCol: "list_id"},
		{entity: "card", table: "card_watches", idCol: "card_id"},
	}

	queryParts := make([]string, 0, len(sources))
	args := make([]any, 0, len(sources))

	for _, src := range sources {
		ids := targetIDsByEntity[src.entity]
		if len(ids) == 0 {
			continue
		}

		queryParts = append(queryParts,
			fmt.Sprintf("SELECT user_id FROM %s WHERE %s IN ?", src.table, src.idCol),
		)
		args = append(args, ids)
	}

	if len(queryParts) == 0 {
		return results, nil
	}

	rawQuery := "SELECT DISTINCT user_id FROM (" + strings.Join(queryParts, " UNION ALL ") + ") AS notified_users"

	if err := r.db.WithContext(ctx).Raw(rawQuery, args...).Scan(&results).Error; err != nil {
		return nil, err
	}

	return results, nil
}

func (s *GormEventRepository) CreateUserAuditNotifications(ctx context.Context, notifications []models.UserAuditNotification) error {
	if err := s.db.WithContext(ctx).Create(&notifications).Error; err != nil {
		return err
	}
	return nil
}

func (s *GormEventRepository) GetUserUnreadNotificationCount(ctx context.Context, userID uuid.UUID) (int, error) {
	var count int64
	err := s.db.WithContext(ctx).
		Table("user_audit_notifications").
		Where("user_id = ? AND read = false AND deleted_at IS NULL", userID).
		Count(&count).Error
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

func (s *GormEventRepository) GetBoardListsByListIds(ctx context.Context, listIDs []uuid.UUID) ([]models.BoardList, error) {
	var boardLists []models.BoardList
	err := s.db.WithContext(ctx).
		Table("board_lists").
		Where("list_id IN ? AND deleted_at IS NULL", listIDs).
		Find(&boardLists).Error
	if err != nil {
		return nil, err
	}
	return boardLists, nil
}
