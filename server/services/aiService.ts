// AI CPA Assistant Service using OpenAI

import OpenAI from 'openai';
import type { Request, Response } from 'express';
import { isManualOperationsModeActive } from '../lib/manualOperationsGate';
import { getOrCreateDefaultCompany } from './companyBootstrap';
import { buildFinancialSnapshot } from './aiFinancialSnapshot';
import {
  formatRecentAiMemoriesForPrompt,
  recordAiTenantMemoryIfEnabled,
} from './aiTenantMemory';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key',
});

const isDemoMode = !process.env.OPENAI_API_KEY;
const AI_MODEL = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are the **AI CPA Assistant** for BOG (Books On The Go) — a professional accounting program.

**Your job:** Answer with **concrete numbers** from the FINANCIAL SNAPSHOT block below. Do not give generic "I can help with…" loops.

**Report requests** (income statement, P&L, trial balance, balance sheet, cash flow, revenue, expenses, AR/AP):
1. Pull figures directly from the snapshot (MTD/YTD revenue, COGS, expenses, net income, account balances).
2. Present as a short markdown table or bullet list with dollar amounts.
3. Name the ledger: Commerce (store) vs Investment Personal (Robinhood ••••2686) vs Investment Agentic (••••2117) when relevant.
4. Only say data is unavailable if the snapshot explicitly shows zeros or says unavailable — then tell the user which app screen to open (Chart of accounts, Reports, Journal entries).

**Tone:** Professional CPA, concise, no filler paragraphs.

**Compliance:** Educational framing only — not investment advice. USA GAAP baseline; note when Mexico/CFDI rules may differ.

**Never:** Invent invoice numbers, balances, or transactions not in the snapshot.`;

export async function chatWithAI(
  userMessage: string,
  context?: {
    companyId?: string;
    userRole?: string;
    period?: string;
    extraSystemPrompt?: string;
  }
): Promise<{ response: string; model?: string; tokens?: number; latency: number }> {
  const startTime = Date.now();

  const snapshot = await buildFinancialSnapshot();
  const systemContent = [SYSTEM_PROMPT, snapshot, context?.extraSystemPrompt?.trim()]
    .filter(Boolean)
    .join('\n\n');

  if (isDemoMode) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      response: `**Demo mode** — set \`OPENAI_API_KEY\` on Render for full AI. Below is your **live snapshot** from the database:\n\n${snapshot}\n\n---\n**Your question:** ${userMessage}\n\n_Open the **Reports** menu for printable trial balance, income statement, and balance sheet._`,
      model: 'demo+snapshot',
      latency: Date.now() - startTime,
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1400,
      temperature: 0.35,
    });

    const response = completion.choices[0]?.message?.content || 'I could not generate a response.';
    const tokens = completion.usage?.total_tokens;

    return {
      response,
      model: AI_MODEL,
      tokens,
      latency: Date.now() - startTime,
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return {
      response: `AI service error: ${msg.slice(0, 200)}. Your snapshot is still available in Reports. Check OPENAI_API_KEY and billing on the OpenAI platform.`,
      latency: Date.now() - startTime,
    };
  }
}

export async function handleAIRequest(req: Request, res: Response) {
  try {
    if (await isManualOperationsModeActive()) {
      res.status(403).json({
        error:
          'AI CPA is turned off for this company. Manual operations mode is enabled — use standard ledger, AR, AP, and journal entry screens with human input only.',
        code: 'MANUAL_OPERATIONS_MODE',
      });
      return;
    }

    const { message, context } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const company = await getOrCreateDefaultCompany();
    const memoryBlock = await formatRecentAiMemoriesForPrompt(
      company.id,
      'AI_CPA',
      company.aiRetainSessionMemory
    );

    const result = await chatWithAI(message, {
      ...(typeof context === 'object' && context !== null ? context : {}),
      extraSystemPrompt: memoryBlock,
    });

    await recordAiTenantMemoryIfEnabled(
      company.id,
      'AI_CPA',
      typeof message === 'string' ? message : '',
      result.response,
      Boolean(company.aiRetainSessionMemory) && !isDemoMode
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('AI Request Error:', error);
    res.status(500).json({
      error: 'Failed to process AI request',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
