-- Remove legacy constraint that disallows blank title on board_labels.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_board_labels_title_not_blank'
          AND conrelid = 'board_labels'::regclass
    ) THEN
        ALTER TABLE board_labels
            DROP CONSTRAINT chk_board_labels_title_not_blank;
    END IF;
END $$;
