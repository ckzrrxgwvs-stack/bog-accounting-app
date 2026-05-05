/** Demo-friendly rectangular datasets for Data Studio — BOG-owned sample rows (not sample spreadsheet files). */

export type DatasetDef = {
  id: string;
  label: string;
  description: string;
  columns: { key: string; label: string; type: 'text' | 'number' | 'date' }[];
  rows: Record<string, unknown>[];
};

export const SAMPLE_DATASETS: DatasetDef[] = [
  {
    id: 'demo-regional-performance',
    label: 'Demo · Regional performance',
    description: 'Illustrative revenue by region and quarter — swap fields in Cross-tab to explore.',
    columns: [
      { key: 'region', label: 'Region', type: 'text' },
      { key: 'quarter', label: 'Quarter', type: 'text' },
      { key: 'productLine', label: 'Product line', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'units', label: 'Units', type: 'number' },
    ],
    rows: [
      { region: 'West', quarter: 'Q1', productLine: 'Hardware', amount: 124000, units: 420 },
      { region: 'West', quarter: 'Q2', productLine: 'Hardware', amount: 132500, units: 455 },
      { region: 'West', quarter: 'Q1', productLine: 'Services', amount: 78000, units: 120 },
      { region: 'East', quarter: 'Q1', productLine: 'Hardware', amount: 98000, units: 310 },
      { region: 'East', quarter: 'Q2', productLine: 'Hardware', amount: 105400, units: 340 },
      { region: 'East', quarter: 'Q1', productLine: 'Services', amount: 92000, units: 95 },
      { region: 'Central', quarter: 'Q1', productLine: 'Hardware', amount: 87000, units: 290 },
      { region: 'Central', quarter: 'Q2', productLine: 'Services', amount: 64000, units: 88 },
      { region: 'Central', quarter: 'Q2', productLine: 'Hardware', amount: 91000, units: 300 },
    ],
  },
  {
    id: 'demo-operating-expenses',
    label: 'Demo · Operating expenses',
    description: 'Illustrative expense lines by department and category.',
    columns: [
      { key: 'department', label: 'Department', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'month', label: 'Month', type: 'text' },
      { key: 'actual', label: 'Actual', type: 'number' },
    ],
    rows: [
      { department: 'Operations', category: 'Payroll', month: 'Jan', actual: 185000 },
      { department: 'Operations', category: 'Facilities', month: 'Jan', actual: 42000 },
      { department: 'Sales', category: 'Travel', month: 'Jan', actual: 28000 },
      { department: 'Sales', category: 'Marketing', month: 'Jan', actual: 52000 },
      { department: 'Operations', category: 'Payroll', month: 'Feb', actual: 186500 },
      { department: 'Operations', category: 'Facilities', month: 'Feb', actual: 41800 },
      { department: 'Sales', category: 'Travel', month: 'Feb', actual: 31000 },
      { department: 'G&A', category: 'Professional fees', month: 'Feb', actual: 24000 },
    ],
  },
];
