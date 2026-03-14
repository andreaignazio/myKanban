-- Add index to support cursor-based pagination on user_audit_notifications
-- joined with board_audit_events ordered by bae.created_at DESC, bae.id DESC

-- Index on board_audit_events for the cursor filter + order (already likely exists via PK, but explicit composite helps)
CREATE INDEX IF NOT EXISTS idx_bae_created_at_id_desc
    ON board_audit_events (created_at DESC, id DESC);

-- Index on user_audit_notifications to efficiently filter by user_id and look up audit_id
CREATE INDEX IF NOT EXISTS idx_uan_user_id_audit_id
    ON user_audit_notifications (user_id, audit_id)
    WHERE deleted_at IS NULL;
