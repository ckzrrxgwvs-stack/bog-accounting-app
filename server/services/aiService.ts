// AI CPA Assistant Service using OpenAI

import OpenAI from 'openai';
import type { Request, Response } from 'express';
import { isManualOperationsModeActive } from '../lib/manualOperationsGate';
import { getOrCreateDefaultCompany } from './companyBootstrap';
import {
  formatRecentAiMemoriesForPrompt,
  recordAiTenantMemoryIfEnabled,
} from './aiTenantMemory';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key',
});

const isDemoMode = !process.env.OPENAI_API_KEY;

// System prompt for the AI CPA
const SYSTEM_PROMPT = `You are an AI CPA Assistant for a professional accounting system. You help users with:

1. Financial Analysis - Analyzing revenue, expenses, profitability
2. Accounting Questions - Explaining accounting concepts, GAAP principles
3. Transaction Lookups - Finding specific transactions, invoices, journal entries
4. Report Generation - Explaining and summarizing financial reports
5. Budget Analysis - Comparing actual vs budget, explaining variances
6. Accounts Payable/Receivable - Status of payments, outstanding invoices
7. Compliance - Tax questions, regulatory requirements for USA and Mexico

You have access to the company's accounting data and can provide specific,
accurate information based on the actual data. Always be professional,
concise, and helpful.

When answering questions:
- Be specific with numbers and dates when available
- Explain accounting concepts clearly for non-experts
- Suggest actions when appropriate (e.g., "Consider collecting this overdue invoice")
- Flag potential issues (e.g., "This invoice is 60+ days overdue")

Current company context:
- Country: USA and Mexico support
- Currency: USD and MXN
- Fiscal Year: January to December
- Industry: General business accounting

If you don't have specific data, explain the general principle and suggest
how to find the information in the system.`;

// Demo responses for when OpenAI API is not configured
const demoResponses = [
  `Based on your accounting records, I can see your revenue trends are positive this month.

Key insights:
• Revenue: $124,500 (up 12.5% from last month)
• Expenses: $89,200 (down 3.2% from last month)
• Net Income: $35,300 (up 18.7% from last month)

Would you like me to generate a detailed financial report?`,

  `Looking at your Accounts Receivable aging:
• Current: $18,500 (on track)
• 31-60 days: $12,300 (needs attention)
• 60+ days: $4,200 (follow-up recommended)

I recommend prioritizing collection on the 60+ day invoices. Would you like me to show you the specific customer accounts?`,

  `For your Accounts Payable this week:
• Due: $450 (Electric Company)
• Approved and ready to pay: $3,500

You have sufficient cash balance ($52,800) to cover all outstanding payments. Take advantage of early payment discounts where available.`,
];

export async function chatWithAI(
  userMessage: string,
  context?: {
    companyId?: string;
    userRole?: string;
    period?: string;
    /** Tenant retrieval memory — appended to system instructions only */
    extraSystemPrompt?: string;
  }
): Promise<{ response: string; model?: string; tokens?: number; latency: number }> {
  const startTime = Date.now();

  const systemContent =
    context?.extraSystemPrompt && context.extraSystemPrompt.trim().length > 0
      ? `${SYSTEM_PROMPT}\n\n${context.extraSystemPrompt}`
      : SYSTEM_PROMPT;

  if (isDemoMode) {
    // Return demo response
    const demoIndex = Math.floor(Math.random() * demoResponses.length);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

    return {
      response: demoResponses[demoIndex],
      model: 'demo',
      latency: Date.now() - startTime,
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response.';
    const tokens = completion.usage?.total_tokens;

    return {
      response,
      model: 'gpt-4o',
      tokens,
      latency: Date.now() - startTime,
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return {
      response: 'I apologize, but I encountered an error processing your request. Please try again.',
      latency: Date.now() - startTime,
    };
  }
}

// API endpoint handler
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