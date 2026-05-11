import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { baseApi } from '../../../environment';
import {
  Wallet, CheckCircle2, Clock, AlertTriangle, X, CalendarDays,
  TrendingUp, DollarSign, Filter, RefreshCw, ChevronDown,
} from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const statusBadge = (status) => ({
  paid:    { cls: 'bg-green-500/15 text-green-400 border border-green-500/25',  icon: <CheckCircle2 size={11}/>, label: 'Paid'    },
  pending: { cls: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/25', icon: <Clock size={11}/>,        label: 'Pending' },
  overdue: { cls: 'bg-red-500/15 text-red-400 border border-red-500/25',       icon: <AlertTriangle size={11}/>, label: 'Overdue' },
}[status] || { cls: 'bg-gray-700/40 text-gray-400 border border-gray-600', icon: null, label: status });

const methodLabel = (m) => ({
  cash:          'Cash',
  bank_transfer: 'Bank Transfer',
  online:        'Online',
  cheque:        'Cheque',
}[m] || '—');

export default function Payment() {
  const [salaries, setSalaries]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchSalaries = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterYear)   params.append('year',   filterYear);
      if (filterMonth)  params.append('month',  filterMonth);
      if (filterStatus) params.append('status', filterStatus);
      const res = await axios.get(`${baseApi}/salary/my?${params}`, getAuthHeaders());
      if (res.data.success) setSalaries(res.data.salaries || []);
      else setError('Failed to load salary records');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load salary records');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSalaries(); }, [filterYear, filterMonth, filterStatus]);

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); }
  }, [error]);

  const totalPaid    = salaries.filter(s => s.status === 'paid').reduce((a, s) => a + s.amount, 0);
  const totalPending = salaries.filter(s => s.status === 'pending').reduce((a, s) => a + s.amount, 0);
  const totalOverdue = salaries.filter(s => s.status === 'overdue').reduce((a, s) => a + s.amount, 0);

  const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 });

  const today = new Date();

  const selectCls = 'bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-gray-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors cursor-pointer';

  return (
    <div className="text-gray-100 space-y-5">

      {/* ── Hero Banner ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600/25 via-blue-500/10 to-gray-900 border border-blue-500/20 rounded-2xl px-6 py-5">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
              <Wallet size={22} className="text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-100">My Payments</h1>
              <p className="text-xs text-gray-400 mt-0.5">Track your salary payments from school</p>
            </div>
          </div>
          <div className="sm:ml-auto flex flex-wrap gap-2 items-center shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/60 border border-gray-700/60 px-3 py-1.5 rounded-lg">
              <CalendarDays size={11} className="text-blue-400" />
              {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <button onClick={fetchSalaries}
              className="p-2 bg-gray-800/60 border border-gray-700/60 rounded-lg text-gray-400 hover:text-blue-400 hover:border-blue-500/40 transition-colors">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', count: salaries.length, icon: <DollarSign size={18}/>,   color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   isAmt: false },
          { label: 'Paid',          count: totalPaid,        icon: <CheckCircle2 size={18}/>, color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  isAmt: true  },
          { label: 'Pending',       count: totalPending,     icon: <Clock size={18}/>,        color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', isAmt: true  },
          { label: 'Overdue',       count: totalOverdue,     icon: <AlertTriangle size={18}/>,color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    isAmt: true  },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 flex items-center gap-3`}>
            <div className={`p-2 rounded-lg ${s.bg} border ${s.border} ${s.color} shrink-0`}>{s.icon}</div>
            <div className="min-w-0">
              <p className={`font-bold leading-none ${s.color} ${s.isAmt ? 'text-base' : 'text-2xl'} truncate`}>
                {s.isAmt ? fmt(s.count) : s.count}
              </p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <div className="flex items-center gap-2"><AlertTriangle size={14}/>{error}</div>
          <button onClick={() => setError('')}><X size={14}/></button>
        </div>
      )}

      {/* ── Filter Bar ─────────────────────────────────────────────── */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <Filter size={12} className="text-blue-400" /> Filters:
          </div>

          {/* Year */}
          <div className="relative">
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className={selectCls}>
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Month */}
          <div className="relative">
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className={selectCls}>
              <option value="">All Months</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Status pills */}
          <div className="flex gap-2 flex-wrap">
            {[['', 'All'], ['paid', 'Paid'], ['pending', 'Pending'], ['overdue', 'Overdue']].map(([v, l]) => (
              <button key={v} onClick={() => setFilterStatus(v)}
                className={['px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border', filterStatus === v ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-700/50 text-gray-400 border-gray-600/60 hover:bg-gray-700 hover:text-gray-200'].join(' ')}>
                {l}
              </button>
            ))}
          </div>

          {(filterYear || filterMonth || filterStatus) && (
            <button onClick={() => { setFilterYear(''); setFilterMonth(''); setFilterStatus(''); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors ml-auto">
              <X size={12}/> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Records ────────────────────────────────────────────────── */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700/60 bg-gray-800/60">
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-blue-400" />
            <span className="font-semibold text-gray-100 text-sm">Salary Records</span>
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full ml-0.5">{salaries.length}</span>
          </div>
          {loading && <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />}
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-700/30 rounded-xl animate-pulse" />)}
          </div>
        ) : salaries.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center px-6">
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <Wallet size={36} className="text-blue-400" />
            </div>
            <p className="font-semibold text-gray-300">No Salary Records Found</p>
            <p className="text-sm text-gray-500 max-w-xs">
              {filterYear || filterMonth || filterStatus ? 'Try adjusting your filters.' : 'No salary records have been added yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-700/60 bg-gray-900/40">
                  <tr>
                    {['Month & Year', 'Amount', 'Status', 'Due Date', 'Paid Date', 'Method', 'Note'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/40">
                  {salaries.map(s => {
                    const b = statusBadge(s.status);
                    return (
                      <tr key={s._id} className="hover:bg-blue-500/5 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-200">{s.month} {s.year}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-blue-400">{fmt(s.amount)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${b.cls}`}>
                            {b.icon} {b.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {s.dueDate ? new Date(s.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {s.paidDate ? new Date(s.paidDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-gray-600">Not paid yet</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{methodLabel(s.paymentMethod)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{s.description || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-3 space-y-3">
              {salaries.map(s => {
                const b = statusBadge(s.status);
                const leftBorder = s.status === 'paid' ? 'border-l-green-500' : s.status === 'overdue' ? 'border-l-red-500' : 'border-l-yellow-500';
                return (
                  <div key={s._id} className={`bg-gray-800/60 border border-gray-700/60 border-l-4 ${leftBorder} rounded-xl p-4`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-100">{s.month} {s.year}</p>
                        <p className="text-blue-400 font-bold text-lg leading-tight">{fmt(s.amount)}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${b.cls}`}>
                        {b.icon} {b.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Due: {s.dueDate ? new Date(s.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                      {s.paidDate && <span className="text-green-400">Paid: {new Date(s.paidDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                      {s.paymentMethod && <span>Via: {methodLabel(s.paymentMethod)}</span>}
                    </div>
                    {s.description && <p className="text-gray-600 text-xs mt-1.5 italic">{s.description}</p>}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
