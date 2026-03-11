DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'board_lists'
          AND c.conname = 'board_lists_board_id_list_id_key'
    ) THEN
        IF EXISTS (
            SELECT 1
            FROM pg_class i
            JOIN pg_namespace n ON n.oid = i.relnamespace
            WHERE n.nspname = 'public'
              AND i.relkind = 'i'
              AND i.relname = 'board_lists_board_id_list_id_key'
        ) THEN
            ALTER TABLE public.board_lists
                ADD CONSTRAINT board_lists_board_id_list_id_key
                UNIQUE USING INDEX board_lists_board_id_list_id_key;
        ELSE
            ALTER TABLE public.board_lists
                ADD CONSTRAINT board_lists_board_id_list_id_key
                UNIQUE (board_id, list_id);
        END IF;
    END IF;
END $$;