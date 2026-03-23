import { Router } from 'express';
import healthRouter from './health';

// ─── CHAQUE PERSONNE AJOUTE SON IMPORT + SA LIGNE ICI ────────────────────────
// import featureARouter from './featureA';
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

router.use('/', healthRouter);

// ─── CHAQUE PERSONNE AJOUTE SA ROUTE ICI ─────────────────────────────────────
// router.use('/', featureARouter);
// ─────────────────────────────────────────────────────────────────────────────

export default router;
