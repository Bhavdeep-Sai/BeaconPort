/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import axios from 'axios';
import { baseApi } from '../../../environment';
import { classSchema } from '../../../yupSchema/classSchema';
import {
  GraduationCap, Edit, Trash2, Plus, ArrowLeft, Users, CheckCircle,
  Layers, BookOpen, Search, X,
} from 'lucide-react';
import { Spinner } from '../../../components/ui';

const FREQ_LABEL = {
  'monthly':     { short: '/mo',      long: 'Monthly'     },
  'quarterly':   { short: '/qtr',     long: 'Quarterly'   },
  'half-yearly': { short: '/half-yr', long: 'Half-Yearly' },
  'annual':      { short: '/yr',      long: 'Annual'      },
};

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const Class = () => {
  const [message, setMessage]               = useState('');
  const [messageType, setMessageType]       = useState('success');
  const [classes, setClasses]               = useState([]);
  const [subjects, setSubjects]             = useState([]);
  const [subjectSearch, setSubjectSearch]   = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [edit, setEdit]                     = useState(false);
  const [editId, setEditId]                 = useState(null);
  const [loading, setLoading]               = useState(false);
  const [showForm, setShowForm]             = useState(false);
  const [feeFrequency, setFeeFrequency]     = useState('monthly');

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseApi}/class/all`);
      setClasses(res.data.data || []);
    } catch {
      setMessage('Failed to fetch classes'); setMessageType('error');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchClasses(); }, []);

  useEffect(() => {
    axios.get(`${baseApi}/subject/all`).then(r => setSubjects(r.data.data || [])).catch(() => {});
    axios.get(`${baseApi}/fee/settings`).then(r => { if (r.data?.feeFrequency) setFeeFrequency(r.data.feeFrequency); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (message) { const t = setTimeout(() => setMessage(''), 5000); return () => clearTimeout(t); }
  }, [message]);

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showForm]);

  const formik = useFormik({
    initialValues: { classText: '', classNum: '', classFee: 0 },
    validationSchema: classSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const payload = { ...values, includedSubjects: selectedSubjects };
        if (edit) {
          const res = await axios.put(`${baseApi}/class/update/${editId}`, payload);
          setMessage(res.data.message || 'Class updated successfully');
        } else {
          const res = await axios.post(`${baseApi}/class/create`, payload);
          setMessage(res.data.message || 'Class created successfully');
        }
        setMessageType('success');
        formik.resetForm(); setSelectedSubjects([]); setShowForm(false); setEdit(false); setEditId(null);
        fetchClasses();
      } catch { setMessage('Operation failed. Please try again.'); setMessageType('error');
      } finally { setLoading(false); }
    },
  });

  const handleEdit = (cls) => {
    setEdit(true); setEditId(cls._id);
    formik.setValues({ classText: cls.classText, classNum: cls.classNum, classFee: cls.classFee || 0 });
    setSelectedSubjects((cls.includedSubjects || []).map(s => s._id || s));
    setShowForm(true);
  };

  const handleCancel = () => {
    setEdit(false); setEditId(null); setShowForm(false); setSelectedSubjects([]); formik.resetForm();
  };

  const handleAddNew = () => {
    setEdit(false); setEditId(null); setSelectedSubjects([]); formik.resetForm(); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    setLoading(true);
    try {
      const res = await axios.delete(`${baseApi}/class/delete/${id}`);
      setMessage(res.data.message || 'Class deleted successfully'); setMessageType('success'); fetchClasses();
    } catch { setMessage('Failed to delete class'); setMessageType('error');
    } finally { setLoading(false); }
  };

  const toggleSubject = (id) =>
    setSelectedSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const filteredSubjects = subjects.filter(s =>
    s.subjectName.toLowerCase().includes(subjectSearch.toLowerCase()) ||
    (s.subjectCode || '').toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const freqShort = FREQ_LABEL[feeFrequency]?.short ?? '';
  const freqLong  = FREQ_LABEL[feeFrequency]?.long  ?? 'Term';

  const bullets = edit ? [
    { icon: Edit,        label: 'Update class details',    sub: 'Change name, fee or included subjects' },
    { icon: Layers,      label: 'Maintain structure',      sub: 'Keep your curriculum organised'        },
    { icon: CheckCircle, label: 'Changes apply instantly', sub: 'All assignments remain intact'         },
  ] : [
    { icon: Users,       label: 'Organise your students',  sub: 'Group students by class & grade'       },
    { icon: BookOpen,    label: 'Assign free subjects',    sub: 'Pick subjects included in class fee'   },
    { icon: CheckCircle, label: 'Instantly available',     sub: 'Ready to assign teachers and students' },
  ];

  return (
    <div className={showForm ? 'h-screen overflow-hidden bg-gray-950' : 'min-h-screen bg-gray-950'}>

      {/* ── Full-screen form overlay ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex bg-gray-950 overflow-hidden">

          {/* Left panel */}
          <div className="hidden md:flex w-2/5 flex-col border-r border-orange-500/20 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500/20 flex-shrink-0" />
            {[420, 300, 190].map((s, i) => (
              <div key={i} className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{ width: s, height: s, border: `1px solid rgba(249,115,22,${0.05 + i * 0.05})` }} />
            ))}
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)' }} />
            <div className="flex-1 flex flex-col px-10 pt-10 pb-6 z-10">
              <div className="w-24 h-24 rounded-full bg-orange-500/10 border-2 border-orange-500/40 shadow-[0_0_40px_rgba(249,115,22,0.15)] flex items-center justify-center mb-7">
                <GraduationCap size={48} className="text-orange-500" />
              </div>
              <h1 className="font-black text-3xl text-slate-100 leading-tight">{edit ? 'Edit' : 'Create a'}</h1>
              <h1 className="font-black text-3xl text-orange-500 leading-tight mb-4">{edit ? 'Class Details' : 'New Class'}</h1>
              <p className="text-slate-400 leading-relaxed mb-8 max-w-xs">
                {edit
                  ? 'Update the class details, fee or the subjects included at no extra cost for students.'
                  : 'Add a new class, set the term fee and choose which subjects are included free of charge.'}
              </p>
              {bullets.map((item, i) => (
                <div key={i} className="flex items-center gap-3 mb-3 p-3 bg-orange-500/5 border border-orange-500/10 rounded-2xl hover:bg-orange-500/10 hover:border-orange-500/20 transition-all">
                  <div className="p-2 bg-orange-500/15 rounded-xl text-orange-500 flex-shrink-0"><item.icon size={20} /></div>
                  <div>
                    <p className="text-slate-100 font-semibold text-sm leading-tight">{item.label}</p>
                    <p className="text-slate-500 text-xs">{item.sub}</p>
                  </div>
                </div>
              ))}
              <div className="flex-1" />
              <div className="border-t border-orange-500/15 pt-4">
                <button onClick={handleCancel} className="flex items-center gap-2 text-slate-500 hover:text-slate-100 font-medium transition-colors text-sm">
                  <ArrowLeft size={16} /> Back to Classes
                </button>
              </div>
            </div>
          </div>

          {/* Right form panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
            <div className="h-1 bg-gradient-to-r from-orange-500/30 via-orange-500 to-orange-400 flex-shrink-0" />
            <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-700 flex-shrink-0">
              <button onClick={handleCancel} className="text-slate-400 hover:text-slate-100"><ArrowLeft size={20} /></button>
              <span className="font-bold text-slate-100">{edit ? 'Edit Class' : 'Add New Class'}</span>
            </div>
            <form onSubmit={formik.handleSubmit} className="form-scroll flex-1 flex flex-col overflow-y-auto px-6 md:px-12 pt-6 md:pt-12 pb-8">
              <div className="hidden md:flex items-center gap-4 mb-8">
                <div className="w-1 h-9 bg-orange-500 rounded-full flex-shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-slate-100 leading-tight">{edit ? 'Edit Class' : 'Class Information'}</h2>
                  <p className="text-slate-500 text-sm mt-0.5">{edit ? 'Update the details below and save' : 'Fill in the details to create a new class'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-6 max-w-xl">

                {/* Row: Name + Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Class Name</label>
                    <input name="classText" type="text" placeholder="e.g. Kalvium-Juniors"
                      value={formik.values.classText} onChange={formik.handleChange} onBlur={formik.handleBlur}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors" />
                    {formik.touched.classText && formik.errors.classText && (
                      <p className="text-red-400 text-xs mt-1">{formik.errors.classText}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Class Number</label>
                    <input name="classNum" type="text" placeholder="e.g. 014"
                      value={formik.values.classNum} onChange={formik.handleChange} onBlur={formik.handleBlur}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors" />
                    {formik.touched.classNum && formik.errors.classNum && (
                      <p className="text-red-400 text-xs mt-1">{formik.errors.classNum}</p>
                    )}
                  </div>
                </div>

                {/* Fee */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">{freqLong} Class Fee (&#x20B9;)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">&#x20B9;</span>
                    <input name="classFee" type="number" min="0" placeholder="0"
                      value={formik.values.classFee} onChange={formik.handleChange} onBlur={formik.handleBlur}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-7 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors" />
                  </div>
                  <p className="text-slate-500 text-xs mt-1">Base {freqLong.toLowerCase()} fee charged for students in this class</p>
                </div>

                {/* ── Included Subjects ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-sm font-medium text-slate-300">Included Subjects</label>
                      <p className="text-xs text-slate-500 mt-0.5">Subjects available free of charge for students in this class</p>
                    </div>
                    {selectedSubjects.length > 0 && (
                      <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/25 rounded-full px-2.5 py-0.5 font-semibold flex-shrink-0 ml-3">
                        {selectedSubjects.length} selected
                      </span>
                    )}
                  </div>

                  {subjects.length === 0 ? (
                    <div className="text-center py-5 px-4 bg-gray-800/60 border border-dashed border-gray-700 rounded-xl text-slate-600 text-sm">
                      No subjects available. Add subjects from Subject Management first.
                    </div>
                  ) : (
                    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                      {/* Search bar */}
                      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-700 bg-gray-800/80">
                        <Search size={14} className="text-slate-500 flex-shrink-0" />
                        <input type="text" placeholder="Search subjects..." value={subjectSearch}
                          onChange={e => setSubjectSearch(e.target.value)}
                          className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-600 outline-none" />
                        {subjectSearch && (
                          <button type="button" onClick={() => setSubjectSearch('')} className="text-slate-500 hover:text-slate-300 transition-colors">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                      {/* List */}
                      <div className="form-scroll max-h-56 overflow-y-auto divide-y divide-gray-700/40">
                        {filteredSubjects.length === 0 ? (
                          <p className="text-center text-slate-600 text-xs py-5">No matching subjects</p>
                        ) : filteredSubjects.map(sub => {
                          const checked = selectedSubjects.includes(sub._id);
                          return (
                            <label key={sub._id}
                              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${checked ? 'bg-orange-500/5 hover:bg-orange-500/10' : 'hover:bg-gray-700/40'}`}>
                              <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${checked ? 'bg-orange-500 border-orange-500' : 'border-gray-600 bg-gray-700'}`}>
                                {checked && <CheckCircle size={10} className="text-white" strokeWidth={3} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium leading-tight truncate ${checked ? 'text-slate-100' : 'text-slate-300'}`}>{sub.subjectName}</p>
                                <p className="text-xs text-slate-500 mt-0.5">Code: {sub.subjectCode}&nbsp;&nbsp;·&nbsp;&nbsp;Fee: {fmt(sub.subjectFee)}{freqShort}</p>
                              </div>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${checked ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'bg-gray-700/80 text-slate-500'}`}>
                                {checked ? 'Included' : 'Optional'}
                              </span>
                              <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleSubject(sub._id)} />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Selected chips */}
                  {selectedSubjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {selectedSubjects.map(id => {
                        const sub = subjects.find(s => s._id === id);
                        if (!sub) return null;
                        return (
                          <span key={id} className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-400 border border-orange-500/25 rounded-full px-2.5 py-0.5 text-xs font-medium">
                            <BookOpen size={9} /> {sub.subjectName}
                            <button type="button" onClick={() => toggleSubject(id)} className="ml-0.5 text-orange-400/60 hover:text-orange-300 transition-colors">
                              <X size={10} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              <div className="flex-1 min-h-8" />
              <div className="flex gap-3 pt-6 flex-wrap max-w-xl">
                <button type="button" onClick={handleCancel}
                  className="flex-1 min-w-[120px] border border-gray-700 text-slate-400 font-semibold py-3 rounded-xl hover:border-gray-600 hover:text-slate-200 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={loading}
                  className={`flex-[2] min-w-[180px] font-bold py-3 rounded-xl transition-all text-white flex items-center justify-center gap-2 ${edit ? 'bg-green-500 hover:bg-green-600' : 'bg-orange-500 hover:bg-orange-600'} disabled:bg-gray-700 disabled:text-slate-500`}>
                  {loading ? <Spinner size="sm" color="white" /> : edit ? 'Save Changes' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="px-4 md:px-8 pt-7 pb-2 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 leading-tight">Class Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create and manage your school classes</p>
        </div>
        <button onClick={handleAddNew}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-5 py-2.5 transition-colors shadow-lg shadow-orange-500/20">
          <Plus size={18} /> Add Class
        </button>
      </div>

      {/* ── Alert ── */}
      {message && (
        <div className="px-4 md:px-8 pt-4">
          <div className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium ${messageType === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="ml-3 opacity-70 hover:opacity-100">&#x2715;</button>
          </div>
        </div>
      )}

      {/* ── Classes grid ── */}
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-100">All Classes</h2>
          <span className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-full px-3 py-1 text-sm font-medium">
            <GraduationCap size={14} /> {classes.length} {classes.length === 1 ? 'Class' : 'Classes'}
          </span>
        </div>

        {loading && classes.length === 0 ? (
          <div className="flex justify-center py-20"><Spinner size="lg" color="orange" /></div>
        ) : classes.length === 0 ? (
          <div className="p-12 text-center bg-gray-800 border border-gray-700 rounded-2xl">
            <div className="w-20 h-20 mx-auto mb-5 bg-orange-500/10 rounded-full flex items-center justify-center">
              <GraduationCap size={36} className="text-orange-500 opacity-70" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">No Classes Yet</h3>
            <p className="text-slate-500 text-sm mb-6">Add your first class to get started</p>
            <button onClick={handleAddNew}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-5 py-2 transition-colors">
              <Plus size={16} /> Add First Class
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((item) => {
              const included = item.includedSubjects || [];
              const SHOW = 4;
              return (
                <div key={item._id} className="bg-gray-800 border border-gray-700 rounded-2xl hover:border-orange-500/40 hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] transition-all flex flex-col overflow-hidden group">

                  {/* Body */}
                  <div className="p-6 flex-1 flex flex-col gap-6">

                    {/* Header */}
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex-shrink-0 group-hover:bg-orange-500/15 transition-colors">
                        <GraduationCap size={26} className="text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-100 text-lg leading-snug break-words">{item.classText}</h3>
                        <span className="inline-block bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full px-3 py-0.5 text-xs font-semibold mt-1">
                          Class {item.classNum}
                        </span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-900/60 border border-gray-700/80 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" fill="currentColor" viewBox="0 0 16 16" className="flex-shrink-0"><path d="M0 3a2 2 0 0 1 2-2h13.5a.5.5 0 0 1 0 1H15v2a1 1 0 0 1 1 1v8.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 0 12.5zm1 1.732V12.5A1.5 1.5 0 0 0 2.5 14h12a.5.5 0 0 0 .5-.5V5H2a2 2 0 0 1-1-.268M1 3a1 1 0 0 0 1 1h12V2H2a1 1 0 0 0-1 1"/></svg> Fee
                        </p>
                        <p className="text-base font-bold text-green-400 leading-tight">
                          {fmt(item.classFee)}<span className="text-xs font-normal text-slate-500 ml-0.5">{freqShort}</span>
                        </p>
                      </div>
                      <div className="bg-gray-900/60 border border-gray-700/80 rounded-xl p-4">
                        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                          <Users size={11} className="flex-shrink-0" /> Students
                        </p>
                        <p className="text-base font-bold text-blue-400 leading-tight">{item.studentCount ?? 0}</p>
                      </div>
                    </div>

                    {/* Included Subjects */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen size={11} className="flex-shrink-0" /> Included Subjects
                        </p>
                        <span className="text-xs text-slate-500 bg-gray-700/60 rounded-full px-2.5 py-0.5">
                          {included.length} subject{included.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {included.length === 0 ? (
                        <p className="text-xs text-slate-600 italic py-2">No subjects included in class fee</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {included.slice(0, SHOW).map(sub => (
                            <span key={sub._id || sub} className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-3 py-1 text-xs font-medium">
                              <BookOpen size={9} /> {sub.subjectName || '—'}
                            </span>
                          ))}
                          {included.length > SHOW && (
                            <span className="text-xs text-slate-500 bg-gray-700/80 border border-gray-600/50 rounded-full px-3 py-1">
                              +{included.length - SHOW} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Footer actions */}
                  <div className="px-6 py-4 flex justify-end gap-3 border-t border-gray-700/60 bg-gray-800/60">
                    <button onClick={() => handleEdit(item)} disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-xl hover:bg-orange-500/20 text-xs font-semibold transition-colors disabled:opacity-50">
                      <Edit size={13} /> Edit
                    </button>
                    <button onClick={() => handleDelete(item._id)} disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/20 text-xs font-semibold transition-colors disabled:opacity-50">
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Class;
