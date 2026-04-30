// CFDI Management Page - Mexico Electronic Invoicing

import React, { useState } from 'react';
import { Plus, Search, FileText, X, Check, AlertTriangle, Download, Send } from 'lucide-react';

interface CFDIRecord {
  id: string;
  uuid: string;
  tipo: 'invoice' | 'payment_complement';
  status: 'draft' | 'stamped' | 'cancelled';
  emisorRfc: string;
  receptorRfc: string;
  monto: number;
  fechaEmision: string;
  fechaTimbrado?: string;
}

export function CFDI() {
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'invoices' | 'complements'>('invoices');

  const cfdiRecords: CFDIRecord[] = [
    {
      id: '1',
      uuid: 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890',
      tipo: 'invoice',
      status: 'stamped',
      emisorRfc: 'XAXX010101000',
      receptorRfc: 'XEXX010101000',
      monto: 15000.00,
      fechaEmision: '2026-04-28',
      fechaTimbrado: '2026-04-28T10:30:00',
    },
    {
      id: '2',
      uuid: 'B2C3D4E5-F6A7-8901-BCDE-F12345678901',
      tipo: 'invoice',
      status: 'stamped',
      emisorRfc: 'XAXX010101000',
      receptorRfc: 'ABC123456789',
      monto: 8500.50,
      fechaEmision: '2026-04-27',
      fechaTimbrado: '2026-04-27T14:15:00',
    },
    {
      id: '3',
      uuid: 'C3D4E5F6-A7B8-9012-CDEF-123456789012',
      tipo: 'payment_complement',
      status: 'stamped',
      emisorRfc: 'XAXX010101000',
      receptorRfc: 'XEXX010101000',
      monto: 5000.00,
      fechaEmision: '2026-04-26',
      fechaTimbrado: '2026-04-26T09:00:00',
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'stamped':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            <Check size={12} className="mr-1" />
            Timbrado
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
            <X size={12} className="mr-1" />
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
            Borrador
          </span>
        );
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">CFDI Management</h1>
          <p className="text-gray-500 mt-1">Mexico electronic invoicing (Comprobante Fiscal Digital)</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={18} className="mr-2" />
            Download XML
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={18} className="mr-2" />
            New CFDI
          </button>
        </div>
      </div>

      {/* PAC Status Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="text-blue-600 mt-0.5 mr-3" size={20} />
          <div>
            <h3 className="font-medium text-blue-800">PAC Integration Status</h3>
            <p className="text-sm text-blue-600 mt-1">
              Configure PAC credentials in environment variables to enable live CFDI operations.
              Currently running in demo mode.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setSelectedTab('invoices')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            selectedTab === 'invoices'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={16} className="inline mr-2" />
          Invoices
        </button>
        <button
          onClick={() => setSelectedTab('complements')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            selectedTab === 'complements'
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Send size={16} className="inline mr-2" />
          Payment Complements
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total CFDI</p>
          <p className="text-2xl font-bold text-black mt-1">{cfdiRecords.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Stamped</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {cfdiRecords.filter(r => r.status === 'stamped').length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Cancelled</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            {cfdiRecords.filter(r => r.status === 'cancelled').length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold text-black mt-1">
            {formatCurrency(cfdiRecords.reduce((sum, r) => sum + r.monto, 0))}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <Search size={18} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by UUID, RFC, or amount..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
      </div>

      {/* CFDI Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UUID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emisor RFC</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receptor RFC</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount (MXN)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cfdiRecords.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs font-mono text-gray-600">{record.uuid.substring(0, 18)}...</td>
                <td className="px-4 py-3 text-sm text-black">{record.emisorRfc}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{record.receptorRfc}</td>
                <td className="px-4 py-3 text-sm text-right font-medium text-black">
                  {formatCurrency(record.monto)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatDate(record.fechaEmision)}
                </td>
                <td className="px-4 py-3 text-center">
                  {getStatusBadge(record.status)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center space-x-2">
                    <button className="p-1.5 text-gray-400 hover:text-gray-600" title="Download XML">
                      <Download size={16} />
                    </button>
                    {record.status === 'stamped' && (
                      <button className="p-1.5 text-gray-400 hover:text-red-600" title="Cancel">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">Showing 1-{cfdiRecords.length} of {cfdiRecords.length} records</p>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-500 hover:bg-gray-50" disabled>
            Previous
          </button>
          <button className="px-3 py-1 bg-black text-white rounded text-sm">1</button>
          <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-500 hover:bg-gray-50" disabled>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}