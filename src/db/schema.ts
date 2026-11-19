import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default('Arduino Maker'),
  photoUrl: text('photo_url'),
  xp: integer('xp').notNull().default(0),
  rank: text('rank').notNull().default('spark_novice'),
  role: text('role').notNull().default('student'), // 'student' | 'admin'
  isBanned: boolean('is_banned').notNull().default(false),
  preferredLang: text('preferred_lang').notNull().default('ar'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userProgress = pgTable(
  'user_progress',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    itemType: text('item_type').notNull(), // 'lesson' | 'challenge'
    itemId: text('item_id').notNull(),
    completed: boolean('completed').notNull().default(true),
    xpEarned: integer('xp_earned').notNull().default(0),
    completedAt: timestamp('completed_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_progress_user_item_idx').on(
      table.userId,
      table.itemType,
      table.itemId,
    ),
  ],
);

export const userBadges = pgTable(
  'user_badges',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    badgeId: text('badge_id').notNull(),
    earnedAt: timestamp('earned_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_badges_user_badge_idx').on(table.userId, table.badgeId),
  ],
);

export const userProjects = pgTable('user_projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  code: text('code').notNull(),
  blocksJson: text('blocks_json').notNull().default('[]'),
  circuitJson: text('circuit_json').notNull().default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const certificates = pgTable(
  'certificates',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => profiles.id, { onDelete: 'cascade' })
      .notNull(),
    certificateCode: text('certificate_code').notNull().unique(),
    recipientName: text('recipient_name').notNull(),
    issuedBy: text('issued_by').notNull().default('ArdunoLab Academy'),
    completionPercent: integer('completion_percent').notNull().default(100),
    issuedAt: timestamp('issued_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('certificates_user_idx').on(table.userId)],
);

export const customLessons = pgTable('custom_lessons', {
  id: serial('id').primaryKey(),
  lessonKey: text('lesson_key').notNull().unique(),
  stationId: integer('station_id').notNull().default(1),
  titleAr: text('title_ar').notNull(),
  titleEn: text('title_en').notNull(),
  titleFr: text('title_fr').notNull().default(''),
  summaryAr: text('summary_ar').notNull().default(''),
  summaryEn: text('summary_en').notNull().default(''),
  summaryFr: text('summary_fr').notNull().default(''),
  theoryAr: text('theory_ar').notNull().default(''),
  theoryEn: text('theory_en').notNull().default(''),
  theoryFr: text('theory_fr').notNull().default(''),
  xp: integer('xp').notNull().default(75),
  code: text('code').notNull(),
  published: boolean('published').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const platformSettings = pgTable('platform_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const profilesRelations = relations(profiles, ({ many }) => ({
  progress: many(userProgress),
  badges: many(userBadges),
  projects: many(userProjects),
  certificates: many(certificates),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  profile: one(profiles, {
    fields: [userProgress.userId],
    references: [profiles.id],
  }),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  profile: one(profiles, {
    fields: [userBadges.userId],
    references: [profiles.id],
  }),
}));

export const userProjectsRelations = relations(userProjects, ({ one }) => ({
  profile: one(profiles, {
    fields: [userProjects.userId],
    references: [profiles.id],
  }),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  profile: one(profiles, {
    fields: [certificates.userId],
    references: [profiles.id],
  }),
}));
