import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { baseApi } from '../../../environment';
import {
  BookOpen, Plus, Edit, Trash2, Filter, X, Calendar, Clock,
  Timer, GraduationCap, ArrowLeft, ClipboardList, Search,
  AlertTriangle, CheckCircle, TrendingUp, CalendarDays,
} from 'lucide-react';

const Examination = () => {
  const [examinations, setExaminations]         = useState([]);
  const [classes, setClasses]                   = useState([]);
  const [subjects, setSubjects]                 = useState([]);
  const [availableExamTypes, setAvailableExamTypes] = useState([]);
  const [selectedClass, setSelectedClass]       = useState('');
  const [search, setSearch]                     = useState('');
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');
  const [success, setSuccess]                   = useState('');
  const [userRole, setUserRole]                 = useState('');
  const [userId, setUserId]                     = useState('');
  const [formData, setFormData]                 = useState({ date: '', subjectId: '', examType: '', classId: '', startTime: '', endTime: '', duration: '' });
  const [showModal, setShowModal]               = useState(false);
  const [modalType, setModalType]               = useState('create');
  const [selectedExamId, setSelectedExamId]     = useState(null);
  const [calculatingDuration, setCalculatingDuration] = useState(false);
  const [deleteTarget, setDeleteTarget]         = useState(null);
  const [deleting, setDeleting]                 = useState(false);

  useEffect(() => { initializeComponent(); }, []);

  useEffect(() => {
    if (selectedClass) fetchExaminationsByClass(selectedClass);
    else fetchExaminations();
  }, [selectedClass]);

  useEffect(() => {
    if (formData.startTime && formData.endTime) calculateDuration(formData.startTime, formData.endTime);
    else setFormData(p => ({ ...p, duration: '' }));
  }, [formData.startTime, formData.endTime]);

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(''); setError(''); }, 5000);
      return () => clearTimeout(t);
    }
  }, [success, error]);

  const initializeComponent = async () => {
    getUserInfo();
    await Promise.all([fetchExaminations(), fetchClasses(), fetchSubjects(), fetchAvailableExamTypes()]);
  };

  const getUserInfo = () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const p = JSON.parse(atob(token.split('.')[1]));
        setUserRole(p.role || ''); setUserId(p.id || '');
      } catch { setError('Authentication error.'); }
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
  };

  const fetchExaminations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseApi}/examination/all`, getAuthHeaders());
      if (res.data.success) setExaminations(res.data.data || []);
      else setError('Failed to fetch examinations');
    } catch (e) { setError(e.response?.data?.message || 'Failed to fetch examinations'); }
    finally { setLoading(false); }
  };

  const fetchExaminationsByClass = async (classId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseApi}/examination/class/${classId}`, getAuthHeaders());
      if (res.data.success) setExaminations(res.data.data || []);
      else setError('Failed to fetch examinations for this class');
    } catch (e) { setError(e.response?.data?.message || 'Failed to fetch examinations'); }
    finally { setLoading(false); }
  };

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${baseApi}/class/all`, getAuthHeaders());
      if (res.data.success) setClasses(res.data.data || []);
    } catch { /* non-critical */ }
  };

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${baseApi}/subject/all`, getAuthHeaders());
      if (res.data.success) setSubjects(res.data.data || []);
    } catch { /* non-critical */ }
  };

  const fetchAvailableExamTypes = async () => {
    try {
      const res = await axios.get(`${baseApi}/examination/exam-types`, getAuthHeaders());
      if (res.data.success) setAvailableExamTypes(res.data.data || []);
    } catch {
      setAvailableExamTypes(['Mid Term', 'Final Term', 'Annual Exam', 'Semester Exam', 'Quiz', 'Class Test', 'Pop Quiz', 'Unit Test', 'Weekly Test', 'Slip Test']);
    }
  };

  const calculateDuration = async (startTime, endTime) => {
    setCalculatingDuration(true);
    try {
      const start = new Date(`1970-01-01T${startTime}:00`);
      const end   = new Date(`1970-01-01T${endTime}:00`);
      if (end <= start) { setError('End time must be after start time'); setFormData(p => ({ ...p, duration: '' })); return; }
      const mins = Math.round((end - start) / 60000);
      if (mins < 15)  { setError('Duration must be at least 15 minutes'); setFormData(p => ({ ...p, duration: '' })); return; }
      if (mins > 480) { setError('Duration cannot exceed 8 hours'); setFormData(p => ({ ...p, duration: '' })); return; }
      setFormData(p => ({ ...p, duration: mins }));
      const res = await axios.post(`${baseApi}/examination/calculate-duration`, { startTime, endTime }, getAuthHeaders());
      if (res.data.success) setFormData(p => ({ ...p, duration: res.data.data.duration }));
    } catch (e) { if (e.response?.data?.message) setError(e.response.data.message); }
    finally { setCalculatingDuration(false); }
  };

  const validateForm = () => {
    const { date, subjectId, examType, classId, startTime, endTime, duration } = formData;
    if (!date || !subjectId || !examType || !startTime || !endTime) { setError('All required fields must be filled'); return false; }
    if (modalType === 'create' && !classId) { setError('Class selection is required'); return false; }
    if (!duration || duration < 15) { setError('Invalid duration. Check start and end times'); return false; }
    const today = new Date(); today.setHours(0,0,0,0);
    if (new Date(date) < today) { setError('Exam date cannot be in the past'); return false; }
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      let res;
      if (modalType === 'create') {
        res = await axios.post(`${baseApi}/examination/create`, formData, getAuthHeaders());
      } else {
        const u = { date: formData.date, subjectId: formData.subjectId, examType: formData.examType, startTime: formData.startTime, endTime: formData.endTime, duration: formData.duration };
        res = await axios.put(`${baseApi}/examination/update/${selectedExamId}`, u, getAuthHeaders());
      }
      if (res.data.success) {
        setSuccess(modalType === 'create' ? 'Examination created successfully' : 'Examination updated successfully');
        await fetchExaminations(); closeModal();
      } else setError(res.data.message || 'Operation failed');
    } catch (e) { setError(e.response?.data?.message || 'Operation failed. Please try again.'); }
    finally { setLoading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await axios.delete(`${baseApi}/examination/delete/${deleteTarget}`, getAuthHeaders());
      if (res.data.success) { setSuccess('Examination deleted'); await fetchExaminations(); }
      else setError(res.data.message || 'Failed to delete');
    } catch (e) { setError(e.response?.data?.message || 'Failed to delete'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  const openCreateModal = () => {
    setModalType('create');
    setFormData({ date: '', subjectId: '', examType: '', classId: '', startTime: '', endTime: '', duration: '' });
    setError(''); setShowModal(true);
  };

  const openUpdateModal = (exam) => {
    setModalType('update'); setSelectedExamId(exam._id);
    const subjectId = typeof exam.subject === 'object' ? exam.subject._id : exam.subject;
    const classId   = typeof exam.class   === 'object' ? exam.class._id   : exam.class;
    setFormData({ date: exam.examDate ? format(new Date(exam.examDate), 'yyyy-MM-dd') : '', subjectId: subjectId||'', examType: exam.examType||'', classId: classId||'', startTime: exam.startTime||'', endTime: exam.endTime||'', duration: exam.duration||'' });
    setError(''); setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false); setSelectedExamId(null);
    setFormData({ date: '', subjectId: '', examType: '', classId: '', startTime: '', endTime: '', duration: '' }); setError('');
  };

  /* ── helpers ─────────────────────────────────────────────────────── */
  const canEditExam = (exam) => {
    if (userRole === 'SCHOOL') return true;
    if (userRole === 'TEACHER' && exam.creatorRole === 'TEACHER') {
      const cid = typeof exam.createdBy === 'object' ? exam.createdBy._id : exam.createdBy;
      return cid === userId;
    }
    return false;
  };

  const getClassName  = (d) => { if (typeof d === 'object' && d?.classText)   return d.classText;   return classes.find(c => c._id === d)?.classText   || 'Unknown'; };
  const getSubjectName= (d) => { if (typeof d === 'object' && d?.subjectName) return d.subjectName; return subjects.find(s => s._id === d)?.subjectName || 'Unknown'; };

  const formatDuration = (m) => {
    if (!m) return 'N/A';
    const h = Math.floor(m / 60), mm = m % 60;
    if (h === 0) return `${mm} min`;
    if (mm === 0) return `${h} hr`;
    return `${h} hr ${mm} min`;
  };

  const formatTime = (t) => {
    if (!t) return 'N/A';
    try { return new Date(`1970-01-01T${t}:00`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); }
    catch { return t; }
  };

  const examTypeBadge = (type) => {
    const finals = ['Mid Term', 'Final Term', 'Annual Exam', 'Semester Exam'];
    if (finals.includes(type)) return { cls: 'bg-red-500/15 text-red-400 border border-red-500/25', bar: 'bg-red-500' };
    const small  = ['Quiz', 'Class Test', 'Pop Quiz', 'Unit Test', 'Weekly Test', 'Slip Test'];
    if (small.includes(type))  return { cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/25', bar: 'bg-blue-500' };
    return { cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/25', bar: 'bg-orange-500' };
  };

  const getCreatorName = (exam) => {
    if (exam.creatorRole === 'SCHOOL') return typeof exam.createdBy === 'object' && exam.createdBy.schoolName ? exam.createdBy.schoolName : 'School Admin';
    return typeof exam.createdBy === 'object' && exam.createdBy.name ? exam.createdBy.name : 'Teacher';
  };

  const isUpcoming = (exam) => exam.examDate && new Date(exam.examDate) >= new Date(new Date().setHours(0,0,0,0));

  const canCreateExam  = userRole === 'SCHOOL' || userRole === 'TEACHER';
  const canViewActions = userRole === 'SCHOOL' || userRole === 'TEACHER';

  const today = new Date();
  const upcomingCount = examinations.filter(e => isUpcoming(e)).length;
  const pastCount     = examinations.length - upcomingCount;

  /* filtered list */
  const filtered = examinations.filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return getSubjectName(e.subject).toLowerCase().includes(q)
      || getClassName(e.class).toLowerCase().includes(q)
      || (e.examType || '').toLowerCase().includes(q);
  });

  const inputCls = 'w-full bg-gray-800/80 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-colors text-sm';
  const selectCls = 'w-full bg-gray-800/80 border border-gray-700 rounded-xl px-3 py-2.5 text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-colors text-sm cursor-pointer';

  return (
    <div className="text-gray-100 space-y-5">

      {/* ── Hero Banner ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-600/25 via-orange-500/10 to-gray-900 border border-orange-500/20 rounded-2xl px-6 py-5">
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-500/20 border border-orange-500/30">
              <BookOpen size={22} className="text-orange-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-100">Examination Management</h1>
              <p className="text-xs text-gray-400 mt-0.5">Schedule, manage and track class examinations</p>
            </div>
          </div>
          <div className="sm:ml-auto flex flex-wrap gap-2 items-center shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/60 border border-gray-700/60 px-3 py-1.5 rounded-lg">
              <CalendarDays size={11} className="text-orange-400" />
              {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            {canCreateExam && (
              <button onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl transition-all shadow-lg shadow-orange-500/20">
                <Plus size={15} /> Create Exam
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Exams',   count: examinations.length, icon: <ClipboardList size={18}/>, color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
          { label: 'Upcoming',      count: upcomingCount,        icon: <TrendingUp size={18}/>,    color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/20'  },
          { label: 'Past Exams',    count: pastCount,            icon: <CheckCircle size={18}/>,   color: 'text-gray-400',    bg: 'bg-gray-700/30',    border: 'border-gray-600/40'   },
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

      {/* ── Alerts ────────────────────────────────────────────────────── */}
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

      {/* ── Filter + Search Bar ───────────────────────────────────────── */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-4 space-y-3">
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search by subject, class or exam type…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors placeholder-gray-600"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"><X size={13}/></button>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 whitespace-nowrap">
            <Filter size={12} className="text-orange-400" />
            <span className="font-medium text-gray-400">Filter:</span>
          </div>
        </div>

        {/* Class pills */}
        {classes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedClass('')}
              className={['px-3 py-1 rounded-lg text-xs font-medium transition-colors border', !selectedClass ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-700/50 text-gray-400 border-gray-600/60 hover:bg-gray-700 hover:text-gray-200'].join(' ')}
            >
              All Classes
            </button>
            {classes.map(c => (
              <button
                key={c._id}
                onClick={() => setSelectedClass(c._id)}
                className={['px-3 py-1 rounded-lg text-xs font-medium transition-colors border', selectedClass === c._id ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-700/50 text-gray-400 border-gray-600/60 hover:bg-gray-700 hover:text-gray-200'].join(' ')}
              >
                {c.classText}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Exam List ─────────────────────────────────────────────────── */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl overflow-hidden">
        {/* Table header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700/60 bg-gray-800/60">
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-orange-400" />
            <span className="font-semibold text-gray-100 text-sm">Examinations</span>
            <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full ml-0.5">{filtered.length}</span>
          </div>
          {loading && <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />}
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-20 bg-gray-700/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-center px-6">
            <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
              <BookOpen size={36} className="text-orange-400" />
            </div>
            <p className="font-semibold text-gray-300">No Examinations Found</p>
            <p className="text-sm text-gray-500 max-w-xs">{selectedClass || search ? 'Try adjusting your filters.' : 'No exams have been scheduled yet.'}</p>
            {canCreateExam && !selectedClass && !search && (
              <button onClick={openCreateModal}
                className="mt-1 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors">
                <Plus size={14}/> Create First Exam
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-700/60 bg-gray-900/40">
                  <tr>
                    {['Exam Date', 'Subject', 'Class', 'Type', 'Time', 'Duration', 'Created By', ...(canViewActions ? ['Actions'] : [])].map(h => (
                      <th key={h} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/40">
                  {filtered.map(exam => {
                    const badge = examTypeBadge(exam.examType);
                    const upcoming = isUpcoming(exam);
                    return (
                      <tr key={exam._id} className="hover:bg-orange-500/5 transition-colors group">
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-semibold text-gray-200 text-sm">{exam.examDate ? format(new Date(exam.examDate), 'MMM dd, yyyy') : 'N/A'}</span>
                            <span className={`text-[10px] font-semibold mt-0.5 ${upcoming ? 'text-green-400' : 'text-gray-500'}`}>{upcoming ? 'Upcoming' : 'Past'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-orange-400">{getSubjectName(exam.subject)}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-300 text-sm">{getClassName(exam.class)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${badge.cls}`}>{exam.examType}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-400 text-xs whitespace-nowrap">
                          {formatTime(exam.startTime)} &ndash; {formatTime(exam.endTime)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-orange-400 font-semibold text-sm">{formatDuration(exam.duration)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`block text-xs font-bold ${exam.creatorRole === 'SCHOOL' ? 'text-red-400' : 'text-blue-400'}`}>{exam.creatorRole === 'SCHOOL' ? 'School' : 'Teacher'}</span>
                          <span className="text-gray-500 text-xs">{getCreatorName(exam)}</span>
                        </td>
                        {canViewActions && (
                          <td className="px-4 py-3 text-center">
                            {canEditExam(exam) ? (
                              <div className="flex gap-1.5 justify-center">
                                <button onClick={() => openUpdateModal(exam)}
                                  className="p-1.5 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg transition-colors" title="Edit">
                                  <Edit size={13}/>
                                </button>
                                <button onClick={() => setDeleteTarget(exam._id)}
                                  className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors" title="Delete">
                                  <Trash2 size={13}/>
                                </button>
                              </div>
                            ) : <span className="text-gray-600 text-xs">View only</span>}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden p-3 space-y-3">
              {filtered.map(exam => {
                const badge    = examTypeBadge(exam.examType);
                const upcoming = isUpcoming(exam);
                return (
                  <div key={exam._id} className="bg-gray-800/60 border border-gray-700/60 rounded-xl overflow-hidden hover:border-orange-500/40 transition-colors">
                    <div className={`h-0.5 ${badge.bar}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div>
                          <p className="font-bold text-orange-400 text-base leading-tight">{getSubjectName(exam.subject)}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{getClassName(exam.class)}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${badge.cls}`}>{exam.examType}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-orange-400"/>
                          {exam.examDate ? format(new Date(exam.examDate), 'MMM dd, yyyy') : 'N/A'}
                          <span className={`ml-1 font-semibold ${upcoming ? 'text-green-400' : 'text-gray-600'}`}>({upcoming ? 'Upcoming' : 'Past'})</span>
                        </span>
                        <span className="flex items-center gap-1"><Clock size={11} className="text-orange-400"/> {formatTime(exam.startTime)} – {formatTime(exam.endTime)}</span>
                        <span className="flex items-center gap-1"><Timer size={11} className="text-orange-400"/> <span className="text-orange-400 font-semibold">{formatDuration(exam.duration)}</span></span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className={`font-bold ${exam.creatorRole === 'SCHOOL' ? 'text-red-400' : 'text-blue-400'}`}>{exam.creatorRole === 'SCHOOL' ? 'School' : 'Teacher'}:</span>
                          <span className="text-gray-500">{getCreatorName(exam)}</span>
                        </div>
                        {canViewActions && canEditExam(exam) && (
                          <div className="flex gap-2">
                            <button onClick={() => openUpdateModal(exam)}
                              className="p-1.5 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg hover:bg-orange-500/20 transition-colors">
                              <Edit size={13}/>
                            </button>
                            <button onClick={() => setDeleteTarget(exam._id)}
                              className="p-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors">
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Delete Confirm Modal ──────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-100">Delete Examination</h3>
                <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-6 pl-1">Are you sure you want to permanently delete this examination?</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50 transition-colors">
                {deleting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ───────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex bg-gray-950 overflow-hidden">

          {/* Left decorative panel */}
          <div className="hidden md:flex w-96 shrink-0 flex-col border-r border-orange-500/20 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-orange-500 via-orange-400 to-transparent" />
            {[380, 270, 170].map((s, i) => (
              <div key={i} className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{ width: s, height: s, border: `1px solid rgba(249,115,22,${0.06 + i * 0.05})` }} />
            ))}
            <div className="flex-1 flex flex-col px-10 pt-12 pb-8 z-10">
              <div className="w-20 h-20 rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center mb-7">
                <ClipboardList size={38} className="text-orange-400" />
              </div>
              <h1 className="font-black text-3xl text-gray-100 leading-tight">{modalType === 'update' ? 'Edit' : 'Schedule a'}</h1>
              <h1 className="font-black text-3xl text-orange-400 leading-tight mb-4">{modalType === 'update' ? 'Examination' : 'New Exam'}</h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-xs">
                {modalType === 'update' ? 'Update the examination details below.' : 'Fill in the date, subject, class, and timing for the exam.'}
              </p>
              {[
                { icon: Calendar,      label: 'Exam date',       sub: 'Set when the exam takes place' },
                { icon: GraduationCap, label: 'Subject & class', sub: 'Associate with a subject and class' },
                { icon: Timer,         label: 'Auto-duration',   sub: 'Calculated from start & end time' },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-3 mb-3 p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl hover:bg-orange-500/8 transition-colors">
                  <div className="p-2 bg-orange-500/15 rounded-lg text-orange-400 shrink-0"><b.icon size={16}/></div>
                  <div>
                    <p className="text-gray-200 font-semibold text-sm">{b.label}</p>
                    <p className="text-gray-500 text-xs">{b.sub}</p>
                  </div>
                </div>
              ))}
              <div className="flex-1" />
              <button onClick={closeModal} className="flex items-center gap-2 text-gray-500 hover:text-gray-200 text-sm font-medium transition-colors border-t border-orange-500/15 pt-5">
                <ArrowLeft size={15}/> Back to Examinations
              </button>
            </div>
          </div>

          {/* Right form panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
            <div className="h-0.5 bg-gradient-to-r from-orange-500/30 via-orange-500 to-orange-400 shrink-0" />
            {/* Mobile back header */}
            <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-700/60">
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-100 transition-colors"><ArrowLeft size={20}/></button>
              <span className="font-bold text-gray-100">{modalType === 'update' ? 'Edit Exam' : 'New Exam'}</span>
            </div>

            <div className="flex-1 flex flex-col overflow-auto px-6 md:px-12 pt-6 md:pt-10 pb-8">
              {/* Desktop title */}
              <div className="hidden md:flex items-center gap-4 mb-8">
                <div className="w-1 h-9 bg-orange-500 rounded-full shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-gray-100">{modalType === 'update' ? 'Edit Examination' : 'Examination Details'}</h2>
                  <p className="text-gray-500 text-sm mt-0.5">Fill in the required fields below</p>
                </div>
              </div>

              {error && (
                <div className="mb-5 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertTriangle size={14}/>{error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
                {/* Exam Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Exam Date <span className="text-red-400">*</span></label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} className={`${inputCls} [color-scheme:dark]`} />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subject <span className="text-red-400">*</span></label>
                  <select name="subjectId" value={formData.subjectId} onChange={handleChange} className={selectCls}>
                    <option value="">Select subject…</option>
                    {subjects.map(s => <option key={s._id} value={s._id}>{s.subjectName}</option>)}
                  </select>
                </div>

                {/* Class (create only) */}
                {modalType === 'create' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Class <span className="text-red-400">*</span></label>
                    <select name="classId" value={formData.classId} onChange={handleChange} className={selectCls}>
                      <option value="">Select class…</option>
                      {classes.map(c => <option key={c._id} value={c._id}>{c.classText}</option>)}
                    </select>
                  </div>
                )}

                {/* Exam Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Exam Type <span className="text-red-400">*</span></label>
                  <select name="examType" value={formData.examType} onChange={handleChange} className={selectCls}>
                    <option value="">Select type…</option>
                    {availableExamTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Start Time <span className="text-red-400">*</span></label>
                  <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className={`${inputCls} [color-scheme:dark]`} />
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">End Time <span className="text-red-400">*</span></label>
                  <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className={`${inputCls} [color-scheme:dark]`} />
                </div>

                {/* Duration */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Duration <span className="text-gray-600">(auto-calculated)</span></label>
                  <div className="relative">
                    <input type="text" readOnly
                      value={formData.duration ? `${formData.duration} minutes (${formatDuration(formData.duration)})` : ''}
                      placeholder="Set start and end time to calculate automatically…"
                      className="w-full bg-gray-900/80 border border-gray-700/60 rounded-xl px-4 py-2.5 text-orange-400 font-semibold text-sm placeholder-gray-600 cursor-not-allowed" />
                    {calculatingDuration && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-8" />
              <div className="flex gap-3 pt-6 max-w-2xl border-t border-gray-800 mt-6">
                <button type="button" onClick={closeModal}
                  className="flex-1 border border-gray-700 text-gray-400 font-semibold py-3 rounded-xl hover:border-gray-500 hover:text-gray-200 transition-all text-sm">
                  Cancel
                </button>
                <button type="submit" onClick={handleSubmit} disabled={loading || calculatingDuration}
                  className={`flex-[2] font-bold py-3 rounded-xl text-white flex items-center justify-center gap-2 transition-all text-sm shadow-lg ${modalType === 'update' ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'} disabled:bg-gray-700 disabled:text-gray-500 disabled:shadow-none`}>
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</>
                    : modalType === 'update' ? <><CheckCircle size={16}/> Update Exam</> : <><Plus size={16}/> Create Exam</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Examination;
