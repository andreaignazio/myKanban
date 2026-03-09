ALTER TABLE boards
    DROP COLUMN IF EXISTS is_selected_for_suspend;

ALTER TABLE user_workspaces
    DROP COLUMN IF EXISTS is_selected_for_suspend;