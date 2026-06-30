import { Router } from 'express';
import { requireDatabase } from '../lib/requireDatabase';
import { resolveCompanyFromRequest } from '../lib/resolveCompany';
import { resolveBrandKit } from '../services/documents/brandKit';
import { buildComposedMailDocx } from '../services/documents/composeMailDocx';

const router = Router();

/** Company brand kit for in-app mail + reports (logo, letterhead fields). */
router.get('/brand', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await resolveCompanyFromRequest(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }
    const brand = await resolveBrandKit(company.id);
    res.json({ brand });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Could not load brand kit' });
  }
});

/** Branded business letter → native .docx (Word-compatible; no Word required to start). */
router.post('/mail/docx', async (req, res) => {
  if (!requireDatabase(res)) return;

  const body = req.body as {
    subject?: string;
    recipientName?: string;
    recipientEmail?: string;
    body?: string;
  };

  if (!body.subject?.trim() || !body.recipientName?.trim() || !body.body?.trim()) {
    res.status(400).json({ error: 'subject, recipientName, and body are required' });
    return;
  }

  try {
    const company = await resolveCompanyFromRequest(req);
    if (!company) {
      res.status(503).json({ error: 'Company unavailable' });
      return;
    }
    const brand = await resolveBrandKit(company.id);
    const buffer = await buildComposedMailDocx({
      brand,
      subject: body.subject.trim(),
      recipientName: body.recipientName.trim(),
      recipientEmail: body.recipientEmail?.trim(),
      body: body.body.trim(),
    });

    const slug = body.subject.trim().slice(0, 40).replace(/[^a-zA-Z0-9-_]+/g, '-');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="bog-letter-${slug || 'draft'}.docx"`);
    res.send(buffer);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not generate letter' });
  }
});

export { router as documentsRouter };
