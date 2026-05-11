/* Rewritten Student Management UI — Tailwind-based, clean and consistent with Class UI */
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { baseApi } from '../../../environment';
import {
  Search, Grid, List, Plus, Edit, Trash2, Filter, Eye, EyeOff,
} from 'lucide-react';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';

export default function Students() {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // student id or null
  const [form, setForm] = useState({ name: '', email: '', studentClass: '', age: '', gender: '', parent: '', parentNum: '', password: '' });
  const [imageFile, setImageFile] = useState(null);
  const fileRef = useRef(null);
  const [passwordVisibility, setPasswordVisibility] = useState({});
  const [fetchedStudentIds, setFetchedStudentIds] = useState(new Set());

  const fetchStudentWithPassword = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${baseApi}/student/fetch/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const fetched = res.data.student || res.data;
      // Only copy password — preserve populated fields like studentClass
      setStudents(prev => prev.map(x => x._id === id ? { ...x, password: fetched.password } : x));
    } catch (e) { console.error('Failed to fetch student details', e); }
  };

  const togglePasswordVisibility = async (id) => {
    if (!fetchedStudentIds.has(id)) {
      await fetchStudentWithPassword(id);
      setFetchedStudentIds(prev => new Set([...prev, id]));
    }
    setPasswordVisibility(p => ({ ...p, [id]: !p[id] }));
  };

  // Fetch helpers
  const fetchClasses = async () => {
    try {
      const res = await axios.get(`${baseApi}/class/all`);
      setClasses(res.data.data || []);
    } catch (e) { /* silent */ }
  };

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${baseApi}/subject/all`);
      setSubjects(res.data.data || []);
    } catch (e) { /* silent */ }
  };

  const fetchStudents = async (params = {}) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${baseApi}/student/fetch-with-query`, { params, headers: token ? { Authorization: `Bearer ${token}` } : {} });
      setStudents(res.data.students || []);
    } catch (e) {
      setError('Failed to load students');
      setStudents([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchClasses(); fetchSubjects(); }, []);
  useEffect(() => { fetchStudents({ search: search || undefined, studentClass: filterClass || undefined }); }, [search, filterClass]);

  // Form handling
  const openAdd = () => { setEditing(null); setForm({ name: '', email: '', studentClass: '', age: '', gender: '', parent: '', parentNum: '', password: '' }); setImageFile(null); setShowForm(true); };
  const openEdit = (s) => {
    setEditing(s._id);
    setForm({ name: s.name || '', email: s.email || '', studentClass: s.studentClass?._id || '', age: s.age || '', gender: s.gender || '', parent: s.parent || '', parentNum: s.parentNum || '', password: '' });
    setImageFile(null);
    setShowForm(true);
  };

  const handleFile = (e) => { const f = e.target.files?.[0]; if (f) setImageFile(f); };

  const submitForm = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      if (imageFile) fd.append('image', imageFile);
      fd.append('name', form.name); fd.append('email', form.email);
      fd.append('studentClass', form.studentClass); fd.append('age', form.age);
      fd.append('gender', form.gender); fd.append('parent', form.parent);
      fd.append('parentNum', form.parentNum);
      if (!editing) fd.append('password', form.password || '');

      const token = localStorage.getItem('token');
      if (editing) {
        await axios.put(`${baseApi}/student/update/${editing}`, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      } else {
        await axios.post(`${baseApi}/student/register`, fd, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      }
      setShowForm(false); fetchStudents({ search: search || undefined, studentClass: filterClass || undefined });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${baseApi}/student/delete/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      fetchStudents({ search: search || undefined, studentClass: filterClass || undefined });
    } catch (e) { setError('Failed to delete'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <div className="px-4 md:px-8 pt-7 pb-2 border-b border-gray-700/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg flex items-center justify-center">
              <PeopleAltIcon sx={{ fontSize: 26, color: '#f97316' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Student Management</h1>
              <p className="text-slate-500 text-sm mt-0.5">Manage and organize student data</p>
            </div>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-2.5 transition-shadow shadow-lg shadow-orange-500/20">
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-6xl mx-auto px-4 md:px-0 py-2">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-2 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-3xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
              className="w-full bg-transparent rounded-lg pl-10 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40" />
          </div>

          <div className="min-w-[160px]">
            <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-slate-100">
              <option value="">All Classes</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.classText}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setViewMode('grid')} className={`p-1 rounded-md ${viewMode === 'grid' ? 'border border-orange-400 text-orange-400' : 'text-slate-400'}`}><Grid className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-1 rounded-md ${viewMode === 'list' ? 'border border-orange-400 text-orange-400' : 'text-slate-400'}`}><List className="w-4 h-4" /></button>
          </div>

          <div className="ml-auto flex items-center gap-2 text-slate-400 text-sm"><Filter className="w-4 h-4" /> <span className="text-slate-200 font-semibold">{students.length}</span> <span className="text-slate-400">students</span></div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-0 pb-12">
        {error && <div className="mb-4 text-red-400">{error}</div>}

        {loading ? (
          <div className="py-24 text-center text-slate-400">Loading…</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center bg-gray-800 border border-gray-700 rounded-2xl text-slate-400">No students found</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {students.map(s => (
              <article key={s._id} className="bg-gray-800/80 border border-gray-700 rounded-2xl overflow-hidden flex flex-col">
                {/* Photo + name header */}
                <div className="flex gap-4 p-5 pb-4 border-b border-gray-700/50">
                  <img src={s.studentImg} alt={s.name} className="w-20 h-20 rounded-xl object-cover border border-gray-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-lg leading-tight truncate">{s.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {s.gender && <span className="text-xs px-2 py-0.5 bg-slate-700 rounded-full text-slate-300">{s.gender}</span>}
                      {s.age && <span className="text-xs text-slate-400">{s.age} yrs</span>}
                    </div>
                    <p className="text-slate-400 text-xs mt-1.5 truncate">{s.email}</p>
                  </div>
                </div>

                {/* Data rows */}
                <div className="px-5 py-4 space-y-3 flex-1">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-slate-500 w-24 flex-shrink-0 pt-0.5">Class</span>
                    {s.studentClass?.classText
                      ? <span className="text-xs bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">{s.studentClass.classText}</span>
                      : <span className="text-xs text-slate-600">Not assigned</span>}
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-slate-500 w-24 flex-shrink-0 pt-0.5">Parent</span>
                    <div>
                      <div className="text-sm text-slate-200">{s.parent || <span className="text-slate-600 text-xs">—</span>}</div>
                      {s.parentNum && <div className="text-xs text-slate-400 mt-0.5">{s.parentNum}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-500 w-24 flex-shrink-0">Password</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-slate-300">
                        {passwordVisibility[s._id] ? (s.password || 'N/A') : 'xxxxxxxxx'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(s._id)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {passwordVisibility[s._id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 py-3 border-t border-gray-700/50 flex gap-2">
                  <button
                    onClick={() => openEdit(s)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm border border-gray-600 text-slate-200 rounded-lg py-2 hover:border-orange-500 hover:text-orange-400 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s._id)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm border border-red-600/50 text-red-400 rounded-lg py-2 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
            {students.map((s, idx) => (
              <div key={s._id} className={`px-5 py-4 flex items-center gap-4 ${idx < students.length - 1 ? 'border-b border-gray-700' : ''}`}>
                <img src={s.studentImg} alt={s.name} className="w-12 h-12 rounded-full object-cover border border-gray-700 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-100 font-semibold">{s.name}</span>
                    {s.studentClass?.classText && (
                      <span className="text-xs bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/20">{s.studentClass.classText}</span>
                    )}
                  </div>
                  <div className="text-slate-400 text-xs mt-0.5">{s.email} · {s.gender} · {s.age} yrs</div>
                  <div className="text-slate-500 text-xs mt-0.5">{s.parent}{s.parentNum ? ` · ${s.parentNum}` : ''}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => togglePasswordVisibility(s._id)} className="text-slate-500 hover:text-slate-300 p-1">
                    {passwordVisibility[s._id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(s)} className="text-sm border border-gray-600 text-slate-200 rounded-lg px-3 py-1.5 hover:border-orange-500 transition-colors">Edit</button>
                  <button onClick={() => handleDelete(s._id)} className="text-sm border border-red-600/50 text-red-400 rounded-lg px-3 py-1.5 hover:bg-red-500/10 transition-colors">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form — Class-style two-pane overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex bg-black/60">
          {/* Left decorative panel */}
          <div className="hidden md:flex w-2/5 flex-col border-r border-orange-500/20 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500/20 flex-shrink-0" />
            {[420,300,190].map((s,i) => (
              <div key={i} className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none" style={{ width: s, height: s, border: `1px solid rgba(249,115,22,${0.05 + i*0.05})` }} />
            ))}
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)' }} />
            <div className="flex-1 flex flex-col px-8 pt-8 pb-6 z-10">
              <div className="w-20 h-20 rounded-full bg-orange-500/10 border-2 border-orange-500/40 shadow-[0_0_40px_rgba(249,115,22,0.15)] flex items-center justify-center mb-6">
                <PeopleAltIcon sx={{ fontSize: 36, color: '#f97316' }} />
              </div>
              <h3 className="font-black text-2xl text-slate-100 leading-tight">{editing ? 'Edit' : 'Add'} Student</h3>
              <p className="text-slate-400 mt-2 mb-4">Fill in the student details and assign class & contact info.</p>
              <div className="flex-1" />
              <button onClick={() => { setShowForm(false); }} className="text-sm text-slate-400 hover:text-slate-100 flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15 19l-7-7 7-7"/></svg>
                Back to Students
              </button>
            </div>
          </div>

          {/* Right form panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
            <div className="h-1 bg-gradient-to-r from-orange-500/30 via-orange-500 to-orange-400 flex-shrink-0" />
            <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-700 flex-shrink-0">
              <button onClick={() => setShowForm(false)} className="text-slate-400">←</button>
              <span className="font-bold text-slate-100">{editing ? 'Edit Student' : 'Add New Student'}</span>
            </div>

            <form onSubmit={submitForm} className="form-scroll flex-1 flex flex-col overflow-y-auto px-6 md:px-12 pt-6 md:pt-10 pb-6">
              <div className="hidden md:flex items-center gap-4 mb-6">
                <div className="w-1 h-9 bg-orange-500 rounded-full flex-shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{editing ? 'Edit Student' : 'Student Information'}</h2>
                  <p className="text-slate-500 text-sm mt-0.5">All fields are optional unless marked required</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-slate-100" />
                <input required placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-slate-100" />
                <select value={form.studentClass} onChange={e => setForm(f => ({ ...f, studentClass: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-slate-100">
                  <option value="">Choose class (optional)</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.classText}</option>)}
                </select>
                <input placeholder="Age" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-slate-100" />
                <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-slate-100">
                  <option value="">Gender</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
                <input placeholder="Parent / Guardian" value={form.parent} onChange={e => setForm(f => ({ ...f, parent: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-slate-100" />
                <input placeholder="Parent phone" value={form.parentNum} onChange={e => setForm(f => ({ ...f, parentNum: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-slate-100" />
                {!editing && <input placeholder="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-slate-100" />}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <input ref={fileRef} onChange={handleFile} type="file" accept="image/*" className="hidden" />
                <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className="text-sm px-3 py-2 rounded-md border border-gray-700 text-slate-200">Upload Photo</button>
                <div className="text-slate-400 text-sm">{imageFile ? imageFile.name : (editing ? 'Leave empty to keep existing photo' : 'No file selected')}</div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 min-w-[120px] border border-gray-700 text-slate-400 font-semibold py-3 rounded-xl hover:border-gray-600">Cancel</button>
                <button type="submit" className="flex-1 min-w-[180px] font-bold py-3 rounded-xl text-white bg-orange-500 hover:bg-orange-600">{loading ? 'Saving…' : editing ? 'Save Changes' : 'Create Student'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
