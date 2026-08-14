ALTER TABLE users
  ADD COLUMN account_role ENUM('user', 'moderator', 'admin') NOT NULL DEFAULT 'user' AFTER account_status,
  ADD KEY idx_users_account_role (account_role);
