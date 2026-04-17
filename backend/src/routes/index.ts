import express, { Router } from 'express';
import healthRouter from './health';
import syncRouter from './sync';
import bugsRouter from './bugs';
import conformityRouter from './conformity';
import writeRouter from './write';
import statsRouter from './stats';
import kpisRouter from './kpis';
import settingsRouter from './settings';

const router = Router();
router.use(express.json({ limit: '10kb' }));

router.use('/', healthRouter);
router.use('/', syncRouter);
router.use('/', bugsRouter);
router.use('/', conformityRouter);
router.use('/', writeRouter);
router.use('/', statsRouter);
router.use('/', kpisRouter);
router.use('/', settingsRouter);

export default router;
