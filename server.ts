import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  requireAdmin,
  requireAuth,
  signAdminToken,
  type AuthRequest,
} from './src/middleware/auth.ts';
import {
  adminCreateCustomLesson,
  adminDeleteCustomLesson,
  adminDeleteUser,
  adminManageUserCertificate,
  adminToggleUserBadge,
  adminUpdateCustomLesson,
  adminUpdateSettings,
  adminUpdateUser,
  claimOrUpdateCertificate,
  deleteUserProject,
  getAdminOverview,
  getFullUserData,
  getLeaderboard,
  getPublicPlatformConfig,
  recordUserProgress,
  saveUserProject,
  updateUserLang,
  verifyAdminLogin,
} from './src/db/repository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // ==================== PUBLIC PLATFORM & LEADERBOARD APIs ====================
  app.get('/api/platform-config', async (_req, res) => {
    try {
      const config = await getPublicPlatformConfig();
      res.json(config);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch platform config';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/leaderboard', async (_req, res) => {
    try {
      const entries = await getLeaderboard(50);
      res.json({ entries });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch leaderboard';
      res.status(500).json({ error: message });
    }
  });

  // ==================== AUTHENTICATED STUDENT CLOUD SYNC APIs ====================
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@ardunolab.local`;
      const name = req.user!.name || undefined;
      const picture = req.user!.picture || undefined;
      const data = await getFullUserData(uid, email, name, picture);
      res.json(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch user profile';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/progress', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@ardunolab.local`;
      const name = req.user!.name || undefined;
      const { itemType, itemId, xpReward, badgeIds } = req.body as {
        itemType?: 'lesson' | 'challenge';
        itemId?: string;
        xpReward?: number;
        badgeIds?: string[];
      };

      if (
        (itemType !== 'lesson' && itemType !== 'challenge') ||
        typeof itemId !== 'string' ||
        !itemId.trim()
      ) {
        return res.status(400).json({ error: 'Invalid progress payload' });
      }

      const safeXp = Math.max(0, Math.min(500, Number(xpReward) || 50));
      const data = await recordUserProgress({
        uid,
        email,
        displayName: name,
        itemType,
        itemId: itemId.trim(),
        xpReward: safeXp,
        badgeIds: Array.isArray(badgeIds) ? badgeIds : undefined,
      });
      res.json(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to record progress';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/certificate/claim', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@ardunolab.local`;
      const name = req.user!.name || undefined;
      const { recipientName } = req.body as { recipientName?: string };
      const result = await claimOrUpdateCertificate({
        uid,
        email,
        displayName: name,
        recipientName,
      });
      if (!result.eligible) {
        return res.status(403).json({
          error: 'Roadmap completion threshold not yet reached',
          pct: result.pct,
          required: result.required,
        });
      }
      res.json(result);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to issue certificate';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/projects', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@ardunolab.local`;
      const name = req.user!.name || undefined;
      const { title, description, code, blocksJson, circuitJson } = req.body as {
        title?: string;
        description?: string;
        code?: string;
        blocksJson?: string;
        circuitJson?: string;
      };

      if (!title || typeof code !== 'string') {
        return res.status(400).json({ error: 'Title and code are required' });
      }

      const project = await saveUserProject({
        uid,
        email,
        displayName: name,
        title,
        description: description || '',
        code,
        blocksJson: blocksJson || '[]',
        circuitJson: circuitJson || '{}',
      });
      res.status(201).json(project);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to save project';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/projects/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const projectId = Number(req.params.id);
      if (!Number.isInteger(projectId) || projectId <= 0) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const deleted = await deleteUserProject(uid, projectId);
      if (!deleted) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json({ deleted: true, id: projectId });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete project';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/preferences', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { preferredLang } = req.body as { preferredLang?: string };
      if (
        preferredLang !== 'ar' &&
        preferredLang !== 'en' &&
        preferredLang !== 'fr'
      ) {
        return res.status(400).json({ error: 'Unsupported language' });
      }
      await updateUserLang(uid, preferredLang);
      res.json({ updated: true, preferredLang });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update preferences';
      res.status(500).json({ error: message });
    }
  });

  // ==================== ADMIN AUTH & FULL CONTROL APIs ====================
  app.post('/api/admin/login', async (req, res) => {
    try {
      const { email, password } = req.body as {
        email?: string;
        password?: string;
      };
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      const check = await verifyAdminLogin(email, password);
      if (!check.ok || !check.email) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }
      const token = signAdminToken(check.email);
      res.json({ ok: true, token, email: check.email });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Admin login failed';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/admin/overview', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const overview = await getAdminOverview();
      res.json({ ...overview, adminEmail: req.adminEmail });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load admin overview';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      const { xp, displayName, role, isBanned } = req.body as {
        xp?: number;
        displayName?: string;
        role?: 'student' | 'admin';
        isBanned?: boolean;
      };
      const updated = await adminUpdateUser(userId, {
        xp,
        displayName,
        role: role === 'admin' || role === 'student' ? role : undefined,
        isBanned,
      });
      if (!updated) return res.status(404).json({ error: 'User not found' });
      res.json({ user: updated });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update user';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/admin/users/:id/badge', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { badgeId, action } = req.body as {
        badgeId?: string;
        action?: 'grant' | 'revoke';
      };
      if (
        !Number.isInteger(userId) ||
        userId <= 0 ||
        !badgeId ||
        (action !== 'grant' && action !== 'revoke')
      ) {
        return res.status(400).json({ error: 'Invalid badge action payload' });
      }
      await adminToggleUserBadge(userId, badgeId, action);
      res.json({ ok: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update badge';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/admin/users/:id/certificate', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { action, recipientName } = req.body as {
        action?: 'issue' | 'revoke';
        recipientName?: string;
      };
      if (
        !Number.isInteger(userId) ||
        userId <= 0 ||
        (action !== 'issue' && action !== 'revoke')
      ) {
        return res.status(400).json({ error: 'Invalid certificate payload' });
      }
      const cert = await adminManageUserCertificate(userId, action, recipientName);
      res.json({ ok: true, certificate: cert });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to manage certificate';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }
      const deleted = await adminDeleteUser(userId);
      if (!deleted) return res.status(404).json({ error: 'User not found' });
      res.json({ deleted: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete user';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/admin/lessons', requireAdmin, async (req, res) => {
    try {
      const body = req.body as {
        stationId?: number;
        titleAr?: string;
        titleEn?: string;
        titleFr?: string;
        summaryAr?: string;
        summaryEn?: string;
        summaryFr?: string;
        theoryAr?: string;
        theoryEn?: string;
        theoryFr?: string;
        xp?: number;
        code?: string;
      };
      if (!body.titleAr?.trim() || !body.code?.trim()) {
        return res.status(400).json({ error: 'Arabic title and starter code are required' });
      }
      const created = await adminCreateCustomLesson({
        stationId: Number(body.stationId) || 1,
        titleAr: body.titleAr,
        titleEn: body.titleEn || body.titleAr,
        titleFr: body.titleFr,
        summaryAr: body.summaryAr,
        summaryEn: body.summaryEn,
        summaryFr: body.summaryFr,
        theoryAr: body.theoryAr,
        theoryEn: body.theoryEn,
        theoryFr: body.theoryFr,
        xp: Number(body.xp) || 75,
        code: body.code,
      });
      res.status(201).json({ lesson: created });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create lesson';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/admin/lessons/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid lesson ID' });
      }
      const updated = await adminUpdateCustomLesson(id, req.body);
      if (!updated) return res.status(404).json({ error: 'Lesson not found' });
      res.json({ lesson: updated });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update lesson';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/admin/lessons/:id', requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid lesson ID' });
      }
      const deleted = await adminDeleteCustomLesson(id);
      if (!deleted) return res.status(404).json({ error: 'Lesson not found' });
      res.json({ deleted: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete lesson';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const updated = await adminUpdateSettings(req.body);
      res.json({ settings: updated });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update settings';
      res.status(500).json({ error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  const disableHmr = process.env.DISABLE_HMR === 'true';
  const httpServer = http.createServer(app);

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
        hmr: disableHmr ? false : true,
        watch: disableHmr ? null : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Respect explicit --port / --host CLI args first, and never collide with NGINX_PORT in dev
  const args = process.argv.slice(2);
  const readArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1]) return args[idx + 1];
    const prefixed = args.find((a) => a.startsWith(`${flag}=`));
    return prefixed ? prefixed.slice(flag.length + 1) : undefined;
  };

  const cliPort = Number(readArg('--port'));
  const cliHost = readArg('--host') || '0.0.0.0';
  const envPort = Number(process.env.PORT);
  const nginxPort = Number(process.env.NGINX_PORT);
  const defaultAppPort = Number(process.env.DEFAULT_APP_PORT) || 3000;

  let port = defaultAppPort;
  if (Number.isFinite(cliPort) && cliPort > 0) {
    port = cliPort;
  } else if (
    Number.isFinite(envPort) &&
    envPort > 0 &&
    (isProd || !nginxPort || envPort !== nginxPort)
  ) {
    port = envPort;
  }

  httpServer.listen(port, cliHost, () => {
    console.log(`ArdunoLab server listening on http://${cliHost}:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ArdunoLab server:', err);
  process.exit(1);
});
