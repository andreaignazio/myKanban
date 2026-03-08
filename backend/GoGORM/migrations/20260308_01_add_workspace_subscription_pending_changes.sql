ALTER TABLE workspace_subscriptions
    ADD COLUMN IF NOT EXISTS provider_schedule_id text,
    ADD COLUMN IF NOT EXISTS pending_plan text,
    ADD COLUMN IF NOT EXISTS pending_seat_quantity integer,
    ADD COLUMN IF NOT EXISTS pending_change_effective_at timestamp NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_workspace_subscriptions_pending_plan'
    ) THEN
        ALTER TABLE workspace_subscriptions
        ADD CONSTRAINT chk_workspace_subscriptions_pending_plan
        CHECK (pending_plan IS NULL OR pending_plan IN ('free','pro','premium'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ws_sub_provider_schedule_id
    ON workspace_subscriptions (provider_schedule_id)
    WHERE provider_schedule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ws_sub_pending_plan
    ON workspace_subscriptions (pending_plan)
    WHERE pending_plan IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ws_sub_pending_change_effective_at
    ON workspace_subscriptions (pending_change_effective_at)
    WHERE pending_change_effective_at IS NOT NULL;