import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const WEBHOOK_SECRETS: Record<string, string | undefined> = {
  FLIPKART: process.env.FLIPKART_WEBHOOK_SECRET,
  NYKAA: process.env.NYKAA_WEBHOOK_SECRET,
  MYNTRA: process.env.MYNTRA_WEBHOOK_SECRET,
  TATACLIQ: process.env.TATACLIQ_WEBHOOK_SECRET,
  AMAZON: process.env.AMAZON_WEBHOOK_SECRET,
  SHOPIFY: process.env.SHOPIFY_WEBHOOK_SECRET,
};

export function verifyWebhookSignature(req: Request, res: Response, next: NextFunction) {
  const marketplace = (req.params.marketplace as string).toUpperCase();
  const secret = WEBHOOK_SECRETS[marketplace];

  if (!secret) {
    console.warn(`[WebhookAuth] No webhook secret configured for ${marketplace} - rejecting request`);
    return res.status(401).json({ message: `Webhook authentication not configured for ${marketplace}` });
  }

  const signature = req.headers['x-webhook-signature'] as string | undefined;
  const timestamp = req.headers['x-webhook-timestamp'] as string | undefined;

  if (!signature || !timestamp) {
    return res.status(401).json({ message: 'Missing webhook signature or timestamp' });
  }

  // Reject requests older than 5 minutes to prevent replay attacks
  const requestTime = parseInt(timestamp, 10);
  if (isNaN(requestTime) || Math.abs(Date.now() - requestTime) > 5 * 60 * 1000) {
    return res.status(401).json({ message: 'Webhook timestamp expired' });
  }

  const rawBody = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    console.error(`[WebhookAuth] Invalid signature for ${marketplace} webhook`);
    return res.status(401).json({ message: 'Invalid webhook signature' });
  }

  next();
}
