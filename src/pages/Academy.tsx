/**
 * Pi Academy — a separate-identity practice room for accountants. Learners pick
 * the competencies they want (AR, AP, GL…) à la carte, practice them hands-on in
 * the BOG app, and track per-module mastery. Going all the way to CPA readiness is
 * optional. Freemium: the free tier gives just enough to register and feel one real
 * win; the paid membership unlocks the full certification practice. Build sequenced
 * in docs/CPA_ACADEMY_ROADMAP.md.
 */
import { ListChecks, FlaskConical, Sparkles, Trophy, Compass, Check, Lock, ArrowRight } from 'lucide-react';
import { ModuleWorkspace } from '@/components/layout/ModuleWorkspace';
import { PiAcademyMarkGlow, ACADEMY_AMBER } from '@/components/PiAcademyLogo';

const AMBER = ACADEMY_AMBER;
const AMBER_SOFT = 'hsl(38 90% 48% / 0.10)';
const AMBER_MUTED = 'hsl(38 70% 95%)';

const TRACKS = [
  {
    icon: ListChecks,
    title: 'Pick your modules',
    body: 'Choose exactly what you want to develop — just Accounts Receivable, just Accounts Payable, the general ledger, bank rec, payroll, and more. Take one or take them all; the path is yours.',
  },
  {
    icon: FlaskConical,
    title: 'Practice room',
    body: 'Every skill is drilled hands-on inside the BOG accounting workspace — real-style ledgers, real tasks — with instant feedback, not just multiple-choice quizzes.',
  },
  {
    icon: Trophy,
    title: 'Mastery per module',
    body: 'Each module has its own mastery meter and proficiency badge. Finishing one module is a complete, satisfying win — you never have to do the rest to feel progress.',
  },
  {
    icon: Compass,
    title: 'CPA readiness (optional)',
    body: 'Want the full path? An opt-in readiness view aggregates your modules into the CPA Evolution sections (AUD, FAR, REG + a discipline). It guides, never gates.',
  },
];

const FREE_PERKS = [
  'Create your Pi Academy account in seconds',
  'One guided Accounts Receivable taster — a real, complete lesson',
  'A single hands-on rep inside the live practice room',
  'See your first mastery meter move and earn a starter mark',
];

const MEMBER_PERKS = [
  'Every à-la-carte module — AR, AP, GL, bank rec, payroll, fixed assets & more',
  'Unlimited hands-on practice in the BOG workspace with instant feedback',
  'Full mastery meters, proficiency badges & stackable micro-certificates',
  'Opt-in CPA-readiness tracking across AUD · FAR · REG + a discipline',
  'New modules and practice sets as they ship — yours as you grow',
];

export function Academy() {
  return (
    <ModuleWorkspace
      label="Academy"
      title="Pi Academy"
      description="Its own place to learn the discipline behind the ledger. Enroll free, pick the competencies you care about, and build real, certifiable skill hands-on — at your own pace, your own path."
      actions={
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: AMBER }}
        >
          <Sparkles size={14} /> Coming soon
        </span>
      }
    >
      <div className="mx-auto max-w-4xl">
        {/* Hero — Pi Academy's own mark + identity */}
        <div
          className="bog-statement-card overflow-hidden p-6 lg:p-8"
          style={{ borderColor: 'hsl(38 30% 88%)' }}
        >
          <div className="flex items-start gap-5">
            <PiAcademyMarkGlow size={56} />
            <div>
              <h2 className="text-lg font-semibold text-bog-ink">
                Your own practice room — learn by doing
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                Pi Academy is a place of its own, a sibling of the BOG ledger you already trust. Choose the
                accounting competencies you want to grow, practice them hands-on in the real workspace, and watch
                your mastery climb — one module at a time. Some learners go all the way to CPA readiness; many just
                sharpen a single skill. Both are first-class here.
              </p>
            </div>
          </div>

          <div
            className="my-6 h-px w-full"
            style={{ background: `linear-gradient(90deg, transparent, ${AMBER}, transparent)` }}
            aria-hidden
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {TRACKS.map((t) => (
              <div
                key={t.title}
                className="rounded-xl border bg-white p-4"
                style={{ borderColor: 'hsl(38 30% 90%)' }}
              >
                <div className="flex items-center gap-2">
                  <t.icon size={18} style={{ color: AMBER }} />
                  <h3 className="text-sm font-semibold text-bog-ink">{t.title}</h3>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{t.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Freemium — free hooks, membership transforms */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-bog-rule bg-white p-6">
            <div className="flex items-center justify-between">
              <span className="bog-section-label text-zinc-500">Free</span>
              <span className="text-sm font-semibold text-bog-ink">Get in, get a win</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              Just enough to register and feel one genuine moment of progress — no card required. It’s a real
              taste of the practice room, designed to show you exactly what mastery feels like.
            </p>
            <ul className="mt-4 space-y-2">
              {FREE_PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-zinc-700">
                  <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-bog-rule px-4 py-2.5 text-sm font-medium text-bog-ink transition-colors hover:bg-zinc-50"
            >
              Start free
            </button>
          </div>

          {/* Membership */}
          <div
            className="relative overflow-hidden rounded-2xl border p-6"
            style={{
              borderColor: AMBER,
              background: `linear-gradient(180deg, ${AMBER_MUTED}, #ffffff 60%)`,
              boxShadow: `0 1px 0 ${AMBER}22, 0 18px 40px -24px ${AMBER}99`,
            }}
          >
            <span
              className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
              style={{ backgroundColor: AMBER }}
            >
              <Sparkles size={12} /> Certification
            </span>
            <div className="flex items-center gap-2">
              <span className="bog-section-label" style={{ color: AMBER }}>
                Pi Academy Membership
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-bog-ink">
              Where a taste becomes a credential.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600">
              Unlock every module, unlimited hands-on practice, and the badges and CPA-readiness tracking that turn
              your effort into something you can show an employer.
            </p>
            <ul className="mt-4 space-y-2">
              {MEMBER_PERKS.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm text-zinc-800">
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ backgroundColor: AMBER }}
                  >
                    <Check size={11} />
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.01]"
              style={{ backgroundColor: AMBER }}
            >
              Become a member <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Honest gate note + disclaimer */}
        <div
          className="mt-4 flex items-start gap-2 rounded-xl border p-4"
          style={{ borderColor: 'hsl(38 30% 90%)', backgroundColor: AMBER_SOFT }}
        >
          <Lock size={15} className="mt-0.5 shrink-0" style={{ color: AMBER }} />
          <p className="text-xs leading-relaxed text-zinc-600">
            The free taster is intentionally small — one complete lesson and one real practice rep — so you can feel
            the quality before you commit. Depth and breadth (every module, unlimited practice, badges, and
            readiness tracking) live in the membership. Pricing shown at enrollment; modules roll out in phases.
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Content is reviewed for accuracy before release — Pi Academy is a practice &amp; study aid, not a guarantee
          of passing the CPA exam, and is not affiliated with AICPA/NASBA.
        </p>
      </div>
    </ModuleWorkspace>
  );
}
