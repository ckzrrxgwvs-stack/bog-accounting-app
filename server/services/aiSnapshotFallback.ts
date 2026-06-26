/** When OpenAI quota/billing fails, answer from the live financial snapshot instead of a dead-end error. */

export function isOpenAIQuotaError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 429) return true;
  const code = (error as { code?: string })?.code;
  if (code === 'insufficient_quota' || code === 'rate_limit_exceeded') return true;
  const msg = error instanceof Error ? error.message : String(error);
  return /\b429\b|exceeded your current quota|insufficient_quota|billing details/i.test(msg);
}

function extractIncomeLines(snapshot: string): { mtd?: string; ytd?: string } {
  const mtd = snapshot.match(
    /MTD[^:]*: Revenue [^,]+, COGS [^,]+, Expenses [^,]+, Net ([^\n]+)/
  );
  const ytd = snapshot.match(
    /YTD[^:]*: Revenue [^,]+, COGS [^,]+, Expenses [^,]+, Net ([^\n]+)/
  );
  return { mtd: mtd?.[1]?.trim(), ytd: ytd?.[1]?.trim() };
}

function extractCashLines(snapshot: string): string[] {
  const lines: string[] = [];
  for (const raw of snapshot.split('\n')) {
    const line = raw.trim();
    if (!/cash|bank|brokerage/i.test(line)) continue;
    if (!/:\s*\$/.test(line) && !/:\s*-\$/.test(line)) continue;
    lines.push(line.replace(/^[-*]\s*/, ''));
  }
  return lines;
}

function formatCashFlowSummary(snapshot: string, userMessage: string): string {
  const income = extractIncomeLines(snapshot);
  const cashLines = extractCashLines(snapshot);
  const ar = snapshot.match(/AR invoices \(open\): (\d+)/);
  const ap = snapshot.match(/AP invoices \(open\): (\d+)/);

  let body = `## Cash flow summary (from your live books)\n\n`;
  body += `_OpenAI quota is exhausted — this answer is built from posted journal data, not GPT._\n\n`;

  if (cashLines.length) {
    body += `### Cash & brokerage balances\n`;
    for (const line of cashLines) body += `- ${line}\n`;
    body += `\n`;
  } else {
    body += `### Cash & brokerage balances\n- No non-zero cash accounts in the snapshot yet.\n\n`;
  }

  body += `### Operating activity (proxy)\n`;
  body += `Net income from posted journals approximates operating cash generation before working-capital changes:\n`;
  if (income.mtd) body += `- **MTD net income:** ${income.mtd}\n`;
  if (income.ytd) body += `- **YTD net income:** ${income.ytd}\n`;
  if (!income.mtd && !income.ytd) body += `- No MTD/YTD income posted yet.\n`;
  body += `\n`;

  body += `### Working capital (open documents)\n`;
  body += `- Open AR invoices: ${ar?.[1] ?? '0'}\n`;
  body += `- Open AP invoices: ${ap?.[1] ?? '0'}\n\n`;

  body += `For a printable **Statement of Cash Flows**, open **Reports → Cash Flow Statement** in the sidebar.\n\n`;
  body += `---\n**Your question:** ${userMessage}\n\n${snapshot}`;
  return body;
}

function formatIncomeHighlight(snapshot: string, userMessage: string): string {
  const income = extractIncomeLines(snapshot);
  let body = `## Income summary (from your live books)\n\n`;
  body += `_OpenAI quota is exhausted — figures below are from posted journals._\n\n`;
  const mtdLine = snapshot.match(/MTD[^:]*: ([^\n]+)/);
  const ytdLine = snapshot.match(/YTD[^:]*: ([^\n]+)/);
  if (mtdLine) body += `- **MTD:** ${mtdLine[1].trim()}\n`;
  if (ytdLine) body += `- **YTD:** ${ytdLine[1].trim()}\n`;
  if (income.mtd) body += `- **MTD net income:** ${income.mtd}\n`;
  if (income.ytd) body += `- **YTD net income:** ${income.ytd}\n`;
  body += `\nOpen **Reports → Income Statement** for export.\n\n---\n**Your question:** ${userMessage}\n\n${snapshot}`;
  return body;
}

function formatBalanceHighlight(snapshot: string, userMessage: string): string {
  let body = `## Balance sheet / trial balance (from your live books)\n\n`;
  body += `_OpenAI quota is exhausted — balances below are as-of the snapshot date._\n\n`;
  const balanceSection = snapshot.match(
    /### Commerce account balances \(non-zero\)\n([\s\S]*?)(?:\n## |\nWhen the user|$)/
  );
  if (balanceSection?.[1]?.trim()) {
    body += balanceSection[1].trim() + '\n\n';
  }
  const invSection = snapshot.match(/## Investment ledgers[\s\S]*/);
  if (invSection) body += invSection[0] + '\n\n';
  body += `Open **Reports → Balance Sheet** or **Trial Balance** for export.\n\n---\n**Your question:** ${userMessage}\n\n${snapshot}`;
  return body;
}

export function buildQuotaFallbackResponse(userMessage: string, snapshot: string): string {
  const notice =
    '**OpenAI billing/quota limit reached.** Answers use your **live database snapshot** until you add credits at [platform.openai.com/account/billing](https://platform.openai.com/account/billing).\n\n';

  const q = userMessage.toLowerCase();
  if (/cash\s*flow|cashflow|statement of cash/.test(q)) {
    return notice + formatCashFlowSummary(snapshot, userMessage);
  }
  if (/income|p&l|p\s*&\s*l|profit|loss|revenue|expense/.test(q)) {
    return notice + formatIncomeHighlight(snapshot, userMessage);
  }
  if (/balance\s*sheet|trial\s*balance|assets|liabilit/.test(q)) {
    return notice + formatBalanceHighlight(snapshot, userMessage);
  }

  return `${notice}**Your question:** ${userMessage}\n\n${snapshot}\n\n---\n_Open **Reports** in the sidebar for printable statements._`;
}
