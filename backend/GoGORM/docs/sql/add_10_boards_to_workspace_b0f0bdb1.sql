BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM workspaces
        WHERE id = 'b0f0bdb1-78c2-4838-9df8-26d71f0cccf7'::uuid
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Workspace % non trovato o eliminato', 'b0f0bdb1-78c2-4838-9df8-26d71f0cccf7';
    END IF;
END $$;

WITH target_workspace AS (
    SELECT id, created_by_user_id
    FROM workspaces
    WHERE id = 'b0f0bdb1-78c2-4838-9df8-26d71f0cccf7'::uuid
      AND deleted_at IS NULL
),
seed_boards AS (
    SELECT *
    FROM (VALUES
        ('0f4bc8c1-2df7-4232-8b4d-e8c7d14d3001'::uuid, 'Workspace Board 01', 'private', 'seed-b0f0-board-01-3001', '{}'::jsonb, 'a0'),
        ('c82c8440-42ea-4f20-8c53-115fcd4f3002'::uuid, 'Workspace Board 02', 'private', 'seed-b0f0-board-02-3002', '{}'::jsonb, 'a1'),
        ('1f3c4e2a-2683-4f6d-b5d8-a6ef08ac3003'::uuid, 'Workspace Board 03', 'private', 'seed-b0f0-board-03-3003', '{}'::jsonb, 'a2'),
        ('7ae1a4d6-f2da-44bf-a33d-a186d8023004'::uuid, 'Workspace Board 04', 'private', 'seed-b0f0-board-04-3004', '{}'::jsonb, 'a3'),
        ('e6ef4ee4-9928-462d-97e5-6d4d3d2b3005'::uuid, 'Workspace Board 05', 'private', 'seed-b0f0-board-05-3005', '{}'::jsonb, 'a4'),
        ('0b5027a0-a0da-4ce7-9a2a-5df76bb53006'::uuid, 'Workspace Board 06', 'private', 'seed-b0f0-board-06-3006', '{}'::jsonb, 'a5'),
        ('50b47db4-f5f4-4a88-8c5b-d1e6e4803007'::uuid, 'Workspace Board 07', 'private', 'seed-b0f0-board-07-3007', '{}'::jsonb, 'a6'),
        ('4c32967a-47ec-4d92-a54d-373eca6b3008'::uuid, 'Workspace Board 08', 'private', 'seed-b0f0-board-08-3008', '{}'::jsonb, 'a7'),
        ('57f74ad1-7c69-46b2-baa8-fbb9bf293009'::uuid, 'Workspace Board 09', 'private', 'seed-b0f0-board-09-3009', '{}'::jsonb, 'a8'),
        ('22530898-7ea3-4f97-8d28-f2f8d46b3010'::uuid, 'Workspace Board 10', 'private', 'seed-b0f0-board-10-3010', '{}'::jsonb, 'a9')
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