-- Constraints and indexes for new models:
-- card_members, board_labels, card_label_links, user_inbox_cards,
-- list_watches, card_watches, board_watches, user_audit_notifications

-- -----------------------------------------------------------------------------
-- card_members
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_card_members_active_card_user_unique
    ON card_members (card_id, user_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_card_members_active_user_card
    ON card_members (user_id, card_id)
    WHERE deleted_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_members_card_id'
    ) THEN
        ALTER TABLE card_members
            ADD CONSTRAINT fk_card_members_card_id
            FOREIGN KEY (card_id) REFERENCES cards(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_members_user_id'
    ) THEN
        ALTER TABLE card_members
            ADD CONSTRAINT fk_card_members_user_id
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- board_labels
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_board_labels_active_board_lower_title_unique
    ON board_labels (board_id, lower(title))
    WHERE deleted_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_board_labels_title_not_blank'
    ) THEN
        ALTER TABLE board_labels
            ADD CONSTRAINT chk_board_labels_title_not_blank
            CHECK (char_length(trim(title)) > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_board_labels_board_id'
    ) THEN
        ALTER TABLE board_labels
            ADD CONSTRAINT fk_board_labels_board_id
            FOREIGN KEY (board_id) REFERENCES boards(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- card_label_links
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_card_label_links_active_card_label_unique
    ON card_label_links (card_id, board_label_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_card_label_links_active_label_card
    ON card_label_links (board_label_id, card_id)
    WHERE deleted_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_label_links_card_id'
    ) THEN
        ALTER TABLE card_label_links
            ADD CONSTRAINT fk_card_label_links_card_id
            FOREIGN KEY (card_id) REFERENCES cards(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_label_links_board_label_id'
    ) THEN
        ALTER TABLE card_label_links
            ADD CONSTRAINT fk_card_label_links_board_label_id
            FOREIGN KEY (board_label_id) REFERENCES board_labels(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- user_inbox_cards
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_inbox_cards_active_user_card_unique
    ON user_inbox_cards (user_id, card_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_inbox_cards_active_user_board_pos
    ON user_inbox_cards (user_id, source_board_id, pos COLLATE "C")
    WHERE deleted_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_user_inbox_cards_pos_not_blank'
    ) THEN
        ALTER TABLE user_inbox_cards
            ADD CONSTRAINT chk_user_inbox_cards_pos_not_blank
            CHECK (char_length(trim(pos)) > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_inbox_cards_user_id'
    ) THEN
        ALTER TABLE user_inbox_cards
            ADD CONSTRAINT fk_user_inbox_cards_user_id
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_inbox_cards_card_id'
    ) THEN
        ALTER TABLE user_inbox_cards
            ADD CONSTRAINT fk_user_inbox_cards_card_id
            FOREIGN KEY (card_id) REFERENCES cards(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_inbox_cards_source_board_id'
    ) THEN
        ALTER TABLE user_inbox_cards
            ADD CONSTRAINT fk_user_inbox_cards_source_board_id
            FOREIGN KEY (source_board_id) REFERENCES boards(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- watchlists: board_watches, list_watches, card_watches
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_board_watches_active_user_board_unique
    ON board_watches (user_id, board_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_board_watches_active_board_user
    ON board_watches (board_id, user_id)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_list_watches_active_user_board_list_unique
    ON list_watches (user_id, board_id, list_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_list_watches_active_list_user
    ON list_watches (list_id, user_id)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_watches_active_user_board_card_unique
    ON card_watches (user_id, board_id, card_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_card_watches_active_card_user
    ON card_watches (card_id, user_id)
    WHERE deleted_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_board_watches_board_id'
    ) THEN
        ALTER TABLE board_watches
            ADD CONSTRAINT fk_board_watches_board_id
            FOREIGN KEY (board_id) REFERENCES boards(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_board_watches_user_id'
    ) THEN
        ALTER TABLE board_watches
            ADD CONSTRAINT fk_board_watches_user_id
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_list_watches_board_id'
    ) THEN
        ALTER TABLE list_watches
            ADD CONSTRAINT fk_list_watches_board_id
            FOREIGN KEY (board_id) REFERENCES boards(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_list_watches_list_id'
    ) THEN
        ALTER TABLE list_watches
            ADD CONSTRAINT fk_list_watches_list_id
            FOREIGN KEY (list_id) REFERENCES lists(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_list_watches_user_id'
    ) THEN
        ALTER TABLE list_watches
            ADD CONSTRAINT fk_list_watches_user_id
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_watches_board_id'
    ) THEN
        ALTER TABLE card_watches
            ADD CONSTRAINT fk_card_watches_board_id
            FOREIGN KEY (board_id) REFERENCES boards(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_watches_card_id'
    ) THEN
        ALTER TABLE card_watches
            ADD CONSTRAINT fk_card_watches_card_id
            FOREIGN KEY (card_id) REFERENCES cards(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_watches_user_id'
    ) THEN
        ALTER TABLE card_watches
            ADD CONSTRAINT fk_card_watches_user_id
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- user_audit_notifications (user notifications)
-- -----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_audit_notifications_user_audit_unique
    ON user_audit_notifications (user_id, audit_id);

CREATE INDEX IF NOT EXISTS idx_user_audit_notifications_unread_user_audit
    ON user_audit_notifications (user_id, audit_id)
    WHERE read = false;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_audit_notifications_user_id'
    ) THEN
        ALTER TABLE user_audit_notifications
            ADD CONSTRAINT fk_user_audit_notifications_user_id
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_audit_notifications_audit_id'
    ) THEN
        ALTER TABLE user_audit_notifications
            ADD CONSTRAINT fk_user_audit_notifications_audit_id
            FOREIGN KEY (audit_id) REFERENCES board_audit_events(id)
            ON DELETE CASCADE;
    END IF;
END $$;
