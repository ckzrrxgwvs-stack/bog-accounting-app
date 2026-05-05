import OpenAI from 'openai';
import { prisma } from '../lib/prisma';
import { getOrCreateDefaultCompany } from './companyBootstrap';
import { dec } from '../lib/serialize';
import { isManualOperationsModeActive } from '../lib/manualOperationsGate';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'demo-key' });

export type AccountingReviewInput =
  | { kind: 'invoice'; invoiceId: string }
  | { kind: 'payment'; paymentId: string };

export type AccountingReviewResult = {
  summary: string;
  risks: string[];
  suggestions: string[];
  checksPassed: string[];
  demoMode: boolean;
};

/**
 * AI-assisted review of an invoice or payment before/after posting — suggestions only; never mutates data.
 */
export async function runAccountingReview(input: AccountingReviewInput): Promise<AccountingReviewResult> {
  const company = await getOrCreateDefaultCompany();

  const demoMode = !process.env.OPENAI_API_KEY;

  if (await isManualOperationsModeActive()) {
    return {
      summary:
        'Automated AI accounting review is off — this company uses manual operations mode. Review documents using standard workflows and human judgment.',
      risks: [],
      suggestions: [],
      checksPassed: [],
      demoMode: true,
    };
  }

  if (input.kind === 'invoice') {
    const inv = await prisma.invoice.findFirst({
      where: { id: input.invoiceId, companyId: company.id },
      include: { customer: true, vendor: true, lines: true },
    });
    if (!inv) {
      return {
        summary: 'Invoice not found.',
        risks: ['Invalid identifier'],
        suggestions: [],
        checksPassed: [],
        demoMode,
      };
    }

    const total = dec(inv.total as never);
    const tax = dec(inv.taxAmount as never);
    const lineSum = inv.lines.reduce((s, l) => s + dec(l.total as never), 0);
    const checks: string[] = [];
    const sub = dec(inv.subtotal as never);
    if (inv.lines.length > 0 && Math.abs(lineSum - sub) < 0.02) checks.push('Line totals match subtotal');
    if (inv.glJournalEntryId) checks.push('Posted to general ledger');
    if (total > 0) checks.push('Total is positive');

    if (demoMode) {
      return {
        summary: `Demo review for ${inv.invoiceNumber} (${inv.type}): subledger and tax rules should be verified before period close.`,
        risks: inv.status === 'DRAFT' ? ['Invoice is still in DRAFT'] : [],
        suggestions: [
          'Confirm default GL accounts in Company settings match your chart of accounts.',
          'Reconcile customer/vendor balance after posting.',
        ],
        checksPassed: checks,
        demoMode: true,
      };
    }

    const userContent = JSON.stringify({
      type: inv.type,
      number: inv.invoiceNumber,
      status: inv.status,
      total,
      tax,
      subtotal: dec(inv.subtotal as never),
      customer: inv.customer?.name,
      vendor: inv.vendor?.name,
      glPosted: !!inv.glJournalEntryId,
      lineCount: inv.lines.length,
    });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a senior accountant reviewing invoice data before GL posting. Respond ONLY with compact JSON:
{"summary":"one paragraph","risks":["..."],"suggestions":["..."]}
No markdown. Risks: accounting/control issues. Suggestions: concrete corrections (user must approve any change).`,
        },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 600,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    let parsed: { summary?: string; risks?: string[]; suggestions?: string[] } = {};
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      parsed = { summary: raw.slice(0, 500), risks: [], suggestions: [] };
    }

    return {
      summary: parsed.summary ?? '',
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      checksPassed: checks,
      demoMode: false,
    };
  }

  const pay = await prisma.payment.findFirst({
    where: { id: input.paymentId, companyId: company.id },
    include: {
      invoices: { include: { invoice: { select: { id: true, type: true, invoiceNumber: true } } } },
    },
  });

  if (!pay) {
    return {
      summary: 'Payment not found.',
      risks: ['Invalid identifier'],
      suggestions: [],
      checksPassed: [],
      demoMode,
    };
  }

  const amt = dec(pay.amount as never);
  const applied = pay.invoices.reduce((s, a) => s + dec(a.amount as never), 0);
  const checks: string[] = [];
  if (Math.abs(amt - applied) < 0.02) checks.push('Applied amounts equal payment total');
  if (pay.glJournalEntryId) checks.push('Posted to general ledger');

  if (demoMode) {
    return {
      summary: `Demo review for payment ${pay.paymentNumber}: verify cash/bank account and AR/AP applications.`,
      risks: pay.invoices.length === 0 ? ['No invoice applications'] : [],
      suggestions: ['Confirm payment date falls in an open accounting period.'],
      checksPassed: checks,
      demoMode: true,
    };
  }

  const userContent = JSON.stringify({
    paymentNumber: pay.paymentNumber,
    status: pay.status,
    amount: amt,
    appliedTotal: applied,
    applications: pay.invoices.map((x) => ({
      invoiceId: x.invoiceId,
      amount: dec(x.amount as never),
      invoiceNumber: x.invoice.invoiceNumber,
    })),
    glPosted: !!pay.glJournalEntryId,
  });

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a senior accountant reviewing payment allocation before GL posting. Respond ONLY with compact JSON:
{"summary":"...","risks":["..."],"suggestions":["..."]}
No markdown.`,
      },
      { role: 'user', content: userContent },
    ],
    temperature: 0.2,
    max_tokens: 600,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  let parsed: { summary?: string; risks?: string[]; suggestions?: string[] } = {};
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    parsed = { summary: raw.slice(0, 500), risks: [], suggestions: [] };
  }

  return {
    summary: parsed.summary ?? '',
    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    checksPassed: checks,
    demoMode: false,
  };
}
