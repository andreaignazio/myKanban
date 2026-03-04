-- Backfill legacy list props shape from {"Props": {...}} to flat {...}
-- Root cause fixed in service layer; this migration normalizes already-persisted rows.

UPDATE lists
SET props = (props - 'Props') || COALESCE(props->'Props', '{}'::jsonb)
WHERE props IS NOT NULL
  AND props ? 'Props'
  AND jsonb_typeof(props->'Props') = 'object';
