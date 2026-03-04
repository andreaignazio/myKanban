ALTER TABLE user_boards
ADD COLUMN IF NOT EXISTS props jsonb;

UPDATE user_boards
SET props = '{}'::jsonb
WHERE props IS NULL;

ALTER TABLE user_boards
ALTER COLUMN props SET DEFAULT '{}'::jsonb;

ALTER TABLE user_boards
ALTER COLUMN props SET NOT NULL;
