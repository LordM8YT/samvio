import { boolean, char, index, int, json, mysqlEnum, mysqlTable, primaryKey, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';

const timestamps = {
  createdAt: timestamp('created_at', { mode: 'date', fsp: 6 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 6 }).notNull().defaultNow().onUpdateNow()
};

export const users = mysqlTable('users', {
  id: char('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 254 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  accountStatus: mysqlEnum('account_status', ['pending', 'active', 'suspended', 'deleted']).notNull().default('pending'),
  ...timestamps
}, (t) => [uniqueIndex('uq_users_email').on(t.email)]);

export const profiles = mysqlTable('profiles', {
  userId: char('user_id', { length: 36 }).primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  realName: varchar('real_name', { length: 120 }).notNull(),
  username: varchar('username', { length: 30 }).notNull(),
  bio: varchar('bio', { length: 300 }),
  avatarPath: varchar('avatar_path', { length: 500 }),
  ageBand: mysqlEnum('age_band', ['child', 'teen', 'adult']).notNull(),
  isIdentityVerified: boolean('is_identity_verified').notNull().default(false),
  ...timestamps
}, (t) => [uniqueIndex('uq_profiles_username').on(t.username)]);

export const sessions = mysqlTable('sessions', {
  id: char('id', { length: 64 }).primaryKey(),
  userId: char('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
}, (t) => [index('idx_sessions_user_id').on(t.userId)]);

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
  visibility: mysqlEnum('visibility', ['followers', 'friends', 'private']).notNull().default('followers'),
  createdAt: timestamp('created_at', { mode: 'date', fsp: 6 }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', fsp: 6 }).notNull().defaultNow().onUpdateNow()
}, (t) => [index('idx_posts_chronological').on(t.createdAt, t.id), index('idx_posts_author').on(t.authorId, t.createdAt)]);

export const postMedia = mysqlTable('post_media', {
  id: char('id', { length: 36 }).primaryKey(),
  postId: char('post_id', { length: 36 }).notNull().references(() => posts.id, { onDelete: 'cascade' }),
  mediaType: mysqlEnum('media_type', ['image', 'video']).notNull(),
  storageKey: varchar('storage_key', { length: 500 }).notNull(),
  width: int('width'), height: int('height'), sortOrder: int('sort_order').notNull().default(0),
  metadata: json('metadata')
}, (t) => [index('idx_post_media_post').on(t.postId, t.sortOrder)]);
