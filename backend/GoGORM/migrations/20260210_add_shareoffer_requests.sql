-- Support board access requests for share_offers
ALTER TABLE share_offers
    ADD COLUMN kind text NOT NULL DEFAULT 'invite',
    ADD COLUMN decided_by_user_id uuid;

ALTER TABLE share_offers
    ALTER COLUMN to_user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_share_offers_target_kind_status
    ON share_offers (target_type, target_id, kind, status)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_share_offers_requester_pending
    ON share_offers (from_user_id, target_type, target_id, kind, status)
    WHERE deleted_at IS NULL;
