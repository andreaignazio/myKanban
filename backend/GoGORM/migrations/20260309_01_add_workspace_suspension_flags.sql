ALTER TABLE boards
    ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_pending_suspend boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_selected_for_suspend boolean NOT NULL DEFAULT false;

ALTER TABLE user_workspaces
    ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_pending_suspend boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_selected_for_suspend boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_boards_workspace_suspension_flags
    ON boards (workspace_id, is_suspended, is_pending_suspend)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_workspaces_workspace_suspension_flags
    ON user_workspaces (workspace_id, is_suspended, is_pending_suspend)
    WHERE deleted_at IS NULL;