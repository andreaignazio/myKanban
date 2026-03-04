-- Backfill missing workspace_subscriptions rows for existing workspaces
INSERT INTO workspace_subscriptions (
    workspace_id,
    plan,
    status,
    provider,
    current_period_end,
    created_at,
    updated_at
)
SELECT
    w.id,
    'free',
    'none',
    'stripe',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM workspaces w
LEFT JOIN workspace_subscriptions ws
    ON ws.workspace_id = w.id
WHERE ws.workspace_id IS NULL
  AND w.deleted_at IS NULL;
