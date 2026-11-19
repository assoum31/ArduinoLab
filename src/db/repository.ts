import crypto from 'crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  certificates,
  customLessons,
  platformSettings,
  profiles,
  userBadges,
  userProgress,
  userProjects,
} from './schema.ts';

export const OWNER_ADMIN_EMAIL = 'berrahmaomarfarouk@gmail.com';
export const DEFAULT_ADMIN_EMAIL = 'admin@ardunolab.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@2026';

// Built-in 5-station roadmap mapping for server-side badge & certificate verification
export const SERVER_STATIONS: Array<{
  stationId: number;
  badgeId: string;
  bonusXp: number;
  lessonIds: string[];
}> = [
  {
    stationId: 1,
    badgeId: 'station_1_digital',
    bonusXp: 100,
    lessonIds: ['lesson-0', 'lesson-1', 'lesson-2', 'lesson-3'],
  },
  {
    stationId: 2,
    badgeId: 'station_2_analog',
    bonusXp: 100,
    lessonIds: ['lesson-4', 'lesson-5', 'lesson-6'],
  },
  {
    stationId: 3,
    badgeId: 'station_3_actuators',
    bonusXp: 100,
    lessonIds: ['lesson-7', 'lesson-8', 'lesson-12'],
  },
  {
    stationId: 4,
    badgeId: 'station_4_sensors',
    bonusXp: 100,
    lessonIds: ['lesson-9', 'lesson-10', 'lesson-13'],
  },
  {
    stationId: 5,
    badgeId: 'station_5_capstone',
    bonusXp: 150,
    lessonIds: ['lesson-11', 'lesson-14'],
  },
];

export const ALL_BUILTIN_LESSON_IDS = SERVER_STATIONS.flatMap((s) => s.lessonIds);

export function computeRank(xp: number): string {
  if (xp >= 1500) return 'embedded_architect';
  if (xp >= 800) return 'circuit_master';
  if (xp >= 300) return 'wire_apprentice';
  return 'spark_novice';
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function generateCertCode(): string {
  const year = new Date().getFullYear();
  const rnd = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ARD-${year}-${rnd}`;
}

export async function getRawSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(platformSettings);
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

export async function ensureAdminCredentialsInitialized(): Promise<void> {
  const map = await getRawSettingsMap();
  const defaults: Array<[string, string]> = [
    ['admin_email', DEFAULT_ADMIN_EMAIL],
    ['admin_password_hash', hashPassword(DEFAULT_ADMIN_PASSWORD)],
    ['announcement_active', 'false'],
    ['announcement_ar', 'مرحباً بكم في مسار أردوينولاب! أكمل المحطات الخمس واحصل على شهادتك المعتمدة.'],
    ['announcement_en', 'Welcome to ArdunoLab Roadmap! Complete all 5 stations to unlock your official certificate.'],
    ['announcement_fr', 'Bienvenue sur le parcours ArdunoLab ! Complétez les 5 étapes pour obtenir votre certificat.'],
    ['xp_multiplier', '1'],
    ['cert_threshold', '100'],
    ['cert_issuer_name', 'ArdunoLab Academy'],
    ['cert_director_name', 'Omar Farouk Berrahma'],
  ];

  for (const [key, value] of defaults) {
    if (!(key in map)) {
      await db
        .insert(platformSettings)
        .values({ key, value })
        .onConflictDoNothing();
    }
  }
}

export async function verifyAdminLogin(
  email: string,
  password: string,
): Promise<{ ok: boolean; email?: string }> {
  await ensureAdminCredentialsInitialized();
  const map = await getRawSettingsMap();
  const normalized = email.trim().toLowerCase();
  const configuredEmail = (map.admin_email || DEFAULT_ADMIN_EMAIL).toLowerCase();
  const allowedEmails = new Set([configuredEmail, OWNER_ADMIN_EMAIL.toLowerCase(), DEFAULT_ADMIN_EMAIL]);
  if (!allowedEmails.has(normalized)) {
    return { ok: false };
  }
  const hash = map.admin_password_hash || '';
  if (!verifyPassword(password, hash)) {
    return { ok: false };
  }
  return { ok: true, email: normalized };
}

export async function getPublicPlatformConfig() {
  await ensureAdminCredentialsInitialized();
  const [map, lessons] = await Promise.all([
    getRawSettingsMap(),
    db
      .select()
      .from(customLessons)
      .where(eq(customLessons.published, true))
      .orderBy(customLessons.stationId, customLessons.id),
  ]);

  return {
    announcementActive: map.announcement_active === 'true',
    announcementAr: map.announcement_ar || '',
    announcementEn: map.announcement_en || '',
    announcementFr: map.announcement_fr || '',
    xpMultiplier: Math.max(1, Math.min(5, Number(map.xp_multiplier) || 1)),
    certThreshold: Math.max(20, Math.min(100, Number(map.cert_threshold) || 100)),
    certIssuerName: map.cert_issuer_name || 'ArdunoLab Academy',
    certDirectorName: map.cert_director_name || 'Omar Farouk Berrahma',
    customLessons: lessons,
  };
}

export async function getOrCreateProfile(
  uid: string,
  email: string,
  displayName?: string,
  photoUrl?: string,
) {
  try {
    const isOwner = email.trim().toLowerCase() === OWNER_ADMIN_EMAIL.toLowerCase();
    const result = await db
      .insert(profiles)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0] || 'Arduino Maker',
        photoUrl: photoUrl || null,
        role: isOwner ? 'admin' : 'student',
      })
      .onConflictDoUpdate({
        target: profiles.uid,
        set: {
          email,
          displayName: displayName || undefined,
          photoUrl: photoUrl || undefined,
          ...(isOwner ? { role: 'admin' } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database error in getOrCreateProfile:', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function isProfileAdminByUid(uid: string, email?: string): Promise<boolean> {
  if (email && email.trim().toLowerCase() === OWNER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  const [row] = await db.select().from(profiles).where(eq(profiles.uid, uid));
  return row?.role === 'admin';
}

export async function getFullUserData(
  uid: string,
  email: string,
  displayName?: string,
  photoUrl?: string,
) {
  try {
    const profile = await getOrCreateProfile(uid, email, displayName, photoUrl);
    const [progressRows, badgeRows, projectRows, certRows] = await Promise.all([
      db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, profile.id))
        .orderBy(desc(userProgress.completedAt)),
      db
        .select()
        .from(userBadges)
        .where(eq(userBadges.userId, profile.id))
        .orderBy(desc(userBadges.earnedAt)),
      db
        .select()
        .from(userProjects)
        .where(eq(userProjects.userId, profile.id))
        .orderBy(desc(userProjects.updatedAt)),
      db
        .select()
        .from(certificates)
        .where(eq(certificates.userId, profile.id)),
    ]);

    return {
      profile,
      progress: progressRows,
      badges: badgeRows,
      projects: projectRows,
      certificate: certRows[0] || null,
    };
  } catch (error) {
    console.error('Database error in getFullUserData:', error);
    throw new Error('Failed to load user workspace data.', { cause: error });
  }
}

export async function recordUserProgress(params: {
  uid: string;
  email: string;
  displayName?: string;
  itemType: 'lesson' | 'challenge';
  itemId: string;
  xpReward: number;
  badgeIds?: string[];
}) {
  try {
    const [profile, config] = await Promise.all([
      getOrCreateProfile(params.uid, params.email, params.displayName),
      getPublicPlatformConfig(),
    ]);

    const existing = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, profile.id),
          eq(userProgress.itemType, params.itemType),
          eq(userProgress.itemId, params.itemId),
        ),
      );

    let addedXp = 0;
    const effectiveReward = Math.round(params.xpReward * config.xpMultiplier);

    if (existing.length === 0) {
      await db.insert(userProgress).values({
        userId: profile.id,
        itemType: params.itemType,
        itemId: params.itemId,
        completed: true,
        xpEarned: effectiveReward,
      });
      addedXp += effectiveReward;
    }

    // Fetch updated completed lessons and existing badges to check station completions
    const [allProgress, existingBadges] = await Promise.all([
      db.select().from(userProgress).where(eq(userProgress.userId, profile.id)),
      db.select().from(userBadges).where(eq(userBadges.userId, profile.id)),
    ]);

    const completedLessonSet = new Set(
      allProgress
        .filter((p) => p.itemType === 'lesson')
        .map((p) => p.itemId),
    );
    const existingBadgeSet = new Set(existingBadges.map((b) => b.badgeId));

    const badgesToGrant = new Set<string>(params.badgeIds || []);
    const newlyUnlockedStations: string[] = [];

    if (params.itemType === 'lesson') {
      badgesToGrant.add('first_blink');
      if (['lesson-9', 'lesson-10', 'lesson-13'].includes(params.itemId)) {
        badgesToGrant.add('sensor_wizard');
      }

      // Check every roadmap station milestone!
      for (const st of SERVER_STATIONS) {
        const allDone = st.lessonIds.every((lid) => completedLessonSet.has(lid));
        if (allDone && !existingBadgeSet.has(st.badgeId)) {
          badgesToGrant.add(st.badgeId);
          newlyUnlockedStations.push(st.badgeId);
          addedXp += st.bonusXp;
        }
      }
    }

    if (params.itemType === 'challenge') {
      if (params.itemId.startsWith('wire-')) badgesToGrant.add('wire_master');
      if (params.itemId.startsWith('debug-')) badgesToGrant.add('bug_hunter');
      if (params.itemId.startsWith('code-')) badgesToGrant.add('code_architect');
    }

    for (const badgeId of badgesToGrant) {
      await db
        .insert(userBadges)
        .values({ userId: profile.id, badgeId })
        .onConflictDoNothing();
    }

    // Auto-issue Certificate if roadmap threshold reached!
    const completedBuiltinCount = ALL_BUILTIN_LESSON_IDS.filter((id) =>
      completedLessonSet.has(id),
    ).length;
    const pct = Math.round(
      (completedBuiltinCount / ALL_BUILTIN_LESSON_IDS.length) * 100,
    );

    const CORE_CERT_LESSONS = 11;
    if (pct >= config.certThreshold || completedBuiltinCount >= CORE_CERT_LESSONS) {
      const existingCert = await db
        .select()
        .from(certificates)
        .where(eq(certificates.userId, profile.id));
      if (existingCert.length === 0) {
        await db
          .insert(certificates)
          .values({
            userId: profile.id,
            certificateCode: generateCertCode(),
            recipientName: profile.displayName,
            issuedBy: config.certIssuerName,
            completionPercent: pct,
          })
          .onConflictDoNothing();
      }
    }

    const newXp = profile.xp + addedXp;
    const newRank = computeRank(newXp);

    if (addedXp > 0 || newRank !== profile.rank) {
      await db
        .update(profiles)
        .set({ xp: newXp, rank: newRank, updatedAt: new Date() })
        .where(eq(profiles.id, profile.id));
    }

    const full = await getFullUserData(params.uid, params.email, params.displayName);
    return {
      ...full,
      newlyUnlockedStations,
      addedXp,
    };
  } catch (error) {
    console.error('Database error in recordUserProgress:', error);
    throw new Error('Failed to save learning progress.', { cause: error });
  }
}

export async function claimOrUpdateCertificate(params: {
  uid: string;
  email: string;
  displayName?: string;
  recipientName?: string;
}) {
  const [profile, config] = await Promise.all([
    getOrCreateProfile(params.uid, params.email, params.displayName),
    getPublicPlatformConfig(),
  ]);

  const progressRows = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, profile.id));

  const completedSet = new Set(
    progressRows.filter((p) => p.itemType === 'lesson').map((p) => p.itemId),
  );
  const completedCount = ALL_BUILTIN_LESSON_IDS.filter((id) =>
    completedSet.has(id),
  ).length;
  const pct = Math.round((completedCount / ALL_BUILTIN_LESSON_IDS.length) * 100);

  const [existing] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.userId, profile.id));

  const cleanName =
    (params.recipientName || profile.displayName).trim().slice(0, 80) ||
    profile.displayName;

  if (existing) {
    const [updated] = await db
      .update(certificates)
      .set({ recipientName: cleanName })
      .where(eq(certificates.id, existing.id))
      .returning();
    return { certificate: updated, eligible: true, pct };
  }

  const CORE_CERT_LESSONS = 11;
  if (
    pct < config.certThreshold &&
    completedCount < CORE_CERT_LESSONS &&
    profile.role !== 'admin'
  ) {
    return { certificate: null, eligible: false, pct, required: config.certThreshold };
  }

  const [created] = await db
    .insert(certificates)
    .values({
      userId: profile.id,
      certificateCode: generateCertCode(),
      recipientName: cleanName,
      issuedBy: config.certIssuerName,
      completionPercent: Math.max(pct, config.certThreshold),
    })
    .returning();

  return { certificate: created, eligible: true, pct };
}

export async function getLeaderboard(limit = 50) {
  const [allProfiles, allProgress, allBadges, allCerts] = await Promise.all([
    db
      .select()
      .from(profiles)
      .where(eq(profiles.isBanned, false))
      .orderBy(desc(profiles.xp), desc(profiles.updatedAt))
      .limit(limit),
    db.select().from(userProgress),
    db.select().from(userBadges),
    db.select().from(certificates),
  ]);

  const lessonsByUser = new Map<number, number>();
  const challengesByUser = new Map<number, number>();
  for (const row of allProgress) {
    if (row.itemType === 'lesson') {
      lessonsByUser.set(row.userId, (lessonsByUser.get(row.userId) || 0) + 1);
    } else if (row.itemType === 'challenge') {
      challengesByUser.set(
        row.userId,
        (challengesByUser.get(row.userId) || 0) + 1,
      );
    }
  }

  const badgesByUser = new Map<number, number>();
  for (const b of allBadges) {
    badgesByUser.set(b.userId, (badgesByUser.get(b.userId) || 0) + 1);
  }

  const certSet = new Set(allCerts.map((c) => c.userId));

  return allProfiles.map((p, idx) => ({
    position: idx + 1,
    id: p.id,
    uid: p.uid,
    displayName: p.displayName,
    photoUrl: p.photoUrl,
    xp: p.xp,
    rank: p.rank,
    lessonsCompleted: lessonsByUser.get(p.id) || 0,
    challengesCompleted: challengesByUser.get(p.id) || 0,
    badgesCount: badgesByUser.get(p.id) || 0,
    hasCertificate: certSet.has(p.id),
  }));
}

export async function saveUserProject(params: {
  uid: string;
  email: string;
  displayName?: string;
  title: string;
  description: string;
  code: string;
  blocksJson: string;
  circuitJson: string;
}) {
  try {
    const profile = await getOrCreateProfile(
      params.uid,
      params.email,
      params.displayName,
    );

    const [created] = await db
      .insert(userProjects)
      .values({
        userId: profile.id,
        title: params.title.trim().slice(0, 120) || 'Untitled Circuit',
        description: params.description.slice(0, 300),
        code: params.code,
        blocksJson: params.blocksJson,
        circuitJson: params.circuitJson,
      })
      .returning();

    await db
      .insert(userBadges)
      .values({ userId: profile.id, badgeId: 'cloud_maker' })
      .onConflictDoNothing();

    // Small XP bonus for saving a circuit
    const newXp = profile.xp + 25;
    await db
      .update(profiles)
      .set({ xp: newXp, rank: computeRank(newXp), updatedAt: new Date() })
      .where(eq(profiles.id, profile.id));

    return created;
  } catch (error) {
    console.error('Database error in saveUserProject:', error);
    throw new Error('Failed to save circuit project.', { cause: error });
  }
}

export async function deleteUserProject(uid: string, projectId: number) {
  try {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.uid, uid));

    if (!profile) return false;

    const deleted = await db
      .delete(userProjects)
      .where(
        and(eq(userProjects.id, projectId), eq(userProjects.userId, profile.id)),
      )
      .returning();

    return deleted.length > 0;
  } catch (error) {
    console.error('Database error in deleteUserProject:', error);
    throw new Error('Failed to delete circuit project.', { cause: error });
  }
}

export async function updateUserLang(uid: string, preferredLang: string) {
  try {
    await db
      .update(profiles)
      .set({ preferredLang, updatedAt: new Date() })
      .where(eq(profiles.uid, uid));
  } catch (error) {
    console.error('Database error in updateUserLang:', error);
    throw new Error('Failed to update language preference.', { cause: error });
  }
}

// =========================== ADMIN REPOSITORY ===========================

export async function getAdminOverview() {
  await ensureAdminCredentialsInitialized();
  const [
    allProfiles,
    allProgress,
    allBadges,
    allProjects,
    allCerts,
    allCustomLessons,
    settingsMap,
  ] = await Promise.all([
    db.select().from(profiles).orderBy(desc(profiles.xp), desc(profiles.createdAt)),
    db.select().from(userProgress),
    db.select().from(userBadges),
    db.select().from(userProjects),
    db.select().from(certificates).orderBy(desc(certificates.issuedAt)),
    db.select().from(customLessons).orderBy(customLessons.stationId, desc(customLessons.createdAt)),
    getRawSettingsMap(),
  ]);

  const lessonsByUser = new Map<number, number>();
  const challengesByUser = new Map<number, number>();
  for (const r of allProgress) {
    if (r.itemType === 'lesson') {
      lessonsByUser.set(r.userId, (lessonsByUser.get(r.userId) || 0) + 1);
    } else {
      challengesByUser.set(r.userId, (challengesByUser.get(r.userId) || 0) + 1);
    }
  }

  const badgesByUser = new Map<number, string[]>();
  for (const b of allBadges) {
    const arr = badgesByUser.get(b.userId) || [];
    arr.push(b.badgeId);
    badgesByUser.set(b.userId, arr);
  }

  const projectsByUser = new Map<number, number>();
  for (const pr of allProjects) {
    projectsByUser.set(pr.userId, (projectsByUser.get(pr.userId) || 0) + 1);
  }

  const certByUser = new Map<number, (typeof allCerts)[number]>();
  for (const c of allCerts) {
    certByUser.set(c.userId, c);
  }

  const totalXpAwarded = allProfiles.reduce((sum, p) => sum + p.xp, 0);

  return {
    stats: {
      totalUsers: allProfiles.length,
      totalXpAwarded,
      totalLessonsCompleted: allProgress.filter((p) => p.itemType === 'lesson').length,
      totalChallengesSolved: allProgress.filter((p) => p.itemType === 'challenge').length,
      totalCertificates: allCerts.length,
      totalProjects: allProjects.length,
      totalCustomLessons: allCustomLessons.length,
    },
    users: allProfiles.map((p) => ({
      id: p.id,
      uid: p.uid,
      email: p.email,
      displayName: p.displayName,
      photoUrl: p.photoUrl,
      xp: p.xp,
      rank: p.rank,
      role: p.role as 'student' | 'admin',
      isBanned: p.isBanned,
      lessonsCompleted: lessonsByUser.get(p.id) || 0,
      challengesCompleted: challengesByUser.get(p.id) || 0,
      badges: badgesByUser.get(p.id) || [],
      projectsCount: projectsByUser.get(p.id) || 0,
      certificate: certByUser.get(p.id) || null,
      createdAt: p.createdAt,
    })),
    certificates: allCerts,
    customLessons: allCustomLessons,
    settings: {
      adminEmail: settingsMap.admin_email || DEFAULT_ADMIN_EMAIL,
      announcementActive: settingsMap.announcement_active === 'true',
      announcementAr: settingsMap.announcement_ar || '',
      announcementEn: settingsMap.announcement_en || '',
      announcementFr: settingsMap.announcement_fr || '',
      xpMultiplier: Number(settingsMap.xp_multiplier) || 1,
      certThreshold: Number(settingsMap.cert_threshold) || 100,
      certIssuerName: settingsMap.cert_issuer_name || 'ArdunoLab Academy',
      certDirectorName: settingsMap.cert_director_name || 'Omar Farouk Berrahma',
    },
  };
}

export async function adminUpdateUser(
  userId: number,
  updates: {
    xp?: number;
    displayName?: string;
    role?: 'student' | 'admin';
    isBanned?: boolean;
  },
) {
  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId));
  if (!existing) return null;

  const nextXp =
    typeof updates.xp === 'number' && Number.isFinite(updates.xp)
      ? Math.max(0, Math.min(100000, Math.round(updates.xp)))
      : existing.xp;

  const [updated] = await db
    .update(profiles)
    .set({
      xp: nextXp,
      rank: computeRank(nextXp),
      displayName: updates.displayName?.trim() || existing.displayName,
      role: updates.role || existing.role,
      isBanned:
        typeof updates.isBanned === 'boolean'
          ? updates.isBanned
          : existing.isBanned,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
    .returning();

  return updated;
}

export async function adminToggleUserBadge(
  userId: number,
  badgeId: string,
  action: 'grant' | 'revoke',
) {
  if (action === 'grant') {
    await db
      .insert(userBadges)
      .values({ userId, badgeId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)));
  }
}

export async function adminManageUserCertificate(
  userId: number,
  action: 'issue' | 'revoke',
  recipientName?: string,
) {
  if (action === 'revoke') {
    await db.delete(certificates).where(eq(certificates.userId, userId));
    return null;
  }

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId));
  if (!profile) return null;

  const config = await getPublicPlatformConfig();
  const [existing] = await db
    .select()
    .from(certificates)
    .where(eq(certificates.userId, userId));

  if (existing) return existing;

  const [created] = await db
    .insert(certificates)
    .values({
      userId,
      certificateCode: generateCertCode(),
      recipientName: (recipientName || profile.displayName).trim(),
      issuedBy: config.certIssuerName,
      completionPercent: 100,
    })
    .returning();
  return created;
}

export async function adminDeleteUser(userId: number) {
  const deleted = await db
    .delete(profiles)
    .where(eq(profiles.id, userId))
    .returning();
  return deleted.length > 0;
}

export async function adminCreateCustomLesson(payload: {
  stationId: number;
  titleAr: string;
  titleEn: string;
  titleFr?: string;
  summaryAr?: string;
  summaryEn?: string;
  summaryFr?: string;
  theoryAr?: string;
  theoryEn?: string;
  theoryFr?: string;
  xp: number;
  code: string;
}) {
  const lessonKey = `custom-${Date.now().toString(36)}`;
  const [created] = await db
    .insert(customLessons)
    .values({
      lessonKey,
      stationId: Math.max(1, Math.min(5, payload.stationId || 1)),
      titleAr: payload.titleAr.trim(),
      titleEn: payload.titleEn.trim() || payload.titleAr.trim(),
      titleFr: (payload.titleFr || payload.titleEn || payload.titleAr).trim(),
      summaryAr: (payload.summaryAr || '').trim(),
      summaryEn: (payload.summaryEn || payload.summaryAr || '').trim(),
      summaryFr: (payload.summaryFr || payload.summaryEn || payload.summaryAr || '').trim(),
      theoryAr: (payload.theoryAr || '').trim(),
      theoryEn: (payload.theoryEn || payload.theoryAr || '').trim(),
      theoryFr: (payload.theoryFr || payload.theoryEn || payload.theoryAr || '').trim(),
      xp: Math.max(10, Math.min(1000, Number(payload.xp) || 75)),
      code: payload.code,
      published: true,
    })
    .returning();
  return created;
}

export async function adminUpdateCustomLesson(
  id: number,
  updates: { published?: boolean; xp?: number; stationId?: number },
) {
  const [existing] = await db
    .select()
    .from(customLessons)
    .where(eq(customLessons.id, id));
  if (!existing) return null;

  const [updated] = await db
    .update(customLessons)
    .set({
      published:
        typeof updates.published === 'boolean'
          ? updates.published
          : existing.published,
      xp:
        typeof updates.xp === 'number'
          ? Math.max(10, Math.min(1000, updates.xp))
          : existing.xp,
      stationId:
        typeof updates.stationId === 'number'
          ? Math.max(1, Math.min(5, updates.stationId))
          : existing.stationId,
    })
    .where(eq(customLessons.id, id))
    .returning();
  return updated;
}

export async function adminDeleteCustomLesson(id: number) {
  const deleted = await db
    .delete(customLessons)
    .where(eq(customLessons.id, id))
    .returning();
  return deleted.length > 0;
}

export async function adminUpdateSettings(updates: {
  announcementActive?: boolean;
  announcementAr?: string;
  announcementEn?: string;
  announcementFr?: string;
  xpMultiplier?: number;
  certThreshold?: number;
  certIssuerName?: string;
  certDirectorName?: string;
  newAdminPassword?: string;
}) {
  await ensureAdminCredentialsInitialized();
  const pairs: Array<[string, string]> = [];

  if (typeof updates.announcementActive === 'boolean') {
    pairs.push(['announcement_active', String(updates.announcementActive)]);
  }
  if (typeof updates.announcementAr === 'string') {
    pairs.push(['announcement_ar', updates.announcementAr.slice(0, 300)]);
  }
  if (typeof updates.announcementEn === 'string') {
    pairs.push(['announcement_en', updates.announcementEn.slice(0, 300)]);
  }
  if (typeof updates.announcementFr === 'string') {
    pairs.push(['announcement_fr', updates.announcementFr.slice(0, 300)]);
  }
  if (typeof updates.xpMultiplier === 'number' && Number.isFinite(updates.xpMultiplier)) {
    pairs.push(['xp_multiplier', String(Math.max(1, Math.min(5, updates.xpMultiplier)))]);
  }
  if (typeof updates.certThreshold === 'number' && Number.isFinite(updates.certThreshold)) {
    pairs.push(['cert_threshold', String(Math.max(20, Math.min(100, Math.round(updates.certThreshold))))]);
  }
  if (typeof updates.certIssuerName === 'string' && updates.certIssuerName.trim()) {
    pairs.push(['cert_issuer_name', updates.certIssuerName.trim().slice(0, 100)]);
  }
  if (typeof updates.certDirectorName === 'string' && updates.certDirectorName.trim()) {
    pairs.push(['cert_director_name', updates.certDirectorName.trim().slice(0, 100)]);
  }
  if (typeof updates.newAdminPassword === 'string' && updates.newAdminPassword.trim().length >= 6) {
    pairs.push(['admin_password_hash', hashPassword(updates.newAdminPassword.trim())]);
  }

  for (const [key, value] of pairs) {
    await db
      .insert(platformSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: platformSettings.key,
        set: { value, updatedAt: sql`NOW()` },
      });
  }

  return await getPublicPlatformConfig();
}
