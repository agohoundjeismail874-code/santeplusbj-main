// ============================================================================
// ROUTES PAYMENT SERVICE
// ============================================================================

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { dbService } from '../services/db.service';

const router = Router();
router.use(requireAuth, requireRole('patient'));

interface Invoice {
  id: string;
  patientId: number;
  totalXof: number;
  totalSats?: number;
  status: string;
  paymentMethod?: string;
  createdAt: Date;
}

interface Payment {
  id: string;
  invoiceId: string;
  patientId: number;
  amount: number;
  status: string;
  createdAt: Date;
}

// Mock DB
let invoices: Invoice[] = [];
let payments: Payment[] = [];

// XOF to Satoshis conversion
const XOF_TO_SATS = 1.666;

// POST /api/payments/invoice
router.post('/invoice', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { hospitalId, consultationId, items, totalXof } = req.body;

  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(400).json({ success: false, error: 'Les lignes de facture sont invalides.' });
  }
  if (!Number.isSafeInteger(totalXof) || totalXof <= 0 || totalXof > 100000000) {
    return res.status(400).json({ success: false, error: 'Le montant de la facture est invalide.' });
  }
  for (const item of items) {
    if (!item || typeof item.name !== 'string' || item.name.length > 200 ||
        !Number.isSafeInteger(item.priceXof) || item.priceXof < 0 || item.priceXof > 100000000) {
      return res.status(400).json({ success: false, error: 'Une ligne de facture est invalide.' });
    }
  }
  const computedTotal = items.reduce((sum: number, item: any) => sum + item.priceXof, 0);
  if (computedTotal !== totalXof) {
    return res.status(400).json({ success: false, error: 'Le total ne correspond pas aux lignes de facture.' });
  }

  const invoiceId = `INV_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const totalSats = Math.floor(totalXof * XOF_TO_SATS);

  const invoice: Invoice = {
    id: invoiceId,
    patientId: userId,
    totalXof,
    totalSats,
    status: 'PENDING',
    createdAt: new Date(),
  };

  if (dbService.getStatus().connected) {
    const patientResult = await dbService.query<{ id: number }>(
      'SELECT id FROM patients WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    if (!patientResult?.rows[0]) {
      return res.status(404).json({ success: false, error: 'Patient profile not found' });
    }

    const invoiceHash = crypto.createHash('sha256').update(`${invoiceId}:${userId}:${totalXof}`).digest('hex');
    await dbService.query(
      `INSERT INTO invoices (id, patient_id, items, total_xof, total_sats, hash, status, qr_code)
       VALUES ($1, (SELECT id FROM patients WHERE user_id = $2 LIMIT 1), $3::jsonb, $4, $5, $6, 'PENDING', $7)`,
      [invoiceId, userId, JSON.stringify(items || []), totalXof, totalSats, invoiceHash, `QR_${invoiceId}`]
    );
  }

  invoices.push(invoice);

  res.status(201).json({
    success: true,
    data: {
      id: invoiceId,
      totalXof,
      totalSats,
      qrCode: `QR_${invoiceId}`,
      status: 'PENDING',
    },
  });
});

// POST /api/payments/pay
router.post('/pay', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { invoiceId, method } = req.body;

  let invoice = invoices.find(i => i.id === invoiceId);

  if (!invoice && dbService.getStatus().connected) {
    const result = await dbService.query<Invoice>(
      `SELECT id, patient_id AS "patientId", total_xof AS "totalXof",
              total_sats AS "totalSats", status, payment_method AS "paymentMethod",
              created_at AS "createdAt"
       FROM invoices
       WHERE id = $1
         AND patient_id = (SELECT id FROM patients WHERE user_id = $2 LIMIT 1)
       LIMIT 1`,
      [invoiceId, userId]
    );
    invoice = result?.rows[0];
  }

  if (!invoice) {
    return res.status(404).json({ success: false, error: 'Invoice not found' });
  }

  if (invoice.patientId !== userId || invoice.status === 'PAID') {
    return res.status(409).json({ success: false, error: 'Invoice is not payable by this user' });
  }

  const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const payment: Payment = {
    id: paymentId,
    invoiceId,
    patientId: userId,
    amount: invoice.totalXof,
    status: 'COMPLETED',
    createdAt: new Date(),
  };

  const transactionHash = `TX_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  if (dbService.getStatus().connected) {
    try {
      await dbService.transaction(async client => {
      if ((method || 'wallet').toLowerCase() === 'wallet') {
        const walletResult = await client.query(
          `UPDATE wallet_accounts
           SET balance_xof = balance_xof - $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2 AND balance_xof >= $1
           RETURNING id, balance_xof AS "balanceAfterXof"`,
          [invoice.totalXof, userId]
        );
        if (!walletResult.rows[0]) {
          throw new Error('Insufficient wallet balance');
        }
        await client.query(
          `INSERT INTO wallet_transactions
           (wallet_id, direction, amount_xof, balance_after_xof, reference)
           VALUES ($1, 'debit', $2, $3, $4)`,
          [walletResult.rows[0].id, invoice.totalXof, walletResult.rows[0].balanceAfterXof, paymentId]
        );
      }
      await client.query(
        `INSERT INTO payment_transactions
         (invoice_id, payer_id, provider, provider_reference, amount_xof, status, metadata, confirmed_at)
         VALUES ($1, $2, $3, $4, $5, 'confirmed', $6::jsonb, CURRENT_TIMESTAMP)`,
        [invoiceId, userId, method || 'wallet', paymentId, invoice.totalXof, JSON.stringify({ transactionHash })]
      );
      await client.query(
        `UPDATE invoices SET status = 'PAID', payment_method = $1, payment_hash = $2,
         paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [method || 'wallet', transactionHash, invoiceId]
      );
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Insufficient wallet balance') {
        return res.status(402).json({ success: false, error: error.message });
      }
      return res.status(502).json({ success: false, error: 'Payment persistence failed' });
    }
  }

  payments.push(payment);
  invoice.status = 'PAID';
  invoice.paymentMethod = method;

  res.json({
    success: true,
    data: {
      paymentId,
      status: 'COMPLETED',
      transactionHash,
    },
  });
});

router.post('/refund/:invoiceId', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { invoiceId } = req.params;
  let invoice = invoices.find(item => item.id === invoiceId && item.patientId === userId);

  if (dbService.getStatus().connected) {
    const result = await dbService.query<Invoice>(
      `SELECT id, patient_id AS "patientId", total_xof AS "totalXof",
              total_sats AS "totalSats", status, payment_method AS "paymentMethod",
              created_at AS "createdAt"
       FROM invoices
       WHERE id = $1
         AND patient_id = (SELECT id FROM patients WHERE user_id = $2 LIMIT 1)
       LIMIT 1`,
      [invoiceId, userId]
    );
    invoice = result?.rows[0];
  }

  if (!invoice) {
    return res.status(404).json({ success: false, error: 'Invoice not found' });
  }
  if (invoice.status !== 'PAID') {
    return res.status(409).json({ success: false, error: 'Only paid invoices can be refunded' });
  }

  const paymentMethod = invoice.paymentMethod?.toLowerCase() || 'wallet';
  const refundUrl = paymentMethod === 'fedapay'
    ? process.env.FEDAPAY_REFUND_URL
    : paymentMethod === 'lightning'
      ? process.env.LIGHTNING_REFUND_URL
      : process.env.WALLET_REFUND_LEDGER_URL;
  const refundKey = paymentMethod === 'fedapay'
    ? process.env.FEDAPAY_SECRET_KEY
    : paymentMethod === 'lightning'
      ? process.env.LNBITS_API_KEY
      : process.env.WALLET_REFUND_LEDGER_KEY;
  const refundProviderConfigured = Boolean(refundUrl && refundKey);

  if (process.env.NODE_ENV === 'production' && !refundProviderConfigured) {
    return res.status(501).json({
      success: false,
      error: `Refund provider not configured for ${paymentMethod}`,
    });
  }

  if (process.env.NODE_ENV === 'production') {
    try {
      const providerResponse = await fetch(refundUrl!, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paymentMethod === 'fedapay' ? process.env.FEDAPAY_SECRET_KEY : paymentMethod === 'lightning' ? process.env.LNBITS_API_KEY : process.env.WALLET_REFUND_LEDGER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId,
          amountXof: invoice.totalXof,
          amountSats: invoice.totalSats || 0,
          reason: req.body.reason || 'Patient refund request',
        }),
      });
      if (!providerResponse.ok) {
        return res.status(502).json({ success: false, error: 'Refund provider rejected the request' });
      }
    } catch (error) {
      return res.status(502).json({ success: false, error: 'Refund provider unavailable' });
    }
  }

  const refundId = `REFUND_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  if (dbService.getStatus().connected) {
    await dbService.transaction(async client => {
      await client.query(
        `INSERT INTO payment_transactions
         (invoice_id, payer_id, provider, provider_reference, amount_xof, amount_sats, status, metadata, confirmed_at)
         VALUES ($1, $2, 'refund', $3, $4, $5, 'refunded', $6::jsonb, CURRENT_TIMESTAMP)`,
        [invoiceId, userId, refundId, invoice.totalXof, invoice.totalSats || 0, JSON.stringify({ reason: req.body.reason || 'Patient refund request' })]
      );
      await client.query(
        `UPDATE invoices SET status = 'REFUNDED', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [invoiceId]
      );
    });
  }

  const memoryInvoice = invoices.find(item => item.id === invoiceId && item.patientId === userId);
  if (memoryInvoice) {
    memoryInvoice.status = 'REFUNDED';
  }
  const payment = payments.find(item => item.invoiceId === invoiceId && item.patientId === userId);
  if (payment) {
    payment.status = 'REFUNDED';
  }

  res.json({
    success: true,
    data: { refundId, invoiceId, amountXof: invoice.totalXof, status: 'REFUNDED' },
  });
});

// GET /api/payments/status/:id
router.get('/status/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  let payment = payments.find(p => p.id === req.params.id && p.patientId === userId);

  if (!payment && dbService.getStatus().connected) {
    const result = await dbService.query(
      `SELECT pt.provider_reference AS id, pt.invoice_id AS "invoiceId",
              pt.amount_xof AS amount, pt.status, pt.created_at AS "createdAt"
       FROM payment_transactions pt
       JOIN invoices i ON i.id = pt.invoice_id
       WHERE pt.provider_reference = $1
         AND i.patient_id = (SELECT id FROM patients WHERE user_id = $2 LIMIT 1)
       LIMIT 1`,
      [req.params.id, userId]
    );
    payment = result?.rows[0];
  }

  if (!payment) {
    return res.status(404).json({ success: false, error: 'Payment not found' });
  }

  res.json({
    success: true,
    data: payment,
  });
});

// POST /api/payments/transfer
router.post('/transfer', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, recipient } = req.body;

  const transactionId = `TXN_${Date.now()}`;

  res.json({
    success: true,
    data: {
      transactionId,
      amount,
      recipient,
      status: 'COMPLETED',
      timestamp: new Date(),
    },
  });
});

// GET /api/payments/balance
router.get('/balance', async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (dbService.getStatus().connected) {
    const result = await dbService.query(
      `SELECT balance_xof AS "balanceXof", balance_sats AS "balanceSats"
       FROM wallet_accounts WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return res.json({
      success: true,
      data: result?.rows[0] || { balanceXof: 0, balanceSats: 0 },
    });
  }

  res.json({
    success: true,
    data: {
      balanceXof: 25000,
      balanceSats: 41650,
    },
  });
});

// POST /api/payments/convert
router.post('/convert', (req: Request, res: Response) => {
  const { amount, from, to } = req.body;

  let result = amount;

  if (from === 'XOF' && to === 'SAT') {
    result = Math.floor(amount * XOF_TO_SATS);
  } else if (from === 'SAT' && to === 'XOF') {
    result = Math.floor(amount / XOF_TO_SATS);
  }

  res.json({
    success: true,
    data: {
      original: amount,
      originalCurrency: from,
      result,
      resultCurrency: to,
      rate: XOF_TO_SATS,
    },
  });
});

// GET /api/payments/invoices
router.get('/invoices', async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (dbService.getStatus().connected) {
    const result = await dbService.query(
      `SELECT id, total_xof AS "totalXof", total_sats AS "totalSats", status,
              payment_method AS "paymentMethod", qr_code AS "qrCode", created_at AS "createdAt"
       FROM invoices WHERE patient_id = (SELECT id FROM patients WHERE user_id = $1 LIMIT 1)
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.json({ success: true, data: result?.rows || [] });
  }

  const userInvoices = invoices.filter(i => i.patientId === userId);

  res.json({
    success: true,
    data: userInvoices,
  });
});

// GET /api/payments/invoice/:id
router.get('/invoice/:id', async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (dbService.getStatus().connected) {
    const result = await dbService.query(
      `SELECT id, patient_id AS "patientId", items, total_xof AS "totalXof",
              total_sats AS "totalSats", status, payment_method AS "paymentMethod",
              qr_code AS "qrCode", created_at AS "createdAt", paid_at AS "paidAt"
      FROM invoices
       WHERE id = $1
         AND patient_id = (SELECT id FROM patients WHERE user_id = $2 LIMIT 1)
       LIMIT 1`,
      [req.params.id, userId]
    );
    if (result?.rows[0]) {
      return res.json({ success: true, data: result.rows[0] });
    }
    return res.status(404).json({ success: false, error: 'Invoice not found' });
  }

  const invoice = invoices.find(i => i.id === req.params.id);

  if (!invoice) {
    return res.status(404).json({ success: false, error: 'Invoice not found' });
  }

  res.json({
    success: true,
    data: invoice,
  });
});

export default router;
