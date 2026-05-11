import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { baseApi } from '../../../environment';
import { Spinner } from '../../../components/ui';
import { buildFeeTimelineRows } from './feeTimeline';
import {
  CreditCard, Settings, RefreshCw, CheckCircle, Clock,
  AlertCircle, Users, Filter, MinusCircle, X, Plus, XCircle,
} from 'lucide-react';

// ─── Term definitions ─────────────────────────────────────────────────────────
const TERM_DEFS = {
  'half-yearly': [
    { key: 'H1', label: 'Term 1 (Jan – Jun)' },
    { key: 'H2', label: 'Term 2 (Jul – Dec)' },
  ],
  quarterly: [
    { key: 'Q1', label: 'Q1 (Jan – Mar)' },
    { key: 'Q2', label: 'Q2 (Apr – Jun)' },
    { key: 'Q3', label: 'Q3 (Jul – Sep)' },
    { key: 'Q4', label: 'Q4 (Oct – Dec)' },
  ],
  monthly: ['January','February','March','April','May','June',
            'July','August','September','October','November','December']
    .map(m => ({ key: m, label: m })),
  annual: [{ key: 'Annual', label: 'Full Year' }],
};

const getCurrentTerm = (freq) => {
  const m = new Date().getMonth();
  if (freq === 'half-yearly') return m < 6 ? 'H1' : 'H2';
  if (freq === 'quarterly')   return ['Q1','Q1','Q1','Q2','Q2','Q2','Q3','Q3','Q3','Q4','Q4','Q4'][m];
  if (freq === 'monthly')     return TERM_DEFS.monthly[m].key;
  return 'Annual';
};

const getDefaultDueDate = (term, year, freq) => {
  if (freq === 'monthly') {
    const idx = TERM_DEFS.monthly.findIndex(t => t.key === term);
    const lastDay = new Date(year, idx + 1, 0).getDate();
    return `${year}-${String(idx + 1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
  }
  const map = {
    'half-yearly': { H1: `${year}-06-30`, H2: `${year}-12-31` },
    quarterly:     { Q1: `${year}-03-31`, Q2: `${year}-06-30`, Q3: `${year}-09-30`, Q4: `${year}-12-31` },
    annual:        { Annual: `${year}-12-31` },
  };
  return map[freq]?.[term] || `${year}-12-31`;
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  paid:        { label: 'Paid',      bg: 'bg-green-500/15',  text: 'text-green-400',  border: 'border-green-500/30',  Icon: CheckCircle  },
  partial:     { label: 'Partial',   bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/30', Icon: MinusCircle  },
  pending:     { label: 'Pending',   bg: 'bg-gray-500/15',   text: 'text-gray-400',   border: 'border-gray-500/30',   Icon: Clock        },
  overdue:     { label: 'Overdue',   bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30',    Icon: AlertCircle  },
  'no-record': { label: 'No Record', bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', Icon: CreditCard   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const hdrs = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmt  = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ─── Component ────────────────────────────────────────────────────────────────
export default function Fee() {
  const [frequency,    setFrequency]    = useState('half-yearly');
  const [selectedTerm, setSelectedTerm] = useState('H1');
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [filterClass,  setFilterClass]  = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [classes,  setClasses]  = useState([]);
  const [overview, setOverview] = useState([]);
  const [loading,  setLoading]  = useState(false);

  const [showSettings,   setShowSettings]   = useState(false);
  const [settingsFreq,   setSettingsFreq]   = useState('half-yearly');
  const [savingSettings, setSavingSettings] = useState(false);
  const [generating,     setGenerating]     = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [payModal, setPayModal] = useState(null); // row object
  const [payForm,  setPayForm]  = useState({ status: 'paid', paymentMethod: 'cash', paidAmount: '' });
  const [paying,   setPaying]   = useState(false);

  // ── Load settings + classes on mount ────────────────────────────────────────
  const loadMeta = useCallback(async () => {
    const [sRes, cRes] = await Promise.allSettled([
      axios.get(`${baseApi}/fee/settings`, hdrs()),
      axios.get(`${baseApi}/class/all`,    hdrs()),
    ]);
    if (sRes.status === 'fulfilled' && sRes.value.data.success) {
      const freq = sRes.value.data.feeFrequency || 'half-yearly';
      setFrequency(freq);
      setSettingsFreq(freq);
      setSelectedTerm(getCurrentTerm(freq));
    }
    if (cRes.status === 'fulfilled') {
      setClasses(cRes.value.data.classes || cRes.value.data.data || []);
    }
  }, []);

  // ── Load student overview ────────────────────────────────────────────────────
  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      // fetch students (optionally by class)
      const sParams = {};
      if (filterClass) sParams.studentClass = filterClass;
      const studentsRes = await axios.get(`${baseApi}/student/fetch-with-query`, { ...hdrs(), params: sParams });
      const students = studentsRes.data.success ? (studentsRes.data.students || []) : [];

      // fetch all fee records for these students
      const feesRes = await axios.get(`${baseApi}/fee/all`, { ...hdrs() });
      const fees = feesRes.data.success ? (feesRes.data.fees || []) : [];

      // Build timeline rows based on current frequency setting
      const rows = buildFeeTimelineRows(students, fees, frequency, new Date());

      // Filter rows by selected term/year/class/status
      let filtered = rows;
      
      if (filterClass) filtered = filtered.filter(r => String(r.class?._id) === String(filterClass));
      if (filterStatus) filtered = filtered.filter(r => (r.fee?.status || 'no-record') === filterStatus);
      if (selectedTerm) filtered = filtered.filter(r => r.term === selectedTerm);
      if (selectedYear) filtered = filtered.filter(r => Number(r.year) === Number(selectedYear));

      setOverview(filtered);
    } catch (err) {
      console.error('❌ loadOverview error:', err);
    } finally { setLoading(false); }
  }, [selectedTerm, selectedYear, filterClass, filterStatus, frequency]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { loadOverview(); }, [loadOverview]);
  useEffect(() => { setSelectedTerm(getCurrentTerm(frequency)); }, [frequency]);
  useEffect(() => {
    if (msg.text) {
      const t = setTimeout(() => setMsg({ text: '', type: '' }), 4000);
      return () => clearTimeout(t);
    }
  }, [msg.text]);

  const showMsg = (text, type = 'success') => setMsg({ text, type });

  // ── Stats derived from current overview ──────────────────────────────────────
  const stats = overview.reduce((acc, row) => {
    if (!row.fee) { acc.noRecord++; return acc; }
    acc[row.fee.status] = (acc[row.fee.status] || 0) + 1;
    // for partial: count the amount actually paid, for others count full amount
    const amt = (row.fee.status === 'partial' && row.fee.paidAmount != null)
      ? row.fee.paidAmount
      : (row.fee.amount || 0);
    acc[`${row.fee.status}Amt`] = (acc[`${row.fee.status}Amt`] || 0) + amt;
    return acc;
  }, { paid: 0, partial: 0, pending: 0, overdue: 0, noRecord: 0, paidAmt: 0, partialAmt: 0, pendingAmt: 0, overdueAmt: 0 });

  // ── Open payment modal ────────────────────────────────────────────────────────
  const openPayModal = (row) => {
    setPayModal(row);
    setPayForm({
      status:        row.fee?.status        || 'paid',
      paymentMethod: row.fee?.paymentMethod || 'cash',
      paidAmount:    '',
    });
  };

  // ── Save payment status from modal ────────────────────────────────────────────
  const handleSavePayment = async () => {
    if (!payModal) return;
    setPaying(true);
    try {
      let feeId = payModal.fee?._id;

      if (!feeId) {
        // Fetch fresh school settings to ensure consistency
        const settingsRes = await axios.get(`${baseApi}/fee/settings`, hdrs());
        const schoolFrequency = settingsRes.data.feeFrequency || frequency || 'half-yearly';

        const genRes = await axios.post(`${baseApi}/fee/bulk-generate`, {
          term: selectedTerm, 
          year: selectedYear, 
          frequency: schoolFrequency,
          dueDate: getDefaultDueDate(selectedTerm, selectedYear, schoolFrequency),
          studentIds: [payModal.student._id],
        }, hdrs());

        if (!genRes.data.success) { 
          showMsg(genRes.data.message || 'Failed to create record', 'error'); 
          return; 
        }

        const ovRes = await axios.get(`${baseApi}/fee/overview`, {
          ...hdrs(), params: { term: selectedTerm, year: selectedYear },
        });
        const updated = (ovRes.data.overview || []).find(r => String(r.student._id) === String(payModal.student._id));
        feeId = updated?.fee?._id;
      }

      if (feeId) {
        const payload = {
          status:        payForm.status,
          paymentMethod: payForm.paymentMethod || null,
          paidAmount:    payForm.paidAmount ? Number(payForm.paidAmount) : null,
        };

        await axios.put(`${baseApi}/fee/update-status/${feeId}`, payload, hdrs());

        showMsg(`${payModal.student.name}'s payment status updated`);
        setPayModal(null);
        await loadOverview();
      }
    } catch {
      showMsg('Failed to update payment status', 'error');
    } finally {
      setPaying(false);
    }
  };

  // ── Bulk generate all fee records for this term ───────────────────────────────
  const handleBulkGenerate = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${baseApi}/fee/bulk-generate`, {
        term: selectedTerm, year: selectedYear, frequency,
        dueDate: getDefaultDueDate(selectedTerm, selectedYear, frequency),
        classId: filterClass || undefined,
      }, hdrs());
      showMsg(res.data.message || 'Fees generated');
      loadOverview();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to generate fees', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // ── Save frequency settings ───────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await axios.put(`${baseApi}/fee/settings`, { feeFrequency: settingsFreq }, hdrs());
      setFrequency(settingsFreq);
      showMsg('Fee settings saved');
      setShowSettings(false);
    } catch {
      showMsg('Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const terms     = TERM_DEFS[frequency] || TERM_DEFS['half-yearly'];
  const termLabel = terms.find(t => t.key === selectedTerm)?.label || selectedTerm;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/15 rounded-xl border border-orange-500/20">
            <CreditCard className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Fee Management</h1>
            <p className="text-sm text-gray-500">Track and manage student fee payments</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setShowSettings(true); setSettingsFreq(frequency); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 bg-gray-800 border border-gray-700 rounded-xl hover:bg-gray-700 hover:text-gray-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            onClick={handleBulkGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl transition-all disabled:opacity-50"
          >
            {generating ? <Spinner size="sm" color="white" /> : <Plus className="w-4 h-4" />}
            Generate Fees
          </button>
        </div>
      </div>

      {/* ── Toast ── */}
      {msg.text && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'error'
            ? 'bg-red-900/20 border-red-700/40 text-red-300'
            : 'bg-green-900/20 border-green-700/40 text-green-300'
        }`}>
          {msg.type === 'error'
            ? <XCircle className="w-4 h-4 shrink-0" />
            : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{msg.text}</span>
          <button onClick={() => setMsg({ text: '', type: '' })} className="opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { key: 'paid',     label: 'Collected', Icon: CheckCircle,  colorCls: 'text-green-400',  bgCls: 'bg-green-500/15',  amt: stats.paidAmt,    count: stats.paid    },
          { key: 'partial',  label: 'Partial',   Icon: MinusCircle,  colorCls: 'text-yellow-400', bgCls: 'bg-yellow-500/15', amt: stats.partialAmt, count: stats.partial  },
          { key: 'pending',  label: 'Pending',   Icon: Clock,        colorCls: 'text-gray-400',   bgCls: 'bg-gray-500/15',   amt: stats.pendingAmt, count: stats.pending  },
          { key: 'overdue',  label: 'Overdue',   Icon: AlertCircle,  colorCls: 'text-red-400',    bgCls: 'bg-red-500/15',    amt: stats.overdueAmt, count: stats.overdue  },
          { key: 'noRecord', label: 'No Record', Icon: Users,        colorCls: 'text-orange-400', bgCls: 'bg-orange-500/15', amt: null,             count: stats.noRecord },
        ].map((item) => {
          const StatIcon = item.Icon;
          return (
            <div key={item.key} className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${item.bgCls}`}>
                  <StatIcon className={`w-4 h-4 ${item.colorCls}`} />
                </div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.label}</span>
              </div>
              {item.amt != null
                ? <p className={`text-xl font-bold ${item.colorCls}`}>{fmt(item.amt)}</p>
                : <p className={`text-3xl font-bold ${item.colorCls}`}>{item.count}</p>
              }
              {item.amt != null && (
                <p className="text-xs text-gray-500 mt-1">{item.count} student{item.count !== 1 ? 's' : ''}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Filters ── */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-orange-400 font-semibold">
            <Filter className="w-4 h-4" /> Filters
          </div>

          <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 cursor-pointer transition-colors">
            {terms.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>

          <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 cursor-pointer transition-colors">
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 cursor-pointer transition-colors">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.classText}</option>)}
          </select>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 cursor-pointer transition-colors">
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>

          <button onClick={loadOverview}
            className="ml-auto flex items-center gap-2 px-3 py-2 text-sm text-gray-400 bg-gray-700/60 hover:bg-gray-700 rounded-xl transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Showing: <span className="text-orange-400 font-medium">{termLabel} {selectedYear}</span>
          <span className="ml-2 opacity-50 capitalize">({frequency})</span>
        </p>
      </div>

      {/* ── Student list ── */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" color="orange" /></div>
        ) : overview.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-500">
            <CreditCard className="w-12 h-12 opacity-20" />
            <p className="text-sm">No students found for this period.</p>
            <button onClick={handleBulkGenerate} disabled={generating}
              className="mt-1 px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 transition-colors">
              {generating ? <Spinner size="sm" color="white" /> : 'Generate Fee Records'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-700/60 bg-gray-800/60">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Class</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Paid On</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40">
                {overview.map((row) => {
                  const feeKey  = row.fee?._id || `no_${row.student._id}`;
                  const status  = row.fee?.status || 'no-record';
                  const sc      = STATUS[status] || STATUS.pending;
                  const SIcon   = sc.Icon;

                  return (
                    <tr key={feeKey} className="hover:bg-gray-700/20 transition-colors">
                      {/* Student */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {row.student.studentImg ? (
                            <img src={row.student.studentImg} alt={row.student.name}
                              className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-600" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center shrink-0">
                              <span className="text-sm font-semibold text-gray-300">{row.student.name?.charAt(0)}</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-100 truncate">{row.student.name}</p>
                            <p className="text-xs text-gray-500 truncate">{row.student.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-gray-300 px-2 py-1 bg-gray-700/60 rounded-lg">
                          {row.class?.classText || '—'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 font-semibold text-gray-100">
                        {row.fee ? (
                          row.fee.status === 'partial' && row.fee.paidAmount != null
                            ? <span>{fmt(row.fee.paidAmount)} <span className="text-xs text-gray-500 font-normal">/ {fmt(row.fee.amount)}</span></span>
                            : fmt(row.fee.amount)
                        ) : fmt(row.totalFee ?? row.class?.classFee ?? 0)}
                      </td>

                      {/* Due date */}
                      <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                        {row.fee ? fmtDate(row.fee.dueDate) : '—'}
                      </td>

                      {/* Paid on */}
                      <td className="px-4 py-3 text-xs hidden md:table-cell">
                        {row.fee?.paidDate
                          ? <span className="text-green-400">{fmtDate(row.fee.paidDate)}</span>
                          : <span className="text-gray-600">—</span>}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                          <SIcon className="w-3 h-3" />
                          {sc.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openPayModal(row)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            status === 'paid'
                              ? 'text-green-400 bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
                              : status === 'partial'
                              ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                              : status === 'overdue'
                              ? 'text-red-400 bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                              : 'text-gray-300 bg-gray-700/60 border-gray-600 hover:bg-gray-700'
                          }`}
                        >
                          {sc.Icon && <sc.Icon className="w-3 h-3" />}
                          {status === 'no-record' ? 'Add Payment' : 'Update'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Payment Status Modal ── */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !paying && setPayModal(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div>
                <h2 className="text-base font-semibold text-gray-100">Update Payment</h2>
                <p className="text-xs text-gray-500 mt-0.5">{payModal.student.name}</p>
              </div>
              <button onClick={() => setPayModal(null)} disabled={paying}
                className="text-gray-400 hover:text-gray-200 p-1 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Fee summary */}
              <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl px-4 py-3 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Amount</span>
                  <span className="font-bold text-gray-100">
                    {fmt(payModal.fee?.amount ?? payModal.totalFee ?? payModal.class?.classFee ?? 0)}
                  </span>
                </div>
                {/* Breakdown: class fee + subject fees */}
                {(payModal.class || (payModal.subjects?.length > 0)) && (
                  <div className="border-t border-gray-700/60 pt-2 space-y-1">
                    {payModal.class && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Class ({payModal.class.classText})</span>
                        <span>{fmt(payModal.class.classFee)}</span>
                      </div>
                    )}
                    {(payModal.subjects || []).map(sub => {
                      const isIncluded = (payModal.class?.includedSubjects || []).includes(String(sub._id));
                      return (
                        <div key={sub._id} className="flex justify-between text-xs text-gray-500">
                          <span>{sub.subjectName}</span>
                          {isIncluded
                            ? <span className="text-green-500 font-semibold">Free</span>
                            : <span>+ {fmt(sub.subjectFee)}</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Status selector */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'paid',    label: 'Paid',    active: 'border-green-500/60 bg-green-500/15 text-green-300'   },
                    { value: 'partial', label: 'Partial', active: 'border-yellow-500/60 bg-yellow-500/15 text-yellow-300' },
                    { value: 'pending', label: 'Pending', active: 'border-gray-400/60 bg-gray-500/15 text-gray-200'       },
                    { value: 'overdue', label: 'Overdue', active: 'border-red-500/60 bg-red-500/15 text-red-300'          },
                  ].map(opt => (
                    <button key={opt.value}
                      onClick={() => setPayForm(prev => ({ ...prev, status: opt.value }))}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        payForm.status === opt.value
                          ? opt.active
                          : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment method — shown when paid or partial */}
              {(payForm.status === 'paid' || payForm.status === 'partial') && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Method</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'cash',          label: 'Cash'          },
                      { value: 'bank_transfer', label: 'Bank Transfer' },
                      { value: 'online',        label: 'Online'        },
                      { value: 'cheque',        label: 'Cheque'        },
                    ].map(m => (
                      <button key={m.value}
                        onClick={() => setPayForm(prev => ({ ...prev, paymentMethod: m.value }))}
                        className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                          payForm.paymentMethod === m.value
                            ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
                            : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                        }`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Amount paid — shown only for partial */}
              {payForm.status === 'partial' && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Amount Paid</p>
                  <input
                    type="number" min="0"
                    value={payForm.paidAmount}
                    onChange={e => setPayForm(prev => ({ ...prev, paidAmount: e.target.value }))}
                    placeholder="Enter amount paid..."
                    className="w-full px-3 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 text-sm outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors placeholder-gray-600"
                  />
                  {payModal.fee && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      Total due: <span className="text-gray-400 font-medium">{fmt(payModal.fee?.amount ?? payModal.totalFee ?? 0)}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-700">
              <button onClick={() => setPayModal(null)} disabled={paying}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 rounded-lg transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSavePayment} disabled={paying}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg disabled:opacity-50 transition-all">
                {paying && <Spinner size="sm" color="white" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings modal ── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-orange-400" /> Fee Settings
              </h2>
              <button onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-200 p-1 rounded-lg hover:bg-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-300 mb-3">Fee Collection Frequency</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'monthly',     label: 'Monthly',     desc: '12 payments / year' },
                    { value: 'quarterly',   label: 'Quarterly',   desc: '4 payments / year'  },
                    { value: 'half-yearly', label: 'Half-Yearly', desc: '2 payments / year'  },
                    { value: 'annual',      label: 'Annual',      desc: '1 payment / year'   },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setSettingsFreq(opt.value)}
                      className={`flex flex-col items-start px-4 py-3 rounded-xl border text-left transition-all ${
                        settingsFreq === opt.value
                          ? 'bg-orange-500/15 border-orange-500/50 text-orange-300'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}>
                      <span className="font-semibold text-sm">{opt.label}</span>
                      <span className="text-xs opacity-60 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 bg-gray-800/60 rounded-lg px-3 py-2 border border-gray-700/60">
                Changing the frequency only affects new periods. Existing fee records are not changed.
              </p>
            </div>

            <div className="flex gap-2 justify-end mt-6">
              <button onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveSettings} disabled={savingSettings}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg disabled:opacity-50 transition-all">
                {savingSettings && <Spinner size="sm" color="white" />}
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

