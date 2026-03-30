import { Router } from 'express';
import { getDb } from '../db';
import {
  type BacklogGranularity,
  backlogEvolution,
  closedByPi,
  defectDebtByPi,
  pointBacklog,
  terrainReturnsByExercise,
  teamBacklogs,
} from '../services/kpis';

const router = Router();

router.get('/kpis/defect-debt', (_req, res) => {
  try {
    const db = getDb();
    res.json(defectDebtByPi(db));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

router.get('/kpis/backlog-evolution', (req, res) => {
  try {
    const db = getDb();
    const rawMonths = typeof req.query.months === 'string' ? parseInt(req.query.months, 10) : 12;
    const months = Number.isFinite(rawMonths) ? rawMonths : 12;
    const rawGranularity = typeof req.query.granularity === 'string' ? req.query.granularity : 'week';
    const granularity: BacklogGranularity = rawGranularity === 'day' || rawGranularity === 'month' || rawGranularity === 'week'
      ? rawGranularity
      : 'week';
    res.json(backlogEvolution(db, months, granularity));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

router.get('/kpis/point-backlog', (req, res) => {
  try {
    const db = getDb();
    res.json(pointBacklog(db));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

router.get('/kpis/closed-by-pi', (_req, res) => {
  try {
    const db = getDb();
    res.json(closedByPi(db));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

router.get('/kpis/team-backlogs', (_req, res) => {
  try {
    const db = getDb();
    res.json(teamBacklogs(db));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

router.get('/kpis/terrain-returns', (_req, res) => {
  try {
    const db = getDb();
    res.json(terrainReturnsByExercise(db));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unexpected error' });
  }
});

export default router;
