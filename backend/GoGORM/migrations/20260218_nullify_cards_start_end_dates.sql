-- Force card schedule dates to NULL for all existing cards.
-- Data preservation is intentionally not required.

ALTER TABLE cards
    ALTER COLUMN start_date DROP NOT NULL,
    ALTER COLUMN end_date DROP NOT NULL;

ALTER TABLE cards
    DROP COLUMN IF EXISTS due_date;

UPDATE cards
SET start_date = NULL,
    end_date = NULL;