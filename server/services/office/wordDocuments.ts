import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from 'docx';

export type WordTemplateId =
  | 'engagement_letter'
  | 'financial_statement_cover'
  | 'management_representation'
  | 'invoice_transmittal';

export const WORD_TEMPLATES: { id: WordTemplateId; label: string; description: string }[] = [
  {
    id: 'engagement_letter',
    label: 'Engagement letter',
    description: 'CPA / bookkeeping engagement scope letter (.docx)',
  },
  {
    id: 'financial_statement_cover',
    label: 'Financial statement cover',
    description: 'Cover page for compiled or reviewed statements',
  },
  {
    id: 'management_representation',
    label: 'Management representation',
    description: 'Standard management representation letter outline',
  },
  {
    id: 'invoice_transmittal',
    label: 'Invoice transmittal',
    description: 'Transmittal memo for billing packages',
  },
];

type Vars = Record<string, string>;

function p(text: string, opts?: { bold?: boolean; heading?: typeof HeadingLevel.HEADING_1 }) {
  return new Paragraph({
    heading: opts?.heading,
    children: [new TextRun({ text, bold: opts?.bold })],
    spacing: { after: 200 },
  });
}

export async function buildWordDocument(templateId: WordTemplateId, vars: Vars): Promise<Buffer> {
  const company = vars.companyName ?? 'Client Company';
  const period = vars.period ?? new Date().getFullYear().toString();
  const preparer = vars.preparerName ?? 'BOG Accounting';

  let children: Paragraph[] | (Paragraph | Table)[];

  switch (templateId) {
    case 'engagement_letter':
      children = [
        p('ENGAGEMENT LETTER', { bold: true, heading: HeadingLevel.HEADING_1 }),
        p(`Date: ${vars.date ?? new Date().toLocaleDateString('en-US')}`),
        p(`To: ${company}`),
        p(
          `This letter confirms the terms of our engagement to provide accounting and bookkeeping services for the period ${period}. Services include maintenance of the general ledger, bank reconciliations, and preparation of financial reports derived from posted journal entries.`
        ),
        p(
          'Responsibilities: Management is responsible for the accuracy and completeness of underlying records and for all management decisions. We will perform services in accordance with applicable professional standards and your authorized instructions.',
          { bold: false }
        ),
        p(`Prepared by: ${preparer}`),
        p('Accepted by: _____________________________    Date: ______________'),
      ];
      break;

    case 'financial_statement_cover':
      children = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 2400, after: 400 },
          children: [new TextRun({ text: company, bold: true, size: 36 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
          children: [new TextRun({ text: 'Financial Statements', size: 28 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `For the period ending ${period}`, size: 24 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 1200 },
          children: [new TextRun({ text: `Prepared by ${preparer}`, italics: true })],
        }),
      ];
      break;

    case 'management_representation':
      children = [
        p('MANAGEMENT REPRESENTATION LETTER', { bold: true, heading: HeadingLevel.HEADING_1 }),
        p(`To: ${preparer}`),
        p(
          `In connection with the preparation of financial statements for ${company} for ${period}, we confirm that we have fulfilled our responsibilities for the preparation and fair presentation of the financial statements in accordance with the applicable financial reporting framework.`
        ),
        p(
          'We acknowledge our responsibility for the design, implementation, and maintenance of internal control relevant to the preparation of financial statements that are free from material misstatement, whether due to fraud or error.'
        ),
        p('Signed: _____________________________    Title: _____________________________'),
        p('Date: _____________________________'),
      ];
      break;

    case 'invoice_transmittal':
      children = [
        p('INVOICE TRANSMITTAL', { bold: true, heading: HeadingLevel.HEADING_1 }),
        p(`Company: ${company}`),
        p(`Period: ${period}`),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ['Invoice #', 'Customer', 'Amount', 'Due Date'].map(
                (h) =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
                  })
              ),
            }),
            new TableRow({
              children: ['(export AR)', '(from BOG)', '(USD)', '(as posted)'].map(
                (t) => new TableCell({ children: [new Paragraph(t)] })
              ),
            }),
          ],
        }),
        p('Please remit payment per terms on each invoice. Contact us with any discrepancies within 10 business days.'),
      ];
      break;

    default:
      children = [p('Unknown template')];
  }

  const doc = new Document({
    sections: [{ properties: {}, children: children as Paragraph[] }],
  });

  return Packer.toBuffer(doc);
}
