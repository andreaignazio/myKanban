package links

import (
	"GoGORM/internal/dbx"
	"GoGORM/internal/domainerr"
	"GoGORM/models"
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormLinksRepo struct {
	db *gorm.DB
}

func NewGormLinksRepo(db *gorm.DB) *GormLinksRepo {
	return &GormLinksRepo{db: db}
}

func (r *GormLinksRepo) createList(ctx context.Context, db *gorm.DB, list *models.List) error {
	if err := db.WithContext(ctx).
		Table("lists").
		Create(list).Error; err != nil {
		return dbx.WrapDBErr(err, "error creating list")
	}
	return nil

}

func (r *GormLinksRepo) CreateOrUpdateBoardList(ctx context.Context, db *gorm.DB, boardList *models.BoardList) error {
	if err := db.WithContext(ctx).
		Table("board_lists").
		Clauses(clause.Returning{}, clause.OnConflict{
			Columns:   []clause.Column{{Name: "list_id"}, {Name: "board_id"}},
			DoUpdates: clause.AssignmentColumns([]string{"access_mode"}),
		}).Create(&boardList).Error; err != nil {
		return dbx.WrapDBErr(err, "error creating or updating board list")
	}
	return nil
}

func (r *GormLinksRepo) GetListsInBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.BoardList, error) {
	listsInBoard := []models.BoardList{}
	query := r.db.WithContext(ctx).Table("board_lists bl")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("bl.deleted_at IS NULL")
	}
	if err := query.
		Where("bl.board_id = ?", boardID).
		Order("bl.pos COLLATE \"C\"").
		Find(&listsInBoard).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get lists of board")
	}
	return listsInBoard, nil

}

func (r *GormLinksRepo) PatchBoardListPositionTX(ctx context.Context, tx *gorm.DB, boardList *models.BoardList) error {
	patch := &models.BoardList{Pos: boardList.Pos}
	//patched := &models.BoardList{}
	if err := tx.WithContext(ctx).
		Table("board_lists bl").
		Where("bl.board_id = ? AND bl.list_id = ?", boardList.BoardID, boardList.ListID).
		Clauses(clause.Returning{}).
		Updates(patch).
		Scan(boardList).Error; err != nil {
		return dbx.WrapDBErr(err, "error updating position")
	}

	return nil
}

type BoardListRow struct {
	BoardID   uuid.UUID  `gorm:"column:board_id"`
	ListID    uuid.UUID  `gorm:"column:list_id"`
	Pos       string     `gorm:"column:pos"`
	DeletedAt *time.Time `gorm:"column:deleted_at"`
}

func (r *GormLinksRepo) BulkPatchBoardListPosition(ctx context.Context,
	boardID uuid.UUID, listIDs []uuid.UUID, positions []string) ([]models.BoardList, error) {

	var rows []models.BoardList
	err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Raw(`
				UPDATE board_lists bl
				SET pos = v.pos
				FROM unnest(?::uuid[], ?::text[]) AS v(list_id, pos)
				WHERE bl.board_id = ?
				AND bl.list_id = v.list_id
				RETURNING bl.*;
				`, pq.Array(listIDs), pq.Array(positions), boardID).
			Scan(&rows).Error; err != nil {
			return dbx.WrapDBErr(err, "error batch update")
		}
		return nil
	})
	if err != nil {
		return nil, dbx.WrapDBErr(err, "error batch")
	}

	return rows, nil

}

func (r *GormLinksRepo) DeleteBoardList(ctx context.Context, boardID, listID uuid.UUID) error {
	tx := r.db.WithContext(ctx).
		Table("board_lists").
		Where("board_id = ? AND list_id = ?", boardID, listID).
		Delete(&models.BoardList{})

	if tx.Error != nil {
		return dbx.WrapDBErr(tx.Error, "error deleting")
	}

	if tx.RowsAffected == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}

func (r *GormLinksRepo) CreateBoardListTX(ctx context.Context, db *gorm.DB, boardList *models.BoardList) error {
	if err := db.WithContext(ctx).
		Table("board_lists").
		Create(boardList).
		Clauses(clause.Returning{}).
		Scan(boardList).
		Error; err != nil {
		return dbx.WrapDBErr(err, "error creating board list")
	}
	return nil
}

func (r *GormLinksRepo) DetatchListFromBoard(ctx context.Context, db *gorm.DB, boardID, listID uuid.UUID) (*models.BoardList, error) {
	var boardList models.BoardList
	tx := db.WithContext(ctx).
		Table("board_lists").
		Clauses(clause.Returning{}).
		Where("board_id = ? AND list_id = ?", boardID, listID).
		Delete(&boardList)

	if tx.Error != nil {
		return nil, dbx.WrapDBErr(tx.Error, "error detatching list from board")
	}
	if tx.RowsAffected == 0 {
		return nil, domainerr.ErrNotFound
	}
	return &boardList, nil
}

func (r *GormLinksRepo) RestoreListToBoard(ctx context.Context, boardID, listID uuid.UUID, position string) (*models.BoardList, error) {
	var boardList models.BoardList
	if err := r.db.WithContext(ctx).
		Unscoped().
		Clauses(clause.Returning{}).
		Model(&models.BoardList{}).
		Where("board_id = ? AND list_id = ?", boardID, listID).
		Update("deleted_at", nil).
		Update("pos", position).
		Scan(&boardList).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error restoring list to board")
	}
	return &boardList, nil
}

func (r *GormLinksRepo) PatchBoardListAccessMode(ctx context.Context, boardList *models.BoardList) error {
	patch := &models.BoardList{AccessMode: boardList.AccessMode}
	if err := r.db.WithContext(ctx).
		Table("board_lists bl").
		Where("bl.board_id = ? AND bl.list_id = ?", boardList.BoardID, boardList.ListID).
		Updates(patch).
		Scan(boardList).Error; err != nil {
		return dbx.WrapDBErr(err, "error updating access mode")
	}

	return nil
}

func (r *GormLinksRepo) GetBoardList(ctx context.Context, boardID, listID uuid.UUID, includeDeleted bool) (*models.BoardList, error) {
	boardList := &models.BoardList{}
	query := r.db.WithContext(ctx).Table("board_lists bl")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("bl.deleted_at IS NULL")
	}
	if err := query.
		Where("bl.board_id = ? AND bl.list_id = ?", boardID, listID).
		First(boardList).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get board list")
	}
	return boardList, nil
}

func (r *GormLinksRepo) GetBoardListByID(ctx context.Context, boardID, boardListID uuid.UUID, includeDeleted bool) (*models.BoardList, error) {
	boardList := &models.BoardList{}
	query := r.db.WithContext(ctx).Table("board_lists bl")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("bl.deleted_at IS NULL")
	}
	if err := query.
		Where("bl.board_id = ? AND bl.id = ?", boardID, boardListID).
		First(boardList).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get board list by id")
	}
	return boardList, nil
}

func (r *GormLinksRepo) GetBoardListLinksByRootID(ctx context.Context, rootID uuid.UUID, includeDeleted bool) ([]models.BoardList, error) {
	boardLists := []models.BoardList{}
	query := r.db.WithContext(ctx).Table("board_lists bl")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("bl.deleted_at IS NULL")
	}
	if err := query.
		Where("bl.root_id = ?", rootID).
		Order("bl.created_at ASC, bl.id ASC").
		Find(&boardLists).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get board list links by root id")
	}
	return boardLists, nil
}

func (r *GormLinksRepo) GetUserBoardLinks(ctx context.Context, userID, boardID uuid.UUID, includeDeleted bool) (*models.UserBoard, error) {
	userBoard := &models.UserBoard{}
	query := r.db.WithContext(ctx).Table("user_boards ub")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("ub.deleted_at IS NULL")
	}
	if err := query.Where("ub.user_id = ? AND ub.board_id = ?", userID, boardID).
		First(userBoard).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get user board link")
	}
	return userBoard, nil
}

func (r *GormLinksRepo) GetBoardListLinks(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.BoardList, error) {
	boardLists := []models.BoardList{}
	query := r.db.WithContext(ctx).Table("board_lists bl")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("bl.deleted_at IS NULL")
	}
	if err := query.Where("bl.board_id = ?", boardID).
		Order("bl.pos COLLATE \"C\"").
		Find(&boardLists).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get board list links")
	}
	return boardLists, nil
}

func (r *GormLinksRepo) GetBoardListLinksTX(ctx context.Context, tx *gorm.DB, boardID uuid.UUID, includeDeleted bool) ([]models.BoardList, error) {
	boardLists := []models.BoardList{}
	query := tx.WithContext(ctx).Table("board_lists bl")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("bl.deleted_at IS NULL")
	}
	if err := query.Where("bl.board_id = ?", boardID).
		Order("bl.pos COLLATE \"C\"").
		Find(&boardLists).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get board list links")
	}
	return boardLists, nil
}

func (r *GormLinksRepo) GetListCardLinks(ctx context.Context, listIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error) {
	if len(listIDs) == 0 {
		return []models.ListCard{}, nil
	}
	listCards := []models.ListCard{}
	query := r.db.WithContext(ctx).Table("list_cards lc")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("lc.deleted_at IS NULL")
	}
	if err := query.Where("lc.list_id IN ?", listIDs).
		Order("lc.list_id, lc.pos COLLATE \"C\"").
		Find(&listCards).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get list card links")
	}
	return listCards, nil
}

func (r *GormLinksRepo) GetDeletedBoardListLinks(ctx context.Context, boardID uuid.UUID) ([]models.BoardList, error) {
	boardLists := []models.BoardList{}
	if err := r.db.WithContext(ctx).
		Unscoped().
		Table("board_lists bl").
		Where("bl.board_id = ?", boardID).
		Where("bl.deleted_at IS NOT NULL").
		Order("bl.updated_at DESC").
		Find(&boardLists).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get deleted board list links")
	}
	return boardLists, nil
}

func (r *GormLinksRepo) GetDeletedListCardLinksByBoardID(ctx context.Context, boardID uuid.UUID) ([]models.ListCard, error) {
	listCards := []models.ListCard{}
	if err := r.db.WithContext(ctx).
		Unscoped().
		Table("list_cards lc").
		Select("DISTINCT lc.*").
		Joins("JOIN board_lists bl ON bl.list_id = lc.list_id").
		Where("bl.board_id = ?", boardID).
		Where("lc.deleted_at IS NOT NULL").
		Order("lc.updated_at DESC").
		Find(&listCards).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get deleted list card links by board")
	}
	return listCards, nil
}

func (r *GormLinksRepo) RestoreBoardListLinksByIDsTX(ctx context.Context, tx *gorm.DB, boardID uuid.UUID, boardListIDs []uuid.UUID) ([]models.BoardList, error) {
	if len(boardListIDs) == 0 {
		return []models.BoardList{}, nil
	}

	updated := []models.BoardList{}
	if err := tx.WithContext(ctx).
		Raw(`
			UPDATE board_lists bl
			SET deleted_at = NULL
			WHERE bl.board_id = ?
			AND bl.id = ANY(?::uuid[])
			AND bl.deleted_at IS NOT NULL
			RETURNING bl.*
		`, boardID, pq.Array(boardListIDs)).
		Scan(&updated).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error restoring board list links")
	}

	return updated, nil
}

func (r *GormLinksRepo) GetDeletedListCardLinksByIDsAndBoardIDTX(ctx context.Context, tx *gorm.DB, boardID uuid.UUID, listCardIDs []uuid.UUID) ([]models.ListCard, error) {
	if len(listCardIDs) == 0 {
		return []models.ListCard{}, nil
	}

	listCards := []models.ListCard{}
	if err := tx.WithContext(ctx).
		Unscoped().
		Table("list_cards lc").
		Select("DISTINCT lc.*").
		Joins("JOIN board_lists bl ON bl.list_id = lc.list_id").
		Where("bl.board_id = ?", boardID).
		Where("lc.id IN ?", listCardIDs).
		Where("lc.deleted_at IS NOT NULL").
		Find(&listCards).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get deleted list card links by ids and board")
	}

	return listCards, nil
}

func (r *GormLinksRepo) RestoreListCardLinksTX(ctx context.Context, tx *gorm.DB, listCards []models.ListCard) ([]models.ListCard, error) {
	if len(listCards) == 0 {
		return []models.ListCard{}, nil
	}

	restored := make([]models.ListCard, 0, len(listCards))
	for i := range listCards {
		candidate := listCards[i]
		updated := models.ListCard{}
		if err := tx.WithContext(ctx).
			Raw(`
				UPDATE list_cards lc
				SET list_id = ?, pos = ?, deleted_at = NULL
				WHERE lc.id = ?
				AND lc.deleted_at IS NOT NULL
				RETURNING lc.*
			`, candidate.ListID, candidate.Pos, candidate.ID).
			Scan(&updated).Error; err != nil {
			return nil, dbx.WrapDBErr(err, "error restoring list card link")
		}
		if updated.ID != uuid.Nil {
			restored = append(restored, updated)
		}
	}

	return restored, nil
}

func (r *GormLinksRepo) PurgeBoardListLinksByIDsTX(ctx context.Context, tx *gorm.DB, boardID uuid.UUID, boardListIDs []uuid.UUID) ([]models.BoardList, error) {
	if len(boardListIDs) == 0 {
		return []models.BoardList{}, nil
	}

	purged := []models.BoardList{}
	if err := tx.WithContext(ctx).
		Unscoped().
		Model(&models.BoardList{}).
		Clauses(clause.Returning{}).
		Where("board_id = ?", boardID).
		Where("id IN ?", boardListIDs).
		Where("deleted_at IS NOT NULL").
		Delete(&models.BoardList{}).
		Scan(&purged).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error purging board list links")
	}

	return purged, nil
}

func (r *GormLinksRepo) PurgeListCardLinksByIDsTX(ctx context.Context, tx *gorm.DB, listCardIDs []uuid.UUID) ([]models.ListCard, error) {
	if len(listCardIDs) == 0 {
		return []models.ListCard{}, nil
	}

	purged := []models.ListCard{}
	if err := tx.WithContext(ctx).
		Unscoped().
		Model(&models.ListCard{}).
		Clauses(clause.Returning{}).
		Where("id IN ?", listCardIDs).
		Where("deleted_at IS NOT NULL").
		Delete(&models.ListCard{}).
		Scan(&purged).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error purging list card links")
	}

	return purged, nil
}

func (r *GormLinksRepo) GetListCardLinksByCardIDs(ctx context.Context, cardIDs []uuid.UUID, includeDeleted bool) ([]models.ListCard, error) {
	if len(cardIDs) == 0 {
		return []models.ListCard{}, nil
	}
	listCards := []models.ListCard{}
	query := r.db.WithContext(ctx).Table("list_cards lc")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("lc.deleted_at IS NULL")
	}
	if err := query.Where("lc.card_id IN ?", cardIDs).
		Order("lc.card_id, lc.pos COLLATE \"C\"").
		Find(&listCards).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get list card links by card ids")
	}
	return listCards, nil
}

func (r *GormLinksRepo) GetExternalRootRefsByIDs(ctx context.Context, rootIDs []uuid.UUID, includeDeleted bool) ([]models.ExternalRootRefRow, error) {
	if len(rootIDs) == 0 {
		return []models.ExternalRootRefRow{}, nil
	}

	rows := []models.ExternalRootRefRow{}
	query := r.db.WithContext(ctx).Table("list_cards lc")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("lc.deleted_at IS NULL").
			Where("bl.deleted_at IS NULL").
			Where("b.deleted_at IS NULL").
			Where("w.deleted_at IS NULL").
			Where("l.deleted_at IS NULL").
			Where("c.deleted_at IS NULL")
	}

	if err := query.
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
		Order("lc.updated_at DESC").
		Scan(&rows).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get external root refs")
	}

	return rows, nil
}

func (r *GormLinksRepo) GetUserBoardRelationsByBoardID(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.UserBoard, error) {
	userBoards := []models.UserBoard{}
	query := r.db.WithContext(ctx).Table("user_boards ub")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("ub.deleted_at IS NULL")
	}
	if err := query.
		Where("ub.board_id = ?", boardID).
		Order("ub.pos COLLATE \"C\"").
		Find(&userBoards).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get user board relations")
	}
	return userBoards, nil
}

func (r *GormLinksRepo) GetCardMembersForBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.CardMember, error) {
	cardMembers := []models.CardMember{}
	query := r.db.WithContext(ctx).Table("card_members cm")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("cm.deleted_at IS NULL").Where("lc.deleted_at IS NULL").Where("bl.deleted_at IS NULL")
	}

	if err := query.
		Select("DISTINCT cm.*").
		Joins("JOIN list_cards lc ON lc.card_id = cm.card_id").
		Joins("JOIN board_lists bl ON bl.list_id = lc.list_id").
		Where("bl.board_id = ?", boardID).
		Find(&cardMembers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get board card members")
	}

	return cardMembers, nil
}

func (r *GormLinksRepo) GetCardChecklistsForBoard(ctx context.Context, boardID uuid.UUID, includeDeleted bool) ([]models.CardChecklist, error) {
	cardChecklists := []models.CardChecklist{}
	query := r.db.WithContext(ctx).Table("card_checklists cc")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("cc.deleted_at IS NULL")
	}

	existsClause := `EXISTS (
		SELECT 1
		FROM list_cards lc
		JOIN board_lists bl ON bl.list_id = lc.list_id
		WHERE lc.card_id = cc.card_id
		AND bl.board_id = ?
		AND lc.deleted_at IS NULL
		AND bl.deleted_at IS NULL
	)`

	if err := query.
		Where(existsClause, boardID).
		Order("cc.card_id, cc.pos COLLATE \"C\"").
		Find(&cardChecklists).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get board card checklists")
	}

	return cardChecklists, nil
}

func (r *GormLinksRepo) GetChecklistsByIDs(ctx context.Context, checklistIDs []uuid.UUID, includeDeleted bool) ([]models.Checklist, error) {
	if len(checklistIDs) == 0 {
		return []models.Checklist{}, nil
	}

	checklists := []models.Checklist{}
	query := r.db.WithContext(ctx).Table("checklists")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.
		Where("id IN ?", checklistIDs).
		Find(&checklists).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get checklists by IDs")
	}

	return checklists, nil
}

func (r *GormLinksRepo) GetChecklistEntriesByChecklistIDs(ctx context.Context, checklistIDs []uuid.UUID, includeDeleted bool) ([]models.ChecklistEntry, error) {
	if len(checklistIDs) == 0 {
		return []models.ChecklistEntry{}, nil
	}

	checklistEntries := []models.ChecklistEntry{}
	query := r.db.WithContext(ctx).Table("checklist_entries ce")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("ce.deleted_at IS NULL")
	}

	if err := query.
		Where("ce.checklist_id IN ?", checklistIDs).
		Order("ce.checklist_id, ce.pos COLLATE \"C\"").
		Find(&checklistEntries).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get checklist entries by checklist IDs")
	}

	return checklistEntries, nil
}

func (r *GormLinksRepo) GetEntriesByIDs(ctx context.Context, entryIDs []uuid.UUID, includeDeleted bool) ([]models.Entry, error) {
	if len(entryIDs) == 0 {
		return []models.Entry{}, nil
	}

	entries := []models.Entry{}
	query := r.db.WithContext(ctx).Table("entries")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}

	if err := query.
		Where("id IN ?", entryIDs).
		Find(&entries).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get entries by IDs")
	}

	return entries, nil
}

func (r *GormLinksRepo) GetEntryMembersByEntryIDs(ctx context.Context, entryIDs []uuid.UUID, includeDeleted bool) ([]models.EntryMember, error) {
	if len(entryIDs) == 0 {
		return []models.EntryMember{}, nil
	}

	entryMembers := []models.EntryMember{}
	query := r.db.WithContext(ctx).Table("entry_members em")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("em.deleted_at IS NULL")
	}

	if err := query.
		Where("em.entry_id IN ?", entryIDs).
		Find(&entryMembers).Error; err != nil {
		return nil, dbx.WrapDBErr(err, "error get entry members by entry IDs")
	}

	return entryMembers, nil
}
