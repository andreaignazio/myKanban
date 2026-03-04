-- board_labels: treat blank title as no-title and enforce uniqueness only on non-empty titles.

UPDATE board_labels
SET title = NULL
WHERE title IS NOT NULL
  AND btrim(title) = '';

DROP INDEX IF EXISTS idx_board_labels_active_board_lower_title_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_board_labels_active_board_lower_title_unique
    ON board_labels (board_id, lower(title))
    WHERE deleted_at IS NULL
      AND title IS NOT NULL
      AND btrim(title) <> '';
