import { Router } from 'express';
import healthRouter from './health';
import syncRouter from './sync';
import bugsRouter from './bugs';
import conformityRouter from './conformity';
import writeRouter from './write';

const router = Router();

router.use('/', healthRouter);
router.use('/', syncRouter);
router.use('/', bugsRouter);
router.use('/', conformityRouter);
router.use('/', writeRouter);

export default router;
