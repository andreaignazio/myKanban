BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM workspaces
        WHERE id = 'b07b756c-a6e5-4e5f-9bdc-7b57635e6beb'::uuid
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Workspace % non trovato o eliminato', 'b07b756c-a6e5-4e5f-9bdc-7b57635e6beb';
    END IF;
END $$;

WITH seed_users AS (
    SELECT *
    FROM (VALUES
        ('1e6c4d2f-4cb4-4f84-b8a8-72a4d9f4b101'::uuid, 'bf8dbe14-7ba7-4cf5-97a2-c1fd221f2101'::uuid, 'Workspace Seed 01', 'workspace.seed.01@mytrello.local', 'workspace_seed_01', '', '', '{}'::jsonb, 'a0'),
        ('f27e9ec3-1ee9-43ad-b2d0-3c1e4ca3b102'::uuid, '4bf69a17-a9b7-4f55-94af-4a34c6cb2102'::uuid, 'Workspace Seed 02', 'workspace.seed.02@mytrello.local', 'workspace_seed_02', '', '', '{}'::jsonb, 'a0'),
        ('a4bc8c78-f53d-4c44-a1c1-41f4a2dbb103'::uuid, '7f293d13-f1ad-4f16-91d3-b01179532103'::uuid, 'Workspace Seed 03', 'workspace.seed.03@mytrello.local', 'workspace_seed_03', '', '', '{}'::jsonb, 'a0'),
        ('c5d6f0cf-9b2b-4d8d-b9de-53e5bf47b104'::uuid, '0d41d5fc-c28d-42d2-98b0-f270401e2104'::uuid, 'Workspace Seed 04', 'workspace.seed.04@mytrello.local', 'workspace_seed_04', '', '', '{}'::jsonb, 'a0'),
        ('d9b8f76a-1f9f-4c79-9db3-0d5f6a18b105'::uuid, 'f1b0b1fe-1ec5-4988-abd3-f3349bff2105'::uuid, 'Workspace Seed 05', 'workspace.seed.05@mytrello.local', 'workspace_seed_05', '', '', '{}'::jsonb, 'a0'),
        ('e3aa1b55-7ff5-4a4f-b144-c8a7b0d9c106'::uuid, '2dc50a22-4ff1-46d1-8c48-7200a8802106'::uuid, 'Workspace Seed 06', 'workspace.seed.06@mytrello.local', 'workspace_seed_06', '', '', '{}'::jsonb, 'a0'),
        ('2ac4e4ae-c957-4b95-b29e-77e2a5e7d107'::uuid, '5198d35d-39d4-472b-8cdc-42ce6c2d2107'::uuid, 'Workspace Seed 07', 'workspace.seed.07@mytrello.local', 'workspace_seed_07', '', '', '{}'::jsonb, 'a0'),
        ('75f0c0b0-211c-4d8c-aef5-6b7a36f8d108'::uuid, '1030b48e-4eca-40e6-a507-ea2e53f02108'::uuid, 'Workspace Seed 08', 'workspace.seed.08@mytrello.local', 'workspace_seed_08', '', '', '{}'::jsonb, 'a0'),
        ('8de0d18c-13d7-4f0e-9f50-bf2296cad109'::uuid, 'f496f66f-f6ef-4505-b780-4e9b09fe2109'::uuid, 'Workspace Seed 09', 'workspace.seed.09@mytrello.local', 'workspace_seed_09', '', '', '{}'::jsonb, 'a0'),
        ('9bf19221-6831-4b1f-8b45-8165592d110a'::uuid, 'e8d5f130-a55c-4d52-9eb7-16653cf2210a'::uuid, 'Workspace Seed 10', 'workspace.seed.10@mytrello.local', 'workspace_seed_10', '', '', '{}'::jsonb, 'a0')
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
)
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
    'b07b756c-a6e5-4e5f-9bdc-7b57635e6beb'::uuid,
    su.id,
    su.pos,
    'member',
    NOW(),
    NOW(),
    NULL
FROM seed_users su
ON CONFLICT (workspace_id, user_id) DO UPDATE
SET
    role = EXCLUDED.role,
    pos = EXCLUDED.pos,
    updated_at = NOW(),
    deleted_at = NULL
WHERE user_workspaces.deleted_at IS NOT NULL;

COMMIT;