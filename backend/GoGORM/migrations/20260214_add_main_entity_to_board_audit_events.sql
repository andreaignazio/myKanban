-- Add main entity fields to board_audit_events
-- Backfill existing rows and enforce NOT NULL constraints.

ALTER TABLE board_audit_events
    ADD COLUMN IF NOT EXISTS main_entity_id uuid,
    ADD COLUMN IF NOT EXISTS main_entity_type text;

UPDATE board_audit_events
SET main_entity_id = board_id
WHERE main_entity_id IS NULL;

UPDATE board_audit_events
SET main_entity_type = 'board'
WHERE main_entity_type IS NULL OR btrim(main_entity_type) = '';

ALTER TABLE board_audit_events
    ALTER COLUMN main_entity_id SET NOT NULL,
    ALTER COLUMN main_entity_type SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_board_audit_events_main_entity_id
    ON board_audit_events (main_entity_id);
