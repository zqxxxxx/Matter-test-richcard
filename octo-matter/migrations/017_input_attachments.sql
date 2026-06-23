-- 017_input_attachments.sql
-- Input materials attached at creation time, readable directly from GET /matters/:id.
-- Separates input (creator uploads) from output (timeline work product).

-- +migrate Up
SET @has_input_attachments := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'matters'
    AND COLUMN_NAME = 'input_attachments'
);
SET @input_attachments_sql := IF(
  @has_input_attachments = 0,
  'ALTER TABLE matters ADD COLUMN input_attachments JSON NULL AFTER source_msg_ids',
  'SELECT 1'
);
PREPARE input_attachments_stmt FROM @input_attachments_sql;
EXECUTE input_attachments_stmt;
DEALLOCATE PREPARE input_attachments_stmt;

-- +migrate Down
SET @has_input_attachments := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'matters'
    AND COLUMN_NAME = 'input_attachments'
);
SET @input_attachments_sql := IF(
  @has_input_attachments = 1,
  'ALTER TABLE matters DROP COLUMN input_attachments',
  'SELECT 1'
);
PREPARE input_attachments_stmt FROM @input_attachments_sql;
EXECUTE input_attachments_stmt;
DEALLOCATE PREPARE input_attachments_stmt;
