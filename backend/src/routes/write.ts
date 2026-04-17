import { Router } from 'express';
import { z } from 'zod';
import { WRITABLE_FIELDS, writeField, bulkWriteField } from '../services/adoWrite';
import { AdoError } from '../services/azureDevOps';
import { requireApiKey } from '../middleware/security';

const PatchFieldSchema = z.object({
  field: z.string().min(1, 'Champ "field" requis'),
  value: z.unknown(),
});

const BulkFieldSchema = z.object({
  ids: z.array(z.number().int().positive('Les IDs doivent être des entiers positifs'))
    .min(1, 'Champ "ids" requis (tableau non vide)')
    .max(200, 'Maximum 200 bugs par opération bulk'),
  field: z.string().min(1, 'Champ "field" requis'),
  value: z.unknown(),
});

const router = Router();

// ─── PATCH /api/bugs/:id/fields — mise à jour d'un champ sur un bug ───────────

router.patch('/bugs/:id/fields', requireApiKey, async (req, res) => {
  const bugId = parseInt(req.params.id, 10);
  if (isNaN(bugId)) {
    res.status(400).json({ error: 'ID invalide' });
    return;
  }

  const parsed = PatchFieldSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide' });
    return;
  }
  const { field, value } = parsed.data;

  if (!WRITABLE_FIELDS[field]) {
    res.status(400).json({ error: `Champ non autorisé : ${field}. Champs acceptés : ${Object.keys(WRITABLE_FIELDS).join(', ')}` });
    return;
  }
  if (value === undefined || value === null) {
    res.status(400).json({ error: 'Champ "value" requis' });
    return;
  }
  if (!WRITABLE_FIELDS[field].validate(value)) {
    res.status(400).json({ error: `Valeur invalide pour le champ ${field}` });
    return;
  }

  try {
    const result = await writeField(bugId, field, value);
    res.json(result);
  } catch (e) {
    if (e instanceof Error && e.message.includes('introuvable')) {
      res.status(404).json({ error: e.message });
      return;
    }
    if (e instanceof AdoError) {
      res.status(502).json({ error: e.message });
      return;
    }
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur inconnue' });
  }
});

// ─── POST /api/bugs/bulk-fields — mise à jour d'un champ sur plusieurs bugs ──

router.post('/bugs/bulk-fields', requireApiKey, async (req, res) => {
  const parsed = BulkFieldSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Requête invalide' });
    return;
  }
  const { ids: bugIds, field, value } = parsed.data;

  if (!WRITABLE_FIELDS[field]) {
    res.status(400).json({ error: `Champ non autorisé : ${field}` });
    return;
  }
  if (value === undefined || value === null) {
    res.status(400).json({ error: 'Champ "value" requis' });
    return;
  }
  if (!WRITABLE_FIELDS[field].validate(value)) {
    res.status(400).json({ error: `Valeur invalide pour le champ ${field}` });
    return;
  }

  try {
    const result = await bulkWriteField(bugIds, field, value);
    res.json(result);
  } catch (e) {
    if (e instanceof AdoError) {
      res.status(502).json({ error: e.message });
      return;
    }
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur inconnue' });
  }
});

export default router;
