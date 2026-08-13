CREATE DATABASE IF NOT EXISTS samvio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE samvio;

CREATE TABLE users (
  id CHAR(36) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NULL COMMENT 'Kun lokal utviklingsinnlogging; NULL for OIDC-kontoer',
  account_status ENUM('pending','active','suspended','deleted') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id), UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE sessions (
  id CHAR(64) NOT NULL,
  user_id CHAR(36) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id), KEY idx_sessions_user_id (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE follows (
  follower_id CHAR(36) NOT NULL,
  followed_id CHAR(36) NOT NULL,
  status ENUM('pending','accepted','blocked') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (follower_id, followed_id),
  KEY idx_follows_feed (follower_id, status),
  CONSTRAINT chk_follows_not_self CHECK (follower_id <> followed_id),
  CONSTRAINT fk_follows_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_follows_followed FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE posts (
  id CHAR(36) NOT NULL,
  author_id CHAR(36) NOT NULL,
  caption TEXT NULL,
  visibility ENUM('followers','friends','private') NOT NULL DEFAULT 'followers',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_posts_chronological (created_at DESC, id DESC),
  KEY idx_posts_author (author_id, created_at DESC),
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE post_media (
  id CHAR(36) NOT NULL,
  post_id CHAR(36) NOT NULL,
  media_type ENUM('image','video') NOT NULL,
  storage_key VARCHAR(500) NOT NULL,
  width INT NULL, height INT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSON NULL,
  PRIMARY KEY (id), KEY idx_post_media_post (post_id, sort_order),
  CONSTRAINT fk_post_media_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE profiles (
  user_id CHAR(36) NOT NULL,
  real_name VARCHAR(120) NOT NULL,
  username VARCHAR(30) NOT NULL,
  bio VARCHAR(300) NULL,
  avatar_path VARCHAR(500) NULL,
  age_band ENUM('child','teen','adult') NOT NULL,
  is_identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id), UNIQUE KEY uq_profiles_username (username),
  CONSTRAINT chk_profiles_real_name CHECK (CHAR_LENGTH(real_name) BETWEEN 2 AND 120),
  CONSTRAINT chk_profiles_username CHECK (BINARY username = BINARY LOWER(username) AND username REGEXP '^[a-z0-9_]{3,30}$'),
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE verifications (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  provider ENUM('bankid','vipps','signicat','criipto','guardian') NOT NULL,
  provider_subject VARCHAR(255) NOT NULL,
  status ENUM('pending','verified','rejected','expired','revoked') NOT NULL DEFAULT 'pending',
  birth_date DATE NULL,
  assurance_level VARCHAR(100) NULL,
  identity_verified_at TIMESTAMP(6) NULL,
  expires_at TIMESTAMP(6) NULL,
  provider_metadata JSON NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_verification_provider_subject (provider, provider_subject),
  UNIQUE KEY uq_verification_user_provider (user_id, provider),
  KEY idx_verifications_user_id (user_id),
  CONSTRAINT fk_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
