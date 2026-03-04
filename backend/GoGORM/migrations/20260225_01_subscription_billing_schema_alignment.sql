-- Align subscription + billing webhook schema with current Go models/repositories
-- - workspace_subscriptions (seat/lifecycle/provider fields)
-- - billing_webhook_events (idempotency inbox)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- workspace_subscriptions
-- -----------------------------------------------------------------------------
ALTER TABLE workspace_subscriptions
    ADD COLUMN IF NOT EXISTS provider_price_id text,
    ADD COLUMN IF NOT EXISTS seat_quantity integer,
    ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean,
    ADD COLUMN IF NOT EXISTS current_period_start timestamp NULL,
    ADD COLUMN IF NOT EXISTS last_webhook_at timestamp NULL,
    ADD COLUMN IF NOT EXISTS last_provider_event_id text NULL;

UPDATE workspace_subscriptions
SET seat_quantity = COALESCE(seat_quantity, 0)
WHERE seat_quantity IS NULL;

ALTER TABLE workspace_subscriptions
    ALTER COLUMN seat_quantity SET DEFAULT 0,
    ALTER COLUMN seat_quantity SET NOT NULL,
    ALTER COLUMN cancel_at_period_end SET DEFAULT false,
    ALTER COLUMN cancel_at_period_end SET NOT NULL;

UPDATE workspace_subscriptions
SET cancel_at_period_end = COALESCE(cancel_at_period_end, false)
WHERE cancel_at_period_end IS NULL;

-- current_period_end can be nullable for lifecycle states
ALTER TABLE workspace_subscriptions
    ALTER COLUMN current_period_end DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_workspace_subscriptions_status'
    ) THEN
        ALTER TABLE workspace_subscriptions
        ADD CONSTRAINT chk_workspace_subscriptions_status
        CHECK (status IN ('none','trial','active','past_due','canceled','incomplete','unpaid'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_workspace_subscriptions_provider'
    ) THEN
        ALTER TABLE workspace_subscriptions
        ADD CONSTRAINT chk_workspace_subscriptions_provider
        CHECK (provider IN ('stripe'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_ws_sub_provider_subscription_id
    ON workspace_subscriptions (provider_subscription_id)
    WHERE provider_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_ws_sub_provider_customer_id
    ON workspace_subscriptions (provider_customer_id);

CREATE INDEX IF NOT EXISTS ix_ws_sub_status
    ON workspace_subscriptions (status);

CREATE INDEX IF NOT EXISTS ix_ws_sub_plan
    ON workspace_subscriptions (plan);

-- -----------------------------------------------------------------------------
-- billing_webhook_events
-- Note: naming aligned to Go model/repo (payloadhash + status)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_webhook_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    event_id text NOT NULL,
    payloadhash text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'received',
    processed_at timestamp NULL,
    failed_at timestamp NULL,
    failure_reason text NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp NULL
);

ALTER TABLE billing_webhook_events
    ADD COLUMN IF NOT EXISTS payloadhash text,
    ADD COLUMN IF NOT EXISTS status text,
    ADD COLUMN IF NOT EXISTS created_at timestamp,
    ADD COLUMN IF NOT EXISTS updated_at timestamp,
    ADD COLUMN IF NOT EXISTS deleted_at timestamp;

UPDATE billing_webhook_events
SET payloadhash = COALESCE(payloadhash, '')
WHERE payloadhash IS NULL;

UPDATE billing_webhook_events
SET status = COALESCE(status, 'received')
WHERE status IS NULL;

ALTER TABLE billing_webhook_events
    ALTER COLUMN payloadhash SET DEFAULT '',
    ALTER COLUMN payloadhash SET NOT NULL,
    ALTER COLUMN status SET DEFAULT 'received',
    ALTER COLUMN status SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_billing_webhook_events_status'
    ) THEN
        ALTER TABLE billing_webhook_events
        ADD CONSTRAINT chk_billing_webhook_events_status
        CHECK (status IN ('received','processed','failed'));
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_webhook_events_provider_event
    ON billing_webhook_events (provider, event_id);

CREATE INDEX IF NOT EXISTS ix_billing_webhook_event_created_at
    ON billing_webhook_events (created_at);

CREATE INDEX IF NOT EXISTS ix_billing_webhook_event_processed_at
    ON billing_webhook_events (processed_at);
