-- Align card_comments creator FK with renamed column:
-- user_id -> created_by_user_id

DO $$
BEGIN
    IF to_regclass('public.card_comments') IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'card_comments'
          AND column_name = 'user_id'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'card_comments'
          AND column_name = 'created_by_user_id'
    ) THEN
        ALTER TABLE card_comments RENAME COLUMN user_id TO created_by_user_id;
    END IF;
END $$;

-- Drop any FK on card_comments -> users built on user_id/created_by_user_id so we can recreate canonical one
DO $$
DECLARE
    fk_name text;
BEGIN
    IF to_regclass('public.card_comments') IS NULL THEN
        RETURN;
    END IF;

    FOR fk_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN pg_class refrel ON refrel.oid = con.confrelid
        WHERE con.contype = 'f'
          AND nsp.nspname = 'public'
          AND rel.relname = 'card_comments'
          AND refrel.relname = 'users'
          AND EXISTS (
                SELECT 1
                FROM unnest(con.conkey) AS keys(attnum)
                JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = keys.attnum
                WHERE att.attname IN ('user_id', 'created_by_user_id')
          )
    LOOP
        EXECUTE format('ALTER TABLE card_comments DROP CONSTRAINT IF EXISTS %I', fk_name);
    END LOOP;
END $$;

DO $$
BEGIN
    IF to_regclass('public.card_comments') IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'card_comments'
          AND column_name = 'created_by_user_id'
    ) THEN
        ALTER TABLE card_comments
            ALTER COLUMN created_by_user_id SET NOT NULL;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.card_comments') IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'card_comments'
          AND column_name = 'created_by_user_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_comments_created_by_user_id'
    ) THEN
        ALTER TABLE card_comments
            ADD CONSTRAINT fk_card_comments_created_by_user_id
            FOREIGN KEY (created_by_user_id) REFERENCES users(id)
            ON DELETE RESTRICT;
    END IF;
END $$;
