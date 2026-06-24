/**
 * AI ERP Assistant — customer-service and clerk workflows with live snapshot context.
 * Disabled when company manualOperationsMode is true (same policy as AI CPA).
 */
import OpenAI from 'openai';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { databaseConfigured } from '../lib/dbMode';
import { getOrCreateDefaultCompany } from './companyBootstrap';
import { dec } from '../lib/serialize';
import { isManualOperationsModeActive } from '../lib/manualOperationsGate';
import {
  formatRecentAiMemoriesForPrompt,
  recordAiTenantMemoryIfEnabled,
} from './aiTenantMemory';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'demo-key',
});

const isDemoMode = !process.env.OPENAI_API_KEY;

const ERP_SYSTEM_PROMPT = `You are the **ERP Assistant** for BOG-Pi — a friendly, efficient helper for **customer service clerks**, warehouse staff, and operations users who are NOT ERP specialists.

Your job is to do ~99% of the thinking: interpret messy requests, explain clearly in plain English, and tie answers to **actual snapshot data** when it appears in the context block below.

**Tone:** Short paragraphs, numbered steps when helpful, no jargon unless you explain it.

**Rules:**
- Never invent order numbers, tracking numbers, or amounts. If the snapshot does not contain something, say so and suggest what screen or question would get it.
- Prefer actionable guidance: what to tell the customer, what to click next, what status means (e.g. CONFIRMED vs PARTIALLY_SHIPPED).
- For Mexico/US logistics or compliance, stay general unless specific company rules appear in context.
- If the user asks to **create or change** records, describe the recommended action and which ERP screen/API applies — you cannot execute mutations yourself unless the product explicitly adds tools later.

**Coverage:** sales orders, purchase orders, shipments & tracking placeholders, logistics documents (BOL/packing/commercial invoice concepts), inventory lots/serials at a high level, RMA/ASN concepts, and linking order status to next accounting steps (AR/AP) in plain language.

Current operational snapshot (may be partial):
`;

const DEMO_ERP_RESPONSES = [
  `Here's what I can tell from typical workflow patterns:

**Customer asks “Where's my order?”**  
1. Confirm their PO or sales order number (or customer name + ship date).  
2. In ERP → Sales orders, find the order and check **status**: CONFIRMED means approved internally; PARTIALLY_SHIPPED / CLOSED tells you how much shipped.  
3. If **Logistics** has a shipment record, use **tracking** there when present.

**Quick reply script:** “I'm pulling up order [number]. Current status is [status]. I'll send tracking as soon as it's on the shipment.”

(Wire OPENAI_API_KEY and DATABASE_URL for answers grounded in your live data.)`,

  `**Purchase order side — vendor asking about delivery:**  
Check ERP → Purchase orders for status APPROVED / PARTIALLY_RECEIVED / CLOSED. Explain that receiving posts inventory when lines have SKU links, and creates AP linkage when your team runs receive-from-PO.

**Tip:** Always repeat back vendor reference + your PO number to avoid duplicates.`,

  `**Shipment / label questions:**  
Outbound shipments can carry BOL, packing slip, commercial invoice, and ASN-style document records. Clerks usually: create or open the shipment → use **Issue standard docs** to register document placeholders → add tracking when the carrier provides it.

If you tell me an order or customer name from your screen, I can walk through statuses step-by-step once live data is connected.`,
];

export async function buildErpSnapshot(): Promise<string> {
  if (!databaseConfigured()) {
    return '[Snapshot unavailable: database not connected. Answer using general ERP customer-service guidance only.]';
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const cid = company.id;

    const [
      soRows,
      poRows,
      shipRows,
      poCounts,
      soCounts,
      logisticsSummary,
    ] = await Promise.all([
      prisma.salesOrder.findMany({
        where: { companyId: cid },
        orderBy: { orderDate: 'desc' },
        take: 10,
        include: { customer: { select: { name: true, code: true } } },
      }),
      prisma.purchaseOrder.findMany({
        where: { companyId: cid },
        orderBy: { orderDate: 'desc' },
        take: 8,
        include: { vendor: { select: { name: true, code: true } } },
      }),
      prisma.shipment.findMany({
        where: { companyId: cid },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { carrier: { select: { name: true } }, customer: { select: { name: true, code: true } } },
      }),
      prisma.purchaseOrder.groupBy({
        by: ['status'],
        where: { companyId: cid },
        _count: { id: true },
      }),
      prisma.salesOrder.groupBy({
        by: ['status'],
        where: { companyId: cid },
        _count: { id: true },
      }),
      prisma.shipment.count({
        where: {
          companyId: cid,
          status: { notIn: ['DELIVERED', 'CANCELLED'] },
        },
      }).then(async (openShips) => {
        const asn = await prisma.inboundAsn.count({
          where: {
            companyId: cid,
            status: { in: ['EXPECTED', 'PARTIALLY_RECEIVED'] },
          },
        });
        const rma = await prisma.rmaHeader.count({
          where: {
            companyId: cid,
            status: { notIn: ['CLOSED', 'CANCELLED'] },
          },
        });
        return { openShips, asn, rma };
      }),
    ]);

    const soLines = soRows
      .map(
        (r) =>
          `- SO ${r.soNumber} | ${r.customer.code} ${r.customer.name} | ${r.status} | ${r.currency} ${dec(r.total as never)} | date ${r.orderDate.toISOString().slice(0, 10)}`
      )
      .join('\n');

    const poLines = poRows
      .map(
        (r) =>
          `- PO ${r.poNumber} | ${r.vendor.code} ${r.vendor.name} | ${r.status} | ${r.currency} ${dec(r.total as never)}`
      )
      .join('\n');

    const shipLines = shipRows
      .map((s) => {
        const tr = s.trackingNumber ? ` tracking=${s.trackingNumber}` : '';
        const bol = s.masterBolNumber ? ` bol=${s.masterBolNumber}` : '';
        return `- ${s.shipmentNumber} | ${s.status} | ${s.customer.code}${tr}${bol} | carrier ${s.carrier?.name ?? '—'}`;
      })
      .join('\n');

    const poStat = poCounts.map((x) => `${x.status}:${x._count.id}`).join(', ');
    const soStat = soCounts.map((x) => `${x.status}:${x._count.id}`).join(', ');

    return `
Company: ${company.name} (${company.currency})

Sales order status counts: ${soStat || 'none'}
Purchase order status counts: ${poStat || 'none'}
Logistics summary: open shipments (not delivered/cancelled)=${logisticsSummary.openShips}, inbound ASNs in flight=${logisticsSummary.asn}, open RMAs=${logisticsSummary.rma}

Recent sales orders (newest 10):
${soLines || '(none)'}

Recent purchase orders (newest 8):
${poLines || '(none)'}

Recent shipments (newest 8):
${shipLines || '(none)'}
`.trim();
  } catch (e) {
    console.error('buildErpSnapshot', e);
    return '[Snapshot error — answer with general guidance and suggest checking ERP screens.]';
  }
}

export async function chatWithErpAssistant(userMessage: string): Promise<{
  response: string;
  model?: string;
  tokens?: number;
  latency: number;
}> {
  const start = Date.now();
  const company = await getOrCreateDefaultCompany();
  const snapshot = await buildErpSnapshot();
  const memorySection = await formatRecentAiMemoriesForPrompt(
    company.id,
    'ERP_ASSISTANT',
    company.aiRetainSessionMemory
  );

  const baseSystem = `${ERP_SYSTEM_PROMPT}\n\n${snapshot}${memorySection ? `\n\n${memorySection}` : ''}`;

  if (isDemoMode) {
    await new Promise((r) => setTimeout(r, 600));
    const idx = Math.floor(Math.random() * DEMO_ERP_RESPONSES.length);
    return {
      response: `${DEMO_ERP_RESPONSES[idx]}\n\n---\n_Snapshot hint:_ ${snapshot.slice(0, 400)}${snapshot.length > 400 ? '…' : ''}`,
      model: 'demo',
      latency: Date.now() - start,
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: baseSystem },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1200,
      temperature: 0.45,
    });

    const response =
      completion.choices[0]?.message?.content ||
      'I could not generate a response. Please try again.';

    await recordAiTenantMemoryIfEnabled(
      company.id,
      'ERP_ASSISTANT',
      userMessage,
      response,
      Boolean(company.aiRetainSessionMemory)
    );

    return {
      response,
      model: 'gpt-4o',
      tokens: completion.usage?.total_tokens,
      latency: Date.now() - start,
    };
  } catch (e) {
    console.error('ERP Assistant OpenAI error:', e);
    return {
      response:
        'Something went wrong contacting the AI service. Please retry, or use the ERP forms directly from the hub.',
      latency: Date.now() - start,
    };
  }
}

export async function handleErpAssistantRequest(req: Request, res: Response): Promise<void> {
  try {
    if (await isManualOperationsModeActive()) {
      res.status(403).json({
        error:
          'ERP Assistant is turned off while manual operations mode is enabled. Leadership can change this under Settings → Manual operations.',
        code: 'MANUAL_OPERATIONS_MODE',
      });
      return;
    }

    const { message } = req.body as { message?: string };
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const result = await chatWithErpAssistant(message.trim());
    res.json({ success: true, ...result });
  } catch (e) {
    console.error('ERP Assistant handler:', e);
    res.status(500).json({
      error: 'Failed to process ERP assistant request',
      message: e instanceof Error ? e.message : 'Unknown error',
    });
  }
}
