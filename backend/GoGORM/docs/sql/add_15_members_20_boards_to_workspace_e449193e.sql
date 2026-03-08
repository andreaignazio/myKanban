BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM workspaces
        WHERE id = 'e449193e-d4ab-4f7d-a767-16f322a1cc34'::uuid
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Workspace % non trovato o eliminato', 'e449193e-d4ab-4f7d-a767-16f322a1cc34';
    END IF;
END $$;

WITH target_workspace AS (
    SELECT id, created_by_user_id
    FROM workspaces
    WHERE id = 'e449193e-d4ab-4f7d-a767-16f322a1cc34'::uuid
      AND deleted_at IS NULL
),
seed_users AS (
    SELECT *
    FROM (VALUES
        ('11111111-1111-4111-8111-111111111101'::uuid, '22222222-2222-4222-8222-222222222101'::uuid, 'Workspace E449 Member 01', 'workspace.e449.member.01@mytrello.local', 'workspace_e449_member_01', '', '', '{}'::jsonb, 'a0'),
        ('11111111-1111-4111-8111-111111111102'::uuid, '22222222-2222-4222-8222-222222222102'::uuid, 'Workspace E449 Member 02', 'workspace.e449.member.02@mytrello.local', 'workspace_e449_member_02', '', '', '{}'::jsonb, 'a1'),
        ('11111111-1111-4111-8111-111111111103'::uuid, '22222222-2222-4222-8222-222222222103'::uuid, 'Workspace E449 Member 03', 'workspace.e449.member.03@mytrello.local', 'workspace_e449_member_03', '', '', '{}'::jsonb, 'a2'),
        ('11111111-1111-4111-8111-111111111104'::uuid, '22222222-2222-4222-8222-222222222104'::uuid, 'Workspace E449 Member 04', 'workspace.e449.member.04@mytrello.local', 'workspace_e449_member_04', '', '', '{}'::jsonb, 'a3'),
        ('11111111-1111-4111-8111-111111111105'::uuid, '22222222-2222-4222-8222-222222222105'::uuid, 'Workspace E449 Member 05', 'workspace.e449.member.05@mytrello.local', 'workspace_e449_member_05', '', '', '{}'::jsonb, 'a4'),
        ('11111111-1111-4111-8111-111111111106'::uuid, '22222222-2222-4222-8222-222222222106'::uuid, 'Workspace E449 Member 06', 'workspace.e449.member.06@mytrello.local', 'workspace_e449_member_06', '', '', '{}'::jsonb, 'a5'),
        ('11111111-1111-4111-8111-111111111107'::uuid, '22222222-2222-4222-8222-222222222107'::uuid, 'Workspace E449 Member 07', 'workspace.e449.member.07@mytrello.local', 'workspace_e449_member_07', '', '', '{}'::jsonb, 'a6'),
        ('11111111-1111-4111-8111-111111111108'::uuid, '22222222-2222-4222-8222-222222222108'::uuid, 'Workspace E449 Member 08', 'workspace.e449.member.08@mytrello.local', 'workspace_e449_member_08', '', '', '{}'::jsonb, 'a7'),
        ('11111111-1111-4111-8111-111111111109'::uuid, '22222222-2222-4222-8222-222222222109'::uuid, 'Workspace E449 Member 09', 'workspace.e449.member.09@mytrello.local', 'workspace_e449_member_09', '', '', '{}'::jsonb, 'a8'),
        ('11111111-1111-4111-8111-11111111110a'::uuid, '22222222-2222-4222-8222-22222222210a'::uuid, 'Workspace E449 Member 10', 'workspace.e449.member.10@mytrello.local', 'workspace_e449_member_10', '', '', '{}'::jsonb, 'a9'),
        ('11111111-1111-4111-8111-11111111110b'::uuid, '22222222-2222-4222-8222-22222222210b'::uuid, 'Workspace E449 Member 11', 'workspace.e449.member.11@mytrello.local', 'workspace_e449_member_11', '', '', '{}'::jsonb, 'aa'),
        ('11111111-1111-4111-8111-11111111110c'::uuid, '22222222-2222-4222-8222-22222222210c'::uuid, 'Workspace E449 Member 12', 'workspace.e449.member.12@mytrello.local', 'workspace_e449_member_12', '', '', '{}'::jsonb, 'ab'),
        ('11111111-1111-4111-8111-11111111110d'::uuid, '22222222-2222-4222-8222-22222222210d'::uuid, 'Workspace E449 Member 13', 'workspace.e449.member.13@mytrello.local', 'workspace_e449_member_13', '', '', '{}'::jsonb, 'ac'),
        ('11111111-1111-4111-8111-11111111110e'::uuid, '22222222-2222-4222-8222-22222222210e'::uuid, 'Workspace E449 Member 14', 'workspace.e449.member.14@mytrello.local', 'workspace_e449_member_14', '', '', '{}'::jsonb, 'ad'),
        ('11111111-1111-4111-8111-11111111110f'::uuid, '22222222-2222-4222-8222-22222222210f'::uuid, 'Workspace E449 Member 15', 'workspace.e449.member.15@mytrello.local', 'workspace_e449_member_15', '', '', '{}'::jsonb, 'ae')
    ) AS t(id, membership_id, name, email, username, password_hash, avatar_url, props, pos)
),
upsert_users AS (
    INSERT INTO users (
        id,
        name,
        email,
        username,
        password_hash,
        avatar_url,
        props,
        created_at,
        updated_at,
        deleted_at
    )
    SELECT
        su.id,
        su.name,
        su.email,
        su.username,
        su.password_hash,
        su.avatar_url,
        su.props,
        NOW(),
        NOW(),
        NULL
    FROM seed_users su
    ON CONFLICT (id) DO UPDATE
    SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        password_hash = EXCLUDED.password_hash,
        avatar_url = EXCLUDED.avatar_url,
        props = EXCLUDED.props,
        updated_at = NOW(),
        deleted_at = NULL
    RETURNING id
),
upsert_workspace_members AS (
    INSERT INTO user_workspaces (
        id,
        workspace_id,
        user_id,
        pos,
        role,
        created_at,
        updated_at,
        deleted_at
    )
    SELECT
        su.membership_id,
        tw.id::uuid,
        su.id,
        su.pos,
        'member',
        NOW(),
        NOW(),
        NULL
    FROM seed_users su
    CROSS JOIN target_workspace tw
    ON CONFLICT (workspace_id, user_id) DO UPDATE
    SET
        role = EXCLUDED.role,
        pos = EXCLUDED.pos,
        updated_at = NOW(),
        deleted_at = NULL
    WHERE user_workspaces.deleted_at IS NOT NULL
    RETURNING user_id
),
seed_boards AS (
    SELECT *
    FROM (VALUES
        ('33333333-3333-4333-8333-333333333301'::uuid, 'Workspace E449 Board 01', 'private', 'seed-e449-board-01-3301', '{}'::jsonb, 'a0'),
        ('33333333-3333-4333-8333-333333333302'::uuid, 'Workspace E449 Board 02', 'private', 'seed-e449-board-02-3302', '{}'::jsonb, 'a1'),
        ('33333333-3333-4333-8333-333333333303'::uuid, 'Workspace E449 Board 03', 'private', 'seed-e449-board-03-3303', '{}'::jsonb, 'a2'),
        ('33333333-3333-4333-8333-333333333304'::uuid, 'Workspace E449 Board 04', 'private', 'seed-e449-board-04-3304', '{}'::jsonb, 'a3'),
        ('33333333-3333-4333-8333-333333333305'::uuid, 'Workspace E449 Board 05', 'private', 'seed-e449-board-05-3305', '{}'::jsonb, 'a4'),
        ('33333333-3333-4333-8333-333333333306'::uuid, 'Workspace E449 Board 06', 'private', 'seed-e449-board-06-3306', '{}'::jsonb, 'a5'),
        ('33333333-3333-4333-8333-333333333307'::uuid, 'Workspace E449 Board 07', 'private', 'seed-e449-board-07-3307', '{}'::jsonb, 'a6'),
        ('33333333-3333-4333-8333-333333333308'::uuid, 'Workspace E449 Board 08', 'private', 'seed-e449-board-08-3308', '{}'::jsonb, 'a7'),
        ('33333333-3333-4333-8333-333333333309'::uuid, 'Workspace E449 Board 09', 'private', 'seed-e449-board-09-3309', '{}'::jsonb, 'a8'),
        ('33333333-3333-4333-8333-33333333330a'::uuid, 'Workspace E449 Board 10', 'private', 'seed-e449-board-10-3310', '{}'::jsonb, 'a9'),
        ('33333333-3333-4333-8333-33333333330b'::uuid, 'Workspace E449 Board 11', 'private', 'seed-e449-board-11-3311', '{}'::jsonb, 'aa'),
        ('33333333-3333-4333-8333-33333333330c'::uuid, 'Workspace E449 Board 12', 'private', 'seed-e449-board-12-3312', '{}'::jsonb, 'ab'),
        ('33333333-3333-4333-8333-33333333330d'::uuid, 'Workspace E449 Board 13', 'private', 'seed-e449-board-13-3313', '{}'::jsonb, 'ac'),
        ('33333333-3333-4333-8333-33333333330e'::uuid, 'Workspace E449 Board 14', 'private', 'seed-e449-board-14-3314', '{}'::jsonb, 'ad'),
        ('33333333-3333-4333-8333-33333333330f'::uuid, 'Workspace E449 Board 15', 'private', 'seed-e449-board-15-3315', '{}'::jsonb, 'ae'),
        ('33333333-3333-4333-8333-333333333310'::uuid, 'Workspace E449 Board 16', 'private', 'seed-e449-board-16-3316', '{}'::jsonb, 'af'),
        ('33333333-3333-4333-8333-333333333311'::uuid, 'Workspace E449 Board 17', 'private', 'seed-e449-board-17-3317', '{}'::jsonb, 'ag'),
        ('33333333-3333-4333-8333-333333333312'::uuid, 'Workspace E449 Board 18', 'private', 'seed-e449-board-18-3318', '{}'::jsonb, 'ah'),
        ('33333333-3333-4333-8333-333333333313'::uuid, 'Workspace E449 Board 19', 'private', 'seed-e449-board-19-3319', '{}'::jsonb, 'ai'),
        ('33333333-3333-4333-8333-333333333314'::uuid, 'Workspace E449 Board 20', 'private', 'seed-e449-board-20-3320', '{}'::jsonb, 'aj')
    ) AS t(id, name, visibility, public_token, props, pos)
),
upsert_boards AS (
    INSERT INTO boards (
        id,
        name,
        created_by_user_id,
        workspace_id,
        visibility,
        public_token,
        props,
        created_at,
        updated_at,
        deleted_at
    )
    SELECT
        sb.id,
        sb.name,
        tw.created_by_user_id::uuid,
        tw.id::uuid,
        sb.visibility,
        sb.public_token,
        sb.props,
        NOW(),
        NOW(),
        NULL
    FROM seed_boards sb
    CROSS JOIN target_workspace tw
    ON CONFLICT (id) DO UPDATE
    SET
        name = EXCLUDED.name,
        created_by_user_id = EXCLUDED.created_by_user_id,
        workspace_id = EXCLUDED.workspace_id,
        visibility = EXCLUDED.visibility,
        public_token = EXCLUDED.public_token,
        props = EXCLUDED.props,
        updated_at = NOW(),
        deleted_at = NULL
    RETURNING id
)
INSERT INTO user_boards (
    user_id,
    board_id,
    role,
    pos,
    props,
    created_at,
    updated_at,
    deleted_at
)
SELECT
    tw.created_by_user_id::uuid,
    sb.id,
    'owner',
    sb.pos,
    '{}'::jsonb,
    NOW(),
    NOW(),
    NULL
FROM seed_boards sb
CROSS JOIN target_workspace tw
ON CONFLICT (user_id, board_id) DO UPDATE
SET
    role = EXCLUDED.role,
    pos = EXCLUDED.pos,
    props = EXCLUDED.props,
    updated_at = NOW(),
    deleted_at = NULL
WHERE user_boards.deleted_at IS NOT NULL;

COMMIT;