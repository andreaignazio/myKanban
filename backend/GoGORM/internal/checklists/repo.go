package checklists

import (
	"GoGORM/models"
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type GormChecklistRepo struct {
	db *gorm.DB
}

func NewGormChecklistRepo(db *gorm.DB) *GormChecklistRepo {
	return &GormChecklistRepo{db: db}
}

func (r *GormChecklistRepo) GetCardChecklists(ctx context.Context, cardID uuid.UUID, includeDeleted bool) ([]models.CardChecklist, error) {
	var cardChecklists []models.CardChecklist
	query := r.db.WithContext(ctx).Table("card_checklists")
	if includeDeleted {
		query = query.Unscoped()
	}
	if err := query.
		Where("card_id = ?", cardID).
		Order("pos COLLATE \"C\"").
		Find(&cardChecklists).Error; err != nil {
		return nil, err
	}
	return cardChecklists, nil
}

func (r *GormChecklistRepo) GetChecklistEntries(ctx context.Context, checklistID uuid.UUID, includeDeleted bool) ([]models.ChecklistEntry, error) {
	var checklistEntries []models.ChecklistEntry
	query := r.db.WithContext(ctx).Table("checklist_entries")
	if includeDeleted {
		query = query.Unscoped()
	}
	if err := query.
		Where("checklist_id = ?", checklistID).
		Order("pos COLLATE \"C\"").
		Find(&checklistEntries).Error; err != nil {
		return nil, err
	}
	return checklistEntries, nil
}

func (r *GormChecklistRepo) GetChecklistByID(ctx context.Context, checklistID uuid.UUID, includeDeleted bool) (*models.Checklist, error) {
	var checklist models.Checklist
	query := r.db.WithContext(ctx).Table("checklists")
	if includeDeleted {
		query = query.Unscoped()
	}
	if err := query.Where("id = ?", checklistID).First(&checklist).Error; err != nil {
		return nil, err
	}
	return &checklist, nil
}

func (r *GormChecklistRepo) GetEntriesByChecklistID(ctx context.Context, checklistID uuid.UUID, includeDeleted bool) ([]models.Entry, error) {
	var entries []models.Entry
	query := r.db.WithContext(ctx).
		Table("entries AS e").
		Select("e.*").
		Joins("JOIN checklist_entries AS ce ON ce.entry_id = e.id").
		Where("ce.checklist_id = ?", checklistID).
		Order("ce.pos COLLATE \"C\"")
	if includeDeleted {
		query = query.Unscoped()
	}
	if err := query.Find(&entries).Error; err != nil {
		return nil, err
	}
	return entries, nil
}

func (r *GormChecklistRepo) CreateChecklist(ctx context.Context, tx *gorm.DB, checklist *models.Checklist) error {
	if err := tx.WithContext(ctx).
		Model(checklist).
		Clauses(clause.Returning{}).
		Create(checklist).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormChecklistRepo) UpdateChecklist(ctx context.Context, checklistID uuid.UUID, updateMap map[string]any) (*models.Checklist, error) {
	var checklist models.Checklist
	if err := r.db.WithContext(ctx).
		Model(&checklist).
		Clauses(clause.Returning{}).
		Where("id = ?", checklistID).
		Updates(updateMap).Error; err != nil {
		return nil, err
	}
	return &checklist, nil
}

func (r *GormChecklistRepo) UpdateCardChecklist(ctx context.Context, cardID, checklistID uuid.UUID, updateMap map[string]any) (*models.CardChecklist, error) {
	var cardChecklist models.CardChecklist
	if err := r.db.WithContext(ctx).
		Model(&cardChecklist).
		Clauses(clause.Returning{}).
		Where("card_id = ? AND checklist_id = ?", cardID, checklistID).
		Updates(updateMap).Error; err != nil {
		return nil, err
	}
	return &cardChecklist, nil
}

func (r *GormChecklistRepo) DeleteChecklist(ctx context.Context, checklistID uuid.UUID) (*models.Checklist, error) {
	var checklist models.Checklist
	result := r.db.WithContext(ctx).
		Model(&models.Checklist{}).
		Clauses(clause.Returning{}).
		Where("id = ?", checklistID).
		Delete(&checklist)

	if result.Error != nil {
		return nil, result.Error
	}

	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}

	return &checklist, nil
}

func (r *GormChecklistRepo) DeleteCardChecklist(ctx context.Context, tx *gorm.DB, cardID, checklistID uuid.UUID) (*models.CardChecklist, error) {
	var cardChecklist models.CardChecklist
	result := tx.WithContext(ctx).
		Model(&models.CardChecklist{}).
		Clauses(clause.Returning{}).
		Where("card_id = ? AND checklist_id = ?", cardID, checklistID).
		Delete(&cardChecklist)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &cardChecklist, nil
}

func (r *GormChecklistRepo) CreateCardChecklist(ctx context.Context, tx *gorm.DB, cardChecklist *models.CardChecklist) error {
	if err := tx.WithContext(ctx).
		Model(cardChecklist).
		Clauses(clause.Returning{}).
		Create(cardChecklist).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormChecklistRepo) CreateEntry(ctx context.Context, tx *gorm.DB, entry *models.Entry) error {
	if err := tx.WithContext(ctx).
		Model(entry).
		Clauses(clause.Returning{}).
		Create(entry).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormChecklistRepo) CreateChecklistEntry(ctx context.Context, tx *gorm.DB, checklistEntry *models.ChecklistEntry) error {
	if err := tx.WithContext(ctx).
		Model(checklistEntry).
		Clauses(clause.Returning{}).
		Create(checklistEntry).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormChecklistRepo) UpdateEntry(ctx context.Context, entryID uuid.UUID, updateMap map[string]any) (*models.Entry, error) {
	var entry models.Entry
	if err := r.db.WithContext(ctx).
		Model(&entry).
		Clauses(clause.Returning{}).
		Where("id = ?", entryID).
		Updates(updateMap).Error; err != nil {
		return nil, err
	}
	return &entry, nil
}

func (r *GormChecklistRepo) UpdateChecklistEntry(ctx context.Context, checklistID, entryID uuid.UUID, updateMap map[string]any) (*models.ChecklistEntry, error) {
	var checklistEntry models.ChecklistEntry
	if err := r.db.WithContext(ctx).
		Model(&checklistEntry).
		Clauses(clause.Returning{}).
		Where("checklist_id = ? AND entry_id = ?", checklistID, entryID).
		Updates(updateMap).Error; err != nil {
		return nil, err
	}
	return &checklistEntry, nil
}

func (r *GormChecklistRepo) DeleteEntry(ctx context.Context, tx *gorm.DB, entryID uuid.UUID) (*models.Entry, error) {
	var entry models.Entry
	result := tx.WithContext(ctx).
		Model(&models.Entry{}).
		Clauses(clause.Returning{}).
		Where("id = ?", entryID).
		Delete(&entry)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &entry, nil
}

func (r *GormChecklistRepo) DeleteChecklistEntry(ctx context.Context, tx *gorm.DB, checklistID, entryID uuid.UUID) (*models.ChecklistEntry, error) {
	var checklistEntry models.ChecklistEntry
	result := tx.WithContext(ctx).
		Model(&models.ChecklistEntry{}).
		Clauses(clause.Returning{}).
		Where("checklist_id = ? AND entry_id = ?", checklistID, entryID).
		Delete(&checklistEntry)
	if result.Error != nil {
		return nil, result.Error
	}
	if result.RowsAffected == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &checklistEntry, nil
}

func (r *GormChecklistRepo) CreateCard(ctx context.Context, tx *gorm.DB, card *models.Card) error {
	if err := tx.WithContext(ctx).
		Table("cards").
		Clauses(clause.Returning{}).
		Create(card).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormChecklistRepo) CreateListCardTX(ctx context.Context, tx *gorm.DB, listCard *models.ListCard) error {
	if err := tx.WithContext(ctx).
		Table("list_cards").
		Clauses(clause.Returning{}).
		Create(listCard).Error; err != nil {
		return err
	}
	return nil
}

func (r *GormChecklistRepo) GetCardsInListTX(ctx context.Context, tx *gorm.DB, listID uuid.UUID, includeDeleted bool) ([]models.ListCard, error) {
	var listCards []models.ListCard
	query := tx.WithContext(ctx).Table("list_cards")
	if includeDeleted {
		query = query.Unscoped()
	} else {
		query = query.Where("deleted_at IS NULL")
	}
	if err := query.
		Where("list_id = ?", listID).
		Order("pos COLLATE \"C\"").
		Find(&listCards).Error; err != nil {
		return nil, err
	}
	return listCards, nil
}

func (r *GormChecklistRepo) IsListInBoardTX(ctx context.Context, tx *gorm.DB, boardID, listID uuid.UUID) (bool, error) {
	var count int64
	if err := tx.WithContext(ctx).
		Table("board_lists").
		Where("board_id = ? AND list_id = ?", boardID, listID).
		Where("deleted_at IS NULL").
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *GormChecklistRepo) GetChecklistsByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.Checklist, error) {
	var checklists []models.Checklist
	query := tx.WithContext(ctx).
		Table("checklists AS c").
		Select("c.*").
		Joins("JOIN card_checklists AS cc ON cc.checklist_id = c.id").
		Where("cc.card_id = ?", cardID).
		Order("cc.pos COLLATE \"C\"")
	if includeDeleted {
		query = query.Unscoped()
	}
	if err := query.Find(&checklists).Error; err != nil {
		return nil, err
	}
	return checklists, nil
}

func (r *GormChecklistRepo) GetEntriesByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.Entry, error) {
	var entries []models.Entry
	query := tx.WithContext(ctx).
		Table("entries AS e").
		Select("DISTINCT e.*").
		Joins("JOIN checklist_entries AS ce ON ce.entry_id = e.id").
		Joins("JOIN card_checklists AS cc ON cc.checklist_id = ce.checklist_id").
		Where("cc.card_id = ?", cardID)
	if includeDeleted {
		query = query.Unscoped()
	}
	if err := query.Find(&entries).Error; err != nil {
		return nil, err
	}
	return entries, nil
}

func (r *GormChecklistRepo) GetCardChecklistsByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.CardChecklist, error) {
	var cardChecklists []models.CardChecklist
	query := tx.WithContext(ctx).
		Table("card_checklists").
		Where("card_id = ?", cardID).
		Order("pos COLLATE \"C\"")
	if includeDeleted {
		query = query.Unscoped()
	}
	if err := query.Find(&cardChecklists).Error; err != nil {
		return nil, err
	}
	return cardChecklists, nil
}

func (r *GormChecklistRepo) GetChecklistEntriesByCardIDTX(ctx context.Context, tx *gorm.DB, cardID uuid.UUID, includeDeleted bool) ([]models.ChecklistEntry, error) {
	var checklistEntries []models.ChecklistEntry
	query := tx.WithContext(ctx).
		Table("checklist_entries AS ce").
		Select("ce.*").
		Joins("JOIN card_checklists AS cc ON cc.checklist_id = ce.checklist_id").
		Where("cc.card_id = ?", cardID).
		Order("ce.pos COLLATE \"C\"")
	if includeDeleted {
		query = query.Unscoped()
	}
	if err := query.Find(&checklistEntries).Error; err != nil {
		return nil, err
	}
	return checklistEntries, nil
}

func (r *GormChecklistRepo) BulkCreateChecklistsTX(ctx context.Context, tx *gorm.DB, checklists []models.Checklist) error {
	if len(checklists) == 0 {
		return nil
	}
	return tx.WithContext(ctx).Create(&checklists).Error
}

func (r *GormChecklistRepo) BulkCreateEntriesTX(ctx context.Context, tx *gorm.DB, entries []models.Entry) error {
	if len(entries) == 0 {
		return nil
	}
	return tx.WithContext(ctx).Create(&entries).Error
}

func (r *GormChecklistRepo) BulkCreateCardChecklistsTX(ctx context.Context, tx *gorm.DB, cardChecklists []models.CardChecklist) error {
	if len(cardChecklists) == 0 {
		return nil
	}
	return tx.WithContext(ctx).Create(&cardChecklists).Error
}

func (r *GormChecklistRepo) BulkCreateChecklistEntriesTX(ctx context.Context, tx *gorm.DB, checklistEntries []models.ChecklistEntry) error {
	if len(checklistEntries) == 0 {
		return nil
	}
	return tx.WithContext(ctx).Create(&checklistEntries).Error
}
