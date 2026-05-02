// Backend server with API routes

import express from 'express';
import cors from 'cors';
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

config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    openai: !!process.env.OPENAI_API_KEY,
    database: !!process.env.DATABASE_URL
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  if (!process.env.OPENAI_API_KEY) {
    console.log('   ⚠️  Warning: OPENAI_API_KEY not set - AI CPA will run in demo mode');
  }
});

export default app;