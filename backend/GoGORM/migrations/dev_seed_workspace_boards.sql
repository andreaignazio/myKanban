-- ============================================================
-- DEV ONLY — Seed X fake boards into a workspace
--
-- Usage: replace the three variables below, then run the script.
--
--   target_workspace_id  — the workspace UUID to populate
--   creator_user_id      — user UUID that will own the boards
--   board_count          — how many boards to insert
--
-- The script is idempotent: re-running will not create
-- duplicates (uses ON CONFLICT DO NOTHING on boards).
-- ============================================================

DO $$
DECLARE
    target_workspace_id uuid := '9c2fcb93-1097-409e-a6e6-a7e3c0532c87'; -- <<< REPLACE
    creator_user_id     uuid := '00000000-0000-0000-0000-000000000000'; -- <<< REPLACE
    board_count         int  := 20;                                      -- <<< REPLACE

    i            int;
    new_board_id uuid;
    fake_name    text;
    fake_token   text;
BEGIN
    FOR i IN 1..board_count LOOP
        new_board_id := gen_random_uuid();
        fake_name    := 'Seed Board ' || i;
        fake_token   := substr(replace(new_board_id::text, '-', ''), 1, 16);

        INSERT INTO boards (
            id,
            name,
            created_by_user_id,
            workspace_id,
            visibility,
            public_token,
            props,
            is_suspended,
            is_pending_suspend,
            created_at,
            updated_at
        )
        VALUES (
            new_board_id,
            fake_name,
            creator_user_id,
            target_workspace_id,
            'private',
            fake_token,
            '{}',
            false,
            false,
            now(),
            now()
        )
        ON CONFLICT DO NOTHING;

    END LOOP;

    RAISE NOTICE 'Seeded % fake boards into workspace %', board_count, target_workspace_id;
END;
$$;
