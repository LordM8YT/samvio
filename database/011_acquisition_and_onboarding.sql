ALTER TABLE users
  ADD COLUMN acquisition_source VARCHAR(40) NULL AFTER last_seen_at,
  ADD COLUMN referred_by_user_id CHAR(36) NULL AFTER acquisition_source,
  ADD KEY idx_users_acquisition_source (acquisition_source),
  ADD KEY idx_users_referred_by (referred_by_user_id),
  ADD CONSTRAINT fk_users_referred_by FOREIGN KEY (referred_by_user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE profiles
  ADD COLUMN profile_visibility ENUM('private','public') NOT NULL DEFAULT 'private' AFTER cover_path,
  ADD COLUMN onboarding_completed_at TIMESTAMP(6) NULL AFTER profile_visibility;

-- Existing alpha users have already used the product. Only accounts created after
-- this migration should be sent through the new onboarding flow.
UPDATE profiles
SET onboarding_completed_at = CURRENT_TIMESTAMP(6)
WHERE onboarding_completed_at IS NULL;

CREATE TABLE acquisition_daily (
  event_date DATE NOT NULL,
  source VARCHAR(40) NOT NULL,
  visits INT UNSIGNED NOT NULL DEFAULT 0,
  registrations INT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (event_date, source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
