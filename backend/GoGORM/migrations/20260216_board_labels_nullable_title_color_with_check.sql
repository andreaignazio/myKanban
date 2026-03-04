-- board_labels: allow nullable title/color, but forbid both NULL at the same time.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'board_labels'
          AND column_name = 'title'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE board_labels
            ALTER COLUMN title DROP NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'board_labels'
          AND column_name = 'color'
          AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE board_labels
            ALTER COLUMN color DROP NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_board_labels_title_or_color_not_both_null'
    ) THEN
        ALTER TABLE board_labels
            ADD CONSTRAINT chk_board_labels_title_or_color_not_both_null
            CHECK (title IS NOT NULL OR color IS NOT NULL);
    END IF;
END $$;
