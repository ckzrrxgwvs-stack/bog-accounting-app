export type MailTemplateId =
  | 'client_update'
  | 'invoice_cover'
  | 'collection_notice'
  | 'quarterly_summary'
  | 'blank';

export type MailTemplate = {
  id: MailTemplateId;
  label: string;
  description: string;
  defaultSubject: string;
  body: string;
};

export const MAIL_TEMPLATES: MailTemplate[] = [
  {
    id: 'client_update',
    label: 'Client update',
    description: 'Professional period-end update to stakeholders',
    defaultSubject: 'Accounting update — {{period}}',
    body: `Dear {{recipientName}},

We are pleased to share an update on your books for {{period}}.

Your general ledger is current through the latest closed activity. Attached summaries reflect posted journal entries only — draft items remain under review until approved.

Please contact us if you need detail on any balance or transaction class before your next meeting.

Thank you for your continued trust.`,
  },
  {
    id: 'invoice_cover',
    label: 'Invoice transmittal',
    description: 'Cover letter for billing packages',
    defaultSubject: 'Invoice package — {{period}}',
    body: `Dear {{recipientName}},

Enclosed please find invoices issued for {{period}}. Amounts are stated in functional currency unless noted otherwise.

Payment terms appear on each invoice. Notify us within ten (10) business days if any item requires correction.

We appreciate your prompt attention.`,
  },
  {
    id: 'collection_notice',
    label: 'Collection notice',
    description: 'Courteous past-due reminder',
    defaultSubject: 'Past due balance reminder',
    body: `Dear {{recipientName}},

Our records indicate an outstanding balance on your account. We would appreciate your attention at your earliest convenience.

If payment has already been sent, please disregard this notice and accept our thanks. For questions, reply to this letter or contact our office directly.`,
  },
  {
    id: 'quarterly_summary',
    label: 'Quarterly summary',
    description: 'Executive summary cover note',
    defaultSubject: 'Quarterly financial summary — {{period}}',
    body: `Dear {{recipientName}},

Attached is your quarterly financial summary prepared from posted ledger activity. Figures are unaudited and intended for management review.

We recommend reviewing the income statement and balance sheet together with the trial balance for the same period.

We remain available to walk through any line item.`,
  },
  {
    id: 'blank',
    label: 'Blank letter',
    description: 'Start from a clean professional layout',
    defaultSubject: '',
    body: `Dear {{recipientName}},



`,
  },
];

export function applyMailTokens(
  text: string,
  vars: { recipientName: string; companyName: string; period: string }
): string {
  return text
    .replace(/\{\{recipientName\}\}/g, vars.recipientName)
    .replace(/\{\{companyName\}\}/g, vars.companyName)
    .replace(/\{\{period\}\}/g, vars.period);
}
