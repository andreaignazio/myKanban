-- Add mode to public_share_links for claim behavior control
ALTER TABLE public_share_links
    ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'autojoin';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_public_share_links_mode'
    ) THEN
        ALTER TABLE public_share_links
            ADD CONSTRAINT chk_public_share_links_mode
            CHECK (mode IN ('autojoin', 'sendrequest'));
    END IF;
END $$;