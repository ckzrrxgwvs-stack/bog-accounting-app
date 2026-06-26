import { Router } from 'express';
import { requireDatabase } from '../lib/requireDatabase';
import { getOrCreateDefaultCompany } from '../services/companyBootstrap';
import {
  connectInstitution,
  disconnectInstitution,
  listConnections,
  syncInstitutionConnection,
} from '../services/financialInstitutions/connectionService';
import { getFinancialProviderCatalog } from '../services/financialInstitutions/registry';
import type { FinancialConnectionProvider, FinancialInstitutionType } from '@prisma/client';

const router = Router();

router.get('/providers', (_req, res) => {
  res.json({ providers: getFinancialProviderCatalog() });
});

router.get('/', async (_req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const connections = await listConnections(company.id);
    res.json({ connections, useBankFeeds: company.useBankFeeds });
  } catch (e) {
    console.error(e);
    res.status(503).json({ error: 'Database unavailable' });
  }
});

router.post('/connect', async (req, res) => {
  if (!requireDatabase(res)) return;
  const body = req.body as {
    provider?: FinancialConnectionProvider;
    institutionType?: FinancialInstitutionType;
    displayName?: string;
    institutionName?: string;
    accountMask?: string;
  };

  if (!body.provider || !body.institutionType || !body.displayName?.trim()) {
    res.status(400).json({ error: 'provider, institutionType, and displayName are required' });
    return;
  }

  try {
    const company = await getOrCreateDefaultCompany();
    const result = await connectInstitution({
      companyId: company.id,
      provider: body.provider,
      institutionType: body.institutionType,
      displayName: body.displayName.trim(),
      institutionName: body.institutionName,
      accountMask: body.accountMask,
    });
    res.status(201).json({
      id: result.connection.id,
      status: result.status,
      bankFeedAccountId: result.bankFeedAccountId ?? null,
      lastError: result.connection.lastError,
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e instanceof Error ? e.message : 'Connect failed' });
  }
});

router.post('/:id/sync', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    const result = await syncInstitutionConnection(company.id, req.params.id);
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e instanceof Error ? e.message : 'Sync failed' });
  }
});

router.delete('/:id', async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const company = await getOrCreateDefaultCompany();
    await disconnectInstitution(company.id, req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e instanceof Error ? e.message : 'Disconnect failed' });
  }
});

export { router as financialConnectionsRouter };
