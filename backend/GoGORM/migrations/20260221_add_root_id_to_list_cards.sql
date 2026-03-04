ALTER TABLE list_cards
    ADD COLUMN IF NOT EXISTS root_id uuid;

UPDATE list_cards
SET root_id = id
WHERE root_id IS NULL;

ALTER TABLE list_cards
    ALTER COLUMN root_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_list_cards_active_root_id
    ON list_cards (root_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_list_cards_active_card_id_root_id
    ON list_cards (card_id, root_id)
    WHERE deleted_at IS NULL;
