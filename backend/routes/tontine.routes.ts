import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';

const router = express.Router();

// ========================================================================
// TONTINE ROUTES - Épargne coopérative entre citoyens
// ========================================================================

router.get('/', requireAuth, (req: any, res: Response) => {
  try {
    const tontines = [
      {
        id: '1',
        name: 'Tontine Santé Abomey-Calavi',
        description: 'Épargne communautaire pour frais médicaux',
        members: 25,
        totalSavings: 12500000,
        monthlyContribution: 50000,
        currentCycle: '2026-07',
        status: 'active',
      },
      {
        id: '2',
        name: 'Tontine Femmes Entrepreneures',
        members: 15,
        totalSavings: 8750000,
        monthlyContribution: 75000,
        currentCycle: '2026-07',
        status: 'active',
      },
    ];
    res.json({ success: true, data: tontines });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

router.post('/', requireAuth, (req: any, res: Response) => {
  try {
    const { name, description, monthlyContribution } = req.body;
    
    const tontine = {
      id: `TONTINE-${Date.now()}`,
      name,
      description,
      monthlyContribution,
      members: 1,
      totalSavings: 0,
      creatorId: req.userId,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    res.status(201).json({ success: true, data: tontine });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

router.post('/:tontineId/join', requireAuth, (req: any, res: Response) => {
  try {
    const { tontineId } = req.params;
    
    res.json({
      success: true,
      message: 'Vous avez rejoint la tontine avec succès',
      membership: {
        tontineId,
        userId: req.userId,
        joinedAt: new Date().toISOString(),
        status: 'active',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

router.post('/:tontineId/contribute', requireAuth, (req: any, res: Response) => {
  try {
    const { tontineId } = req.params;
    const { amount } = req.body;
    
    res.json({
      success: true,
      message: 'Contribution enregistrée',
      contribution: {
        id: `CONTRIB-${Date.now()}`,
        tontineId,
        userId: req.userId,
        amount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

export default router;
