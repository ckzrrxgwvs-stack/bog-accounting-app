import type { AiMemoryChannel } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { databaseConfigured } from '../lib/dbMode';

/** Total excerpts retained per company (both CPA + ERP channels); oldest deleted after inserts exceed cap. */
const MAX_AI_MEMORIES_PER_COMPANY = 380;

function sanitizeExcerpt(text: string, maxChars: number): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= maxChars) return collapsed;
  return `${collapsed.slice(0, maxChars - 1)}…`;
}

/**
 * Recent opted-in excerpts for prompt augmentation (retrieval-style memory — not model fine-tuning).
 */
export async function formatRecentAiMemoriesForPrompt(
  companyId: string,
  channel: AiMemoryChannel,
  memoryEnabled: boolean
): Promise<string> {
  if (!memoryEnabled || !databaseConfigured()) return '';

  const rows = await prisma.aiTenantMemory.findMany({
    where: { companyId, channel },
    orderBy: { createdAt: 'desc' },
    take: 12,
  });

  if (rows.length === 0) return '';

  const chronological = [...rows].reverse();
  const blocks = chronological.map((r, i) => {
    const pe = r.promptExcerpt.length > 320 ? `${r.promptExcerpt.slice(0, 319)}…` : r.promptExcerpt;
    const re = r.responseExcerpt.length > 420 ? `${r.responseExcerpt.slice(0, 419)}…` : r.responseExcerpt;
    return `[${i + 1}] Earlier question (excerpt): ${pe}\nEarlier assistant answer (excerpt): ${re}`;
  });

  return [
    '### Organization memory (executive opt-in)',
    'Short excerpts from prior assistant conversations **for this company only**. Use them to stay consistent with past explanations — do not treat them as authoritative ledger facts.',
    ...blocks,
  ].join('\n');
}

/**
 * Persist turn excerpts when `Company.aiRetainSessionMemory` is true.
 */
export async function recordAiTenantMemoryIfEnabled(
  companyId: string,
  channel: AiMemoryChannel,
  userPrompt: string,
  assistantReply: string,
  enabled: boolean
): Promise<void> {
  if (!enabled || !databaseConfigured()) return;

  const promptExcerpt = sanitizeExcerpt(userPrompt, 1900);
  const responseExcerpt = sanitizeExcerpt(assistantReply, 3400);
  if (!promptExcerpt || !responseExcerpt) return;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.aiTenantMemory.create({
        data: {
          companyId,
          channel,
          promptExcerpt,
          responseExcerpt,
        },
      });

      const total = await tx.aiTenantMemory.count({ where: { companyId } });
      const overflow = total - MAX_AI_MEMORIES_PER_COMPANY;
      if (overflow <= 0) return;

      const victims = await tx.aiTenantMemory.findMany({
        where: { companyId },
        orderBy: { createdAt: 'asc' },
        take: overflow,
        select: { id: true },
      });
      if (victims.length === 0) return;
      await tx.aiTenantMemory.deleteMany({
        where: { id: { in: victims.map((v) => v.id) } },
      });
    });
  } catch (e) {
    console.error('AiTenantMemory record failed:', e);
  }
}
