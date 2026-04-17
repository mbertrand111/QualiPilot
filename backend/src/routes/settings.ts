import { Router } from 'express';
import { z } from 'zod';
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

const ReleaseVersionsSchema = z.object({
  selectedVersions: z.array(z.string()),
});

const SprintCalendarSchema = z.object({
  entries: z.array(z.object({
    id:        z.number(),
    startDate: z.string(),
    endDate:   z.string(),
    active:    z.boolean(),
  })),
});

const ConformityRuleSchema = z.object({
  code:   z.string().min(1, 'code est obligatoire'),
  active: z.boolean(),
});

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
  const parsed = ReleaseVersionsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide' });
    return;
  }
  try {
    const db = getDb();
    res.json(updateReleaseVersionSettings(db, parsed.data.selectedVersions));
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
  const parsed = SprintCalendarSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide' });
    return;
  }
  try {
    const db = getDb();
    res.json(updateSprintCalendarSettings(db, parsed.data.entries));
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
  const parsed = ConformityRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide' });
    return;
  }
  try {
    const { code, active } = parsed.data;
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
