-- Align share_offers uniqueness with current business rules:
-- - allow re-invite after rejected/revoked/accepted
-- - prevent duplicate active pending offers for the same logical target

-- 1) Drop legacy uniqueness object if present (could be either constraint or index)
ALTER TABLE share_offers
    DROP CONSTRAINT IF EXISTS uq_share_offers_target_from_to;

DROP INDEX IF EXISTS uq_share_offers_target_from_to;

-- 2) Remove duplicate active pending rows before creating the new unique index
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY
                target_type,
                target_id,
                from_user_id,
                COALESCE(to_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
                kind
            ORDER BY created_at DESC, id DESC
        ) AS rn
    FROM share_offers
    WHERE deleted_at IS NULL
      AND status = 'pending'
)
DELETE FROM share_offers so
USING ranked r
WHERE so.id = r.id
  AND r.rn > 1;

-- 3) Enforce uniqueness only for ACTIVE pending offers
CREATE UNIQUE INDEX IF NOT EXISTS uq_share_offers_pending_target_from_to_kind
    ON share_offers (
        target_type,
        target_id,
        from_user_id,
        COALESCE(to_user_id, '00000000-0000-0000-0000-000000000000'::uuid),
        kind
    )
    WHERE deleted_at IS NULL AND status = 'pending';
