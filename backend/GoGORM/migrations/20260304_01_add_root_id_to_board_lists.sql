ALTER TABLE board_lists
    ADD COLUMN IF NOT EXISTS root_id uuid;

WITH roots AS (
    SELECT DISTINCT ON (list_id)
        list_id,
        id AS root_id
    FROM board_lists
    ORDER BY list_id, created_at ASC, id ASC
)
UPDATE board_lists bl
SET root_id = roots.root_id
FROM roots
WHERE bl.list_id = roots.list_id
  AND bl.root_id IS NULL;

UPDATE board_lists
SET root_id = id
WHERE root_id IS NULL;

ALTER TABLE board_lists
    ALTER COLUMN root_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_board_lists_root_id
    ON board_lists (root_id);
