-- Create checklist domain tables:
-- checklists, entries, checklist_entries, card_checklists, entry_members

-- Reset checklist domain tables if they already exist (expected empty)
DROP TABLE IF EXISTS entry_members CASCADE;
DROP TABLE IF EXISTS card_checklists CASCADE;
DROP TABLE IF EXISTS checklist_entries CASCADE;
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS checklists CASCADE;

CREATE TABLE IF NOT EXISTS checklists (
    id uuid PRIMARY KEY,
    title text NOT NULL,
    created_by_user_id uuid NOT NULL,
    created_in_card_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz NULL
);

CREATE TABLE IF NOT EXISTS entries (
    id uuid PRIMARY KEY,
    title text NOT NULL,
    done boolean NOT NULL DEFAULT false,
    due_date timestamptz NULL,
    created_by_user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz NULL
);

CREATE TABLE IF NOT EXISTS checklist_entries (
    id uuid PRIMARY KEY,
    checklist_id uuid NOT NULL,
    entry_id uuid NOT NULL,
    pos text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz NULL
);

CREATE TABLE IF NOT EXISTS card_checklists (
    id uuid PRIMARY KEY,
    card_id uuid NOT NULL,
    checklist_id uuid NOT NULL,
    pos text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz NULL
);

CREATE TABLE IF NOT EXISTS entry_members (
    id uuid PRIMARY KEY,
    entry_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz NULL
);

-- Base indexes for soft-delete and ordering paths
CREATE INDEX IF NOT EXISTS idx_checklists_deleted_at ON checklists (deleted_at);
CREATE INDEX IF NOT EXISTS idx_entries_deleted_at ON entries (deleted_at);
CREATE INDEX IF NOT EXISTS idx_checklist_entries_deleted_at ON checklist_entries (deleted_at);
CREATE INDEX IF NOT EXISTS idx_card_checklists_deleted_at ON card_checklists (deleted_at);
CREATE INDEX IF NOT EXISTS idx_entry_members_deleted_at ON entry_members (deleted_at);

CREATE INDEX IF NOT EXISTS idx_checklist_entries_pos ON checklist_entries (pos COLLATE "C");
CREATE INDEX IF NOT EXISTS idx_card_checklists_pos ON card_checklists (pos COLLATE "C");

-- Foreign keys directly owned by root tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_checklists_created_by_user_id'
    ) THEN
        ALTER TABLE checklists
            ADD CONSTRAINT fk_checklists_created_by_user_id
            FOREIGN KEY (created_by_user_id) REFERENCES users(id)
            ON DELETE RESTRICT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_checklists_created_in_card_id'
    ) THEN
        ALTER TABLE checklists
            ADD CONSTRAINT fk_checklists_created_in_card_id
            FOREIGN KEY (created_in_card_id) REFERENCES cards(id)
            ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_entries_created_by_user_id'
    ) THEN
        ALTER TABLE entries
            ADD CONSTRAINT fk_entries_created_by_user_id
            FOREIGN KEY (created_by_user_id) REFERENCES users(id)
            ON DELETE RESTRICT;
    END IF;
END $$;
