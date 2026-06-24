/**
 * Draft feature specs for developers — advisory only; human review required before shipping.
 */
import OpenAI from 'openai';

export async function draftProductSpecMarkdown(topic: string, extraContext?: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  const ctx = (extraContext ?? '').trim().slice(0, 4000);

  if (!key) {
    return [
      '# Product spec draft (offline)',
      '',
      `**Topic:** ${topic}`,
      '',
      'Configure `OPENAI_API_KEY` on the API server to generate AI-assisted drafts.',
      '',
      '### Skeleton (fill manually)',
      '- Problem / hypothesis',
      '- Personas (controller, AP clerk, CFO …)',
      '- UX / modules touched',
      '- Acceptance criteria',
      '- Compliance & data risks (US/MX/North America)',
      '- Open engineering questions',
    ].join('\n');
  }

  const openai = new OpenAI({ apiKey: key });
  const completion = await openai.chat.completions.create({
    model: process.env.PRODUCT_SPEC_MODEL ?? 'gpt-4o-mini',
    temperature: 0.4,
    max_tokens: 1400,
    messages: [
      {
        role: 'system',
        content:
          'You help software developers prioritize accounting/ERP features for North American SMEs. Produce concise markdown: sections Problem hypothesis, Target personas, Proposed UX/modules (Face I accounting vs Face II ERP when relevant), Acceptance criteria (testable), Compliance & audit cautions (general, not legal advice), Risks/unknowns, Suggested next engineering ticket title. No promises of regulatory approval.',
      },
      {
        role: 'user',
        content: `Topic:\n${topic}\n\nAdditional context from user:\n${ctx || '(none)'}`,
      },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? '# (empty response)';
}
