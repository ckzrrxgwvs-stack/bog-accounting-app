// API routes for AI CPA Assistant

import { Router } from 'express';
import { handleAIRequest } from '../services/aiService';
import { handleErpAssistantRequest } from '../services/erpAssistantService';
import { runAccountingReview } from '../services/accountingReview';
import { isManualOperationsModeActive } from '../lib/manualOperationsGate';

const router = Router();

// POST /api/ai/chat - Send message to AI CPA
router.post('/chat', handleAIRequest);

// POST /api/ai/erp-assistant — customer service / clerk ERP help (live snapshot + AI)
router.post('/erp-assistant', handleErpAssistantRequest);

// GET /api/ai/health - Check AI service status
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    mode: process.env.OPENAI_API_KEY ? 'live' : 'demo',
  });
});

// GET /api/ai/history - Conversation history (demo; production would load from DB)
router.get('/history', (_req, res) => {
  res.json({
    messages: [] as { role: string; content: string; at: string }[],
  });
});

/** Structured accounting review (invoice or payment) — suggestions only; does not change data. */
router.post('/accounting-review', async (req, res) => {
  if (await isManualOperationsModeActive()) {
    res.status(403).json({
      error: 'Automated AI accounting review is disabled when manual operations mode is on.',
      code: 'MANUAL_OPERATIONS_MODE',
    });
    return;
  }

  const body = req.body as { invoiceId?: string; paymentId?: string };
  if (body.invoiceId && typeof body.invoiceId === 'string') {
    try {
      const out = await runAccountingReview({ kind: 'invoice', invoiceId: body.invoiceId });
      res.json(out);
    } catch (e) {
      console.error(e);
      res.status(503).json({ error: 'Accounting review unavailable' });
    }
    return;
  }
  if (body.paymentId && typeof body.paymentId === 'string') {
    try {
      const out = await runAccountingReview({ kind: 'payment', paymentId: body.paymentId });
      res.json(out);
    } catch (e) {
      console.error(e);
      res.status(503).json({ error: 'Accounting review unavailable' });
    }
    return;
  }
  res.status(400).json({ error: 'Provide invoiceId or paymentId' });
});

export { router as aiRouter };