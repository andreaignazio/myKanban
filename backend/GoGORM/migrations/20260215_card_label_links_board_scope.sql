-- Enforce board-scoped card label links:
-- 1) unique active triple (card_id, board_id, board_label_id)
-- 2) board consistency between card_label_links and board_labels

-- Ensure board_id exists (safe in case schema drifted across environments)
ALTER TABLE card_label_links
    ADD COLUMN IF NOT EXISTS board_id uuid;

-- Backfill board_id from board_labels when missing
UPDATE card_label_links cll
SET board_id = bl.board_id
FROM board_labels bl
WHERE cll.board_label_id = bl.id
  AND cll.board_id IS NULL;

-- board_id must be present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'card_label_links'
          AND column_name = 'board_id'
          AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE card_label_links
            ALTER COLUMN board_id SET NOT NULL;
    END IF;
END $$;

-- Replace old uniqueness (card_id, board_label_id) with board-scoped uniqueness
DROP INDEX IF EXISTS idx_card_label_links_active_card_label_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_label_links_active_card_board_label_unique
    ON card_label_links (card_id, board_id, board_label_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_card_label_links_active_board_label_card
    ON card_label_links (board_id, board_label_id, card_id)
    WHERE deleted_at IS NULL;

-- Needed to support composite FK target
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_board_labels_id_board_id'
    ) THEN
        ALTER TABLE board_labels
            ADD CONSTRAINT uq_board_labels_id_board_id
            UNIQUE (id, board_id);
    END IF;
END $$;

-- Ensure board_id points to an existing board
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_label_links_board_id'
    ) THEN
        ALTER TABLE card_label_links
            ADD CONSTRAINT fk_card_label_links_board_id
            FOREIGN KEY (board_id) REFERENCES boards(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- Guarantee linked label belongs to same board_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_label_links_board_label_id_board_id'
    ) THEN
        ALTER TABLE card_label_links
            ADD CONSTRAINT fk_card_label_links_board_label_id_board_id
            FOREIGN KEY (board_label_id, board_id) REFERENCES board_labels(id, board_id)
            ON DELETE CASCADE;
    END IF;
END $$;
