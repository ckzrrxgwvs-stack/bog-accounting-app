import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
} from 'docx';
import type { BrandKit } from './brandKit';

function headerBlock(brand: BrandKit): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 80 },
      children: [
        new TextRun({ text: brand.companyName, bold: true, size: 32, color: '18181B' }),
      ],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [new TextRun({ text: brand.legalName, size: 20, color: '52525B' })],
    }),
    new Paragraph({
      spacing: { after: 120 },
      border: { bottom: { color: '0891B2', space: 1, style: BorderStyle.SINGLE, size: 12 } },
      children: [new TextRun({ text: brand.tagline, italics: true, size: 18, color: '71717A' })],
    }),
  ];
}

function bodyParagraphs(body: string): Paragraph[] {
  return body
    .split(/\n{2,}|\r\n\r\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        new Paragraph({
          spacing: { after: 200, line: 276 },
          children: [new TextRun({ text: block, size: 22 })],
        })
    );
}

export async function buildComposedMailDocx(input: {
  brand: BrandKit;
  subject: string;
  recipientName: string;
  recipientEmail?: string;
  body: string;
  dateLabel?: string;
}): Promise<Buffer> {
  const dateLabel = input.dateLabel ?? new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
  const contactLine = [input.brand.phone, input.brand.email].filter(Boolean).join(' · ');

  const children: Paragraph[] = [
    ...headerBlock(input.brand),
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: dateLabel, size: 20, color: '71717A' })],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: 'To: ', bold: true, size: 22 }),
        new TextRun({ text: input.recipientName, size: 22 }),
      ],
    }),
  ];

  if (input.recipientEmail?.trim()) {
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: input.recipientEmail.trim(), size: 20, color: '52525B' })],
      })
    );
  }

  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: `Re: ${input.subject}`, bold: true, size: 24 })],
    }),
    ...bodyParagraphs(input.body),
    new Paragraph({
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: 'Sincerely,', size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: input.brand.companyName, bold: true, size: 22 })],
    })
  );

  if (contactLine) {
    children.push(
      new Paragraph({
        spacing: { before: 80 },
        children: [new TextRun({ text: contactLine, size: 18, color: '71717A' })],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: input.brand.preparerLine, size: 16, color: 'A1A1AA' }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${input.brand.companyName} · Confidential`,
                    size: 16,
                    color: 'A1A1AA',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
