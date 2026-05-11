import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { baseApi } from '../../../environment';
import { Bell, Plus, Edit, Trash2, Search, Filter, RefreshCw, Star, Clock, ArrowLeft, Users, Megaphone, Calendar, AlertTriangle, CheckCircle, X, TrendingUp, CalendarDays, StickyNote } from 'lucide-react';
import { Spinner } from '../../../components/ui';

const Notice = () => {
  const [notices, setNotices] = useState([]);
  const [filteredNotices, setFilteredNotices] = useState([]);
  const [form, setForm] = useState({ title: '', message: '', audience: 'Student', isImportant: false, expiryDate: '' });
  const [editMode, setEditMode] = useState(false);
  const [currentNoticeId, setCurrentNoticeId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [audienceFilter, setAudienceFilter] = useState(() => {
    try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u.role === 'TEACHER' ? 'Student' : 'All'; }
    catch { return 'All'; }
  });
  const [importantFilter, setImportantFilter] = useState(false);
  const [expiredFilter, setExpiredFilter] = useState('active');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });

  const [userInfo] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return { role: user.role || 'STUDENT', id: user._id || user.id, schoolId: user.schoolId || null };
    } catch { return { role: 'STUDENT', id: null, schoolId: null }; }
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' } };
  };

  const isExpired = (d) => d && new Date(d) < new Date();

  const filterByExpiry = (list) => {
    if (expiredFilter === 'expired') return list.filter(n => isExpired(n.expiryDate));
    if (expiredFilter === 'active') return list.filter(n => !isExpired(n.expiryDate));
    return list;
  };

  const fetchNotices = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: pagination.limit });
      if (audienceFilter !== 'All') params.append('audience', audienceFilter);
      if (searchTerm) params.append('search', searchTerm);
      if (importantFilter) params.append('important', 'true');
      const res = await axios.get(`${baseApi}/notice/all?${params}`, getAuthHeaders());
      if (res.data?.success) {
        setNotices(res.data.data || []);
        setPagination(p => ({ ...p, page: res.data.pagination?.page || page, total: res.data.pagination?.total || 0, pages: res.data.pagination?.pages || 0 }));
      } else setNotices([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch notices');
      setNotices([]);
      if (err.response?.status === 401) { localStorage.clear(); window.location.href = '/login'; }
    } finally { setLoading(false); }
  }, [pagination.limit, audienceFilter, searchTerm, importantFilter]);

  useEffect(() => { fetchNotices(1); }, [fetchNotices]);
  useEffect(() => { setFilteredNotices(filterByExpiry(notices)); }, [notices, expiredFilter]);
  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const validateForm = () => {
    if (!form.title?.trim()) return 'Title is required';
    if (form.title.length > 100) return 'Title must be less than 100 characters';
    if (!form.message?.trim()) return 'Message is required';
    if (!form.audience) return 'Audience is required';
    if (form.expiryDate) {
      const today = new Date(); today.setHours(0,0,0,0);
      if (new Date(form.expiryDate) < today) return 'Expiry date cannot be in the past';
    }
    if (userInfo.role === 'TEACHER' && form.audience !== 'Student') return 'Teachers can only create notices for students';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ve = validateForm();
    if (ve) { setError(ve); return; }
    setSubmitting(true);
    try {
      const url = editMode ? `${baseApi}/notice/${currentNoticeId}` : `${baseApi}/notice/create`;
      const method = editMode ? 'put' : 'post';
      const data = { title: form.title.trim(), message: form.message.trim(), audience: form.audience, isImportant: form.isImportant };
      if (form.expiryDate) data.expiryDate = form.expiryDate;
      const res = await axios[method](url, data, getAuthHeaders());
      if (res.data?.success) {
        setSuccess(editMode ? 'Notice updated successfully' : 'Notice created successfully');
        resetForm(); setShowModal(false); fetchNotices(pagination.page);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
      if (err.response?.status === 401) { localStorage.clear(); window.location.href = '/login'; }
    } finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setForm({ title: '', message: '', audience: 'Student', isImportant: false, expiryDate: '' });
    setEditMode(false); setCurrentNoticeId(null);
  };

  const openCreateModal = () => { setModalType('create'); resetForm(); setShowModal(true); setError(''); };
  const openUpdateModal = (n) => {
    setModalType('update');
    setForm({ title: n.title||'', message: n.message||'', audience: n.audience||'Student', isImportant: n.isImportant||false,
      expiryDate: n.expiryDate ? new Date(n.expiryDate).toISOString().split('T')[0] : '' });
    setEditMode(true); setCurrentNoticeId(n._id); setShowModal(true); setError('');
  };
  const closeModal = () => { setShowModal(false); resetForm(); setError(''); };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      const res = await axios.delete(`${baseApi}/notice/${deleteId}`, getAuthHeaders());
      if (res.data?.success) { setSuccess('Notice deleted successfully'); fetchNotices(pagination.page); }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete notice');
      if (err.response?.status === 401) { localStorage.clear(); window.location.href = '/login'; }
    } finally { setSubmitting(false); setShowDeleteModal(false); setDeleteId(null); }
  };

  const handlePageChange = (p) => { if (p >= 1 && p <= pagination.pages) fetchNotices(p); };

  const canManageNotice = (n) => {
    if (userInfo.role !== 'SCHOOL' && userInfo.role !== 'TEACHER') return false;
    if (userInfo.role === 'TEACHER' && n.audience !== 'Student') return false;
    const uid = userInfo.id;
    return n.createdId === uid || n.creatorId === uid ||
      (typeof n.createdBy === 'string' && n.createdBy === uid) ||
      (n.creator && (typeof n.creator === 'object' ? (n.creator._id || n.creator.id) === uid : n.creator === uid));
  };

  const audienceColor = (a) => ({
    Student: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    Teacher: 'bg-green-500/15 text-green-400 border-green-500/30',
    All: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  }[a] || 'bg-gray-500/15 text-gray-400 border-gray-600');

  const expiredCount = notices.filter(n => isExpired(n.expiryDate)).length;
  const activeCount = notices.filter(n => !isExpired(n.expiryDate)).length;
  const isTeacher = userInfo.role === 'TEACHER';
  const hasActiveFilters = searchTerm || audienceFilter !== (isTeacher ? 'Student' : 'All') || importantFilter || expiredFilter !== 'active';
  const ac = {
    t3: isTeacher ? 'text-blue-300' : 'text-orange-300',
    t4: isTeacher ? 'text-blue-400' : 'text-orange-400',
    t5: isTeacher ? 'text-blue-500' : 'text-orange-500',
    bg10: isTeacher ? 'bg-blue-500/10' : 'bg-orange-500/10',
    bg20: isTeacher ? 'bg-blue-500/20' : 'bg-orange-500/20',
    bgS:  isTeacher ? 'bg-blue-500'    : 'bg-orange-500',
    bd15: isTeacher ? 'border-blue-500/15' : 'border-orange-500/15',
    bd20: isTeacher ? 'border-blue-500/20' : 'border-orange-500/20',
    bd30: isTeacher ? 'border-blue-500/30' : 'border-orange-500/30',
    bd40: isTeacher ? 'border-blue-500/40' : 'border-orange-500/40',
    heroGrad: isTeacher ? 'from-blue-600/25 via-blue-500/10 to-gray-900 border border-blue-500/20'  : 'from-orange-600/25 via-orange-500/10 to-gray-900 border border-orange-500/20',
    newBtn:   isTeacher ? 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-blue-500/20' : 'from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-orange-500/20',
    pill:     isTeacher ? 'bg-blue-500 text-white border-blue-500'   : 'bg-orange-500 text-white border-orange-500',
    sF:       isTeacher ? 'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'   : 'focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20',
    fF:       isTeacher ? 'focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'   : 'focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500',
    spin:     isTeacher ? 'border-blue-500/30 border-t-blue-500'     : 'border-orange-500/30 border-t-orange-500',
    hR:       isTeacher ? 'hover:text-blue-400 hover:border-blue-500/40'  : 'hover:text-orange-400 hover:border-orange-500/40',
    hC:       isTeacher ? 'hover:border-blue-500/40'   : 'hover:border-orange-500/40',
    hPg:      isTeacher ? 'hover:border-blue-500 hover:text-blue-400' : 'hover:border-orange-500 hover:text-orange-400',
    topBar:   isTeacher ? 'from-blue-500 via-blue-400 to-blue-500/20' : 'from-orange-500 via-orange-400 to-orange-500/20',
    rBar:     isTeacher ? 'from-blue-500/30 via-blue-500 to-blue-400' : 'from-orange-500/30 via-orange-500 to-orange-400',
    circle:   isTeacher ? 'rgba(59,130,246,'  : 'rgba(249,115,22,',
    fBg:      isTeacher ? 'bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10'   : 'bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10',
    fI:       isTeacher ? 'bg-blue-500/15 text-blue-500'  : 'bg-orange-500/15 text-orange-500',
    eBtn:     isTeacher ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'  : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20',
    cBtn:     isTeacher ? 'bg-blue-500 hover:bg-blue-600'  : 'bg-orange-500 hover:bg-orange-600',
    check:    isTeacher ? 'accent-blue-500'   : 'accent-orange-500',
  };

  /* ─── JSX ──────────────────────────────────────────────────────────────────── */
  const today = new Date();
  return (
    <div className="text-slate-100 space-y-5">

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden bg-gradient-to-r ${ac.heroGrad} rounded-2xl px-6 py-5`}>
        <div className={`absolute -right-8 -top-8 w-40 h-40 rounded-full ${ac.bg10} blur-2xl pointer-events-none`} />
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${ac.bg20} border ${ac.bd30}`}>
              <Bell size={22} className={ac.t3} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-100">Notice Board</h1>
              <p className="text-xs text-gray-400 mt-0.5">Post announcements to students, teachers, or everyone</p>
            </div>
          </div>
          <div className="sm:ml-auto flex flex-wrap gap-2 items-center shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/60 border border-gray-700/60 px-3 py-1.5 rounded-lg">
              <CalendarDays size={11} className={ac.t4} />
              {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <button onClick={() => fetchNotices(pagination.page)}
              className={`p-2 bg-gray-800/60 border border-gray-700/60 rounded-lg text-gray-400 ${ac.hR} transition-colors`}>
              <RefreshCw size={15} />
            </button>
            {(userInfo.role === 'SCHOOL' || userInfo.role === 'TEACHER') && (
              <button onClick={openCreateModal}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r ${ac.newBtn} rounded-xl transition-all shadow-lg`}>
                <Plus size={15} /> New Notice
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',     count: notices.length,  icon: <StickyNote size={18}/>,  color: ac.t4, bg: ac.bg10, border: ac.bd20 },
          { label: 'Active',    count: activeCount,     icon: <TrendingUp size={18}/>,   color: 'text-green-400',  bg: 'bg-green-500/10',   border: 'border-green-500/20'  },
          { label: 'Expired',   count: expiredCount,    icon: <Clock size={18}/>,        color: 'text-gray-400',   bg: 'bg-gray-700/30',    border: 'border-gray-600/40'   },
          { label: 'Important', count: notices.filter(n => n.isImportant).length, icon: <Star size={18}/>, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 flex items-center gap-3`}>
            <div className={`p-2 rounded-lg ${s.bg} border ${s.border} ${s.color} shrink-0`}>{s.icon}</div>
            <div>
              <p className={`text-2xl font-bold leading-none ${s.color}`}>{s.count}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <div className="flex items-center gap-2"><AlertTriangle size={14}/>{error}</div>
          <button onClick={() => setError('')}><X size={14}/></button>
        </div>
      )}
      {success && (
        <div className="flex items-center justify-between px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
          <div className="flex items-center gap-2"><CheckCircle size={14}/>{success}</div>
          <button onClick={() => setSuccess('')}><X size={14}/></button>
        </div>
      )}

      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-4 space-y-3">
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input type="text" placeholder="Search notices…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-8 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none ${ac.sF} transition-colors placeholder-gray-600`} />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"><X size={13}/></button>
            )}
          </div>
          {/* Important toggle */}
          <button
            onClick={() => setImportantFilter(p => !p)}
            className={['flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors shrink-0', importantFilter ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-gray-700/50 text-gray-400 border-gray-600/60 hover:bg-gray-700'].join(' ')}>
            <Star size={12}/> Important
          </button>
        </div>

        {/* Audience pills */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1"><Users size={11}/> Audience:</span>
          {(userInfo.role === 'TEACHER' ? ['Student'] : ['All', 'Student', 'Teacher']).map(a => (
            <button key={a} onClick={() => userInfo.role !== 'TEACHER' && setAudienceFilter(a)}
              className={['px-3 py-1 rounded-lg text-xs font-medium transition-colors border', audienceFilter === a ? ac.pill : userInfo.role === 'TEACHER' ? 'bg-gray-700/50 text-gray-500 border-gray-600/60 cursor-default' : 'bg-gray-700/50 text-gray-400 border-gray-600/60 hover:bg-gray-700 hover:text-gray-200'].join(' ')}>
              {a === 'All' ? 'All Audiences' : a}
            </button>
          ))}
          <span className="text-gray-700 mx-1">|</span>
          <span className="text-xs text-gray-500 font-medium flex items-center gap-1"><Filter size={11}/> Status:</span>
          {[['active','Active'], ['expired','Expired'], ['all','All']].map(([v, l]) => (
            <button key={v} onClick={() => setExpiredFilter(v)}
              className={['px-3 py-1 rounded-lg text-xs font-medium transition-colors border', expiredFilter === v ? ac.pill : 'bg-gray-700/50 text-gray-400 border-gray-600/60 hover:bg-gray-700 hover:text-gray-200'].join(' ')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Notice Grid ─────────────────────────────────────────────── */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl overflow-hidden">
        {/* Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700/60 bg-gray-800/60">
          <div className="flex items-center gap-2">
            <Bell size={14} className={ac.t4} />
            <span className="font-semibold text-gray-100 text-sm">Notices</span>
            <span className={`text-xs font-bold ${ac.t4} ${ac.bg10} border ${ac.bd20} px-2 py-0.5 rounded-full ml-0.5`}>{filteredNotices.length}</span>
          </div>
          {loading && <div className={`w-4 h-4 border-2 ${ac.spin} rounded-full animate-spin`} />}
        </div>

        {loading ? (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 bg-gray-700/30 rounded-xl animate-pulse" />)}
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center px-6">
            <div className={`p-4 rounded-2xl ${ac.bg10} border ${ac.bd20}`}>
              <Bell size={36} className={ac.t4} />
            </div>
            <p className="font-semibold text-gray-300">No Notices Found</p>
            <p className="text-sm text-gray-500 max-w-xs">{hasActiveFilters ? 'Try adjusting your filters.' : 'No notices have been posted yet.'}</p>
            {(userInfo.role === 'SCHOOL' || userInfo.role === 'TEACHER') && !hasActiveFilters && (
              <button onClick={openCreateModal}
                className={`mt-1 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white ${ac.cBtn} rounded-xl transition-colors`}>
                <Plus size={14}/> Post First Notice
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotices.map(notice => {
              const expired = isExpired(notice.expiryDate);
              const topColor = notice.isImportant ? 'bg-red-500' : expired ? 'bg-gray-600' : ac.bgS;
              return (
                <div key={notice._id} className={`bg-gray-800/70 border border-gray-700/60 rounded-xl overflow-hidden flex flex-col transition-all ${ac.hC} hover:shadow-lg hover:shadow-black/30 ${expired ? 'opacity-70' : ''}`}>
                  <div className={`h-0.5 ${topColor}`} />
                  <div className="p-4 flex flex-col flex-1">
                    {/* Title row */}
                    <div className="flex items-start gap-2 mb-2">
                      {notice.isImportant && (
                        <Star size={14} className="text-red-400 mt-0.5 shrink-0 fill-red-400" />
                      )}
                      <h3 className="font-bold text-gray-100 leading-snug flex-1 text-sm line-clamp-2">{notice.title}</h3>
                    </div>
                    {/* Message */}
                    <p className="text-gray-400 text-xs leading-relaxed mb-3 flex-1 line-clamp-3">{notice.message}</p>
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${audienceColor(notice.audience)}`}>{notice.audience}</span>
                      {notice.isImportant && (
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-red-500/10 text-red-400 border-red-500/25 flex items-center gap-1">
                          <Star size={9}/> Important
                        </span>
                      )}
                      {expired && (
                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-gray-500/10 text-gray-500 border-gray-600 flex items-center gap-1">
                          <Clock size={9}/> Expired
                        </span>
                      )}
                    </div>
                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-700/60">
                      <div className="flex items-center gap-1 text-gray-600 text-xs">
                        <Calendar size={10}/>
                        <span>{notice.expiryDate ? `Expires ${new Date(notice.expiryDate).toLocaleDateString()}` : 'No expiry'}</span>
                      </div>
                      {canManageNotice(notice) && (
                        <div className="flex gap-1.5">
                          <button onClick={() => openUpdateModal(notice)}
                            className={`p-1.5 ${ac.eBtn} rounded-lg transition-colors`}>
                            <Edit size={12}/>
                          </button>
                          <button onClick={() => { setDeleteId(notice._id); setShowDeleteModal(true); }}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors">
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-3 px-4 py-4 border-t border-gray-700/60">
            <button disabled={pagination.page <= 1} onClick={() => handlePageChange(pagination.page - 1)}
              className={`px-4 py-2 border border-gray-700 rounded-lg text-gray-400 text-sm ${ac.hPg} disabled:opacity-40 disabled:cursor-not-allowed transition-all`}>
              Prev
            </button>
            <span className="text-gray-500 text-sm font-medium">{pagination.page} / {pagination.pages}</span>
            <button disabled={pagination.page >= pagination.pages} onClick={() => handlePageChange(pagination.page + 1)}
              className={`px-4 py-2 border border-gray-700 rounded-lg text-gray-400 text-sm ${ac.hPg} disabled:opacity-40 disabled:cursor-not-allowed transition-all`}>
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create / Edit Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex bg-gray-950 overflow-hidden">
          {/* Left panel */}
          <div className={`hidden md:flex w-2/5 flex-col border-r ${ac.bd20} bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden`}>
            <div className={`h-1 bg-gradient-to-r ${ac.topBar} flex-shrink-0`} />
            {[420, 300, 190].map((s, i) => (
              <div key={i} className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{ width: s, height: s, border: `1px solid ${ac.circle}${0.05 + i * 0.05})` }} />
            ))}
            <div className="flex-1 flex flex-col px-10 pt-10 pb-6 z-10">
              <div className={`w-24 h-24 rounded-full ${ac.bg10} border-2 ${ac.bd40} flex items-center justify-center mb-7`}>
                <Bell size={48} className={ac.t5} />
              </div>
              <h1 className="font-black text-3xl text-slate-100 leading-tight">{editMode ? 'Edit' : 'Create a'}</h1>
              <h1 className={`font-black text-3xl ${ac.t5} leading-tight mb-4`}>{editMode ? 'Notice' : 'New Notice'}</h1>
              <p className="text-slate-400 leading-relaxed mb-8 max-w-xs">
                {editMode ? 'Update the notice details below.' : 'Post an announcement to students, teachers, or everyone.'}
              </p>
              {[
                { icon: Users, label: 'Target audience', sub: 'Choose who sees this notice' },
                { icon: Megaphone, label: 'Instant broadcast', sub: 'Everyone sees it right away' },
                { icon: Calendar, label: 'Set expiry date', sub: 'Notices auto-expire when set' },
              ].map((b, i) => (
                <div key={i} className={`flex items-center gap-3 mb-3 p-3 ${ac.fBg} rounded-2xl transition-all`}>
                  <div className={`p-2 ${ac.fI} rounded-xl flex-shrink-0`}><b.icon size={18} /></div>
                  <div>
                    <p className="text-slate-100 font-semibold text-sm">{b.label}</p>
                    <p className="text-slate-500 text-xs">{b.sub}</p>
                  </div>
                </div>
              ))}
              <div className="flex-1" />
              <div className={`border-t ${ac.bd15} pt-4`}>
                <button onClick={closeModal} className="flex items-center gap-2 text-slate-500 hover:text-slate-100 text-sm font-medium transition-colors">
                  <ArrowLeft size={16} /> Back to Notices
                </button>
              </div>
            </div>
          </div>

          {/* Right form panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
            <div className={`h-1 bg-gradient-to-r ${ac.rBar} flex-shrink-0`} />
            <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-700">
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-100"><ArrowLeft size={20} /></button>
              <span className="font-bold text-slate-100">{editMode ? 'Edit Notice' : 'New Notice'}</span>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-auto px-6 md:px-12 pt-6 md:pt-10 pb-8">
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
              )}
              <div className="hidden md:flex items-center gap-4 mb-8">
                <div className={`w-1 h-9 ${ac.bgS} rounded-full flex-shrink-0`} />
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{editMode ? 'Edit Notice' : 'Notice Details'}</h2>
                  <p className="text-slate-500 text-sm mt-0.5">{editMode ? 'Update the details below' : 'Fill in the notice information'}</p>
                </div>
              </div>
              <div className="flex flex-col gap-5 max-w-xl">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Title <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="Notice title..." maxLength={100}
                    value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none ${ac.fF} transition-colors`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Message <span className="text-red-400">*</span></label>
                  <textarea placeholder="Notice content..." rows={5}
                    value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none ${ac.fF} transition-colors resize-none`} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Audience</label>
                    {userInfo.role === 'TEACHER' ? (
                      <div className="w-full bg-gray-900/60 border border-gray-700/60 rounded-lg px-3 py-2.5 flex items-center justify-between">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">Student</span>
                        <span className="text-xs text-gray-600">Fixed for teachers</span>
                      </div>
                    ) : (
                      <select value={form.audience} onChange={e => setForm(p => ({ ...p, audience: e.target.value }))}
                        className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-slate-100 focus:outline-none ${ac.fF}`}>
                        <option value="Student">Student</option>
                        <option value="Teacher">Teacher</option>
                        <option value="All">All</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Expiry Date</label>
                    <input type="date" value={form.expiryDate} onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))}
                      className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-slate-100 focus:outline-none ${ac.fF} [color-scheme:dark]`} />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.isImportant} onChange={e => setForm(p => ({ ...p, isImportant: e.target.checked }))}
                    className={`w-4 h-4 ${ac.check}`} />
                  <span className="text-slate-300 text-sm font-medium">Mark as Important</span>
                </label>
              </div>
              <div className="flex-1 min-h-8" />
              <div className="flex gap-3 pt-4 max-w-xl">
                <button type="button" onClick={closeModal}
                  className="flex-1 border border-gray-700 text-slate-400 font-semibold py-3 rounded-xl hover:border-gray-600 hover:text-slate-200 transition-all">Cancel</button>
                <button type="submit" disabled={submitting}
                  className={`flex-[2] font-bold py-3 rounded-xl text-white flex items-center justify-center gap-2 transition-all ${editMode ? 'bg-green-500 hover:bg-green-600' : ac.cBtn} disabled:bg-gray-700 disabled:text-slate-500`}>
                  {submitting ? <Spinner size="sm" color="white" /> : editMode ? 'Update Notice' : 'Post Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-sm w-full mx-4">
            <div className="w-14 h-14 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
              <Trash2 size={28} className="text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 text-center mb-2">Delete Notice</h3>
            <p className="text-slate-400 text-sm text-center mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteId(null); }}
                className="flex-1 border border-gray-700 text-slate-400 font-semibold py-2.5 rounded-xl hover:border-gray-600 transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={submitting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                {submitting ? <Spinner size="sm" color="white" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notice;
