import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { baseApi } from '../../../environment';
import {
  Wallet, Plus, CheckCircle, Clock, AlertTriangle,
  Users, Filter, X, XCircle, RefreshCw, Edit, Trash2, Check,
} from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - 2 + i);

const STATUS = {
  paid:    { label: 'Paid',    bg: 'bg-green-500/15',  text: 'text-green-400',  border: 'border-green-500/30',  Icon: CheckCircle   },
  pending: { label: 'Pending', bg: 'bg-gray-500/15',   text: 'text-gray-400',   border: 'border-gray-500/30',   Icon: Clock         },
  overdue: { label: 'Overdue', bg: 'bg-red-500/15',    text: 'text-red-400',    border: 'border-red-500/30',    Icon: AlertTriangle },
};

const hdrs = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const fmt = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const emptyForm = {
  teacherId: '', amount: '', month: '', year: new Date().getFullYear(),
  dueDate: '', paidDate: '', status: 'pending', paymentMethod: '', description: '',
};

export default function Salary() {
  const [salaries,  setSalaries]  = useState([]);
  const [teachers,  setTeachers]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [msg,       setMsg]       = useState({ text: '', type: '' });

  // Default to current month / year so all teachers appear immediately
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [filterMonth,   setFilterMonth]   = useState(MONTHS[new Date().getMonth()]);
  const [filterYear,    setFilterYear]    = useState(String(CURRENT_YEAR));

  const [modal,   setModal]   = useState(null);
  const [form,    setForm]    = useState(emptyForm);
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState('');

  const [payModal, setPayModal] = useState(null);
  const [payForm,  setPayForm]  = useState({ status: 'paid', paymentMethod: '', paidDate: '' });
  const [paying,   setPaying]   = useState(false);

  const [delId,    setDelId]    = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showMsg = useCallback((text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  }, []);

  const loadTeachers = useCallback(async () => {
    try {
      const res = await axios.get(`${baseApi}/teacher/fetch-with-query`, hdrs());
      if (res.data.success) setTeachers(res.data.teachers || []);
    } catch { /* ignore */ }
  }, []);

  const loadSalaries = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterTeacher) params.teacherId = filterTeacher;
      if (filterStatus)  params.status    = filterStatus;
      if (filterMonth)   params.month     = filterMonth;
      if (filterYear)    params.year      = filterYear;
      const res = await axios.get(`${baseApi}/salary/all`, { ...hdrs(), params });
      if (res.data.success) setSalaries(res.data.salaries || []);
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to load salaries', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterTeacher, filterStatus, filterMonth, filterYear, showMsg]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadTeachers(); }, []);
  useEffect(() => { loadSalaries(); }, [loadSalaries]);

  // ─── Merged display rows ──────────────────────────────────────────────────
  // When a month + year are selected, show ALL teachers — those with an existing
  // salary record show their real status; those without get a virtual "pending" row.
  const displayRows = useMemo(() => {
    const isMerged = !!filterMonth && !!filterYear;
    if (!isMerged) {
      // No period selected — only show real records
      return salaries;
    }

    const base = filterTeacher
      ? teachers.filter(t => t._id === filterTeacher)
      : teachers;

    const rows = base.map(teacher => {
      const record = salaries.find(s => {
        const tid = typeof s.teacher === 'object' ? s.teacher._id : s.teacher;
        return tid === teacher._id;
      });
      if (record) return { ...record, _virtual: false };
      return {
        _id:           null,
        _virtual:      true,
        teacher,
        amount:        teacher.salary || 0,
        month:         filterMonth,
        year:          Number(filterYear),
        status:        'pending',
        dueDate:       null,
        paidDate:      null,
        paymentMethod: null,
      };
    });

    return filterStatus ? rows.filter(r => r.status === filterStatus) : rows;
  }, [teachers, salaries, filterMonth, filterYear, filterTeacher, filterStatus]);

  // Stats derived from displayRows
  const derivedStats = useMemo(() => ({
    paid:    displayRows.filter(r => r.status === 'paid').reduce((s, r) => s + (Number(r.amount) || 0), 0),
    pending: displayRows.filter(r => r.status === 'pending').reduce((s, r) => s + (Number(r.amount) || 0), 0),
    overdue: displayRows.filter(r => r.status === 'overdue').reduce((s, r) => s + (Number(r.amount) || 0), 0),
  }), [displayRows]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(emptyForm);
    setFormErr('');
    setModal({ mode: 'create' });
  };

  const openEdit = (row) => {
    setForm({
      teacherId:     typeof row.teacher === 'object' ? row.teacher._id : row.teacher,
      amount:        row.amount || '',
      month:         row.month  || filterMonth || '',
      year:          row.year   || Number(filterYear) || CURRENT_YEAR,
      dueDate:       row.dueDate  ? row.dueDate.split('T')[0]  : '',
      paidDate:      row.paidDate ? row.paidDate.split('T')[0] : '',
      status:        row.status        || 'pending',
      paymentMethod: row.paymentMethod || '',
      description:   row.description  || '',
    });
    setFormErr('');
    // Virtual row → create modal; real row → edit modal
    setModal(row._virtual ? { mode: 'create' } : { mode: 'edit', record: row });
  };

  const handleTeacherSelect = (e) => {
    const tid = e.target.value;
    const teacher = teachers.find(t => t._id === tid);
    setForm(prev => ({
      ...prev,
      teacherId: tid,
      amount: teacher?.salary ? String(teacher.salary) : prev.amount,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.teacherId || !form.amount || !form.month || !form.year || !form.dueDate) {
      setFormErr('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    setFormErr('');
    try {
      let res;
      if (modal.mode === 'create') {
        res = await axios.post(`${baseApi}/salary/create`, form, hdrs());
      } else {
        res = await axios.put(`${baseApi}/salary/update/${modal.record._id}`, form, hdrs());
      }
      if (res.data.success) {
        showMsg(modal.mode === 'create' ? 'Salary record created!' : 'Salary record updated!');
        setModal(null);
        loadSalaries();
      } else {
        setFormErr(res.data.message || 'Operation failed');
      }
    } catch (err) {
      setFormErr(err.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const openPayModal = (row) => {
    setPayModal(row);
    setPayForm({
      status:        row._virtual ? 'paid' : (row.status || 'pending'),
      paymentMethod: row.paymentMethod || '',
      paidDate:      row.paidDate ? row.paidDate.split('T')[0] : new Date().toISOString().split('T')[0],
    });
  };

  const handleSavePay = async () => {
    if (!payModal) return;
    setPaying(true);
    try {
      let res;
      if (payModal._id === null) {
        // Virtual row — create a new record
        const due = new Date();
        due.setDate(due.getDate() + 7);
        res = await axios.post(`${baseApi}/salary/create`, {
          teacherId:     payModal.teacher._id,
          amount:        payModal.amount || payModal.teacher.salary,
          month:         payModal.month,
          year:          payModal.year,
          dueDate:       due.toISOString().split('T')[0],
          status:        payForm.status,
          paymentMethod: payForm.paymentMethod || undefined,
          paidDate:      payForm.status === 'paid' ? payForm.paidDate : undefined,
        }, hdrs());
      } else {
        res = await axios.put(`${baseApi}/salary/update/${payModal._id}`, {
          ...payModal,
          teacher:       typeof payModal.teacher === 'object' ? payModal.teacher._id : payModal.teacher,
          teacherId:     typeof payModal.teacher === 'object' ? payModal.teacher._id : payModal.teacher,
          status:        payForm.status,
          paymentMethod: payForm.paymentMethod || null,
          paidDate:      payForm.status === 'paid' ? payForm.paidDate : null,
        }, hdrs());
      }
      if (res.data.success) {
        showMsg('Payment status updated');
        setPayModal(null);
        loadSalaries();
      }
    } catch {
      showMsg('Failed to update payment status', 'error');
    } finally {
      setPaying(false);
    }
  };

  const handleDelete = async () => {
    if (!delId) return;
    setDeleting(true);
    try {
      const res = await axios.delete(`${baseApi}/salary/delete/${delId}`, hdrs());
      if (res.data.success) {
        showMsg('Salary record deleted');
        setDelId(null);
        loadSalaries();
      }
    } catch {
      showMsg('Failed to delete record', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const paidCount    = displayRows.filter(r => r.status === 'paid').length;
  const pendingCount = displayRows.filter(r => r.status === 'pending').length;
  const overdueCount = displayRows.filter(r => r.status === 'overdue').length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/15 rounded-xl border border-orange-500/20">
            <Wallet className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Salary Management</h1>
            <p className="text-sm text-gray-500">
              {filterMonth && filterYear
                ? `Showing all teachers for ${filterMonth} ${filterYear}`
                : 'Track and manage teacher salary payments'}
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Salary Record
        </button>
      </div>

      {/* Toast */}
      {msg.text && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          msg.type === 'error'
            ? 'bg-red-900/20 border-red-700/40 text-red-300'
            : 'bg-green-900/20 border-green-700/40 text-green-300'
        }`}>
          {msg.type === 'error' ? <XCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{msg.text}</span>
          <button onClick={() => setMsg({ text: '', type: '' })} className="opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-green-500/15"><CheckCircle className="w-4 h-4 text-green-400" /></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Paid</span>
          </div>
          <p className="text-xl font-bold text-green-400">{fmt(derivedStats.paid)}</p>
          <p className="text-xs text-gray-600 mt-1">{paidCount} teacher{paidCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-gray-500/15"><Clock className="w-4 h-4 text-gray-400" /></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-xl font-bold text-gray-400">{fmt(derivedStats.pending)}</p>
          <p className="text-xs text-gray-600 mt-1">{pendingCount} teacher{pendingCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-red-500/15"><AlertTriangle className="w-4 h-4 text-red-400" /></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overdue</span>
          </div>
          <p className="text-xl font-bold text-red-400">{fmt(derivedStats.overdue)}</p>
          <p className="text-xs text-gray-600 mt-1">{overdueCount} teacher{overdueCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-orange-500/15"><Users className="w-4 h-4 text-orange-400" /></div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Teachers</span>
          </div>
          <p className="text-xl font-bold text-orange-400">{teachers.length}</p>
          <p className="text-xs text-gray-600 mt-1">registered</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-orange-400 font-semibold">
            <Filter className="w-4 h-4" /> Filters
          </div>

          <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 cursor-pointer">
            <option value="">All Teachers</option>
            {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 cursor-pointer">
            <option value="">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>

          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 cursor-pointer">
            <option value="">All Months</option>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>

          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 cursor-pointer">
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {(filterTeacher || filterStatus || filterMonth || filterYear) && (
            <button
              onClick={() => { setFilterTeacher(''); setFilterStatus(''); setFilterMonth(''); setFilterYear(''); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 hover:text-gray-200 border border-gray-700 rounded-xl transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}

          <button onClick={loadSalaries}
            className="ml-auto flex items-center gap-2 px-3 py-2 text-sm text-gray-400 bg-gray-700/60 hover:bg-gray-700 rounded-xl transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {filterMonth && filterYear && (
          <p className="text-xs text-gray-500">
            Showing <span className="text-orange-400 font-medium">{displayRows.length}</span> teachers for {filterMonth} {filterYear}
            {pendingCount > 0 && <span className="ml-2 text-gray-400">&mdash; <span className="text-amber-400 font-medium">{pendingCount} unpaid</span></span>}
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : displayRows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-500">
            <Wallet className="w-12 h-12 opacity-20" />
            <p className="text-sm">
              {teachers.length === 0
                ? 'No teachers found. Add teachers first.'
                : 'No records match the current filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-700/60 bg-gray-800/60">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Period</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Due Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Paid On</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Method</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/40">
                {displayRows.map((row, idx) => {
                  const status  = row.status || 'pending';
                  const sc      = STATUS[status] || STATUS.pending;
                  const SIcon   = sc.Icon;
                  const teacher = typeof row.teacher === 'object' ? row.teacher : null;

                  return (
                    <tr key={row._id || `v-${idx}`} className={`hover:bg-gray-700/20 transition-colors ${row._virtual ? 'opacity-80' : ''}`}>

                      {/* Teacher */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {teacher?.teacherImg ? (
                            <img src={teacher.teacherImg} alt={teacher.name}
                              className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-600" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-orange-500/15 border border-gray-600 flex items-center justify-center shrink-0">
                              <span className="text-sm font-semibold text-orange-400">
                                {(teacher?.name || 'T').charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-100 truncate">{teacher?.name || '—'}</p>
                            <p className="text-xs text-gray-500 truncate">{teacher?.email || ''}</p>
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 font-bold text-orange-400">
                        {row.amount ? fmt(row.amount) : <span className="text-gray-600 text-xs font-normal">Not set</span>}
                      </td>

                      {/* Period */}
                      <td className="px-4 py-3 text-gray-300 hidden sm:table-cell">{row.month} {row.year}</td>

                      {/* Due Date */}
                      <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">
                        {row._virtual ? <span className="text-gray-600">Auto</span> : fmtDate(row.dueDate)}
                      </td>

                      {/* Paid On */}
                      <td className="px-4 py-3 text-xs hidden md:table-cell">
                        {row.paidDate
                          ? <span className="text-green-400">{fmtDate(row.paidDate)}</span>
                          : <span className="text-gray-600">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                          <SIcon className="w-3 h-3" />
                          {sc.label}
                        </span>
                      </td>

                      {/* Method */}
                      <td className="px-4 py-3 text-xs text-gray-400 capitalize hidden lg:table-cell">
                        {row.paymentMethod?.replace('_', ' ') || '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Mark paid / update button */}
                          <button
                            onClick={() => openPayModal(row)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                              status === 'paid'
                                ? 'text-green-400 bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
                                : status === 'overdue'
                                ? 'text-red-400 bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
                                : 'text-orange-300 bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20'
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            {status === 'paid' ? 'Paid' : 'Mark Paid'}
                          </button>

                          {/* Edit */}
                          <button onClick={() => openEdit(row)}
                            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Delete — only for real records */}
                          {!row._virtual && (
                            <button onClick={() => setDelId(row._id)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setModal(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div>
                <h2 className="text-base font-semibold text-gray-100">
                  {modal.mode === 'create' ? 'Add Salary Record' : 'Edit Salary Record'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {modal.mode === 'create' ? 'Fill in the details to create a new record' : 'Update salary payment details'}
                </p>
              </div>
              <button onClick={() => setModal(null)} disabled={saving}
                className="text-gray-400 hover:text-gray-200 p-1 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {formErr && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-900/20 border border-red-700/40 text-red-300 rounded-xl text-sm">
                  <XCircle className="w-4 h-4 shrink-0" />{formErr}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Teacher *</label>
                <select value={form.teacherId} onChange={handleTeacherSelect} required
                  className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors cursor-pointer">
                  <option value="">Select a teacher...</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.name}{t.salary ? ` — ₹${Number(t.salary).toLocaleString('en-IN')}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Amount (₹) *</label>
                <input type="number" min="0" required value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="e.g. 25000"
                  className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors placeholder-gray-600" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Month *</label>
                  <select value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))} required
                    className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 transition-colors cursor-pointer">
                    <option value="">Select...</option>
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Year *</label>
                  <select value={form.year} onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 transition-colors cursor-pointer">
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Due Date *</label>
                <input type="date" required value={form.dueDate}
                  onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 transition-colors [color-scheme:dark]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'pending', label: 'Pending', active: 'border-gray-400/60 bg-gray-500/15 text-gray-200' },
                    { value: 'paid',    label: 'Paid',    active: 'border-green-500/60 bg-green-500/15 text-green-300' },
                    { value: 'overdue', label: 'Overdue', active: 'border-red-500/60 bg-red-500/15 text-red-300' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm(p => ({ ...p, status: opt.value }))}
                      className={`py-2 rounded-xl border text-sm font-semibold transition-all ${
                        form.status === opt.value ? opt.active : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.status === 'paid' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Payment Date</label>
                    <input type="date" value={form.paidDate}
                      onChange={e => setForm(p => ({ ...p, paidDate: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 transition-colors [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'cash', label: 'Cash' },
                        { value: 'bank_transfer', label: 'Bank Transfer' },
                        { value: 'online', label: 'Online' },
                        { value: 'cheque', label: 'Cheque' },
                      ].map(m => (
                        <button key={m.value} type="button"
                          onClick={() => setForm(p => ({ ...p, paymentMethod: m.value }))}
                          className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                            form.paymentMethod === m.value
                              ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
                              : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                          }`}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Notes (optional)</label>
                <textarea rows={2} value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Any additional notes..."
                  className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 transition-colors placeholder-gray-600 resize-none" />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 rounded-xl transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-[2] flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl disabled:opacity-50 transition-all">
                  {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {modal.mode === 'create' ? 'Create Record' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay / Update Status Modal */}
      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !paying && setPayModal(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div>
                <h2 className="text-base font-semibold text-gray-100">Update Payment</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {(typeof payModal.teacher === 'object' ? payModal.teacher?.name : '') || 'Teacher'} &mdash; {payModal.month} {payModal.year}
                </p>
              </div>
              <button onClick={() => setPayModal(null)} disabled={paying}
                className="text-gray-400 hover:text-gray-200 p-1 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-gray-400">Salary Amount</span>
                <span className="font-bold text-gray-100">{fmt(payModal.amount)}</span>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'pending', label: 'Pending', active: 'border-gray-400/60 bg-gray-500/15 text-gray-200' },
                    { value: 'paid',    label: 'Paid',    active: 'border-green-500/60 bg-green-500/15 text-green-300' },
                    { value: 'overdue', label: 'Overdue', active: 'border-red-500/60 bg-red-500/15 text-red-300' },
                  ].map(opt => (
                    <button key={opt.value}
                      onClick={() => setPayForm(p => ({ ...p, status: opt.value }))}
                      className={`py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        payForm.status === opt.value ? opt.active : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {payForm.status === 'paid' && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Date</p>
                    <input type="date" value={payForm.paidDate}
                      onChange={e => setPayForm(p => ({ ...p, paidDate: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 transition-colors [color-scheme:dark]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Method</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'cash', label: 'Cash' },
                        { value: 'bank_transfer', label: 'Bank Transfer' },
                        { value: 'online', label: 'Online' },
                        { value: 'cheque', label: 'Cheque' },
                      ].map(m => (
                        <button key={m.value}
                          onClick={() => setPayForm(p => ({ ...p, paymentMethod: m.value }))}
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
                </>
              )}
            </div>

            <div className="flex gap-2 justify-end px-6 py-4 border-t border-gray-700">
              <button onClick={() => setPayModal(null)} disabled={paying}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 rounded-lg transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSavePay} disabled={paying}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg disabled:opacity-50 transition-all">
                {paying && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setDelId(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-500/10 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-bold text-gray-100">Delete Salary Record</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6">Are you sure? This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDelId(null)} disabled={deleting}
                className="flex-1 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 rounded-xl transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50 transition-colors">
                {deleting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
