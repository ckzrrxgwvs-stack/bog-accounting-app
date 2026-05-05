// API routes for CFDI (Mexico electronic invoicing)

import { Router, type RequestHandler } from 'express';
import { cfdiService, type CFDIInvoice } from '../services/cfdiService';

const router = Router();

const requireCfdiEnabled: RequestHandler = (_req, res, next) => {
  if (process.env.CFDI_ENABLED !== '1' && process.env.CFDI_ENABLED !== 'true') {
    res.status(503).json({
      error: 'CFDI API disabled. Set CFDI_ENABLED=true and configure PAC credentials.',
    });
    return;
  }
  next();
};

// POST /api/cfdi/stamp - Stamp a new CFDI
router.post('/stamp', requireCfdiEnabled, async (req, res) => {
  try {
    const invoice: CFDIInvoice = req.body;

    if (!invoice.emisorRfc || !invoice.receptorRfc) {
      res.status(400).json({ error: 'Missing required fields: emisorRfc and receptorRfc' });
      return;
    }

    const result = await cfdiService.stampCFDI(invoice);

    res.json(result);
  } catch (error) {
    console.error('CFDI Stamp Error:', error);
    res.status(500).json({ error: 'Failed to stamp CFDI' });
  }
});

// POST /api/cfdi/cancel - Cancel a CFDI
router.post('/cancel', requireCfdiEnabled, async (req, res) => {
  try {
    const { uuid, rfcEmisor } = req.body;

    if (!uuid || !rfcEmisor) {
      res.status(400).json({ error: 'Missing required fields: uuid and rfcEmisor' });
      return;
    }

    const result = await cfdiService.cancelCFDI(uuid, rfcEmisor);

    res.json(result);
  } catch (error) {
    console.error('CFDI Cancel Error:', error);
    res.status(500).json({ error: 'Failed to cancel CFDI' });
  }
});

// GET /api/cfdi/verify/:uuid - Verify CFDI status with SAT
router.get('/verify/:uuid', requireCfdiEnabled, async (req, res) => {
  try {
    const { uuid } = req.params;
    const result = await cfdiService.verifyCFDI(uuid);

    res.json(result);
  } catch (error) {
    console.error('CFDI Verify Error:', error);
    res.status(500).json({ error: 'Failed to verify CFDI' });
  }
});

// POST /api/cfdi/payment-complement - Generate payment complement (Complemento de Pago)
router.post('/payment-complement', requireCfdiEnabled, async (req, res) => {
  try {
    const { paymentData, emisorRfc } = req.body;

    const result = await cfdiService.generatePaymentComplement(paymentData, emisorRfc);

    res.json(result);
  } catch (error) {
    console.error('Payment Complement Error:', error);
    res.status(500).json({ error: 'Failed to generate payment complement' });
  }
});

// GET /api/cfdi/status - Check CFDI service status
router.get('/status', (req, res) => {
  res.json({
    status: 'operational',
    environment: process.env.SAT_ENVIRONMENT || 'test',
    pacConfigured: !!(process.env.PAC_API_URL && process.env.PAC_API_KEY),
  });
});

// CFDI usage codes (UsoCFDI)
export const usoCFDIList = [
  { clave: 'G01', descripcion: 'Acquisition of merchandise' },
  { clave: 'G02', descripcion: 'Returns, discounts or bonuses' },
  { clave: 'G03', descripcion: 'General expenses' },
  { clave: 'I01', descripcion: 'Fixed assets' },
  { clave: 'I02', descripcion: 'Inventory' },
  { clave: 'I03', descripcion: 'Machinery and equipment' },
  { clave: 'I04', descripcion: 'Construction' },
  { clave: 'I05', descripcion: 'Office furniture and equipment' },
  { clave: 'I06', descripcion: 'Transportation equipment' },
  { clave: 'I07', descripcion: 'Computer equipment' },
  { clave: 'I08', descripcion: 'Communications equipment' },
  { clave: 'I09', descripcion: 'Other machinery and equipment' },
  { clave: 'I10', descripcion: 'Other fixed assets' },
  { clave: 'D01', descripcion: 'Medical expenses' },
  { clave: 'D02', descripcion: ' Funeral expenses' },
  { clave: 'D03', descripcion: 'Donations' },
  { clave: 'D04', descripcion: 'Accidents and disabilities' },
  { clave: 'D05', descripcion: 'Education expenses' },
  { clave: 'D06', descripcion: 'Mortgage interest (not dwelling)' },
  { clave: 'D07', descripcion: 'Mortgage insurance premiums' },
  { clave: 'D08', descripcion: 'Mandatory contributions' },
  { clave: 'D09', descripcion: 'Medical insurance premiums' },
  { clave: 'D10', descripcion: 'Retirement funds' },
  { clave: 'D11', descripcion: 'Contributions to personal savings' },
  { clave: 'S01', descripcion: 'Payroll' },
  { clave: 'CP01', descripcion: 'Payment to third parties' },
  { clave: 'CN01', descripcion: 'Nomina' },
  { clave: 'P01', descripcion: 'To the public in general' },
];

export { router as cfdiRouter };