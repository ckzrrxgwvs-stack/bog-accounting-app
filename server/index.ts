// Backend server with API routes

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { aiRouter } from './routes/ai';
import { accountsRouter } from './routes/accounts';
import { invoicesRouter } from './routes/invoices';
import { reportsRouter } from './routes/reports';
import { cfdiRouter } from './routes/cfdi';
import { journalEntriesRouter } from './routes/journal-entries';
import { usersRouter } from './routes/users';
import { customersRouter } from './routes/customers';
import { vendorsRouter } from './routes/vendors';
import { paymentsRouter } from './routes/payments';
import { companyRouter } from './routes/company';
import { inventoryRouter } from './routes/inventory';
import { periodCloseRouter } from './routes/period-close';
import { dashboardRouter } from './routes/dashboard';
import { authRouter } from './routes/auth';
import { registrationsRouter } from './routes/registrations';
import { exchangeRatesRouter } from './routes/exchange-rates';
import { erpRouter } from './routes/erp';
import { purchaseOrdersRouter } from './routes/purchase-orders';
import { salesOrdersRouter } from './routes/sales-orders';
import { bomRouter } from './routes/bom';
import { productionOrdersRouter } from './routes/production-orders';
import { logisticsRouter } from './routes/logistics';
import { productIntelRouter } from './routes/productIntel';
import { agentOrgRouter } from './routes/agentOrg';
import { shopifyConnectorRouter } from './routes/shopifyConnector';
import { robinhoodConnectorRouter } from './routes/robinhoodConnector';
import { useDatabase } from './lib/dbMode';
import { applyDatabaseUrlEnv } from './lib/databaseUrl';
import { ensureProgramBootstrap } from './services/ensureProgramBootstrap';
import { ensureDatabaseSchema, isSchemaReady } from './services/ensureDatabaseSchema';
import { setupRouter } from './routes/setup';

config({ override: true });

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigins = (process.env.FRONTEND_URL ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Middleware
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    credentials: true,
  })
);
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX ?? 500),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);
app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buf) => {
    if (req.originalUrl?.startsWith('/api/connectors/shopify/webhook')) {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    }
  },
}));

// API Routes (paths mirror accounting-app/src/services/api.ts)
app.use('/api/ai', aiRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/cfdi', cfdiRouter);
app.use('/api/journal-entries', journalEntriesRouter);
app.use('/api/users', usersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/company', companyRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/periods', periodCloseRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/auth', authRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/exchange-rates', exchangeRatesRouter);
app.use('/api/erp', erpRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/sales-orders', salesOrdersRouter);
app.use('/api/bom', bomRouter);
app.use('/api/production-orders', productionOrdersRouter);
app.use('/api/logistics', logisticsRouter);
app.use('/api/product-intel', productIntelRouter);
app.use('/api/agent-org', agentOrgRouter);
app.use('/api/connectors/shopify', shopifyConnectorRouter);
app.use('/api/connectors/robinhood', robinhoodConnectorRouter);
app.use('/api/setup', setupRouter);

// Health check
app.get('/api/health', async (_req, res) => {
  let dbPing = false;
  let userCount: number | undefined;
  if (useDatabase()) {
    try {
      const { prisma } = await import('./lib/prisma');
      await prisma.$queryRaw`SELECT 1`;
      dbPing = true;
      if (isSchemaReady()) {
        userCount = await prisma.user.count();
      }
    } catch {
      dbPing = false;
    }
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    openai: !!process.env.OPENAI_API_KEY,
    database: useDatabase() && dbPing,
    schemaReady: isSchemaReady(),
    userCount,
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

async function startServer(): Promise<void> {
  if (useDatabase()) {
    console.log('   📦 Database mode (DATABASE_URL set)');
    applyDatabaseUrlEnv();
    await ensureDatabaseSchema();
    await ensureProgramBootstrap();
  } else {
    console.log('   ⚠️  No DATABASE_URL — API returns 503 until Postgres is connected (pnpm run go-live:local)');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);
    if (!process.env.OPENAI_API_KEY) {
      console.log('   ⚠️  Warning: OPENAI_API_KEY not set - AI CPA will run in demo mode');
    }
  });
}

startServer().catch((e) => {
  console.error('Fatal startup error:', e instanceof Error ? e.message : e);
  process.exit(1);
});

export default app;