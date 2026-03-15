-- ============================================================
-- DEV ONLY — Seed X fake members into a workspace
--
-- Usage: replace the two variables below, then run the script.
--
--   :target_workspace_id  — the workspace UUID to populate
--   :member_count         — how many fake users to insert
--
-- The script is idempotent: re-running with the same workspace
-- and the same count will not create duplicates (uses
-- ON CONFLICT DO NOTHING on both users and user_workspaces).
-- ============================================================

DO $$
DECLARE
    target_workspace_id uuid := '9c2fcb93-1097-409e-a6e6-a7e3c0532c87'; -- <<< REPLACE
    member_count        int  := 15;                                       -- <<< REPLACE

    i           int;
    new_user_id uuid;
    fake_email  text;
    fake_name   text;
    fake_user   text;
BEGIN
    FOR i IN 1..member_count LOOP
        new_user_id := gen_random_uuid();
        fake_email  := 'seeduser_' || i || '_' || substr(replace(new_user_id::text, '-', ''), 1, 8) || '@dev.local';
        fake_name   := 'Seed User ' || i;
        fake_user   := 'seeduser_' || i || '_' || substr(replace(new_user_id::text, '-', ''), 1, 8);

        -- Insert fake user (skip if email/username collision from a previous run)
        INSERT INTO users (id, name, email, username, password_hash, avatar_url, props, created_at, updated_at)
        VALUES (
            new_user_id,
            fake_name,
            fake_email,
            fake_user,
            '',         -- no password
            '',
            '{}',
            now(),
            now()
        )
        ON CONFLICT DO NOTHING;

        -- Add as workspace member (role = 'member')
        INSERT INTO user_workspaces (id, workspace_id, user_id, pos, role, is_suspended, is_pending_suspend, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            target_workspace_id,
            new_user_id,
            lpad(i::text, 10, '0'),   -- simple lexicographic position
            'member',
            false,
            false,
            now(),
            now()
        )
        ON CONFLICT DO NOTHING;

    END LOOP;

    RAISE NOTICE 'Seeded % fake members into workspace %', member_count, target_workspace_id;
END;
$$;
