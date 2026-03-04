-- Add workspace_id to watch tables for workspace-scoped filtering

ALTER TABLE board_watches
    ADD COLUMN IF NOT EXISTS workspace_id uuid;

ALTER TABLE list_watches
    ADD COLUMN IF NOT EXISTS workspace_id uuid;

ALTER TABLE card_watches
    ADD COLUMN IF NOT EXISTS workspace_id uuid;

UPDATE board_watches bw
SET workspace_id = b.workspace_id
FROM boards b
WHERE bw.board_id = b.id
  AND bw.workspace_id IS NULL;

UPDATE list_watches lw
SET workspace_id = b.workspace_id
FROM boards b
WHERE lw.board_id = b.id
  AND lw.workspace_id IS NULL;

UPDATE card_watches cw
SET workspace_id = b.workspace_id
FROM boards b
WHERE cw.board_id = b.id
  AND cw.workspace_id IS NULL;

ALTER TABLE board_watches
    ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE list_watches
    ALTER COLUMN workspace_id SET NOT NULL;

ALTER TABLE card_watches
    ALTER COLUMN workspace_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_board_watches_active_workspace_user
    ON board_watches (workspace_id, user_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_list_watches_active_workspace_user
    ON list_watches (workspace_id, user_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_card_watches_active_workspace_user
    ON card_watches (workspace_id, user_id)
    WHERE deleted_at IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_board_watches_workspace_id'
    ) THEN
        ALTER TABLE board_watches
            ADD CONSTRAINT fk_board_watches_workspace_id
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_list_watches_workspace_id'
    ) THEN
        ALTER TABLE list_watches
            ADD CONSTRAINT fk_list_watches_workspace_id
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_watches_workspace_id'
    ) THEN
        ALTER TABLE card_watches
            ADD CONSTRAINT fk_card_watches_workspace_id
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
            ON DELETE CASCADE;
    END IF;
END $$;
