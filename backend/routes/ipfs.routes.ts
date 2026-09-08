// ============================================================================
// ROUTES IPFS SERVICE
// Permet d'archiver de manière infalsifiable les ordonnances et bilans
// ============================================================================

import { Router, Request, Response } from 'express';
import { ipfsService } from '../services/ipfs.service';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Cache local des documents épinglés
const PINNED_DOCUMENTS: Record<string, any> = {};

// POST /api/ipfs/pin-document - Épingler un document médical sur IPFS
router.post('/pin-document', requireAuth, async (req: Request, res: Response) => {
  try {
    const { document, name } = req.body;

    if (!document) {
      return res.status(400).json({ success: false, error: 'Document requis' });
    }

    const result = await ipfsService.pinJSON(document, name || 'Ordonnance Santé+');

    // Sauvegarder dans le cache local pour consultation rapide
    PINNED_DOCUMENTS[result.cid] = { ...result, pinnedBy: (req as any).userId };

    res.status(201).json({
      success: true,
      data: result,
      message: result.isLive
        ? 'Document médical épinglé avec succès sur le réseau IPFS via Pinata'
        : 'Document médical horodaté avec identifiant décentralisé (CID IPFS)',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Erreur lors de l\'épinglage IPFS' });
  }
});

// GET /api/ipfs/document/:cid - Récupérer un document par son CID
router.get('/document/:cid', requireAuth, async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;

    // Vérifier d'abord le cache local
    if (PINNED_DOCUMENTS[cid]) {
      return res.json({ success: true, data: PINNED_DOCUMENTS[cid] });
    }

    // Récupérer depuis la passerelle IPFS
    const document = await ipfsService.fetchDocument(cid);

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document introuvable sur la passerelle IPFS' });
    }

    res.json({
      success: true,
      data: {
        cid,
        gatewayUrl: `${process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/'}${cid}`,
        document,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/ipfs/status - Statut du service IPFS
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    isConfigured: ipfsService.isConfigured(),
    provider: ipfsService.isConfigured() ? 'Pinata Cloud IPFS Gateway' : 'Local IPFS Multihash',
    gateway: process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/',
  });
});

export default router;
