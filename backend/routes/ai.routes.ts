import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';

const router = express.Router();

// ========================================================================
// AI ASSISTANT ROUTES - Medical AI for diagnosis & recommendations
// ========================================================================

router.post('/diagnose', requireAuth, (req: any, res: Response) => {
  res.status(503).json({ success: false, error: 'Assistant clinique indisponible.' });
});

router.post('/drug-interaction', requireAuth, (req: any, res: Response) => {
  res.status(503).json({ success: false, error: 'Vérification des interactions indisponible.' });
});

router.post('/recommendations', requireAuth, (req: any, res: Response) => {
  res.status(503).json({ success: false, error: 'Recommandations assistées indisponibles.' });
});

export default router;
