// ============================================================================
// SERVICE LIGHTNING NETWORK (LNbits & Sandbox Fallback)
// Permet la création d'invoices Lightning réels via LNbits ou mode résilient
// ============================================================================

import crypto from 'crypto';

export interface LightningInvoiceResult {
  invoice: string; // BOLT11 payment request
  paymentHash: string;
  invoiceId: string;
  amountSats: number;
  amountXOF: number;
  expiresAt: number;
  isLive: boolean; // true si généré via un vrai nœud LNbits
  provider: 'lnbits' | 'breez' | 'izichange' | 'sandbox';
}

export interface LightningPaymentStatus {
  paid: boolean;
  preimage?: string;
  amountSats?: number;
  provider: 'lnbits' | 'breez' | 'izichange' | 'sandbox';
}

class LightningService {
  private get lnbitsUrl(): string {
    return (process.env.LNBITS_URL || 'http://localhost:5000').replace(/\/$/, '');
  }

  private get lnbitsApiKey(): string | undefined {
    return process.env.LNBITS_API_KEY;
  }

  private get provider(): 'lnbits' | 'breez' | 'izichange' | 'sandbox' {
    const value = (process.env.LIGHTNING_PROVIDER || 'lnbits').toLowerCase();
    return value === 'breez' || value === 'izichange' || value === 'lnbits' ? value : 'sandbox';
  }

  private get apiUrl(): string {
    return (process.env.LIGHTNING_API_URL || '').replace(/\/$/, '');
  }

  private get apiKey(): string | undefined {
    return process.env.LIGHTNING_API_KEY || this.lnbitsApiKey;
  }

  /**
   * Vérifie si un nœud LNbits est configuré
   */
  public isConfigured(): boolean {
    if (this.provider === 'lnbits') return Boolean(this.lnbitsApiKey?.trim());
    return Boolean(this.apiUrl && this.apiKey?.trim());
  }

  /**
   * Crée un invoice Lightning réel via LNbits ou fallback sandbox
   */
  public async createInvoice(
    amountSats: number,
    amountXOF: number,
    description: string = 'Facture Santé+ Bénin'
  ): Promise<LightningInvoiceResult> {
    const invoiceId = `LN-INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (process.env.NODE_ENV === 'production' && !this.isConfigured()) {
      throw new Error(`${this.provider.toUpperCase()} Lightning credentials must be configured in production`);
    }

    // 1. API LNbits connue
    if (this.provider === 'lnbits' && this.isConfigured()) {
      try {
        const response = await fetch(`${this.lnbitsUrl}/api/v1/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': this.lnbitsApiKey!,
          },
          body: JSON.stringify({
            out: false,
            amount: amountSats,
            memo: `${description} [${invoiceId}]`,
            extra: {
              tag: 'santeplus-benin',
              invoiceId,
              amountXOF,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // data format: { payment_hash: string, payment_request: string, checking_id: string }
          return {
            invoice: data.payment_request,
            paymentHash: data.payment_hash,
            invoiceId,
            amountSats,
            amountXOF,
            expiresAt: Date.now() + 3600 * 1000,
            isLive: true,
            provider: 'lnbits',
          };
        } else {
          console.warn(`LNbits API returned ${response.status}. Bascule en mode sandbox résilient.`);
        }
      } catch (err) {
        console.warn('Erreur de connexion à LNbits:', err);
        if (process.env.NODE_ENV === 'production') {
          throw new Error('LNbits is unavailable in production');
        }
      }

      if (process.env.NODE_ENV === 'production') {
        throw new Error('LNbits rejected the invoice request');
      }
    }

    // 2. Adaptateur REST pour Breez ou Izichange.
    if ((this.provider === 'breez' || this.provider === 'izichange') && this.isConfigured()) {
      try {
        const response = await fetch(`${this.apiUrl}/invoices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Api-Key': this.apiKey!,
          },
          body: JSON.stringify({ amountSats, amount_sats: amountSats, amountXOF, currency: 'XOF', description, invoiceId }),
        });
        const data: any = await response.json().catch(() => ({}));
        const invoice = data.invoice || data.payment_request || data.paymentRequest || data.bolt11;
        const paymentHash = data.payment_hash || data.paymentHash || data.hash;
        if (response.ok && invoice && paymentHash) {
          return { invoice, paymentHash, invoiceId, amountSats, amountXOF, expiresAt: Date.now() + 3600 * 1000, isLive: true, provider: this.provider };
        }
        throw new Error(`Provider response ${response.status} missing invoice fields`);
      } catch (err: any) {
        if (process.env.NODE_ENV === 'production') throw new Error(`${this.provider} Lightning unavailable: ${err.message}`);
      }
    }

    // 3. Mode Sandbox uniquement hors production
    if (process.env.NODE_ENV === 'production') throw new Error('Lightning provider unavailable in production');
    // Génère un hash de paiement SHA-256 cryptographique
    const preimage = crypto.randomBytes(32);
    const paymentHash = crypto.createHash('sha256').update(preimage).digest('hex');

    // Génération d'une chaîne BOLT11 structurée pour l'affichage QR
    const bolt11 = `lnbc${amountSats}u1p392066pp5${paymentHash.slice(0, 52)}qdqg2fhk6mmpwq5kget8wf5k2cmzv9hkutssw3skget8v4cxjumn94sk2uewdqh8gmpwd3jxc6tvd3hxw3scqpvqyjw5qcqpxrzjqw72q3ksla762hsp48qaswep7mqcxw6mppv6mpwpwqf7mpws9p4xpwpvq5qshxztf9f8gskqfq9gqkcxsqypqxpqxzszqxpqw7p9`;

    return {
      invoice: bolt11,
      paymentHash,
      invoiceId,
      amountSats,
      amountXOF,
      expiresAt: Date.now() + 3600 * 1000,
      isLive: false,
      provider: 'sandbox',
    };
  }

  /**
   * Vérifie le statut d'un paiement Lightning auprès de LNbits
   */
  public async checkPaymentStatus(paymentHash: string): Promise<LightningPaymentStatus> {
    if (this.provider === 'lnbits' && this.isConfigured()) {
      try {
        const response = await fetch(`${this.lnbitsUrl}/api/v1/payments/${paymentHash}`, {
          method: 'GET',
          headers: {
            'X-Api-Key': this.lnbitsApiKey!,
          },
        });

        if (response.ok) {
          const data = await response.json();
          return {
            paid: Boolean(data.paid),
            preimage: data.preimage,
            amountSats: data.details?.amount ? Math.round(data.details.amount / 1000) : undefined,
            provider: 'lnbits',
          };
        }
      } catch (err) {
        console.warn('Erreur vérification LNbits:', err);
      }
    }

    if ((this.provider === 'breez' || this.provider === 'izichange') && this.isConfigured()) {
      try {
        const response = await fetch(`${this.apiUrl}/invoices/${paymentHash}`, {
          headers: { 'Authorization': `Bearer ${this.apiKey}`, 'X-Api-Key': this.apiKey! },
        });
        const data: any = await response.json().catch(() => ({}));
        if (response.ok) return { paid: Boolean(data.paid ?? data.settled ?? data.status === 'paid'), preimage: data.preimage, amountSats: data.amountSats || data.amount_sats, provider: this.provider };
      } catch (err) {
        console.warn(`Erreur vérification ${this.provider}:`, err);
      }
    }

    return {
      paid: false,
      provider: 'sandbox',
    };
  }
}

export const lightningService = new LightningService();
export default lightningService;
