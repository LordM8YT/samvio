import { boolean, char, date, index, int, json, mysqlEnum, mysqlTable, primaryKey, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

const timestamps = {
  createdAt: timestamp('created_at', { mode: 'date', fsp: 6 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 6 }).notNull().defaultNow().onUpdateNow()
};

export const users = mysqlTable('users', {
  id: char('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 254 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  accountStatus: mysqlEnum('account_status', ['pending', 'active', 'suspended', 'deleted']).notNull().default('pending'),
  accountRole: mysqlEnum('account_role', ['user', 'moderator', 'admin']).notNull().default('user'),
  mutedUntil: timestamp('muted_until', { mode: 'date' }),
  lastSeenAt: timestamp('last_seen_at', { mode: 'date', fsp: 6 }),
  acquisitionSource: varchar('acquisition_source', { length: 40 }),
  referredByUserId: char('referred_by_user_id', { length: 36 }),
  ...timestamps
}, (t) => [uniqueIndex('uq_users_email').on(t.email), index('idx_users_account_role').on(t.accountRole), index('idx_users_acquisition_source').on(t.acquisitionSource), index('idx_users_referred_by').on(t.referredByUserId)]);

export const profiles = mysqlTable('profiles', {
  userId: char('user_id', { length: 36 }).primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  realName: varchar('real_name', { length: 120 }).notNull(),
  username: varchar('username', { length: 30 }).notNull(),
  bio: varchar('bio', { length: 300 }),
  avatarPath: varchar('avatar_path', { length: 500 }),
  coverPath: varchar('cover_path', { length: 500 }),
  profileVisibility: mysqlEnum('profile_visibility', ['private', 'public']).notNull().default('private'),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { mode: 'date', fsp: 6 }),
  ageBand: mysqlEnum('age_band', ['child', 'teen', 'adult']).notNull(),
  isIdentityVerified: boolean('is_identity_verified').notNull().default(false),
  ...timestamps
}, (t) => [uniqueIndex('uq_profiles_username').on(t.username)]);

export const acquisitionDaily = mysqlTable('acquisition_daily', {
  eventDate: date('event_date', { mode: 'string' }).notNull(),
  source: varchar('source', { length: 40 }).notNull(),
  visits: int('visits', { unsigned: true }).notNull().default(0),
  registrations: int('registrations', { unsigned: true }).notNull().default(0),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 6 }).notNull().defaultNow().onUpdateNow()
}, (t) => [primaryKey({ columns: [t.eventDate, t.source] })]);

export const sessions = mysqlTable('sessions', {
  id: char('id', { length: 64 }).primaryKey(),
  userId: char('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
}, (t) => [index('idx_sessions_user_id').on(t.userId)]);

export const verifications = mysqlTable('verifications', {
  id: char('id', { length: 36 }).primaryKey(),
  userId: char('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: mysqlEnum('provider', ['bankid', 'vipps', 'signicat', 'criipto', 'guardian']).notNull(),
  providerSubject: varchar('provider_subject', { length: 255 }).notNull(),
  status: mysqlEnum('status', ['pending', 'verified', 'rejected', 'expired', 'revoked']).notNull().default('pending'),
  birthDate: date('birth_date', { mode: 'string' }),
  assuranceLevel: varchar('assurance_level', { length: 100 }),
  identityVerifiedAt: timestamp('identity_verified_at', { mode: 'date', fsp: 6 }),
  expiresAt: timestamp('expires_at', { mode: 'date', fsp: 6 }),
  providerMetadata: json('provider_metadata'),
  ...timestamps
}, (t) => [uniqueIndex('uq_verification_provider_subject').on(t.provider, t.providerSubject), uniqueIndex('uq_verification_user_provider').on(t.userId, t.provider), index('idx_verifications_user_id').on(t.userId)]);

export const userFeedState = mysqlTable('user_feed_state', {
  userId: char('user_id', { length: 36 }).primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  caughtUpAt: timestamp('caught_up_at', { mode: 'date', fsp: 6 }),
  ...timestamps
});

export const follows = mysqlTable('follows', {
  followerId: char('follower_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  followedId: char('followed_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: mysqlEnum('status', ['pending', 'accepted', 'blocked']).notNull().default('pending'),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 6 }).notNull().defaultNow()
}, (t) => [primaryKey({ columns: [t.followerId, t.followedId] }), index('idx_follows_feed').on(t.followerId, t.status)]);

export const posts = mysqlTable('posts', {
  id: char('id', { length: 36 }).primaryKey(),
  authorId: char('author_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  caption: text('caption'),
  visibility: mysqlEnum('visibility', ['public', 'followers', 'friends', 'private']).notNull().default('followers'),
  moderationStatus: mysqlEnum('moderation_status', ['visible', 'hidden']).notNull().default('visible'),
  isCommercial: boolean('is_commercial').notNull().default(false),
  sponsorName: varchar('sponsor_name', { length: 120 }),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 6 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 6 }).notNull().defaultNow().onUpdateNow(),
  retentionDeleteAfter: timestamp('retention_delete_after', { mode: 'date', fsp: 6 })
}, (t) => [index('idx_posts_chronological').on(t.createdAt, t.id), index('idx_posts_author').on(t.authorId, t.createdAt), index('idx_posts_retention_delete_after').on(t.retentionDeleteAfter)]);

export const postMedia = mysqlTable('post_media', {
  id: char('id', { length: 36 }).primaryKey(),
  postId: char('post_id', { length: 36 }).notNull().references(() => posts.id, { onDelete: 'cascade' }),
  mediaType: mysqlEnum('media_type', ['image', 'video']).notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  width: int('width'), height: int('height'), sortOrder: int('sort_order').notNull().default(0),
  metadata: json('metadata')
}, (t) => [index('idx_post_media_post').on(t.postId, t.sortOrder)]);

export const postReactions = mysqlTable('post_reactions', {
  postId: char('post_id', { length: 36 }).notNull().references(() => posts.id, { onDelete: 'cascade' }),
  userId: char('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  reaction: mysqlEnum('reaction', ['like']).notNull().default('like'),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 6 }).notNull().defaultNow()
}, (t) => [primaryKey({ columns: [t.postId, t.userId] }), index('idx_post_reactions_user').on(t.userId, t.createdAt)]);

export const comments = mysqlTable('comments', {
  id: char('id', { length: 36 }).primaryKey(),
  postId: char('post_id', { length: 36 }).notNull().references(() => posts.id, { onDelete: 'cascade' }),
  authorId: char('author_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  body: varchar('body', { length: 1000 }).notNull(),
  moderationStatus: mysqlEnum('moderation_status', ['visible', 'hidden']).notNull().default('visible'),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 6 }).notNull().defaultNow()
}, (t) => [index('idx_comments_post_chronological').on(t.postId, t.createdAt, t.id), index('idx_comments_author').on(t.authorId, t.createdAt)]);

export const contentReports = mysqlTable('content_reports', {
  id: char('id', { length: 36 }).primaryKey(),
  reporterId: char('reporter_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetType: mysqlEnum('target_type', ['post', 'comment', 'user']).notNull(),
  targetId: char('target_id', { length: 36 }).notNull(),
  reason: mysqlEnum('reason', ['spam', 'harassment', 'sexual', 'violence', 'privacy', 'other']).notNull(),
  details: varchar('details', { length: 500 }),
  status: mysqlEnum('status', ['open', 'approved', 'hidden', 'deleted']).notNull().default('open'),
  resolvedBy: char('resolved_by', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 6 }).notNull().defaultNow()
}, (t) => [index('idx_content_reports_queue').on(t.status, t.createdAt), index('idx_content_reports_target').on(t.targetType, t.targetId)]);

export const userBlocks = mysqlTable('user_blocks', {
  blockerId: char('blocker_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  blockedId: char('blocked_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 6 }).notNull().defaultNow()
}, (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index('idx_user_blocks_blocked').on(t.blockedId)]);

export const userPreferences = mysqlTable('user_preferences', {
  userId: char('user_id', { length: 36 }).primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  hideCommercialContent: boolean('hide_commercial_content').notNull().default(false),
  notifyFollows: boolean('notify_follows').notNull().default(true),
  notifyComments: boolean('notify_comments').notNull().default(true),
  notifyReactions: boolean('notify_reactions').notNull().default(true),
  ...timestamps
});

export const notifications = mysqlTable('notifications', {
  id: char('id', { length: 36 }).primaryKey(),
  recipientId: char('recipient_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  actorId: char('actor_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: mysqlEnum('type', ['comment', 'reaction']).notNull(),
  postId: char('post_id', { length: 36 }).references(() => posts.id, { onDelete: 'cascade' }),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 6 }).notNull().defaultNow()
}, (t) => [index('idx_notifications_recipient').on(t.recipientId, t.isRead, t.createdAt), index('idx_notifications_actor').on(t.actorId)]);

export const organizations = mysqlTable('organizations', {
  id: char('id', { length: 36 }).primaryKey(), name: varchar('name', { length: 160 }).notNull(),
  slug: varchar('slug', { length: 60 }).notNull(),
  type: mysqlEnum('type', ['team', 'association', 'organization']).notNull(),
  createdBy: char('created_by', { length: 36 }).notNull().references(() => users.id), ...timestamps
}, (t) => [uniqueIndex('uq_organizations_slug').on(t.slug)]);

export const organizationMembers = mysqlTable('organization_members', {
  organizationId: char('organization_id', { length: 36 }).notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: char('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: mysqlEnum('role', ['owner', 'admin', 'moderator', 'member']).notNull().default('member'),
  status: mysqlEnum('status', ['invited', 'active', 'removed']).notNull().default('invited'),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 6 }).notNull().defaultNow()
}, (t) => [primaryKey({ columns: [t.organizationId, t.userId] }), index('idx_org_members_user').on(t.userId, t.status)]);

export const subscriptions = mysqlTable('subscriptions', {
  id: char('id', { length: 36 }).primaryKey(),
  userId: char('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }),
  organizationId: char('organization_id', { length: 36 }).references(() => organizations.id, { onDelete: 'cascade' }),
  planCode: mysqlEnum('plan_code', ['person', 'family', 'team', 'association', 'organization']).notNull(),
  status: mysqlEnum('status', ['trialing', 'active', 'past_due', 'canceled', 'expired']).notNull().default('trialing'),
  priceOre: int('price_ore').notNull(), currency: char('currency', { length: 3 }).notNull().default('NOK'),
  provider: varchar('provider', { length: 30 }).notNull().default('vipps'), providerCustomerId: varchar('provider_customer_id', { length: 255 }),
  providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }),
  currentPeriodStart: timestamp('current_period_start', { mode: 'date' }), currentPeriodEnd: timestamp('current_period_end', { mode: 'date' }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false), ...timestamps
}, (t) => [uniqueIndex('uq_subscriptions_provider_id').on(t.provider, t.providerSubscriptionId), index('idx_subscriptions_user').on(t.userId, t.status), index('idx_subscriptions_org').on(t.organizationId, t.status)]);

export const paymentEvents = mysqlTable('payment_events', {
  id: char('id', { length: 36 }).primaryKey(),
  subscriptionId: char('subscription_id', { length: 36 }).notNull().references(() => subscriptions.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 30 }).notNull().default('vipps'),
  providerEventId: varchar('provider_event_id', { length: 255 }).notNull(),
  eventType: varchar('event_type', { length: 80 }).notNull(),
  payload: json('payload').notNull(),
  processedAt: timestamp('processed_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 6 }).notNull().defaultNow()
}, (t) => [uniqueIndex('uq_payment_events_provider').on(t.provider, t.providerEventId), index('idx_payment_events_subscription').on(t.subscriptionId, t.createdAt)]);