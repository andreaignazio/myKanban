-- Create card comments domain tables:
-- card_comments, comment_mentions

CREATE TABLE IF NOT EXISTS card_comments (
    id uuid PRIMARY KEY,
    card_id uuid NOT NULL,
    content text NOT NULL,
    created_by_user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz NULL
);

CREATE TABLE IF NOT EXISTS comment_mentions (
    card_comment_id uuid NOT NULL,
    mentioned_user_id uuid NOT NULL,
    created_by_user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz NULL
);

-- Base indexes for soft-delete and query paths
CREATE INDEX IF NOT EXISTS idx_card_comments_deleted_at ON card_comments (deleted_at);
CREATE INDEX IF NOT EXISTS idx_card_comments_active_card_created
    ON card_comments (card_id, created_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_comment_mentions_deleted_at ON comment_mentions (deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_mentions_active_comment_user_unique
    ON comment_mentions (card_comment_id, mentioned_user_id)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comment_mentions_active_mentioned_user
    ON comment_mentions (mentioned_user_id, card_comment_id)
    WHERE deleted_at IS NULL;

-- Basic validation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_card_comments_content_not_blank'
    ) THEN
        ALTER TABLE card_comments
            ADD CONSTRAINT chk_card_comments_content_not_blank
            CHECK (char_length(trim(content)) > 0);
    END IF;
END $$;

-- Foreign keys for card_comments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_comments_card_id'
    ) THEN
        ALTER TABLE card_comments
            ADD CONSTRAINT fk_card_comments_card_id
            FOREIGN KEY (card_id) REFERENCES cards(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_card_comments_created_by_user_id'
    ) THEN
        ALTER TABLE card_comments
            ADD CONSTRAINT fk_card_comments_created_by_user_id
            FOREIGN KEY (created_by_user_id) REFERENCES users(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

-- Foreign keys for comment_mentions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_comment_mentions_card_comment_id'
    ) THEN
        ALTER TABLE comment_mentions
            ADD CONSTRAINT fk_comment_mentions_card_comment_id
            FOREIGN KEY (card_comment_id) REFERENCES card_comments(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_comment_mentions_mentioned_user_id'
    ) THEN
        ALTER TABLE comment_mentions
            ADD CONSTRAINT fk_comment_mentions_mentioned_user_id
            FOREIGN KEY (mentioned_user_id) REFERENCES users(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_comment_mentions_created_by_user_id'
    ) THEN
        ALTER TABLE comment_mentions
            ADD CONSTRAINT fk_comment_mentions_created_by_user_id
            FOREIGN KEY (created_by_user_id) REFERENCES users(id)
            ON DELETE RESTRICT;
    END IF;
END $$;
