// API routes for AI CPA Assistant

import { Router } from 'express';
import { handleAIRequest } from '../services/aiService';

const router = Router();

// POST /api/ai/chat - Send message to AI CPA
router.post('/chat', handleAIRequest);

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

export { router as aiRouter };