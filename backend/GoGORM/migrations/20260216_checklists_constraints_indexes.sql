-- Constraints and indexes for checklist domain models:
-- checklists, entries, checklist_entries, card_checklists, entry_members

-- -----------------------------------------------------------------------------
-- checklist_entries
-- Rule: one entry can belong to only one active checklist, and only once per checklist
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_entries_active_entry_unique
    ON checklist_entries (entry_id)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_entries_active_checklist_entry_unique
    ON checklist_entries (checklist_id, entry_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_checklist_entries_active_checklist_pos
    ON checklist_entries (checklist_id, pos COLLATE "C")
    WHERE deleted_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_checklist_entries_checklist_id'
    ) THEN
        ALTER TABLE checklist_entries
            ADD CONSTRAINT fk_checklist_entries_checklist_id
            FOREIGN KEY (checklist_id) REFERENCES checklists(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_checklist_entries_entry_id'
    ) THEN
        ALTER TABLE checklist_entries
            ADD CONSTRAINT fk_checklist_entries_entry_id
            FOREIGN KEY (entry_id) REFERENCES entries(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- card_checklists
-- Rule: one checklist can belong to only one active card, and only once per card
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_card_checklists_active_checklist_unique
    ON card_checklists (checklist_id)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_checklists_active_card_checklist_unique
    ON card_checklists (card_id, checklist_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_card_checklists_active_card_pos
    ON card_checklists (card_id, pos COLLATE "C")
    WHERE deleted_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_checklists_card_id'
    ) THEN
        ALTER TABLE card_checklists
            ADD CONSTRAINT fk_card_checklists_card_id
            FOREIGN KEY (card_id) REFERENCES cards(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_checklists_checklist_id'
    ) THEN
        ALTER TABLE card_checklists
            ADD CONSTRAINT fk_card_checklists_checklist_id
            FOREIGN KEY (checklist_id) REFERENCES checklists(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- entry_members
-- Rule: one member can be linked to an entry only once
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_entry_members_active_entry_user_unique
    ON entry_members (entry_id, user_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entry_members_active_user_entry
    ON entry_members (user_id, entry_id)
    WHERE deleted_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_entry_members_entry_id'
    ) THEN
        ALTER TABLE entry_members
            ADD CONSTRAINT fk_entry_members_entry_id
            FOREIGN KEY (entry_id) REFERENCES entries(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_entry_members_user_id'
    ) THEN
        ALTER TABLE entry_members
            ADD CONSTRAINT fk_entry_members_user_id
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE;
    END IF;
END $$;
