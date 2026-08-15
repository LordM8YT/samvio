ALTER TABLE posts
  ADD COLUMN is_commercial BOOLEAN NOT NULL DEFAULT FALSE AFTER moderation_status,
  ADD COLUMN sponsor_name VARCHAR(120) NULL AFTER is_commercial,
  ADD KEY idx_posts_commercial (is_commercial, created_at);

CREATE TABLE user_blocks (
  blocker_id CHAR(36) NOT NULL,
  blocked_id CHAR(36) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (blocker_id, blocked_id),
  KEY idx_user_blocks_blocked (blocked_id),
  CONSTRAINT chk_user_blocks_not_self CHECK (blocker_id <> blocked_id),
  CONSTRAINT fk_user_blocks_blocker FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_blocks_blocked FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_preferences (
  user_id CHAR(36) NOT NULL,
  hide_commercial_content BOOLEAN NOT NULL DEFAULT FALSE,
  notify_follows BOOLEAN NOT NULL DEFAULT TRUE,
  notify_comments BOOLEAN NOT NULL DEFAULT TRUE,
  notify_reactions BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO user_preferences (user_id, hide_commercial_content)
SELECT u.id, p.age_band IN ('child','teen') FROM users u JOIN profiles p ON p.user_id = u.id;
