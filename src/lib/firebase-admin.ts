import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadFirebaseProjectId(): string | undefined {
  try {
    const configPath = path.resolve(__dirname, '../../firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
        projectId?: string;
      };
      if (parsed.projectId) return parsed.projectId;
    }
  } catch (err) {
    console.warn('Could not read firebase-applet-config.json:', err);
  }
  return process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
}

if (!getApps().length) {
  const projectId = loadFirebaseProjectId();
  initializeApp(projectId ? { projectId } : undefined);
}

export const adminAuth = getAuth();
