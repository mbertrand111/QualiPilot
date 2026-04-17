import { Router } from 'express';
import { getDb } from '../db';
import {
  getReleaseVersionSettings,
  updateReleaseVersionSettings,
} from '../services/releaseVersionSettings';
import {
  getSprintCalendarSettings,
  updateSprintCalendarSettings,
} from '../services/sprintCalendar';
import {
  getConformityRuleSettings,
  updateConformityRuleActive,
} from '../services/conformityRuleSettings';
import { runConformityCheck } from '../services/conformity';
import { requireApiKey } from '../middleware/security';

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
router.patch('/settings/release-versions', requireApiKey, (req, res) => {
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

// GET /api/settings/sprint-calendar
router.get('/settings/sprint-calendar', (_req, res) => {
  try {
    const db = getDb();
    res.json(getSprintCalendarSettings(db));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

// PATCH /api/settings/sprint-calendar
router.patch('/settings/sprint-calendar', requireApiKey, (req, res) => {
  try {
    const rows = Array.isArray(req.body?.entries) ? req.body.entries : null;
    if (rows === null) {
      res.status(400).json({ error: 'entries doit etre un tableau' });
      return;
    }

    const updates = rows.map((row: unknown) => {
      const r = (row ?? {}) as Record<string, unknown>;
      return {
        id: Number(r.id),
        startDate: String(r.startDate ?? ''),
        endDate: String(r.endDate ?? ''),
        active: Boolean(r.active),
      };
    });

    const db = getDb();
    res.json(updateSprintCalendarSettings(db, updates));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

// GET /api/settings/conformity-rules
router.get('/settings/conformity-rules', (_req, res) => {
  try {
    const db = getDb();
    res.json(getConformityRuleSettings(db));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

// PATCH /api/settings/conformity-rules
router.patch('/settings/conformity-rules', requireApiKey, (req, res) => {
  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const active = req.body?.active;

    if (!code) {
      res.status(400).json({ error: 'code est obligatoire' });
      return;
    }
    if (typeof active !== 'boolean') {
      res.status(400).json({ error: 'active doit etre un booleen' });
      return;
    }

    const db = getDb();
    const payload = updateConformityRuleActive(db, code, active);

    // Applique immédiatement l'effet d'activation/desactivation.
    try { runConformityCheck(); } catch { /* non bloquant */ }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

export default router;
