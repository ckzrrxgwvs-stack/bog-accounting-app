/**
 * Issue a private family & friends preview link (CLI).
 *
 * Usage:
 *   pnpm run issue:family-preview
 *   pnpm run issue:family-preview -- --days 15 --desktop
 *   AGENT_ORG_CRON_SECRET=... pnpm run issue:family-preview -- --via-api --desktop
 */
import { config } from 'dotenv';
import { applyDatabaseUrlEnv } from '../lib/databaseUrl';
import { issueTesterInviteLink, buildTesterInviteUrl } from '../services/testerInviteService';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

config({ override: false });

function parseArgs(argv: string[]) {
  let label: string | undefined;
  let days: number | undefined;
  let desktop = false;
  let viaApi = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--label' && argv[i + 1]) label = argv[++i];
    else if ((a === '--days' || a === '--trial-days') && argv[i + 1]) days = Number(argv[++i]);
    else if (a === '--desktop') desktop = true;
    else if (a === '--via-api') viaApi = true;
  }
  return { label, days, desktop, viaApi };
}

async function issueViaApi(input: { label?: string; trialDays?: number }) {
  const apiBase = (process.env.BOG_API_URL ?? 'https://bog-accounting-api.onrender.com/api').replace(/\/$/, '');
  const testerSecret = process.env.TESTER_INVITE_ISSUER_SECRET?.trim();
  const cronSecret = process.env.AGENT_ORG_CRON_SECRET?.trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (testerSecret) headers['x-tester-invite-secret'] = testerSecret;
  else if (cronSecret) headers['x-agent-org-secret'] = cronSecret;
  else {
    throw new Error(
      'Set AGENT_ORG_CRON_SECRET or TESTER_INVITE_ISSUER_SECRET (from Render → bog-accounting-api → Environment)'
    );
  }

  const res = await fetch(`${apiBase}/tester-invites/issue`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      label: input.label ?? 'Family & close friends — program input',
      trialDays: input.trialDays,
    }),
  });
  const body = (await res.json()) as { inviteUrl?: string; trialDays?: number; error?: string };
  if (!res.ok) throw new Error(body.error ?? `API issue failed (${res.status})`);
  if (!body.inviteUrl) throw new Error('API did not return inviteUrl');
  return { inviteUrl: body.inviteUrl, trialDays: body.trialDays ?? input.trialDays ?? 15 };
}

async function main() {
  const { label, days, desktop, viaApi } = parseArgs(process.argv.slice(2));

  const out = viaApi
    ? await issueViaApi({ label: label ?? 'Family & close friends — program input', trialDays: days })
    : await (() => {
        applyDatabaseUrlEnv();
        return issueTesterInviteLink({
          label: label ?? 'Family & close friends — program input',
          trialDays: days,
          issuedById: null,
        });
      })();

  console.log('\n✓ Family & friends preview link created\n');
  console.log(`  Preview: ${out.trialDays} days from each guest's first login`);
  console.log(`  Share URL:\n  ${out.inviteUrl}\n`);

  if (desktop) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const script = path.join(root, 'scripts/create-family-preview-launcher.sh');
    execSync(`BOG_APP_URL="${out.inviteUrl}" bash "${script}"`, { stdio: 'inherit' });
  }

  void buildTesterInviteUrl;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
