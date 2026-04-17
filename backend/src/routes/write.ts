import { Router } from 'express';
import { WRITABLE_FIELDS, writeField, bulkWriteField } from '../services/adoWrite';
import { AdoError } from '../services/azureDevOps';
import { requireApiKey } from '../middleware/security';

const router = Router();

// ─── PATCH /api/bugs/:id/fields — mise à jour d'un champ sur un bug ───────────

router.patch('/bugs/:id/fields', requireApiKey, async (req, res) => {
  const bugId = parseInt(req.params.id, 10);
  if (isNaN(bugId)) {
    res.status(400).json({ error: 'ID invalide' });
    return;
  }

  const { field, value } = req.body as { field?: unknown; value?: unknown };

  if (typeof field !== 'string' || !field) {
    res.status(400).json({ error: 'Champ "field" requis' });
    return;
  }
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
  const { ids, field, value } = req.body as { ids?: unknown; field?: unknown; value?: unknown };

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: 'Champ "ids" requis (tableau non vide)' });
    return;
  }
  if (ids.length > 200) {
    res.status(400).json({ error: 'Maximum 200 bugs par opération bulk' });
    return;
  }
  const bugIds = ids.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0);
  if (bugIds.length !== ids.length) {
    res.status(400).json({ error: 'Tous les IDs doivent être des entiers positifs' });
    return;
  }

  if (typeof field !== 'string' || !field) {
    res.status(400).json({ error: 'Champ "field" requis' });
    return;
  }
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
