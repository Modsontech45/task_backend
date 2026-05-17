import { Router } from 'express';
import authRoutes from './auth';
import scheduleRoutes from './schedule';
import activityRoutes from './activities';
import streakRoutes from './streaks';
import bilingualRoutes from './bilingual';
import predictionsRoutes from './predictions';
import summaryRoutes from './summary';
import templatesRoutes from './templates';
import revisionsRoutes from './revisions';

const router = Router();

// Public routes
router.use('/auth', authRoutes);

// Protected routes (each router applies requireAuth internally)
router.use('/schedule', scheduleRoutes);
router.use('/activities', activityRoutes);
router.use('/streaks', streakRoutes);
router.use('/bilingual', bilingualRoutes);
router.use('/predictions', predictionsRoutes);
router.use('/summary', summaryRoutes);
router.use('/templates', templatesRoutes);
router.use('/revisions', revisionsRoutes);

export default router;
