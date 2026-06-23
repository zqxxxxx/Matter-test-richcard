-- 015_sort_order.sql
-- Add sort_order for user-controlled ordering in board/timeline views.

-- +migrate Up
SET @has_sort_order := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'matters'
    AND COLUMN_NAME = 'sort_order'
);
SET @sort_order_sql := IF(
  @has_sort_order = 0,
  'ALTER TABLE matters ADD COLUMN sort_order DOUBLE DEFAULT NULL AFTER deadline',
  'SELECT 1'
);
PREPARE sort_order_stmt FROM @sort_order_sql;
EXECUTE sort_order_stmt;
DEALLOCATE PREPARE sort_order_stmt;

-- +migrate Down
SET @has_sort_order := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'matters'
    AND COLUMN_NAME = 'sort_order'
);
SET @sort_order_sql := IF(
  @has_sort_order = 1,
  'ALTER TABLE matters DROP COLUMN sort_order',
  'SELECT 1'
);
PREPARE sort_order_stmt FROM @sort_order_sql;
EXECUTE sort_order_stmt;
DEALLOCATE PREPARE sort_order_stmt;
