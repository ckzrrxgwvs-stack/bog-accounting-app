// Payroll Management Page with USA and Mexico compliance

import React, { useState } from 'react';
import { Plus, Users, DollarSign, Calendar, AlertTriangle, Download } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  salary: number;
  status: 'active' | 'on_leave' | 'terminated';
  country: 'US' | 'MX';
}

interface PayrollRecord {
  id: string;
  period: string;
  date: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employees: number;
  status: 'draft' | 'pending' | 'processed';
}

export function Payroll() {
  const [selectedTab, setSelectedTab] = useState<'employees' | 'run' | 'reports'>('employees');

  const employees: Employee[] = [
    { id: '1', name: 'John Smith', department: 'Engineering', position: 'Senior Developer', salary: 85000, status: 'active', country: 'US' },
    { id: '2', name: 'Sarah Johnson', department: 'Finance', position: 'Accountant', salary: 65000, status: 'active', country: 'US' },
    { id: '3', name: 'Carlos Rodriguez', department: 'Operations', position: 'Manager', salary: 75000, status: 'active', country: 'MX' },
    { id: '4', name: 'Maria Garcia', department: 'HR', position: 'HR Specialist', salary: 55000, status: 'active', country: 'MX' },
    { id: '5', name: 'David Wilson', department: 'Sales', position: 'Sales Rep', salary: 60000, status: 'active', country: 'US' },
  ];

  const payrollHistory: PayrollRecord[] = [
    { id: '1', period: 'April 1-15, 2026', date: '2026-04-15', totalGross: 42500, totalDeductions: 10200, totalNet: 32300, employees: 5, status: 'processed' },
    { id: '2', period: 'March 16-31, 2026', date: '2026-03-31', totalGross: 42000, totalDeductions: 10080, totalNet: 31920, employees: 5, status: 'processed' },
    { id: '3', period: 'March 1-15, 2026', date: '2026-03-15', totalGross: 42000, totalDeductions: 10080, totalNet: 31920, employees: 5, status: 'processed' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const totalMonthlyPayroll = employees.reduce((sum, e) => sum + e.salary, 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Payroll Management</h1>
          <p className="text-gray-500 mt-1">Process payroll for USA and Mexico employees</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={18} className="mr-2" />
            Tax Reports
          </button>
          <button className="flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
            <Plus size={18} className="mr-2" />
            Run Payroll
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setSelectedTab('employees')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            selectedTab === 'employees'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={16} className="inline mr-2" />
          Employees
        </button>
        <button
          onClick={() => setSelectedTab('run')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            selectedTab === 'run'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar size={16} className="inline mr-2" />
          Run Payroll
        </button>
        <button
          onClick={() => setSelectedTab('reports')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            selectedTab === 'reports'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <DollarSign size={16} className="inline mr-2" />
          Reports
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Employees</p>
          <p className="text-2xl font-bold text-black mt-1">{employees.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">USA Employees</p>
          <p className="text-2xl font-bold text-black mt-1">{employees.filter(e => e.country === 'US').length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Mexico Employees</p>
          <p className="text-2xl font-bold text-black mt-1">{employees.filter(e => e.country === 'MX').length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Monthly Payroll</p>
          <p className="text-2xl font-bold text-black mt-1">{formatCurrency(totalMonthlyPayroll / 12 * 2)}</p>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="text-blue-600 mt-0.5 mr-3" size={20} />
          <div>
            <h3 className="font-medium text-blue-800">Payroll Compliance Active</h3>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700 font-medium">🇺🇸 USA Compliance</p>
                <ul className="text-blue-600 mt-1 space-y-1">
                  <li>• Federal tax withholding (941)</li>
                  <li>• Social Security (6.2%) & Medicare (1.45%)</li>
                  <li>• State tax calculations</li>
                  <li>• W-2 preparation ready</li>
                </ul>
              </div>
              <div>
                <p className="text-blue-700 font-medium">🇲🇽 Mexico Compliance</p>
                <ul className="text-blue-600 mt-1 space-y-1">
                  <li>• ISR withholding per SAT tables</li>
                  <li>• IMSS employer contributions</li>
                  <li>• INFONAVIT (housing fund)</li>
                  <li>• CFDI Nómina generation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content based on selected tab */}
      {selectedTab === 'employees' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Annual Salary</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-black">{employee.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{employee.department}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{employee.position}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      employee.country === 'US' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {employee.country === 'US' ? '🇺🇸 USA' : '🇲🇽 Mexico'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-black">
                    {formatCurrency(employee.salary)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedTab === 'run' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-black mb-4">Process New Payroll</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Pay Period</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option>April 16-30, 2026</option>
                <option>April 1-15, 2026</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Pay Date</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" defaultValue="2026-04-30" />
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Summary</p>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <p className="text-xs text-gray-400">Employees</p>
                <p className="font-medium">{employees.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Gross Pay</p>
                <p className="font-medium">{formatCurrency(totalMonthlyPayroll / 12 * 2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Net Pay</p>
                <p className="font-medium">{formatCurrency(totalMonthlyPayroll / 12 * 2 * 0.76)}</p>
              </div>
            </div>
          </div>
          <button className="mt-4 w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800">
            Process Payroll
          </button>
        </div>
      )}

      {selectedTab === 'reports' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-black">Payroll History</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Deductions</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payrollHistory.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-black">{record.period}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.date}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-black">{formatCurrency(record.totalGross)}</td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(record.totalDeductions)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-green-600">{formatCurrency(record.totalNet)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}