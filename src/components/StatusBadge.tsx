// Status & Badge Components - Para mostrar estados en toda la app

import React from 'react';
import { Check, X, Clock, AlertTriangle, Info, Zap, Star, Sparkles } from 'lucide-react';

// Status Badge Component
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'warning' | 'error';
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export function StatusBadge({ status, label, size = 'sm', pulse = false }: StatusBadgeProps) {
  const config = {
    active: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      icon: <Check size={12} />,
      dot: 'bg-green-500',
    },
    inactive: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      icon: <X size={12} />,
      dot: 'bg-gray-400',
    },
    pending: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      icon: <Clock size={12} />,
      dot: 'bg-amber-500',
    },
    warning: {
      bg: 'bg-orange-100',
      text: 'text-orange-700',
      icon: <AlertTriangle size={12} />,
      dot: 'bg-orange-500',
    },
    error: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: <X size={12} />,
      dot: 'bg-red-500',
    },
  };

  const c = config[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text} ${
        size === 'md' ? 'text-sm px-3 py-1.5' : ''
      }`}
    >
      {pulse && <span className={`w-1.5 h-1.5 ${c.dot} rounded-full mr-1.5 animate-pulse`} />}
      {!pulse && <span className={`w-1.5 h-1.5 ${c.dot} rounded-full mr-1.5`} />}
      {label || status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Feature Badge
interface FeatureBadgeProps {
  type: 'new' | 'pro' | 'beta' | 'free' | 'mx';
}

export function FeatureBadge({ type }: FeatureBadgeProps) {
  const config = {
    new: { bg: 'bg-green-500', text: 'text-white', label: 'NEW', icon: <Sparkles size={10} /> },
    pro: { bg: 'bg-black', text: 'text-white', label: 'PRO', icon: <Star size={10} /> },
    beta: { bg: 'bg-purple-500', text: 'text-white', label: 'BETA', icon: null },
    free: { bg: 'bg-blue-500', text: 'text-white', label: 'FREE', icon: <Zap size={10} /> },
    mx: { bg: 'bg-red-600', text: 'text-white', label: 'MX', icon: null },
  };

  const c = config[type];

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${c.bg} ${c.text}`}
    >
      {c.icon && <span className="mr-1">{c.icon}</span>}
      {c.label}
    </span>
  );
}

// Info Box Component
interface InfoBoxProps {
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function InfoBox({ type, title, description, action }: InfoBoxProps) {
  const config = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100', icon: <Info size={18} />, iconColor: 'text-blue-600', titleColor: 'text-blue-800', descColor: 'text-blue-600' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100', icon: <AlertTriangle size={18} />, iconColor: 'text-amber-600', titleColor: 'text-amber-800', descColor: 'text-amber-600' },
    success: { bg: 'bg-green-50', border: 'border-green-200', iconBg: 'bg-green-100', icon: <Check size={18} />, iconColor: 'text-green-600', titleColor: 'text-green-800', descColor: 'text-green-600' },
    error: { bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-100', icon: <X size={18} />, iconColor: 'text-red-600', titleColor: 'text-red-800', descColor: 'text-red-600' },
  };

  const c = config[type];

  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-4`}>
      <div className="flex items-start">
        <div className={`${c.iconBg} p-2 rounded-lg ${c.iconColor} flex-shrink-0`}>
          {c.icon}
        </div>
        <div className="ml-3 flex-1">
          <h4 className={`font-semibold ${c.titleColor}`}>{title}</h4>
          <p className={`text-sm ${c.descColor} mt-1`}>{description}</p>
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-3 text-sm font-medium ${c.descColor} hover:underline`}
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Mode Indicator (Demo / Production)
interface ModeIndicatorProps {
  mode: 'demo' | 'production' | 'syncing';
}

export function ModeIndicator({ mode }: ModeIndicatorProps) {
  const config = {
    demo: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      label: 'Demo Mode',
      description: 'Data is stored locally. Connect a database for production.',
    },
    production: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      dot: 'bg-green-500',
      label: 'Connected',
      description: 'All data is synced to the cloud.',
    },
    syncing: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      dot: 'bg-blue-500 animate-pulse',
      label: 'Syncing...',
      description: 'Syncing changes with server.',
    },
  };

  const c = config[mode];

  return (
    <div className={`${c.bg} rounded-xl p-4`}>
      <div className="flex items-center mb-2">
        <span className={`w-2 h-2 ${c.dot} rounded-full mr-2`} />
        <span className={`font-semibold ${c.text}`}>{c.label}</span>
      </div>
      <p className={`text-sm ${c.text} opacity-80`}>{c.description}</p>
    </div>
  );
}