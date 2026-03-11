ALTER TABLE users
    ADD COLUMN IF NOT EXISTS clerk_user_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_user_id
    ON users (clerk_user_id);