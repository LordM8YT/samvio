ALTER TABLE posts
  MODIFY COLUMN visibility ENUM('public','followers','friends','private') NOT NULL DEFAULT 'followers';

CREATE TABLE IF NOT EXISTS verifications (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
