ALTER TABLE users
  ADD COLUMN muted_until TIMESTAMP NULL AFTER account_role,
  ADD COLUMN last_seen_at TIMESTAMP(6) NULL AFTER muted_until,
  ADD KEY idx_users_last_seen (last_seen_at);

ALTER TABLE posts
  ADD COLUMN moderation_status ENUM('visible','hidden') NOT NULL DEFAULT 'visible' AFTER visibility,
  ADD KEY idx_posts_moderation (moderation_status, created_at);

ALTER TABLE comments
  ADD COLUMN moderation_status ENUM('visible','hidden') NOT NULL DEFAULT 'visible' AFTER body,
  ADD KEY idx_comments_moderation (moderation_status, created_at);

CREATE TABLE content_reports (
  id CHAR(36) NOT NULL,
  reporter_id CHAR(36) NOT NULL,
  target_type ENUM('post','comment','user') NOT NULL,
  target_id CHAR(36) NOT NULL,
  reason ENUM('spam','harassment','sexual','violence','privacy','other') NOT NULL,
  details VARCHAR(500) NULL,
  status ENUM('open','approved','hidden','deleted') NOT NULL DEFAULT 'open',
  resolved_by CHAR(36) NULL,
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_content_reports_queue (status, created_at),
  KEY idx_content_reports_target (target_type, target_id),
  CONSTRAINT fk_content_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_content_reports_resolver FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
