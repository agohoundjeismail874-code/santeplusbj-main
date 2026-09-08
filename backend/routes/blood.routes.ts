import express, { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';

const router = express.Router();

// ========================================================================
// BLOOD DONATION ROUTES
// ========================================================================

router.post('/donate', requireAuth, (req: any, res: Response) => {
  try {
    const { donorName, bloodType, quantity, donorPhone } = req.body;
    
    const donation = {
      id: `BLOOD-${Date.now()}`,
      donorId: req.userId,
      donorName,
      bloodType,
      quantity,
      donorPhone,
      timestamp: new Date().toISOString(),
      status: 'validated',
      blockchainHash: `0x${Math.random().toString(16).slice(2)}`,
    };

    res.status(201).json({ success: true, data: donation });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

router.get('/history', requireAuth, (req: any, res: Response) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

router.get('/donor-status', requireAuth, (req: any, res: Response) => {
  try {
    const status = {
      eligibleToDonate: false,
      lastDonationDate: null,
      nextEligibleDate: null,
      totalDonations: 0,
      totalVolume: 0,
    };
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

export default router;
