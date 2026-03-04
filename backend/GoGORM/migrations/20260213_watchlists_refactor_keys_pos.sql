-- Refactor watchlists:
-- - technical PK `id` and sortable `pos`
-- - uniqueness for list/card watches by logical target (user + target)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- Add technical key + position columns
-- -----------------------------------------------------------------------------
ALTER TABLE board_watches
    ADD COLUMN IF NOT EXISTS id uuid,
    ADD COLUMN IF NOT EXISTS pos text;

ALTER TABLE list_watches
    ADD COLUMN IF NOT EXISTS id uuid,
    ADD COLUMN IF NOT EXISTS pos text;

ALTER TABLE card_watches
    ADD COLUMN IF NOT EXISTS id uuid,
    ADD COLUMN IF NOT EXISTS pos text;

UPDATE board_watches
SET id = gen_random_uuid()
WHERE id IS NULL;

UPDATE list_watches
SET id = gen_random_uuid()
WHERE id IS NULL;

UPDATE card_watches
SET id = gen_random_uuid()
WHERE id IS NULL;

-- deterministic per-user ordering seed for existing rows
WITH ranked AS (
    SELECT
        ctid,
        lpad(row_number() OVER (
            PARTITION BY user_id
            ORDER BY created_at NULLS LAST, board_id
        )::text, 12, '0') AS new_pos
    FROM board_watches
)
UPDATE board_watches bw
SET pos = ranked.new_pos
FROM ranked
WHERE bw.ctid = ranked.ctid
  AND bw.pos IS NULL;

WITH ranked AS (
    SELECT
        ctid,
        lpad(row_number() OVER (
            PARTITION BY user_id
            ORDER BY created_at NULLS LAST, list_id
        )::text, 12, '0') AS new_pos
    FROM list_watches
)
UPDATE list_watches lw
SET pos = ranked.new_pos
FROM ranked
WHERE lw.ctid = ranked.ctid
  AND lw.pos IS NULL;

WITH ranked AS (
    SELECT
        ctid,
        lpad(row_number() OVER (
            PARTITION BY user_id
            ORDER BY created_at NULLS LAST, card_id
        )::text, 12, '0') AS new_pos
    FROM card_watches
)
UPDATE card_watches cw
SET pos = ranked.new_pos
FROM ranked
WHERE cw.ctid = ranked.ctid
  AND cw.pos IS NULL;

ALTER TABLE board_watches
    ALTER COLUMN id SET NOT NULL,
    ALTER COLUMN pos SET NOT NULL;

ALTER TABLE list_watches
    ALTER COLUMN id SET NOT NULL,
    ALTER COLUMN pos SET NOT NULL;

ALTER TABLE card_watches
    ALTER COLUMN id SET NOT NULL,
    ALTER COLUMN pos SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pk_board_watches_id'
    ) THEN
        ALTER TABLE board_watches
            ADD CONSTRAINT pk_board_watches_id PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pk_list_watches_id'
    ) THEN
        ALTER TABLE list_watches
            ADD CONSTRAINT pk_list_watches_id PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pk_card_watches_id'
    ) THEN
        ALTER TABLE card_watches
            ADD CONSTRAINT pk_card_watches_id PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_board_watches_pos_not_blank'
    ) THEN
        ALTER TABLE board_watches
            ADD CONSTRAINT chk_board_watches_pos_not_blank
            CHECK (char_length(trim(pos)) > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_list_watches_pos_not_blank'
    ) THEN
        ALTER TABLE list_watches
            ADD CONSTRAINT chk_list_watches_pos_not_blank
            CHECK (char_length(trim(pos)) > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_card_watches_pos_not_blank'
    ) THEN
        ALTER TABLE card_watches
            ADD CONSTRAINT chk_card_watches_pos_not_blank
            CHECK (char_length(trim(pos)) > 0);
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Rework uniqueness (drop old board-scoped keys for list/card)
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_list_watches_active_user_board_list_unique;
DROP INDEX IF EXISTS idx_card_watches_active_user_board_card_unique;

-- remove duplicates on ACTIVE rows before creating new unique keys
WITH dupes AS (
    SELECT ctid
    FROM (
        SELECT
            ctid,
            row_number() OVER (
                PARTITION BY user_id, list_id
                ORDER BY created_at ASC NULLS LAST
            ) AS rn
        FROM list_watches
        WHERE deleted_at IS NULL
    ) x
    WHERE x.rn > 1
)
DELETE FROM list_watches lw
USING dupes
WHERE lw.ctid = dupes.ctid;

WITH dupes AS (
    SELECT ctid
    FROM (
        SELECT
            ctid,
            row_number() OVER (
                PARTITION BY user_id, card_id
                ORDER BY created_at ASC NULLS LAST
            ) AS rn
        FROM card_watches
        WHERE deleted_at IS NULL
    ) x
    WHERE x.rn > 1
)
DELETE FROM card_watches cw
USING dupes
WHERE cw.ctid = dupes.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_list_watches_active_user_list_unique
    ON list_watches (user_id, list_id)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_card_watches_active_user_card_unique
    ON card_watches (user_id, card_id)
    WHERE deleted_at IS NULL;

-- keep board_watches uniqueness as-is (already logical target)

-- ordering-friendly indexes for FE list rendering
CREATE INDEX IF NOT EXISTS idx_board_watches_active_user_pos
    ON board_watches (user_id, pos COLLATE "C")
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_list_watches_active_user_pos
    ON list_watches (user_id, pos COLLATE "C")
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_card_watches_active_user_pos
    ON card_watches (user_id, pos COLLATE "C")
    WHERE deleted_at IS NULL;
