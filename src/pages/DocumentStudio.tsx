import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Printer, Download, FileSpreadsheet, Copy, Check } from 'lucide-react';
import { ModuleWorkspace } from '@/components/layout/ModuleWorkspace';
import { BrandLetterhead, type BrandKitView } from '@/components/documents/BrandLetterhead';
import { api } from '@/services/api';
import {
  MAIL_TEMPLATES,
  applyMailTokens,
  type MailTemplateId,
} from '@/lib/documentTemplates';

const controlClass =
  'w-full rounded-lg border border-bog-rule bg-white px-3 py-2 text-sm text-bog-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--bog-accent))]/25';

export function DocumentStudio() {
  const [brand, setBrand] = useState<BrandKitView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<MailTemplateId>('client_update');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      const res = await api.getDocumentBrand();
      if (!res.success || !res.data) {
        setLoadError(res.error ?? 'Could not load company brand');
        return;
      }
      setBrand((res.data as { brand: BrandKitView }).brand);
    })();
  }, []);

  const periodLabel = useMemo(
    () => new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    [month, year]
  );

  const applyTemplate = (id: MailTemplateId) => {
    setTemplateId(id);
    const t = MAIL_TEMPLATES.find((x) => x.id === id);
    if (!t || !brand) return;
    const vars = { recipientName: recipientName || 'Valued Client', companyName: brand.companyName, period: periodLabel };
    setSubject(applyMailTokens(t.defaultSubject, vars));
    setBody(applyMailTokens(t.body, vars));
  };

  useEffect(() => {
    if (brand) applyTemplate(templateId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fill when period/brand loads
  }, [brand, periodLabel]);

  const refreshTokens = () => {
    if (!brand) return;
    const vars = { recipientName: recipientName || 'Valued Client', companyName: brand.companyName, period: periodLabel };
    setSubject((s) => applyMailTokens(s, vars));
    setBody((b) => applyMailTokens(b, vars));
  };

  const printLetter = () => {
    window.print();
  };

  const downloadDocx = async () => {
    if (!recipientName.trim() || !subject.trim() || !body.trim()) {
      alert('Recipient name, subject, and body are required.');
      return;
    }
    setBusy('docx');
    try {
      await api.downloadComposedMailDocx({
        subject,
        recipientName,
        recipientEmail: recipientEmail || undefined,
        body,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Download failed');
    }
    setBusy(null);
  };

  const copyPlainText = async () => {
    const plain = `${subject}\n\n${body}`;
    await navigator.clipboard.writeText(plain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModuleWorkspace
      label="Productivity"
      title="Document Studio"
      description="Compose branded business mail and print professional reports inside BOG — your logo and letterhead, not just Word or Excel exports."
      actions={
        <Link
          to="/office"
          className="inline-flex items-center rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium text-bog-ink shadow-sm hover:bg-bog-sheet"
        >
          <FileSpreadsheet size={16} className="mr-2" />
          Office hub (.xlsx / .docx)
        </Link>
      }
    >
      {loadError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
        </div>
      )}

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="bog-statement-card space-y-4 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-bog-ink">
            <Mail size={20} className="text-[hsl(var(--bog-accent))]" />
            Compose mail
          </h2>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Template</label>
            <select
              className={controlClass}
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value as MailTemplateId)}
            >
              {MAIL_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              {MAIL_TEMPLATES.find((t) => t.id === templateId)?.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Period month</label>
              <input
                type="number"
                min={1}
                max={12}
                className={controlClass}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Year</label>
              <input type="number" className={controlClass} value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Recipient name</label>
            <input
              className={controlClass}
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              onBlur={refreshTokens}
              placeholder="Jane Client"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Recipient email (optional)</label>
            <input
              type="email"
              className={controlClass}
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="client@company.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Subject</label>
            <input className={controlClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Body</label>
            <textarea
              className={`${controlClass} min-h-[220px] font-serif leading-relaxed`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void downloadDocx()}
              disabled={!!busy}
              className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              <Download size={16} className="mr-2" />
              {busy === 'docx' ? 'Generating…' : 'Download .docx'}
            </button>
            <button
              type="button"
              onClick={printLetter}
              className="inline-flex items-center rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium hover:bg-bog-sheet"
            >
              <Printer size={16} className="mr-2" />
              Print / PDF
            </button>
            <button
              type="button"
              onClick={() => void copyPlainText()}
              className="inline-flex items-center rounded-lg border border-bog-rule bg-white px-4 py-2 text-sm font-medium hover:bg-bog-sheet"
            >
              {copied ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
              {copied ? 'Copied' : 'Copy text'}
            </button>
          </div>
        </section>

        <section className="bog-statement-card p-6">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Live preview</p>
          <div ref={printRef} id="bog-mail-print-root" className="bog-print-document rounded-lg border border-bog-rule bg-white p-8 shadow-inner">
            {brand ? (
              <>
                <BrandLetterhead brand={brand} />
                <div className="mt-6 space-y-4 font-serif text-[15px] leading-relaxed text-bog-ink">
                  <p className="text-sm text-zinc-500">
                    {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
                  </p>
                  {recipientEmail && <p className="text-sm text-zinc-600">{recipientEmail}</p>}
                  <p className="font-semibold">Re: {subject || '(subject)'}</p>
                  <div className="whitespace-pre-wrap">{body || 'Letter body…'}</div>
                  <div className="pt-6">
                    <p>Sincerely,</p>
                    <p className="mt-4 font-semibold">{brand.companyName}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-zinc-500">Loading brand…</p>
            )}
          </div>
        </section>
      </div>

      <section className="bog-statement-card p-6">
        <h2 className="mb-2 text-lg font-semibold text-bog-ink">Professional reports</h2>
        <p className="mb-4 text-sm text-zinc-600">
          Generate live financial reports with your company letterhead, then print or save as PDF — sharper than raw
          spreadsheet exports for board packs and client delivery.
        </p>
        <Link
          to="/reports"
          className="inline-flex items-center rounded-lg bg-bog-ink px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Open branded reports
        </Link>
      </section>
    </ModuleWorkspace>
  );
}
