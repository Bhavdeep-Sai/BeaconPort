import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { baseApi } from '../../../environment';
import {
  ClipboardList, Calendar, Clock, Filter,
  AlertCircle, GraduationCap
} from 'lucide-react';

const Examination = () => {
  const [examinations, setExaminations]         = useState([]);
  const [classes, setClasses]                   = useState([]);
  const [subjects, setSubjects]                 = useState([]);
  const [availableExamTypes, setAvailableExamTypes] = useState([]);
  const [selectedClass, setSelectedClass]       = useState('');
  const [selectedType, setSelectedType]         = useState('');
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');
  const [success, setSuccess]                   = useState('');
  const [userRole, setUserRole]                 = useState('');
  const [userId, setUserId]                     = useState('');

  // Form & modal states (used by SCHOOL/TEACHER)
  const [formData, setFormData] = useState({
    date: '', subjectId: '', examType: '', classId: '',
    startTime: '', endTime: '', duration: ''
  });
  const [showModal, setShowModal]               = useState(false);
  const [modalType, setModalType]               = useState('create');
  const [selectedExamId, setSelectedExamId]     = useState(null);
  const [calculatingDuration, setCalculatingDuration] = useState(false);

  // ─── Init ──────────────────────────────────────────────────────────
  useEffect(() => { initializeComponent(); }, []);

  useEffect(() => {
    if (selectedClass) fetchExaminationsByClass(selectedClass);
    else               fetchExaminations();
  }, [selectedClass]);

  useEffect(() => {
    const { startTime, endTime } = formData;
    if (startTime && endTime) calculateDuration(startTime, endTime);
    else setFormData(prev => ({ ...prev, duration: '' }));
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
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserRole(payload.role || '');
        setUserId(payload.id   || '');
      } catch { setError('Authentication error. Please login again.'); }
    }
  };

  const getAuthHeaders = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });

  // ─── Fetchers ──────────────────────────────────────────────────────
  const fetchExaminations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseApi}/examination/all`, getAuthHeaders());
      if (res.data.success) setExaminations(res.data.data || []);
      else setError('Failed to fetch examinations');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch examinations');
    } finally { setLoading(false); }
  };

  const fetchExaminationsByClass = async (classId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseApi}/examination/class/${classId}`, getAuthHeaders());
      if (res.data.success) setExaminations(res.data.data || []);
      else setError('Failed to fetch examinations for this class');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch examinations');
    } finally { setLoading(false); }
  };

  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${baseApi}/class/all`, getAuthHeaders());
      if (res.data.success) setClasses(res.data.data || []);
    } catch {}
  };

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${baseApi}/subject/all`, getAuthHeaders());
      if (res.data.success) setSubjects(res.data.data || []);
    } catch {}
  };

  const fetchAvailableExamTypes = async () => {
    try {
      const res = await axios.get(`${baseApi}/examination/exam-types`, getAuthHeaders());
      if (res.data.success) setAvailableExamTypes(res.data.data || []);
    } catch {}
  };

  // ─── CRUD (SCHOOL/TEACHER only) ────────────────────────────────────
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (modalType === 'create') {
        const res = await axios.post(`${baseApi}/examination/create`, formData, getAuthHeaders());
        if (res.data.success) { setSuccess('Examination created!'); fetchExaminations(); closeModal(); }
        else setError(res.data.message || 'Failed to create');
      } else {
        const res = await axios.put(`${baseApi}/examination/${selectedExamId}`, formData, getAuthHeaders());
        if (res.data.success) { setSuccess('Examination updated!'); fetchExaminations(); closeModal(); }
        else setError(res.data.message || 'Failed to update');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally { setLoading(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this examination?')) return;
    try {
      const res = await axios.delete(`${baseApi}/examination/${id}`, getAuthHeaders());
      if (res.data.success) { setSuccess('Deleted!'); fetchExaminations(); }
      else setError('Delete failed');
    } catch (err) { setError(err.response?.data?.message || 'Delete failed'); }
  };

  const calculateDuration = async (startTime, endTime) => {
    setCalculatingDuration(true);
    try {
      const start = new Date(`1970-01-01T${startTime}:00`);
      const end   = new Date(`1970-01-01T${endTime}:00`);
      const mins  = Math.round((end - start) / 60000);
      if (mins < 15 || mins > 480) { setFormData(prev => ({ ...prev, duration: '' })); return; }
      setFormData(prev => ({ ...prev, duration: mins }));
      const res = await axios.post(`${baseApi}/examination/calculate-duration`, { startTime, endTime }, getAuthHeaders());
      if (res.data.success) setFormData(prev => ({ ...prev, duration: res.data.data.duration }));
    } catch {}
    finally { setCalculatingDuration(false); }
  };

  const validateForm = () => {
    const { date, subjectId, examType, classId, startTime, endTime, duration } = formData;
    if (!date || !subjectId || !examType || !startTime || !endTime) { setError('All required fields must be filled'); return false; }
    if (modalType === 'create' && !classId) { setError('Class is required'); return false; }
    if (!duration || duration < 15) { setError('Invalid duration'); return false; }
    return true;
  };

  const openCreateModal = () => {
    setModalType('create');
    setFormData({ date: '', subjectId: '', examType: '', classId: '', startTime: '', endTime: '', duration: '' });
    setError('');
    setShowModal(true);
  };

  const openUpdateModal = exam => {
    setModalType('update');
    setSelectedExamId(exam._id);
    setFormData({
      date:      exam.examDate ? format(new Date(exam.examDate), 'yyyy-MM-dd') : '',
      subjectId: typeof exam.subject === 'object' ? exam.subject._id : (exam.subject || ''),
      examType:  exam.examType  || '',
      classId:   typeof exam.class   === 'object' ? exam.class._id   : (exam.class   || ''),
      startTime: exam.startTime || '',
      endTime:   exam.endTime   || '',
      duration:  exam.duration  || ''
    });
    setError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedExamId(null);
    setFormData({ date: '', subjectId: '', examType: '', classId: '', startTime: '', endTime: '', duration: '' });
    setError('');
  };

  // ─── Helpers ───────────────────────────────────────────────────────
  const canEditExam = exam => {
    if (userRole === 'SCHOOL') return true;
    if (userRole === 'TEACHER' && exam.creatorRole === 'TEACHER') {
      const id = typeof exam.createdBy === 'object' ? exam.createdBy._id : exam.createdBy;
      return id === userId;
    }
    return false;
  };

  const getClassName   = d => (typeof d === 'object' && d?.classText)   ? d.classText   : (classes.find(c => c._id === d)?.classText  || 'Unknown');
  const getSubjectName = d => (typeof d === 'object' && d?.subjectName) ? d.subjectName : (subjects.find(s => s._id === d)?.subjectName || 'Unknown');

  const formatDuration = mins => {
    if (!mins) return 'N/A';
    const h = Math.floor(mins / 60), m = mins % 60;
    if (!h) return `${m} min`;
    if (!m) return `${h} hr`;
    return `${h} hr ${m} min`;
  };

  const formatTime = t => {
    if (!t) return 'N/A';
    try { return new Date(`1970-01-01T${t}:00`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); }
    catch { return t; }
  };

  const canCreateExam  = userRole === 'SCHOOL' || userRole === 'TEACHER';
  const canViewActions = userRole === 'SCHOOL' || userRole === 'TEACHER';

  const majorTypes = ['Mid Term', 'Final Term', 'Annual Exam', 'Semester Exam'];
  const typeBadge  = type => majorTypes.includes(type)
    ? 'bg-red-500/15 border border-red-500/30 text-red-400'
    : 'bg-blue-500/15 border border-blue-500/30 text-blue-400';

  // Filtered exams
  const filteredExams = examinations.filter(e =>
    (!selectedType || e.examType === selectedType)
  );

  // Unique exam types for filter pills
  const examTypesInData = [...new Set(examinations.map(e => e.examType))];

  const totalExams    = examinations.length;
  const upcomingExams = examinations.filter(e => new Date(e.examDate) >= new Date()).length;
  const pastExams     = totalExams - upcomingExams;

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">

      {/* ─── Hero ─── */}
      <div className="bg-gradient-to-br from-green-600/25 via-green-500/10 to-gray-900 border border-green-500/20 rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/15 rounded-xl border border-green-500/20">
                <ClipboardList size={20} className="text-green-400" />
              </div>
              <span className="text-xs text-green-400 font-semibold uppercase tracking-widest">Examinations</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Examination Schedule</h1>
            <p className="text-gray-400 mt-1 text-sm">
              {userRole === 'STUDENT'
                ? 'View your upcoming and past examinations'
                : 'Manage examination schedules'}
            </p>
          </div>
          {canCreateExam && (
            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-green-900/30"
            >
              + New Examination
            </button>
          )}
        </div>
      </div>

      {/* ─── Stat cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Exams',    value: totalExams,    icon: <ClipboardList size={18} />, color: 'text-green-400' },
          { label: 'Upcoming',       value: upcomingExams, icon: <Calendar      size={18} />, color: 'text-blue-400'  },
          { label: 'Completed',      value: pastExams,     icon: <GraduationCap size={18} />, color: 'text-gray-400'  },
        ].map((s, i) => (
          <div key={i} className="bg-gray-900/50 border border-green-500/20 rounded-2xl p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-green-500/10 border border-green-500/20 ${s.color}`}>{s.icon}</div>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Alerts ─── */}
      {success && (
        <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <span className="flex items-center gap-2"><AlertCircle size={15} />{error}</span>
          <button onClick={() => setError('')} className="opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ─── Filters ─── */}
      <div className="bg-gray-900/50 border border-green-500/20 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-gray-400 text-sm flex-shrink-0">
          <Filter size={14} /> Filter:
        </span>
        <button
          onClick={() => setSelectedType('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !selectedType
              ? 'bg-green-500 text-white border-green-500'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-green-500/50'
          }`}
        >
          All Types
        </button>
        {examTypesInData.map(t => (
          <button
            key={t}
            onClick={() => setSelectedType(t === selectedType ? '' : t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              selectedType === t
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-green-500/50'
            }`}
          >
            {t}
          </button>
        ))}

        {/* Class filter for SCHOOL/TEACHER */}
        {canViewActions && classes.length > 0 && (
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="ml-auto text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-green-500"
          >
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c._id} value={c._id}>{c.classText}</option>
            ))}
          </select>
        )}
      </div>

      {/* ─── Loading ─── */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-9 h-9 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin" />
        </div>
      )}

      {/* ─── Table ─── */}
      {!loading && filteredExams.length > 0 && (
        <div className="bg-gray-900/50 border border-green-500/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-green-500/15 bg-green-500/5">
            <ClipboardList size={16} className="text-green-400" />
            <h2 className="font-semibold text-white text-sm">Examination List</h2>
            <span className="ml-auto text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2.5 py-0.5 rounded-full">
              {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-950 text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Subject</th>
                  <th className="px-5 py-3 text-left">Class</th>
                  <th className="px-5 py-3 text-center">Type</th>
                  <th className="px-5 py-3 text-center">Time</th>
                  <th className="px-5 py-3 text-center">Duration</th>
                  <th className="px-5 py-3 text-center">Created By</th>
                  {canViewActions && <th className="px-5 py-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filteredExams.map(exam => (
                  <tr key={exam._id} className="hover:bg-green-500/5 transition-colors">
                    <td className="px-5 py-3 text-white">
                      {exam.examDate ? format(new Date(exam.examDate), 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="px-5 py-3 text-green-400 font-medium">{getSubjectName(exam.subject)}</td>
                    <td className="px-5 py-3 text-gray-300">{getClassName(exam.class)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${typeBadge(exam.examType)}`}>
                        {exam.examType}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-gray-300 text-xs">
                      {formatTime(exam.startTime)} – {formatTime(exam.endTime)}
                    </td>
                    <td className="px-5 py-3 text-center text-green-400 font-medium">
                      {formatDuration(exam.duration)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className={`text-xs font-medium ${exam.creatorRole === 'SCHOOL' ? 'text-orange-400' : 'text-blue-400'}`}>
                        {exam.creatorRole === 'SCHOOL' ? 'School' : 'Teacher'}
                      </div>
                    </td>
                    {canViewActions && (
                      <td className="px-5 py-3 text-center">
                        {canEditExam(exam) ? (
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openUpdateModal(exam)}
                              className="px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs hover:bg-green-500/20 transition-colors"
                            >Edit</button>
                            <button
                              onClick={() => handleDelete(exam._id)}
                              className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors"
                            >Delete</button>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs">View Only</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-800/60">
            {filteredExams.map(exam => (
              <div key={exam._id} className="p-4 hover:bg-green-500/5 transition-colors space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{getSubjectName(exam.subject)}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{getClassName(exam.class)}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge(exam.examType)}`}>
                    {exam.examType}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} className="text-green-400" />
                    {exam.examDate ? format(new Date(exam.examDate), 'MMM dd, yyyy') : 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} className="text-green-400" />
                    {formatTime(exam.startTime)} – {formatTime(exam.endTime)}
                  </span>
                </div>
                {canViewActions && canEditExam(exam) && (
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => openUpdateModal(exam)} className="px-2.5 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs hover:bg-green-500/20 transition-colors">Edit</button>
                    <button onClick={() => handleDelete(exam._id)} className="px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors">Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Empty ─── */}
      {!loading && filteredExams.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
          <ClipboardList size={40} className="opacity-20" />
          <p className="text-sm">
            {selectedType ? `No ${selectedType} examinations found` : 'No examinations found'}
          </p>
          {canCreateExam && (
            <button onClick={openCreateModal} className="mt-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm transition-colors">
              Create First Examination
            </button>
          )}
        </div>
      )}

      {/* ─── Modal (SCHOOL/TEACHER only) ─── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-green-500/20 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-green-500/15 bg-green-500/5">
              <h2 className="font-semibold text-white">
                {modalType === 'create' ? 'Create Examination' : 'Edit Examination'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white transition-colors">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-green-400 text-sm mb-1 block">Exam Date *</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} min={format(new Date(), 'yyyy-MM-dd')} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="text-green-400 text-sm mb-1 block">Subject *</label>
                <select name="subjectId" value={formData.subjectId} onChange={handleChange} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500">
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.subjectName}</option>)}
                </select>
              </div>
              {modalType === 'create' && (
                <div>
                  <label className="text-green-400 text-sm mb-1 block">Class *</label>
                  <select name="classId" value={formData.classId} onChange={handleChange} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500">
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.classText}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-green-400 text-sm mb-1 block">Exam Type *</label>
                <select name="examType" value={formData.examType} onChange={handleChange} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500">
                  <option value="">Select Type</option>
                  {availableExamTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-green-400 text-sm mb-1 block">Start Time *</label>
                  <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="text-green-400 text-sm mb-1 block">End Time *</label>
                  <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
                </div>
              </div>
              <div>
                <label className="text-green-400 text-sm mb-1 block">Duration</label>
                <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300">
                  {calculatingDuration ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border-2 border-green-500/30 border-t-green-500 animate-spin" />
                      Calculating…
                    </span>
                  ) : formData.duration ? (
                    <span className="text-green-400 font-medium">{formatDuration(formData.duration)}</span>
                  ) : (
                    <span className="text-gray-500">Set start & end times</span>
                  )}
                </div>
              </div>
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>
              )}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading || calculatingDuration}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {loading ? (
                    <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    {modalType === 'create' ? 'Creating…' : 'Saving…'}</>
                  ) : (
                    modalType === 'create' ? 'Create' : 'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Examination;
