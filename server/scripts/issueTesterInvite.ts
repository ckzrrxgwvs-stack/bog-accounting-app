/**
 * Issue a shareable beta-tester invite link (CLI).
 *
 * Usage:
 *   pnpm run issue:tester-invite
 *   pnpm run issue:tester-invite -- --label "Design partners" --days 15
 *   BOG_APP_URL=https://bog-accounting-v5.vercel.app pnpm run issue:tester-invite -- --desktop
 */
import { config } from 'dotenv';
import { applyDatabaseUrlEnv } from '../lib/databaseUrl';
import { issueTesterInviteLink, buildTesterInviteUrl } from '../services/testerInviteService';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

config({ override: true });
applyDatabaseUrlEnv();

function parseArgs(argv: string[]) {
  let label: string | undefined;
  let days: number | undefined;
  let desktop = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--label' && argv[i + 1]) label = argv[++i];
    else if ((a === '--days' || a === '--trial-days') && argv[i + 1]) days = Number(argv[++i]);
    else if (a === '--desktop') desktop = true;
  }
  return { label, days, desktop };
}

async function main() {
  const { label, days, desktop } = parseArgs(process.argv.slice(2));
  const out = await issueTesterInviteLink({
    label: label ?? 'Beta testers',
    trialDays: days,
    issuedById: null,
  });

  console.log('\n✓ Beta tester invite created\n');
  console.log(`  Trial: ${out.trialDays} days from each tester's first login`);
  console.log(`  Share URL:\n  ${out.inviteUrl}\n`);

  if (desktop) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const script = path.join(root, 'scripts/create-beta-tester-launcher.sh');
    execSync(`BOG_APP_URL="${out.inviteUrl}" bash "${script}"`, { stdio: 'inherit' });
  }

  // Avoid unused import lint
  void buildTesterInviteUrl;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
