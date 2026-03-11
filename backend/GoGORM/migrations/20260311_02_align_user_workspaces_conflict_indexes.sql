-- Ensure user_workspaces matches the assumptions used by ON CONFLICT (workspace_id, user_id).
-- If duplicates already exist, keep one row per pair, preferring active memberships.
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY workspace_id, user_id
            ORDER BY
                CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END,
                updated_at DESC NULLS LAST,
                created_at DESC NULLS LAST,
                id DESC
        ) AS row_num
    FROM user_workspaces
), duplicates AS (
    SELECT id
    FROM ranked
    WHERE row_num > 1
)
DELETE FROM user_workspaces uw
USING duplicates d
WHERE uw.id = d.id;

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_workspaces_workspace_user
    ON user_workspaces (workspace_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_workspaces_one_owner
    ON user_workspaces (workspace_id)
    WHERE role = 'owner';

CREATE INDEX IF NOT EXISTS ix_user_workspaces_workspace_pos
    ON user_workspaces (workspace_id, pos);