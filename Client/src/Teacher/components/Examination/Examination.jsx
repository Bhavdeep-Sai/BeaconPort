import { useState, useEffect } from 'react';
import axios from 'axios';
import { baseApi } from '../../../environment';
import { Plus, Pencil, Trash2, ChevronDown, CheckCircle, XCircle, ClipboardList } from 'lucide-react';

const formatDate     = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A';
const formatDateInput= (d) => d ? new Date(d).toISOString().split('T')[0] : '';
const todayInput     = ()  => new Date().toISOString().split('T')[0];
const formatTime     = (t) => { if (!t) return 'N/A'; try { return new Date(`1970-01-01T${t}:00`).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:false }); } catch { return t; } };
const formatDuration = (m) => { if (!m) return 'N/A'; const h = Math.floor(m/60); const min = m%60; if (!h) return `${min} min`; if (!min) return `${h} hr`; return `${h} hr ${min} min`; };

const MAJOR_EXAMS = ['Mid Term','Final Term','Annual Exam'];
const getTypeBadge = (type) => MAJOR_EXAMS.includes(type)
  ? 'bg-red-500/20 border border-red-500/30 text-red-400'
  : 'bg-blue-500/20 border border-blue-500/30 text-blue-400';

export default function Examination() {
  const [examinations, setExaminations]           = useState([]);
  const [classes, setClasses]                     = useState([]);
  const [subjects, setSubjects]                   = useState([]);
  const [availableExamTypes, setAvailableExamTypes] = useState([]);
  const [selectedClass, setSelectedClass]         = useState('');
  const [loading, setLoading]                     = useState(false);
  const [toast, setToast]                         = useState(null);
  const [userRole, setUserRole]                   = useState('');
  const [userId, setUserId]                       = useState('');
  const [showModal, setShowModal]                 = useState(false);
  const [modalType, setModalType]                 = useState('create');
  const [selectedExamId, setSelectedExamId]       = useState(null);
  const [calculatingDuration, setCalculatingDuration] = useState(false);
  const [formData, setFormData] = useState({ date:'', subjectId:'', examType:'', classId:'', startTime:'', endTime:'', duration:'' });

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000); };

  const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } });

  const getUserInfo = () => {
    const token = localStorage.getItem('token');
    if (!token) return showToast('No auth token. Please login.', 'error');
    try {
      const p = JSON.parse(atob(token.split('.')[1]));
      setUserRole(p.role || ''); setUserId(p.id || '');
    } catch { showToast('Authentication error. Please login again.', 'error'); }
  };

  const fetchExaminations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseApi}/examination/all`, getAuthHeaders());
      if (res.data.success) setExaminations(res.data.data || []);
    } catch (e) { showToast(e.response?.data?.message || 'Failed to fetch examinations', 'error'); }
    finally { setLoading(false); }
  };

  const fetchExaminationsByClass = async (id) => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseApi}/examination/class/${id}`, getAuthHeaders());
      if (res.data.success) setExaminations(res.data.data || []);
    } catch (e) { showToast(e.response?.data?.message || 'Failed to fetch', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    getUserInfo();
    Promise.all([
      fetchExaminations(),
      axios.get(`${baseApi}/class/all`, getAuthHeaders()).then(r => { if(r.data.success) setClasses(r.data.data||[]); }).catch(()=>{}),
      axios.get(`${baseApi}/subject/all`, getAuthHeaders()).then(r => { if(r.data.success) setSubjects(r.data.data||[]); }).catch(()=>{}),
      axios.get(`${baseApi}/examination/exam-types`, getAuthHeaders())
        .then(r => { if(r.data.success) setAvailableExamTypes(r.data.data||[]); })
        .catch(() => setAvailableExamTypes(['Quiz','Class Test','Weekly Test','Slip Test'])),
    ]);
  }, []);

  useEffect(() => {
    if (selectedClass) fetchExaminationsByClass(selectedClass); else fetchExaminations();
  }, [selectedClass]);

  // duration calc
  useEffect(() => {
    const { startTime, endTime } = formData;
    if (!startTime || !endTime) { setFormData(p => ({ ...p, duration:'' })); return; }
    (async () => {
      setCalculatingDuration(true);
      const start = new Date(`1970-01-01T${startTime}:00`);
      const end   = new Date(`1970-01-01T${endTime}:00`);
      if (end <= start) { showToast('End time must be after start time','error'); setFormData(p=>({...p,duration:''})); setCalculatingDuration(false); return; }
      const mins = Math.round((end - start) / 60000);
      if (mins < 15)  { showToast('Duration must be at least 15 minutes','error'); setFormData(p=>({...p,duration:''})); setCalculatingDuration(false); return; }
      if (mins > 480) { showToast('Duration cannot exceed 8 hours','error'); setFormData(p=>({...p,duration:''})); setCalculatingDuration(false); return; }
      setFormData(p => ({ ...p, duration: mins }));
      try {
        const res = await axios.post(`${baseApi}/examination/calculate-duration`, { startTime, endTime }, getAuthHeaders());
        if (res.data.success) setFormData(p => ({ ...p, duration: res.data.data.duration }));
      } catch { /* keep client calc */ }
      setCalculatingDuration(false);
    })();
  }, [formData.startTime, formData.endTime]);

  const handleChange = (e) => { const { name, value } = e.target; setFormData(p => ({ ...p, [name]: value })); };

  const validateForm = () => {
    const { date, subjectId, examType, classId, startTime, endTime, duration } = formData;
    if (!date||!subjectId||!examType||!startTime||!endTime) return showToast('All required fields must be filled','error'), false;
    if (modalType==='create' && !classId) return showToast('Class is required','error'), false;
    if (!duration||duration<15) return showToast('Invalid duration — check times','error'), false;
    if (new Date(date) < new Date(new Date().toDateString())) return showToast('Exam date cannot be in the past','error'), false;
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      let res;
      if (modalType === 'create') {
        res = await axios.post(`${baseApi}/examination/create`, formData, getAuthHeaders());
      } else {
        const { date, subjectId, examType, startTime, endTime, duration } = formData;
        res = await axios.put(`${baseApi}/examination/update/${selectedExamId}`, { date, subjectId, examType, startTime, endTime, duration }, getAuthHeaders());
      }
      if (res.data.success) { showToast(modalType==='create'?'Examination created':'Examination updated'); await fetchExaminations(); closeModal(); }
      else showToast(res.data.message||'Operation failed','error');
    } catch (e) { showToast(e.response?.data?.message||'Operation failed','error'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this examination? This cannot be undone.')) return;
    setLoading(true);
    try {
      const res = await axios.delete(`${baseApi}/examination/delete/${id}`, getAuthHeaders());
      if (res.data.success) { showToast('Examination deleted'); await fetchExaminations(); }
      else showToast(res.data.message||'Failed to delete','error');
    } catch (e) { showToast(e.response?.data?.message||'Failed to delete','error'); }
    finally { setLoading(false); }
  };

  const openCreateModal = () => {
    setModalType('create'); setSelectedExamId(null);
    setFormData({ date:'', subjectId:'', examType:'', classId:'', startTime:'', endTime:'', duration:'' });
    setShowModal(true);
  };

  const openUpdateModal = (exam) => {
    setModalType('update'); setSelectedExamId(exam._id);
    setFormData({
      date: formatDateInput(exam.examDate),
      subjectId: typeof exam.subject==='object' ? exam.subject._id : exam.subject || '',
      examType: exam.examType || '',
      classId: typeof exam.class==='object' ? exam.class._id : exam.class || '',
      startTime: exam.startTime || '',
      endTime: exam.endTime || '',
      duration: exam.duration || '',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setSelectedExamId(null); setFormData({ date:'', subjectId:'', examType:'', classId:'', startTime:'', endTime:'', duration:'' }); };

  const getClassName   = (c) => typeof c==='object'&&c?.classText ? c.classText : (classes.find(x=>x._id===c)?.classText||'—');
  const getSubjectName = (s) => typeof s==='object'&&s?.subjectName ? s.subjectName : (subjects.find(x=>x._id===s)?.subjectName||'—');
  const canEditExam    = (exam) => userRole==='SCHOOL' || (userRole==='TEACHER' && (typeof exam.createdBy==='object'?exam.createdBy._id:exam.createdBy)===userId);
  const getCreatorName = (exam) => exam.creatorRole==='SCHOOL' ? (typeof exam.createdBy==='object'&&exam.createdBy.schoolName?exam.createdBy.schoolName:'School Admin') : (typeof exam.createdBy==='object'&&exam.createdBy.name?exam.createdBy.name:'Teacher');

  return (
    <div className="text-gray-100 space-y-5">
      {/* Toast */}
      {toast && (
        <div className={['fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border',
          toast.type==='success' ? 'bg-green-500/20 border-green-500/40 text-green-300' : 'bg-red-500/20 border-red-500/40 text-red-300'].join(' ')}>
          {toast.type==='success' ? <CheckCircle size={16}/> : <XCircle size={16}/>} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <ClipboardList size={22} className="text-blue-400" /> Examination Management
          </h1>
          {userRole && (
            <p className="text-xs text-gray-500 mt-0.5">
              Role: <span className="text-blue-400 font-medium">{userRole}</span>
              {userRole==='TEACHER' && <span className="ml-3 text-gray-500">Can create: Quiz, Class Test, Weekly Test, Slip Test</span>}
            </p>
          )}
        </div>
        {(userRole==='SCHOOL'||userRole==='TEACHER') && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg whitespace-nowrap"
          >
            <Plus size={15}/> Create Examination
          </button>
        )}
      </div>

      {/* Class filter */}
      {(userRole==='SCHOOL'||userRole==='TEACHER') && classes.length > 0 && (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4 flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-400 min-w-max">Filter by class:</label>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="bg-gray-700/60 border border-gray-600/60 text-gray-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500/60"
          >
            <option value="">All Classes</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.classText}</option>)}
          </select>
          {selectedClass && (
            <button onClick={() => setSelectedClass('')} className="text-xs text-gray-400 hover:text-blue-400 transition-colors">Clear</button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-10 h-10 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Table */}
      {!loading && examinations.length > 0 && (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-500/10 border-b border-gray-700/60">
                  {['Exam Date','Subject','Class','Type','Time','Duration','Created By','Actions'].map(h => (
                    <th key={h} className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {examinations.map(exam => (
                  <tr key={exam._id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-3 text-center text-gray-300 whitespace-nowrap">{formatDate(exam.examDate)}</td>
                    <td className="px-4 py-3 text-center text-blue-400 font-medium">{getSubjectName(exam.subject)}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{getClassName(exam.class)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeBadge(exam.examType)}`}>{exam.examType}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300 whitespace-nowrap text-xs">{formatTime(exam.startTime)} – {formatTime(exam.endTime)}</td>
                    <td className="px-4 py-3 text-center text-amber-400 font-medium">{formatDuration(exam.duration)}</td>
                    <td className="px-4 py-3 text-center">
                      <p className={exam.creatorRole==='SCHOOL' ? 'text-red-400 text-xs font-medium' : 'text-blue-400 text-xs font-medium'}>
                        {exam.creatorRole==='SCHOOL'?'School Admin':'Teacher'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{getCreatorName(exam)}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {canEditExam(exam) ? (
                        <div className="flex justify-center gap-1.5">
                          <button onClick={() => openUpdateModal(exam)} title="Edit" className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 transition-colors">
                            <Pencil size={13}/>
                          </button>
                          <button onClick={() => handleDelete(exam._id)} title="Delete" className="p-1.5 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 hover:bg-red-500/25 transition-colors">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-700/60 text-xs text-gray-500 text-right">
            {examinations.length} examination{examinations.length!==1?'s':''}{selectedClass?' for selected class':''}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && examinations.length === 0 && (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-10 text-center">
          <ClipboardList size={40} className="mx-auto text-gray-600 mb-3"/>
          <p className="text-gray-400 font-medium">{selectedClass ? 'No examinations for the selected class.' : 'No examinations found.'}</p>
          {(userRole==='SCHOOL'||userRole==='TEACHER') && (
            <button onClick={openCreateModal} className="mt-4 px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium">
              Create First Examination
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700/60 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/60 bg-blue-500/10">
              <h2 className="text-base font-bold text-gray-100">{modalType==='create'?'Create New Examination':'Update Examination'}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-200 transition-colors text-lg leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Exam Date <span className="text-red-400">*</span></label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} min={todayInput()} required
                  className="w-full bg-gray-800/60 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/60" />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Subject <span className="text-red-400">*</span></label>
                <select name="subjectId" value={formData.subjectId} onChange={handleChange} required
                  className="w-full bg-gray-800/60 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/60">
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.subjectName}</option>)}
                </select>
              </div>

              {/* Class (create only) */}
              {modalType==='create' && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Class <span className="text-red-400">*</span></label>
                  <select name="classId" value={formData.classId} onChange={handleChange} required
                    className="w-full bg-gray-800/60 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/60">
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.classText}</option>)}
                  </select>
                </div>
              )}

              {/* Exam type */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Exam Type <span className="text-red-400">*</span></label>
                <select name="examType" value={formData.examType} onChange={handleChange} required
                  className="w-full bg-gray-800/60 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/60">
                  <option value="">Select Type</option>
                  {availableExamTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Start Time <span className="text-red-400">*</span></label>
                  <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required
                    className="w-full bg-gray-800/60 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/60" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">End Time <span className="text-red-400">*</span></label>
                  <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required
                    className="w-full bg-gray-800/60 border border-gray-700/60 text-gray-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/60" />
                </div>
              </div>

              {/* Duration display */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Duration</label>
                <div className="bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2 text-sm">
                  {calculatingDuration ? (
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"/> Calculating...
                    </span>
                  ) : formData.duration ? (
                    <span className="text-blue-400 font-medium">{formatDuration(formData.duration)}</span>
                  ) : (
                    <span className="text-gray-500">{formData.startTime && formData.endTime ? 'Invalid time range' : 'Select start & end time'}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeModal}
                  className="px-4 py-2 bg-gray-700/60 border border-gray-600/60 text-gray-300 rounded-lg hover:bg-gray-600/60 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={loading||calculatingDuration}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>{modalType==='create'?'Creating...':'Updating...'}</> : modalType==='create'?'Create Examination':'Update Examination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


