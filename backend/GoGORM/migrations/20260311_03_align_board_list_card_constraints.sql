-- Align production with the local PostgreSQL behavior for boards, board_lists and list_cards.
-- This migration is idempotent and only creates objects that are missing.

-- board_lists is unique per (board_id, list_id) locally.
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY board_id, list_id
            ORDER BY
                CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END,
                updated_at DESC NULLS LAST,
                created_at DESC NULLS LAST,
                id DESC
        ) AS row_num
    FROM board_lists
), duplicates AS (
    SELECT id
    FROM ranked
    WHERE row_num > 1
)
DELETE FROM board_lists bl
USING duplicates d
WHERE bl.id = d.id;

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
            JOIN pg_index x ON x.indexrelid = i.oid
            JOIN pg_class t ON t.oid = x.indrelid
            WHERE n.nspname = 'public'
              AND i.relkind = 'i'
              AND i.relname = 'board_lists_board_id_list_id_key'
              AND t.relname = 'board_lists'
              AND x.indisunique
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

CREATE INDEX IF NOT EXISTS idx_board_lists_board_pos
    ON public.board_lists (board_id, pos);

CREATE INDEX IF NOT EXISTS idx_board_lists_root_id
    ON public.board_lists (root_id);

-- list_cards is unique per (list_id, card_id) locally.
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY list_id, card_id
            ORDER BY
                CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END,
                updated_at DESC NULLS LAST,
                created_at DESC NULLS LAST,
                id DESC
        ) AS row_num
    FROM list_cards
), duplicates AS (
    SELECT id
    FROM ranked
    WHERE row_num > 1
)
DELETE FROM list_cards lc
USING duplicates d
WHERE lc.id = d.id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'list_cards'
          AND c.conname = 'list_cards_list_id_card_id_key'
    ) THEN
        IF EXISTS (
            SELECT 1
            FROM pg_class i
            JOIN pg_namespace n ON n.oid = i.relnamespace
            JOIN pg_index x ON x.indexrelid = i.oid
            JOIN pg_class t ON t.oid = x.indrelid
            WHERE n.nspname = 'public'
              AND i.relkind = 'i'
              AND i.relname = 'list_cards_list_id_card_id_key'
              AND t.relname = 'list_cards'
              AND x.indisunique
        ) THEN
            ALTER TABLE public.list_cards
                ADD CONSTRAINT list_cards_list_id_card_id_key
                UNIQUE USING INDEX list_cards_list_id_card_id_key;
        ELSE
            ALTER TABLE public.list_cards
                ADD CONSTRAINT list_cards_list_id_card_id_key
                UNIQUE (list_id, card_id);
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_list_cards_list_pos
    ON public.list_cards (list_id, pos);

CREATE INDEX IF NOT EXISTS idx_list_cards_active_root_id
    ON public.list_cards (root_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_list_cards_active_card_id_root_id
    ON public.list_cards (card_id, root_id)
    WHERE deleted_at IS NULL;

-- boards.public_token is unique locally. Do not mutate board rows automatically if prod data is already invalid.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.boards
        WHERE public_token IS NOT NULL
          AND public_token <> ''
        GROUP BY public_token
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Cannot add uni_boards_public_token: duplicate non-empty public_token values exist in public.boards';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'boards'
          AND c.conname = 'uni_boards_public_token'
    ) THEN
        IF EXISTS (
            SELECT 1
            FROM pg_class i
            JOIN pg_namespace n ON n.oid = i.relnamespace
            JOIN pg_index x ON x.indexrelid = i.oid
            JOIN pg_class t ON t.oid = x.indrelid
            WHERE n.nspname = 'public'
              AND i.relkind = 'i'
              AND i.relname = 'uni_boards_public_token'
              AND t.relname = 'boards'
              AND x.indisunique
        ) THEN
            ALTER TABLE public.boards
                ADD CONSTRAINT uni_boards_public_token
                UNIQUE USING INDEX uni_boards_public_token;
        ELSE
            ALTER TABLE public.boards
                ADD CONSTRAINT uni_boards_public_token
                UNIQUE (public_token);
        END IF;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_boards_workspace_suspension_flags
    ON public.boards (workspace_id, is_suspended, is_pending_suspend)
    WHERE deleted_at IS NULL;