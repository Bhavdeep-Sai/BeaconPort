/* Teacher Management UI — professional redesign with attendee display, labeled form fields */
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { baseApi } from '../../../environment';
import { Search, Grid, List, Plus, Edit, Trash2, Eye, EyeOff, Filter } from 'lucide-react';
import Groups3Icon from '@mui/icons-material/Groups3';

export default function Teachers() {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', qualification: '', age: '', gender: '',
    subjects: [], teacherClasses: [], attendeeClasses: [], password: '', salary: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const fileRef = useRef(null);
  const [passwordVisibility, setPasswordVisibility] = useState({});
  const [fetchedTeacherIds, setFetchedTeacherIds] = useState(new Set());

  /* helpers */
  const getAttendeeClassesFor = (teacherId) =>
    classes.filter(c => {
      const att = c.attendee;
      if (!att) return false;
      return (att._id || att)?.toString() === teacherId?.toString();
    });

  const fetchTeacherWithPassword = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${baseApi}/teacher/fetch/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setTeachers(prev => prev.map(x => x._id === id ? res.data.teacher : x));
    } catch (e) { console.error('Failed to fetch teacher details', e); }
  };

  const togglePasswordVisibility = async (id) => {
    if (!fetchedTeacherIds.has(id)) {
      await fetchTeacherWithPassword(id);
      setFetchedTeacherIds(prev => new Set([...prev, id]));
    }
    setPasswordVisibility(p => ({ ...p, [id]: !p[id] }));
  };

  /* data fetching */
  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${baseApi}/class/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setClasses(res.data.data || []);
    } catch (e) { /* silent */ }
  };

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${baseApi}/subject/all`);
      setSubjects(res.data.data || []);
    } catch (e) { /* silent */ }
  };

  const fetchTeachers = async (params = {}) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${baseApi}/teacher/fetch-with-query`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setTeachers(res.data.teachers || []);
    } catch (e) {
      setError('Failed to load teachers');
      setTeachers([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchClasses(); fetchSubjects(); }, []);
  useEffect(() => {
    fetchTeachers({
      search: search || undefined,
      teacherClass: filterClass || undefined,
      subject: filterSubject || undefined
    });
  }, [search, filterClass, filterSubject]);

  /* form actions */
  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', email: '', qualification: '', age: '', gender: '', subjects: [], teacherClasses: [], attendeeClasses: [], password: '', salary: '' });
    setImageFile(null);
    setShowForm(true);
  };

  const openEdit = (t) => {
    setEditing(t._id);
    const currentAttendeeClasses = classes
      .filter(c => { const att = c.attendee; return att && (att._id || att)?.toString() === t._id?.toString(); })
      .map(c => c._id);
    setForm({
      name: t.name || '',
      email: t.email || '',
      qualification: t.qualification || '',
      age: t.age || '',
      gender: t.gender || '',
      subjects: t.subjects?.map(s => s._id || s) || [],
      teacherClasses: t.teacherClasses?.map(c => c._id || c) || [],
      attendeeClasses: currentAttendeeClasses,
      password: '',
      salary: t.salary || ''
    });
    setImageFile(null);
    setShowForm(true);
  };

  const handleFile = (e) => { const f = e.target.files?.[0]; if (f) setImageFile(f); };

  const toggleSelect = (field, id) => {
    setForm(f => {
      const cur = f[field] || [];
      return { ...f, [field]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
    });
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      if (imageFile) fd.append('image', imageFile);
      fd.append('name', form.name);
      fd.append('email', form.email);
      fd.append('qualification', form.qualification || '');
      fd.append('age', form.age || '');
      fd.append('gender', form.gender || '');
      fd.append('salary', form.salary || '0');
      if (!editing) fd.append('password', form.password || '');
      if (form.subjects?.length) fd.append('subjects', JSON.stringify(form.subjects));
      if (form.teacherClasses?.length) fd.append('teacherClasses', JSON.stringify(form.teacherClasses));

      const token = localStorage.getItem('token');
      const authHeaders = { Authorization: token ? `Bearer ${token}` : '' };
      const headers = { ...authHeaders, 'Content-Type': 'multipart/form-data' };
      let savedTeacherId = editing;
      if (editing) {
        await axios.put(`${baseApi}/teacher/update/${editing}`, fd, { headers });
      } else {
        const res = await axios.post(`${baseApi}/teacher/register`, fd, { headers });
        savedTeacherId = res.data.teacher?._id || res.data._id;
      }

      // Sync attendee assignments: update each class whose attendee changed
      if (savedTeacherId) {
        const prevAttendeeClassIds = classes
          .filter(c => { const att = c.attendee; return att && (att._id || att)?.toString() === savedTeacherId?.toString(); })
          .map(c => c._id);
        const newAttendeeClassIds = form.attendeeClasses || [];

        const toAdd = newAttendeeClassIds.filter(id => !prevAttendeeClassIds.includes(id));
        const toRemove = prevAttendeeClassIds.filter(id => !newAttendeeClassIds.includes(id));

        await Promise.all([
          ...toAdd.map(id => axios.put(`${baseApi}/class/update/${id}`, { attendee: savedTeacherId }, { headers: authHeaders })),
          ...toRemove.map(id => axios.put(`${baseApi}/class/update/${id}`, { attendee: null }, { headers: authHeaders })),
        ]);
      }

      setShowForm(false);
      fetchClasses();
      fetchTeachers({ search: search || undefined, teacherClass: filterClass || undefined });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this teacher?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${baseApi}/teacher/delete/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchTeachers();
    } catch (e) { setError('Failed to delete'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">

      {/* Header */}
      <div className="px-4 md:px-8 pt-7 pb-4 border-b border-gray-700/60">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Groups3Icon sx={{ fontSize: 26, color: '#f97316' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Teacher Management</h1>
              <p className="text-slate-500 text-sm mt-0.5">Manage and organise teacher records</p>
            </div>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-sm px-4 py-2.5 transition shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" /> Add Teacher
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-4 md:px-0 py-3">
        <div className="bg-gray-800 border border-gray-700 rounded-sm p-2 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full bg-transparent rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            />
          </div>
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:outline-none"
          >
            <option value="">All Classes</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.classText}</option>)}
          </select>
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-slate-100 focus:outline-none"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => <option key={s._id} value={s._id}>{s.subjectName}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'border border-orange-400 text-orange-400' : 'text-slate-400'}`}
            ><Grid className="w-4 h-4" /></button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md ${viewMode === 'list' ? 'border border-orange-400 text-orange-400' : 'text-slate-400'}`}
            ><List className="w-4 h-4" /></button>
          </div>
          <span className="ml-auto text-slate-400 text-sm flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-slate-200 font-semibold">{teachers.length}</span> teachers
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 md:px-0 pb-12">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-sm text-red-400 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="py-24 text-center text-slate-400">Loading...</div>
        ) : teachers.length === 0 ? (
          <div className="p-12 text-center bg-gray-800 border border-gray-700 rounded-2xl text-slate-400">No teachers found</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {teachers.map(t => {
              const attendeeClasses = getAttendeeClassesFor(t._id);
              return (
                <article key={t._id} className="bg-gray-800/80 border border-gray-700 rounded-2xl overflow-hidden flex flex-col">
                  {/* Photo + name row */}
                  <div className="flex gap-4 p-5 pb-4 border-b border-gray-700/50">
                    <img
                      src={t.teacherImg}
                      alt={t.name}
                      className="w-20 h-20 rounded-sm object-cover border border-gray-600 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-lg leading-tight truncate">{t.name}</h3>
                      <p className="text-slate-400 text-xs mt-0.5 truncate">{t.qualification || 'No qualification set'}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {t.gender && <span className="text-xs px-2 py-0.5 bg-slate-700 rounded-sm text-slate-300">{t.gender}</span>}
                        {t.age && <span className="text-xs text-slate-400">{t.age} yrs</span>}
                      </div>
                      <p className="text-slate-400 text-xs mt-1.5 truncate">{t.email}</p>
                    </div>
                  </div>

                  {/* Data rows */}
                  <div className="px-5 py-4 space-y-3 flex-1">
                    {/* Salary */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500 w-24 flex-shrink-0">Salary</span>
                      <span className="text-sm font-semibold text-emerald-400">
                        {t.salary ? `Rs.${Number(t.salary).toLocaleString()}` : <span className="text-slate-600 text-xs font-normal">Not set</span>}
                      </span>
                    </div>

                    {/* Subjects */}
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-semibold text-slate-500 w-24 flex-shrink-0 pt-0.5">Subjects</span>
                      {(t.subjects || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {t.subjects.map((s, i) => (
                            <span key={i} className="text-xs bg-orange-500/10 text-orange-300 px-2 py-0.5 rounded-sm border border-orange-500/20">
                              {typeof s === 'object' ? s.subjectName : s}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-xs text-slate-600">None assigned</span>}
                    </div>

                    {/* Classes teaching */}
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-semibold text-slate-500 w-24 flex-shrink-0 pt-0.5">Teaches</span>
                      {(t.teacherClasses || []).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {t.teacherClasses.map((c, i) => (
                            <span key={i} className="text-xs bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-sm border border-blue-500/20">
                              {typeof c === 'object' ? c.classText : c}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-xs text-slate-600">None assigned</span>}
                    </div>

                    {/* Class Attendee */}
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-semibold text-slate-500 w-24 flex-shrink-0 pt-0.5">Attendee For</span>
                      {attendeeClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {attendeeClasses.map((c, i) => (
                            <span key={i} className="text-xs bg-green-500/10 text-green-300 px-2 py-0.5 rounded-sm border border-green-500/25 font-medium">
                              {c.classText}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-xs text-slate-600">Not a class teacher</span>}
                    </div>

                    {/* Password */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-slate-500 w-24 flex-shrink-0">Password</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-slate-300">
                          {passwordVisibility[t._id] ? (t.password || 'N/A') : 'xxxxxxxxx'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(t._id)}
                          className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                        >
                          {passwordVisibility[t._id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-5 py-3 border-t border-gray-700/50 flex gap-2">
                    <button
                      onClick={() => openEdit(t)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm border border-gray-600 text-slate-200 rounded-lg py-2 hover:border-orange-500 hover:text-orange-400 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t._id)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm border border-red-600/50 text-red-400 rounded-lg py-2 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-700/60 bg-gray-800/60">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teacher</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Salary</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Subjects</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Classes</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Class Teacher</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Password</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/40">
                  {teachers.map((t) => {
                    const attendeeClasses = getAttendeeClassesFor(t._id);
                    return (
                      <tr key={t._id} className="hover:bg-gray-700/20 transition-colors">

                        {/* Teacher */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {t.teacherImg ? (
                              <img src={t.teacherImg} alt={t.name} className="w-9 h-9 rounded-sm object-cover border border-gray-600 shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-sm bg-orange-500/15 border border-gray-600 flex items-center justify-center shrink-0">
                                <span className="text-sm font-semibold text-orange-400">{t.name?.charAt(0)?.toUpperCase()}</span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-100 truncate">{t.name}</p>
                              <p className="text-xs text-slate-500 truncate">{t.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Salary */}
                        <td className="px-4 py-3 hidden sm:table-cell">
                          {t.salary
                            ? <span className="font-semibold text-emerald-400">&#8377;{Number(t.salary).toLocaleString('en-IN')}</span>
                            : <span className="text-slate-600 text-xs">Not set</span>}
                        </td>

                        {/* Subjects */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          {(t.subjects || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {t.subjects.slice(0, 3).map((s, i) => (
                                <span key={i} className="text-xs bg-orange-500/10 text-orange-300 px-2 py-0.5 rounded-sm border border-orange-500/20">
                                  {typeof s === 'object' ? s.subjectName : s}
                                </span>
                              ))}
                              {t.subjects.length > 3 && (
                                <span className="text-xs text-slate-500">+{t.subjects.length - 3}</span>
                              )}
                            </div>
                          ) : <span className="text-xs text-slate-600">None</span>}
                        </td>

                        {/* Classes */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          {(t.teacherClasses || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {t.teacherClasses.slice(0, 3).map((c, i) => (
                                <span key={i} className="text-xs bg-blue-500/10 text-blue-300 px-2 py-0.5 rounded-sm border border-blue-500/20">
                                  {typeof c === 'object' ? c.classText : c}
                                </span>
                              ))}
                              {t.teacherClasses.length > 3 && (
                                <span className="text-xs text-slate-500">+{t.teacherClasses.length - 3}</span>
                              )}
                            </div>
                          ) : <span className="text-xs text-slate-600">None</span>}
                        </td>

                        {/* Class Teacher */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {attendeeClasses.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {attendeeClasses.map((c, i) => (
                                <span key={i} className="text-xs bg-green-500/10 text-green-300 px-2 py-0.5 rounded-sm border border-green-500/25 font-medium">
                                  {c.classText}
                                </span>
                              ))}
                            </div>
                          ) : <span className="text-xs text-slate-600">&#8212;</span>}
                        </td>

                        {/* Password */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-slate-300">
                              {passwordVisibility[t._id] ? (t.password || 'N/A') : '&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;'}
                            </span>
                            <button
                              onClick={() => togglePasswordVisibility(t._id)}
                              className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                            >
                              {passwordVisibility[t._id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(t)}
                              className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(t._id)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm">
          {/* Left decorative pane */}
          <div className="hidden md:flex w-2/5 flex-col border-r border-orange-500/20 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500/20 flex-shrink-0" />
            {[420, 300, 190].map((s, i) => (
              <div
                key={i}
                className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm pointer-events-none"
                style={{ width: s, height: s, border: `1px solid rgba(249,115,22,${0.05 + i * 0.05})` }}
              />
            ))}
            <div
              className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-sm pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)' }}
            />
            <div className="flex-1 flex flex-col px-8 pt-8 pb-6 z-10">
              <div className="w-20 h-20 rounded-sm bg-orange-500/10 border-2 border-orange-500/40 shadow-[0_0_40px_rgba(249,115,22,0.15)] flex items-center justify-center mb-6">
                <Groups3Icon sx={{ fontSize: 36, color: '#f97316' }} />
              </div>
              <h3 className="font-black text-2xl text-slate-100 leading-tight">{editing ? 'Edit' : 'Add'} Teacher</h3>
              <p className="text-slate-400 mt-2 mb-4 text-sm leading-relaxed">
                Fill in the details below to {editing ? 'update this' : 'register a new'} teacher. Assign subjects, classes, and set the monthly salary.
              </p>
              <div className="flex-1" />
              <button
                onClick={() => setShowForm(false)}
                className="text-sm text-slate-400 hover:text-slate-100 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
                Back to Teachers
              </button>
            </div>
          </div>

          {/* Right form pane */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
            <div className="h-1 bg-gradient-to-r from-orange-500/30 via-orange-500 to-orange-400 flex-shrink-0" />
            <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-700 flex-shrink-0">
              <button onClick={() => setShowForm(false)} className="text-slate-400">Back</button>
              <span className="font-bold text-slate-100">{editing ? 'Edit Teacher' : 'Add New Teacher'}</span>
            </div>

            <form onSubmit={submitForm} className="flex-1 overflow-y-auto px-6 md:px-10 pt-8 pb-8 space-y-7">
              <div className="hidden md:flex items-center gap-3">
                <div className="w-1 h-9 bg-orange-500 rounded-sm" />
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{editing ? 'Edit Teacher' : 'Teacher Information'}</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Fields marked * are required</p>
                </div>
              </div>

              {/* Personal Info */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Personal Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Full Name *</label>
                    <input
                      required
                      placeholder="e.g. Esther Wilson"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="bg-gray-800 border border-gray-700 focus:border-orange-500 rounded-sm px-4 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder-slate-600"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Email Address *</label>
                    <input
                      required
                      type="email"
                      placeholder="e.g. esther@school.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="bg-gray-800 border border-gray-700 focus:border-orange-500 rounded-sm px-4 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder-slate-600"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Qualification</label>
                    <input
                      placeholder="e.g. M.Sc Mathematics"
                      value={form.qualification}
                      onChange={e => setForm(f => ({ ...f, qualification: e.target.value }))}
                      className="bg-gray-800 border border-gray-700 focus:border-orange-500 rounded-sm px-4 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder-slate-600"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Age</label>
                    <input
                      type="number"
                      min="18"
                      placeholder="e.g. 30"
                      value={form.age}
                      onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                      className="bg-gray-800 border border-gray-700 focus:border-orange-500 rounded-sm px-4 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder-slate-600"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Gender</label>
                    <select
                      value={form.gender}
                      onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                      className="bg-gray-800 border border-gray-700 focus:border-orange-500 rounded-sm px-4 py-2.5 text-sm text-slate-100 outline-none transition-colors"
                    >
                      <option value="">Select gender...</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Monthly Salary (Rs.)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 25000"
                      value={form.salary}
                      onChange={e => setForm(f => ({ ...f, salary: e.target.value }))}
                      className="bg-gray-800 border border-gray-700 focus:border-orange-500 rounded-sm px-4 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Assignment */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Assignment</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Subjects Assigned</label>
                    <div className="bg-gray-800 border border-gray-700 rounded-sm p-3 min-h-[130px] flex flex-col gap-2">
                      {(form.subjects || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {form.subjects.map(id => {
                            const s = subjects.find(x => x._id === id);
                            return (
                              <span key={id} className="text-xs bg-orange-500/15 text-orange-300 px-2 py-0.5 rounded-sm border border-orange-500/20">
                                {s?.subjectName || id}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex-1 overflow-y-auto max-h-32 space-y-0.5">
                        {subjects.map(s => (
                          <button
                            type="button"
                            key={s._id}
                            onClick={() => toggleSelect('subjects', s._id)}
                            className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                              form.subjects?.includes(s._id)
                                ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20'
                                : 'text-slate-400 hover:bg-gray-700 hover:text-slate-200'
                            }`}
                          >
                            {s.subjectName}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Classes Assigned</label>
                    <div className="bg-gray-800 border border-gray-700 rounded-sm p-3 min-h-[130px] flex flex-col gap-2">
                      {(form.teacherClasses || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {form.teacherClasses.map(id => {
                            const c = classes.find(x => x._id === id);
                            return (
                              <span key={id} className="text-xs bg-blue-500/15 text-blue-300 px-2 py-0.5 rounded-sm border border-blue-500/20">
                                {c?.classText || id}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex-1 overflow-y-auto max-h-32 space-y-0.5">
                        {classes.map(c => (
                          <button
                            type="button"
                            key={c._id}
                            onClick={() => toggleSelect('teacherClasses', c._id)}
                            className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                              form.teacherClasses?.includes(c._id)
                                ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                                : 'text-slate-400 hover:bg-gray-700 hover:text-slate-200'
                            }`}
                          >
                            {c.classText}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Attendee For */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Attendee For (Class Teacher)</label>
                    <div className="bg-gray-800 border border-gray-700 rounded-sm p-3 min-h-[130px] flex flex-col gap-2">
                      {(form.attendeeClasses || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {form.attendeeClasses.map(id => {
                            const c = classes.find(x => x._id === id);
                            return (
                              <span key={id} className="text-xs bg-green-500/15 text-green-300 px-2 py-0.5 rounded-sm border border-green-500/20">
                                {c?.classText || id}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex-1 overflow-y-auto max-h-32 space-y-0.5">
                        {classes.map(c => (
                          <button
                            type="button"
                            key={c._id}
                            onClick={() => toggleSelect('attendeeClasses', c._id)}
                            className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                              form.attendeeClasses?.includes(c._id)
                                ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                                : 'text-slate-400 hover:bg-gray-700 hover:text-slate-200'
                            }`}
                          >
                            {c.classText}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Account</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">{editing ? 'New Password' : 'Password *'}</label>
                    <input
                      required={!editing}
                      type="password"
                      placeholder={editing ? 'Leave blank to keep current' : 'Set a secure password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="bg-gray-800 border border-gray-700 focus:border-orange-500 rounded-sm px-4 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder-slate-600"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-400">Profile Photo</label>
                    <div className="flex items-center gap-3">
                      <input ref={fileRef} onChange={handleFile} type="file" accept="image/*" className="hidden" />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="text-sm px-4 py-2.5 rounded-sm border border-gray-700 text-slate-300 hover:border-orange-500 transition-colors bg-gray-800"
                      >
                        Choose File
                      </button>
                      <span className="text-slate-500 text-xs truncate">
                        {imageFile ? imageFile.name : editing ? 'Keep existing photo' : 'No file chosen'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-sm text-red-400 text-sm">{error}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-700 text-slate-400 font-semibold py-3 rounded-sm hover:border-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 font-bold py-3 rounded-sm text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 transition-colors"
                >
                  {loading ? 'Saving...' : editing ? 'Save Changes' : 'Create Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
