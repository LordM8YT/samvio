ALTER TABLE posts
  ADD COLUMN retention_delete_after TIMESTAMP(6) NULL AFTER updated_at,
  ADD INDEX idx_posts_retention_delete_after (retention_delete_after);
