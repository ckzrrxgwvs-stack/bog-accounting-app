// User Management Page — live PostgreSQL via /api/users

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Shield, Mail, User, Check, X, Key, Eye, EyeOff } from 'lucide-react';
import { UserRole, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/types/permissions';
import { api } from '@/services/api';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  mfaEnabled: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface NewUserForm {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password: string;
  generatePassword: boolean;
  sendInvite: boolean;
}

export function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'ACCOUNTANT',
    password: '',
    generatePassword: false,
    sendInvite: false,
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const res = await api.getUsers();
    setLoading(false);
    if (!res.success) {
      setLoadError(res.error ?? 'Failed to load users');
      return;
    }
    const payload = res.data as { users?: UserData[] };
    setUsers(payload.users ?? []);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && user.isActive) ||
      (filterStatus === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAddUser = async () => {
    setActionError(null);
    const password =
      newUserForm.generatePassword
        ? Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'[b % 58]).join('')
        : newUserForm.password;
    if (password.length < 8) {
      setActionError('Password must be at least 8 characters');
      return;
    }
    const res = await api.createUser({
      email: newUserForm.email,
      firstName: newUserForm.firstName,
      lastName: newUserForm.lastName,
      role: newUserForm.role,
      password,
    });
    if (!res.success) {
      setActionError(res.error ?? 'Could not create user');
      return;
    }
    if (newUserForm.generatePassword) {
      alert(`User created. Generated password (save now):\n${password}`);
    }
    setShowAddModal(false);
    setNewUserForm({
      email: '',
      firstName: '',
      lastName: '',
      role: 'ACCOUNTANT',
      password: '',
      generatePassword: false,
      sendInvite: false,
    });
    await loadUsers();
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setActionError(null);
    const res = await api.updateUser(selectedUser.id, {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
    });
    if (!res.success) {
      setActionError(res.error ?? 'Update failed');
      return;
    }
    setShowEditModal(false);
    setSelectedUser(null);
    await loadUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    setActionError(null);
    const res = await api.deleteUser(userId);
    if (!res.success) {
      setActionError(res.error ?? 'Delete failed');
      return;
    }
    await loadUsers();
  };

  const handleToggleActive = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    setActionError(null);
    const res = await api.updateUser(userId, { isActive: !user.isActive });
    if (!res.success) {
      setActionError(res.error ?? 'Update failed');
      return;
    }
    await loadUsers();
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    setActionError(null);
    const res = await api.updateUserRole(userId, newRole);
    if (!res.success) {
      setActionError(res.error ?? 'Role update failed');
      return;
    }
    setShowRoleModal(false);
    setSelectedUser(null);
    await loadUsers();
  };

  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });
    setShowEditModal(true);
  };

  const openRoleModal = (user: UserData) => {
    setSelectedUser(user);
    setShowRoleModal(true);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'PRESIDENT':
        return 'bg-purple-100 text-purple-700';
      case 'CFO':
        return 'bg-blue-100 text-blue-700';
      case 'CONTROLLER':
        return 'bg-green-100 text-green-700';
      case 'ACCOUNTANT':
        return 'bg-cyan-100 text-cyan-700';
      case 'AP_CLERK':
        return 'bg-yellow-100 text-yellow-700';
      case 'AR_CLERK':
        return 'bg-orange-100 text-orange-700';
      case 'READONLY':
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black">User Management</h1>
          <p className="text-gray-500 mt-1">Manage users, roles, and permissions</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={18} className="mr-2" />
            Add User
          </button>
        </div>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div>
      )}
      {actionError && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{actionError}</div>
      )}
      {loading && <p className="mb-4 text-sm text-gray-500">Loading users from database…</p>}

      {/* Security Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Shield className="text-amber-600 mt-0.5 mr-3" size={20} />
          <div>
            <h3 className="font-medium text-amber-800">Live PostgreSQL users</h3>
            <p className="text-sm text-amber-600 mt-1">
              Users are stored in Postgres. President/CFO/Controller can add staff with a password or generate one.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Search</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">All Roles</option>
              <option value="PRESIDENT">President</option>
              <option value="CFO">CFO</option>
              <option value="CONTROLLER">Controller</option>
              <option value="ACCOUNTANT">Accountant</option>
              <option value="AP_CLERK">AP Clerk</option>
              <option value="AR_CLERK">AR Clerk</option>
              <option value="READONLY">Read-Only</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="text-sm text-gray-500 hover:text-gray-700">
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">MFA</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-black">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.mfaEnabled ? (
                    <span className="inline-flex items-center text-xs text-green-600">
                      <Check size={14} className="mr-1" />
                      Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs text-red-600">
                      <X size={14} className="mr-1" />
                      Not Enabled
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatDate(user.lastLoginAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-1.5 text-gray-400 hover:text-gray-600"
                      title="Edit"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => openRoleModal(user)}
                      className="p-1.5 text-gray-400 hover:text-gray-600"
                      title="Change Role"
                    >
                      <Shield size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(user.id)}
                      className={`p-1.5 ${user.isActive ? 'text-gray-400 hover:text-red-600' : 'text-gray-400 hover:text-green-600'}`}
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {user.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">Showing {filteredUsers.length} of {users.length} users</p>
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

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-black">Add New User</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="user@company.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">First Name</label>
                  <input
                    type="text"
                    value={newUserForm.firstName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={newUserForm.lastName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as UserRole })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{ROLE_DESCRIPTIONS[newUserForm.role as UserRole]}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="generatePassword"
                  checked={newUserForm.generatePassword}
                  onChange={(e) => setNewUserForm({ ...newUserForm, generatePassword: e.target.checked })}
                />
                <label htmlFor="generatePassword" className="text-sm text-gray-600">
                  Generate secure password
                </label>
              </div>
              {!newUserForm.generatePassword && (
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Password</label>
                  <input
                    type="password"
                    minLength={8}
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              )}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sendInvite"
                  checked={newUserForm.sendInvite}
                  onChange={(e) => setNewUserForm({ ...newUserForm, sendInvite: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="sendInvite" className="text-sm text-gray-600">
                  Send invitation email with MFA setup instructions
                </label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleAddUser()}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-black">Edit User</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Key size={16} className="text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">MFA Status</span>
                </div>
                <p className="text-sm text-blue-600">
                  {selectedUser.mfaEnabled
                    ? 'MFA is enabled. User can access the system.'
                    : 'MFA is not enabled. User cannot login until MFA is set up.'}
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleEditUser()}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-black">Change Role for {selectedUser.firstName}</h2>
            </div>
            <div className="p-6 space-y-3">
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => void handleChangeRole(selectedUser.id, value as UserRole)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedUser.role === value
                      ? 'border-black bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-black">{label}</span>
                    {selectedUser.role === value && <Check size={18} className="text-black" />}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{ROLE_DESCRIPTIONS[value as UserRole]}</p>
                </button>
              ))}
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}