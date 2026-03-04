-- Allow workspace-scoped audit events without a board reference.
-- Board-scoped events continue to set board_id as before.

ALTER TABLE board_audit_events
    ALTER COLUMN board_id DROP NOT NULL;
