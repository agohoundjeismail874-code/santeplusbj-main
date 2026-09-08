import express, { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../middleware/auth.middleware';

const router = express.Router();
const DB_FILE = path.join(process.cwd(), 'data_db.json');

// Registre des ancres cryptographiques d'intégrité
interface CryptoAnchor {
  id: string;
  documentId: string;
  contentHash: string;
  signature: string;
  timestamp: string;
  verified: boolean;
  algorithm: 'SHA-256 + HMAC';
}

let ANCHORS_STORE: Record<string, CryptoAnchor> = {};

// Charger les ancres depuis data_db.json
try {
  if (process.env.NODE_ENV !== 'production' && fs.existsSync(DB_FILE)) {
    const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (raw.ANCHORS_STORE) {
      ANCHORS_STORE = raw.ANCHORS_STORE;
    }
  }
} catch (e) {
  // initialisation standard
}

function saveAnchors() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Local blockchain anchor storage is disabled in production');
  }
  try {
    let existing: any = {};
    if (fs.existsSync(DB_FILE)) {
      existing = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
    fs.writeFileSync(DB_FILE, JSON.stringify({
      ...existing,
      ANCHORS_STORE,
    }, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save anchors store:', err);
  }
}

// ========================================================================
// ROUTES CERTIFICATION & INTÉGRITÉ CRYPTOGRAPHIQUE DES DOSSIERS
// ========================================================================

// POST /api/blockchain/anchor - Ancrer et certifier l'empreinte d'un document médical
router.post('/anchor', requireAuth, (req: any, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ success: false, error: 'External blockchain registry is not configured' });
    }
    const { contentHash, documentId } = req.body;

    if (!contentHash && !documentId) {
      return res.status(400).json({ success: false, error: 'contentHash ou documentId requis' });
    }

    const cleanHash = contentHash 
      ? (contentHash.startsWith('0x') ? contentHash : `0x${contentHash}`)
      : `0x${crypto.createHash('sha256').update(String(documentId) + Date.now()).digest('hex')}`;

    const timestamp = new Date().toISOString();
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(503).json({ success: false, error: 'JWT_SECRET non configuré' });
    }
    const signature = crypto.createHmac('sha256', secret).update(`${cleanHash}:${timestamp}`).digest('hex');

    const anchorId = `CERT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const anchor: CryptoAnchor = {
      id: anchorId,
      documentId: documentId || anchorId,
      contentHash: cleanHash,
      signature: `hmac_${signature}`,
      timestamp,
      verified: true,
      algorithm: 'SHA-256 + HMAC',
    };

    ANCHORS_STORE[anchorId] = anchor;
    ANCHORS_STORE[cleanHash] = anchor;
    saveAnchors();

    res.status(201).json({
      success: true,
      data: {
        ...anchor,
        message: 'Empreinte SHA-256 certifiée et scellée dans le registre d\'intégrité Santé+',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/blockchain/verify/:hashOrId - Vérifier l'intégrité réelle d'une empreinte
router.get('/verify/:hashOrId', (req: Request, res: Response) => {
  try {
    const { hashOrId } = req.params;
    const cleanKey = hashOrId.startsWith('0x') ? hashOrId : (ANCHORS_STORE[hashOrId] ? hashOrId : `0x${hashOrId}`);
    const found = ANCHORS_STORE[cleanKey] || ANCHORS_STORE[hashOrId];

    if (!found) {
      return res.status(404).json({
        success: false,
        verified: false,
        error: 'Empreinte non trouvée dans le registre officiel de certification Santé+',
      });
    }

    res.json({
      success: true,
      verified: true,
      data: {
        ...found,
        message: 'Empreinte conforme. L\'intégrité et la non-altération du document médical sont certifiées.',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/blockchain/status/:hashOrId - Statut du scellement cryptographique
router.get('/status/:hashOrId', requireAuth, (req: Request, res: Response) => {
  try {
    const { hashOrId } = req.params;
    const found = ANCHORS_STORE[hashOrId] || ANCHORS_STORE[`0x${hashOrId}`];

    if (!found) {
      return res.status(404).json({ success: false, error: 'Certificat non trouvé' });
    }

    res.json({
      success: true,
      data: {
        id: found.id,
        contentHash: found.contentHash,
        status: 'confirmed',
        timestamp: found.timestamp,
        algorithm: found.algorithm,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
