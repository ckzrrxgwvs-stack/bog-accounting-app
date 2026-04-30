// Inventory Management Page

import React, { useState } from 'react';
import { Plus, Search, Package, AlertTriangle, TrendingDown, Edit, Trash2, Eye } from 'lucide-react';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  cost: number;
  price: number;
  reorderPoint: number;
  value: number;
}

export function Inventory() {
  const [showAddModal, setShowAddModal] = useState(false);

  const items: InventoryItem[] = [
    { id: '1', sku: 'PRD-001', name: 'Product A - Standard', category: 'Finished Goods', quantity: 150, unit: 'units', cost: 25.00, price: 50.00, reorderPoint: 50, value: 3750 },
    { id: '2', sku: 'PRD-002', name: 'Product B - Premium', category: 'Finished Goods', quantity: 80, unit: 'units', cost: 40.00, price: 80.00, reorderPoint: 30, value: 3200 },
    { id: '3', sku: 'RAW-001', name: 'Raw Material X', category: 'Raw Materials', quantity: 500, unit: 'kg', cost: 5.00, price: 12.00, reorderPoint: 200, value: 2500 },
    { id: '4', sku: 'PKG-001', name: 'Packaging Materials', category: 'Supplies', quantity: 200, unit: 'boxes', cost: 8.00, price: 15.00, reorderPoint: 100, value: 1600 },
    { id: '5', sku: 'PRD-003', name: 'Product C - Basic', category: 'Finished Goods', quantity: 25, unit: 'units', cost: 15.00, price: 35.00, reorderPoint: 40, value: 875 },
  ];

  const lowStockItems = items.filter(i => i.quantity <= i.reorderPoint);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">Inventory Management</h1>
          <p className="text-gray-500 mt-1">Track inventory, costs, and reorder points</p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Package size={18} className="mr-2" />
            Inventory Report
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={18} className="mr-2" />
            Add Item
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Items</p>
          <p className="text-2xl font-bold text-black mt-1">{items.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-black mt-1">{formatCurrency(items.reduce((sum, i) => sum + i.value, 0))}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Quantity</p>
          <p className="text-2xl font-bold text-black mt-1">{items.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
              <AlertTriangle size={20} />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Low Stock</p>
              <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="text-red-600 mt-0.5 mr-3" size={20} />
            <div>
              <h3 className="font-medium text-red-800">Low Stock Alert</h3>
              <p className="text-sm text-red-600 mt-1">
                {lowStockItems.length} items are below reorder point. Consider placing orders.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {lowStockItems.map(item => (
                  <span key={item.id} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                    {item.sku} - {item.quantity} left
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center">
            <Search size={18} className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search by SKU, name, or category..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <select className="ml-4 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black">
            <option value="">All Categories</option>
            <option value="finished">Finished Goods</option>
            <option value="raw">Raw Materials</option>
            <option value="supplies">Supplies</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const isLowStock = item.quantity <= item.reorderPoint;
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-black">{item.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={isLowStock ? 'text-red-600 font-medium' : 'text-black'}>
                      {item.quantity.toLocaleString()} {item.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600">{formatCurrency(item.cost)}</td>
                  <td className="px-4 py-3 text-sm text-right text-black font-medium">{formatCurrency(item.price)}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-black">{formatCurrency(item.value)}</td>
                  <td className="px-4 py-3 text-center">
                    {isLowStock ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        <TrendingDown size={12} className="mr-1" />
                        Low
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center space-x-2">
                      <button className="p-1.5 text-gray-400 hover:text-gray-600" title="View">
                        <Eye size={16} />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-gray-600" title="Edit">
                        <Edit size={16} />
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-600" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">Showing 1-{items.length} of {items.length} items</p>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-500 hover:bg-gray-50" disabled>Previous</button>
          <button className="px-3 py-1 bg-black text-white rounded text-sm">1</button>
          <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-500 hover:bg-gray-50" disabled>Next</button>
        </div>
      </div>
    </div>
  );
}