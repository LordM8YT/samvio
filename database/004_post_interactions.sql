CREATE TABLE IF NOT EXISTS post_reactions (
  post_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  reaction ENUM('like') NOT NULL DEFAULT 'like',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (post_id, user_id),
  KEY idx_post_reactions_user (user_id, created_at),
  CONSTRAINT fk_post_reactions_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_post_reactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id CHAR(36) NOT NULL,
  post_id CHAR(36) NOT NULL,
  author_id CHAR(36) NOT NULL,
  body VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_comments_post_chronological (post_id, created_at, id),
  KEY idx_comments_author (author_id, created_at),
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
