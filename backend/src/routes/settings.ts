import { Router } from 'express';
import { getDb } from '../db';
import {
  getReleaseVersionSettings,
  updateReleaseVersionSettings,
} from '../services/releaseVersionSettings';

const router = Router();

// GET /api/settings/release-versions
router.get('/settings/release-versions', (_req, res) => {
  try {
    const db = getDb();
    res.json(getReleaseVersionSettings(db));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

// PATCH /api/settings/release-versions
router.patch('/settings/release-versions', (req, res) => {
  try {
    const selectedVersions = Array.isArray(req.body?.selectedVersions)
      ? req.body.selectedVersions.map((v: unknown) => String(v))
      : null;

    if (selectedVersions === null) {
      res.status(400).json({ error: 'selectedVersions doit etre un tableau' });
      return;
    }

    const db = getDb();
    res.json(updateReleaseVersionSettings(db, selectedVersions));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

export default router;

