USE samvio;

CREATE TABLE IF NOT EXISTS organizations (
  id CHAR(36) NOT NULL, name VARCHAR(160) NOT NULL, slug VARCHAR(60) NOT NULL,
  type ENUM('team','association','organization') NOT NULL, created_by CHAR(36) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id), UNIQUE KEY uq_organizations_slug (slug),
  CONSTRAINT fk_organizations_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL,
  role ENUM('owner','admin','moderator','member') NOT NULL DEFAULT 'member', status ENUM('invited','active','removed') NOT NULL DEFAULT 'invited',
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (organization_id,user_id), KEY idx_org_members_user (user_id,status),
  CONSTRAINT fk_org_members_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_org_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS subscriptions (
  id CHAR(36) NOT NULL, user_id CHAR(36) NULL, organization_id CHAR(36) NULL,
  plan_code ENUM('person','family','team','association','organization') NOT NULL,
  status ENUM('trialing','active','past_due','canceled','expired') NOT NULL DEFAULT 'trialing',
  price_ore INT NOT NULL, currency CHAR(3) NOT NULL DEFAULT 'NOK', provider VARCHAR(30) NOT NULL DEFAULT 'vipps',
  provider_customer_id VARCHAR(255) NULL, provider_subscription_id VARCHAR(255) NULL,
  current_period_start TIMESTAMP NULL, current_period_end TIMESTAMP NULL, cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id), UNIQUE KEY uq_subscriptions_provider_id (provider,provider_subscription_id),
  KEY idx_subscriptions_user (user_id,status), KEY idx_subscriptions_org (organization_id,status),
  CONSTRAINT chk_subscription_owner CHECK ((user_id IS NULL) <> (organization_id IS NULL)),
  CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payment_events (
  id CHAR(36) NOT NULL, subscription_id CHAR(36) NOT NULL, provider VARCHAR(30) NOT NULL DEFAULT 'vipps',
  provider_event_id VARCHAR(255) NOT NULL, event_type VARCHAR(80) NOT NULL, payload JSON NOT NULL, processed_at TIMESTAMP NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (id),
  UNIQUE KEY uq_payment_events_provider (provider,provider_event_id), KEY idx_payment_events_subscription (subscription_id,created_at),
  CONSTRAINT fk_payment_events_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB;
