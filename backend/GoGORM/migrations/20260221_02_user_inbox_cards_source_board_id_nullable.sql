-- Allow inbox cards without a source board reference.
ALTER TABLE user_inbox_cards
    ALTER COLUMN source_board_id DROP NOT NULL;
