/**
 * CPA Academy — AI-guided training path that prepares accountants toward CPA
 * certification, built on the same AI engine that powers the AI CPA Assistant.
 * Placeholder surface: vision + planned tracks. Build sequenced in
 * docs/CPA_ACADEMY_ROADMAP.md (later phase).
 */
import { GraduationCap, BookOpenCheck, Brain, ClipboardCheck, Trophy, Sparkles } from 'lucide-react';
import { ModuleWorkspace } from '@/components/layout/ModuleWorkspace';

const TRACKS = [
  {
    icon: BookOpenCheck,
    title: 'Foundations',
    body: 'GAAP & IFRS fundamentals, the accounting cycle, and double-entry mastery — taught with worked examples drawn from your own ledger.',
  },
  {
    icon: Brain,
    title: 'AI-tutored lessons',
    body: 'The same engine behind the AI CPA Assistant explains concepts, answers questions, and adapts the next lesson to where you struggle.',
  },
  {
    icon: ClipboardCheck,
    title: 'Exam-style practice',
    body: 'Multiple-choice and task-based simulations modeled on the four CPA sections (AUD, FAR, REG, and a discipline), with instant feedback.',
  },
  {
    icon: Trophy,
    title: 'Progress & readiness',
    body: 'Track mastery per topic, simulate a score, and get a personalized study plan that points to your weakest areas before test day.',
  },
];

export function Academy() {
  return (
    <ModuleWorkspace
      label="Intelligence"
      title="CPA Academy"
      description="An AI-guided learning path that trains accountants toward CPA certification — powered by the same intelligence that runs BOG's AI CPA Assistant."
      actions={
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: 'var(--bog-neon)' }}
        >
          <Sparkles size={14} /> Coming soon
        </span>
      }
    >
      <div className="mx-auto max-w-4xl">
        <div className="bog-statement-card p-6 lg:p-8">
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ backgroundColor: 'var(--bog-neon)' }}
            >
              <GraduationCap size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-bog-ink">From bookkeeper to CPA — inside BOG</h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                We're building a structured certification academy that turns BOG's AI into a personal CPA tutor.
                Learn the material, practice with exam-style simulations, and track your readiness — without leaving
                your accounting workspace. This page previews the plan; lessons roll out in phases.
              </p>
            </div>
          </div>

          <div className="bog-neon-rule my-6" aria-hidden />

          <div className="grid gap-4 sm:grid-cols-2">
            {TRACKS.map((t) => (
              <div key={t.title} className="rounded-xl border border-bog-rule bg-white p-4">
                <div className="flex items-center gap-2">
                  <t.icon size={18} style={{ color: 'var(--bog-neon)' }} />
                  <h3 className="text-sm font-semibold text-bog-ink">{t.title}</h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{t.body}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-zinc-500">
            Want early access or to shape the curriculum? Share input in <strong>Product intelligence</strong>.
            Certification content will be reviewed for accuracy before release — BOG Academy is a study aid, not a
            guarantee of passing the CPA exam.
          </p>
        </div>
      </div>
    </ModuleWorkspace>
  );
}
