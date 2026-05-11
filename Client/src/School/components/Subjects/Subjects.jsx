/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import axios from 'axios';
import { baseApi } from '../../../environment';
import { subjectSchema } from '../../../yupSchema/subjectSchema';
import {
  BookOpen, Edit, Trash2, Plus, ArrowLeft,
  Users, GraduationCap, CheckCircle, Layers, Search, X,
} from 'lucide-react';
import { Spinner } from '../../../components/ui';

const FREQ_LABEL = {
  'monthly':     { short: '/mo',       long: 'Monthly'     },
  'quarterly':   { short: '/qtr',      long: 'Quarterly'   },
  'half-yearly': { short: '/half-yr',  long: 'Half-Yearly' },
  'annual':      { short: '/yr',       long: 'Annual'      },
};

const fmt = (n) => `\u20B9${Number(n || 0).toLocaleString('en-IN')}`;

const WalletIcon = ({ size = 12, className = '' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" viewBox="0 0 16 16" className={className}>
    <path d="M0 3a2 2 0 0 1 2-2h13.5a.5.5 0 0 1 0 1H15v2a1 1 0 0 1 1 1v8.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 0 12.5zm1 1.732V12.5A1.5 1.5 0 0 0 2.5 14h12a.5.5 0 0 0 .5-.5V5H2a2 2 0 0 1-1-.268M1 3a1 1 0 0 0 1 1h12V2H2a1 1 0 0 0-1 1"/>
  </svg>
);

const Subjects = () => {
  const [message, setMessage]         = useState('');
  const [messageType, setMessageType] = useState('success');
  const [subjects, setSubjects]       = useState([]);
  const [search, setSearch]           = useState('');
  const [edit, setEdit]               = useState(false);
  const [editId, setEditId]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [showForm, setShowForm]       = useState(false);
  const [feeFrequency, setFeeFrequency] = useState('monthly');

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseApi}/subject/all`);
      setSubjects(res.data.data || []);
    } catch {
      setMessage('Failed to fetch subjects'); setMessageType('error');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSubjects(); }, []);

  useEffect(() => {
    axios.get(`${baseApi}/fee/settings`)
      .then(r => { if (r.data?.feeFrequency) setFeeFrequency(r.data.feeFrequency); })
      .catch(() => {});
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
    initialValues: { subjectName: '', subjectCode: '', subjectFee: 0 },
    validationSchema: subjectSchema,
    onSubmit: async (values) => {
      setLoading(true);
      try {
        if (edit) {
          await axios.put(`${baseApi}/subject/update/${editId}`, values);
          setMessage('Subject updated successfully');
        } else {
          await axios.post(`${baseApi}/subject/create`, values);
          setMessage('Subject created successfully');
        }
        setMessageType('success');
        formik.resetForm(); setShowForm(false); setEdit(false); setEditId(null);
        fetchSubjects();
      } catch {
        setMessage('Operation failed. Please try again.'); setMessageType('error');
      } finally { setLoading(false); }
    },
  });

  const handleEdit = (item) => {
    setEdit(true); setEditId(item._id);
    formik.setValues({ subjectName: item.subjectName, subjectCode: item.subjectCode, subjectFee: item.subjectFee || 0 });
    setShowForm(true);
  };

  const handleCancel = () => {
    setEdit(false); setEditId(null); setShowForm(false); formik.resetForm();
  };

  const handleAddNew = () => {
    setEdit(false); setEditId(null); formik.resetForm(); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    setLoading(true);
    try {
      const res = await axios.delete(`${baseApi}/subject/delete/${id}`);
      setMessage(res.data.message || 'Subject deleted'); setMessageType('success');
      fetchSubjects();
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to delete subject'); setMessageType('error');
    } finally { setLoading(false); }
  };

  const freqShort = FREQ_LABEL[feeFrequency]?.short ?? '';
  const freqLong  = FREQ_LABEL[feeFrequency]?.long  ?? 'Term';

  const filtered = subjects.filter(s =>
    s.subjectName.toLowerCase().includes(search.toLowerCase()) ||
    (s.subjectCode || '').toLowerCase().includes(search.toLowerCase())
  );

  const bullets = edit ? [
    { icon: Edit,        label: 'Update subject details',   sub: 'Change name, code or fee'            },
    { icon: Layers,      label: 'Maintain curriculum',      sub: 'Keep your subjects organised'         },
    { icon: CheckCircle, label: 'Changes apply instantly',  sub: 'All assignments remain intact'        },
  ] : [
    { icon: BookOpen,    label: 'Build your curriculum',    sub: 'Add subjects for classes & students'  },
    { icon: Layers,      label: 'Structured learning',      sub: 'Multi-subject course support'         },
    { icon: CheckCircle, label: 'Instantly available',      sub: 'Ready to assign to teachers & students' },
  ];

  return (
    <div className={showForm ? 'h-screen overflow-hidden bg-gray-950' : 'min-h-screen bg-gray-950'}>

      {/* â”€â”€ Full-screen form overlay â”€â”€ */}
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
                <BookOpen size={48} className="text-orange-500" />
              </div>
              <h1 className="font-black text-3xl text-slate-100 leading-tight">{edit ? 'Edit' : 'Create a'}</h1>
              <h1 className="font-black text-3xl text-orange-500 leading-tight mb-4">{edit ? 'Subject Details' : 'New Subject'}</h1>
              <p className="text-slate-400 leading-relaxed mb-8 max-w-xs">
                {edit
                  ? 'Update the subject name, code, or fee. Existing assignments remain intact.'
                  : 'Add a new subject to your curriculum. Set the fee and assign it to classes and students.'}
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
                  <ArrowLeft size={16} /> Back to Subjects
                </button>
              </div>
            </div>
          </div>

          {/* Right form panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
            <div className="h-1 bg-gradient-to-r from-orange-500/30 via-orange-500 to-orange-400 flex-shrink-0" />
            <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-700 flex-shrink-0">
              <button onClick={handleCancel} className="text-slate-400 hover:text-slate-100"><ArrowLeft size={20} /></button>
              <span className="font-bold text-slate-100">{edit ? 'Edit Subject' : 'Add New Subject'}</span>
            </div>
            <form onSubmit={formik.handleSubmit} className="form-scroll flex-1 flex flex-col overflow-y-auto px-6 md:px-12 pt-6 md:pt-12 pb-8">
              <div className="hidden md:flex items-center gap-4 mb-8">
                <div className="w-1 h-9 bg-orange-500 rounded-full flex-shrink-0" />
                <div>
                  <h2 className="text-xl font-bold text-slate-100 leading-tight">{edit ? 'Edit Subject' : 'Subject Information'}</h2>
                  <p className="text-slate-500 text-sm mt-0.5">{edit ? 'Update the details below and save' : 'Fill in the details to create a new subject'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-6 max-w-xl">

                {/* Name + Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Subject Name</label>
                    <input name="subjectName" type="text" placeholder="e.g. Mathematics, Physics..."
                      value={formik.values.subjectName} onChange={formik.handleChange} onBlur={formik.handleBlur}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors" />
                    {formik.touched.subjectName && formik.errors.subjectName && (
                      <p className="text-red-400 text-xs mt-1">{formik.errors.subjectName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Subject Code</label>
                    <input name="subjectCode" type="text" placeholder="e.g. MATH101"
                      value={formik.values.subjectCode} onChange={formik.handleChange} onBlur={formik.handleBlur}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors" />
                    {formik.touched.subjectCode && formik.errors.subjectCode && (
                      <p className="text-red-400 text-xs mt-1">{formik.errors.subjectCode}</p>
                    )}
                  </div>
                </div>

                {/* Fee */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">{freqLong} Subject Fee (&#x20B9;)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">&#x20B9;</span>
                    <input name="subjectFee" type="number" min="0" placeholder="0"
                      value={formik.values.subjectFee} onChange={formik.handleChange} onBlur={formik.handleBlur}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-7 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-colors" />
                  </div>
                  <p className="text-slate-500 text-xs mt-1">
                    Additional {freqLong.toLowerCase()} fee charged when a student enrolls in this subject.
                    Set to 0 if the subject is always free.
                  </p>
                </div>

                {/* Info box */}
                <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 text-xs text-slate-400 leading-relaxed">
                  <p className="font-semibold text-blue-400 mb-1">ðŸ’¡ About subject fees</p>
                  If this subject is added to a class's <span className="text-slate-200 font-medium">Included Subjects</span>, students in that class are charged <span className="text-green-400 font-medium">â‚¹0</span> for it regardless of this fee. The fee only applies to students who enroll in the subject outside of their class bundle.
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
                  {loading ? <Spinner size="sm" color="white" /> : edit ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* â”€â”€ Header â”€â”€ */}
      <div className="px-4 md:px-8 pt-7 pb-2 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 leading-tight">Subject Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create and manage your curriculum subjects</p>
        </div>
        <button onClick={handleAddNew}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-5 py-2.5 transition-colors shadow-lg shadow-orange-500/20">
          <Plus size={18} /> Add Subject
        </button>
      </div>

      {/* â”€â”€ Alert â”€â”€ */}
      {message && (
        <div className="px-4 md:px-8 pt-4">
          <div className={`flex items-center justify-between p-3 rounded-xl border text-sm font-medium ${messageType === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="ml-3 opacity-70 hover:opacity-100"><X size={14} /></button>
          </div>
        </div>
      )}

      {/* â”€â”€ Content â”€â”€ */}
      <div className="p-4 md:p-8">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text" placeholder="Search subjects..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  <X size={13} />
                </button>
              )}
            </div>
            <h2 className="text-sm text-slate-500 flex-shrink-0">
              {search ? `${filtered.length} of ${subjects.length}` : subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
            </h2>
          </div>
          <span className="flex items-center gap-1.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-full px-3 py-1 text-sm font-medium flex-shrink-0">
            <BookOpen size={14} /> {subjects.length} {subjects.length === 1 ? 'Subject' : 'Subjects'}
          </span>
        </div>

        {/* Grid */}
        {loading && subjects.length === 0 ? (
          <div className="flex justify-center py-20"><Spinner size="lg" color="orange" /></div>
        ) : subjects.length === 0 ? (
          <div className="p-12 text-center bg-gray-800 border border-gray-700 rounded-2xl">
            <div className="w-20 h-20 mx-auto mb-5 bg-orange-500/10 rounded-full flex items-center justify-center">
              <BookOpen size={36} className="text-orange-500 opacity-70" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-2">No Subjects Yet</h3>
            <p className="text-slate-500 text-sm mb-6">Add your first subject to get started</p>
            <button onClick={handleAddNew}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-5 py-2 transition-colors">
              <Plus size={16} /> Add First Subject
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center bg-gray-800/60 border border-dashed border-gray-700 rounded-2xl">
            <p className="text-slate-500 text-sm">No subjects match <span className="text-slate-300 font-medium">"{search}"</span></p>
            <button onClick={() => setSearch('')} className="mt-3 text-orange-400 text-xs hover:text-orange-300 transition-colors">Clear search</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((item) => (
              <div key={item._id}
                className="bg-gray-800 border border-gray-700 rounded-2xl hover:border-orange-500/40 hover:shadow-[0_8px_40px_rgba(0,0,0,0.5)] transition-all flex flex-col overflow-hidden group">

                {/* Body */}
                <div className="p-6 flex-1 flex flex-col gap-5">

                  {/* Header */}
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex-shrink-0 group-hover:bg-orange-500/15 transition-colors">
                      <BookOpen size={24} className="text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-100 text-lg leading-snug break-words">{item.subjectName}</h3>
                      <span className="inline-block bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full px-3 py-0.5 text-xs font-semibold mt-1">
                        {item.subjectCode}
                      </span>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    {/* Fee */}
                    <div className="bg-gray-900/60 border border-gray-700/80 rounded-xl p-3.5 col-span-1">
                      <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                        <WalletIcon size={10} className="flex-shrink-0" /> Fee
                      </p>
                      <p className="text-sm font-bold text-green-400 leading-tight">
                        {fmt(item.subjectFee)}<span className="text-xs font-normal text-slate-500 ml-0.5">{freqShort}</span>
                      </p>
                    </div>
                    {/* Students enrolled */}
                    <div className="bg-gray-900/60 border border-gray-700/80 rounded-xl p-3.5 col-span-1">
                      <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                        <Users size={10} className="flex-shrink-0" /> Students
                      </p>
                      <p className="text-sm font-bold text-blue-400 leading-tight">{item.studentCount ?? 0}</p>
                    </div>
                    {/* Classes */}
                    <div className="bg-gray-900/60 border border-gray-700/80 rounded-xl p-3.5 col-span-1">
                      <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                        <GraduationCap size={10} className="flex-shrink-0" /> Classes
                      </p>
                      <p className="text-sm font-bold text-purple-400 leading-tight">{item.classCount ?? 0}</p>
                    </div>
                  </div>

                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2">
                    {(item.subjectFee || 0) === 0 ? (
                      <span className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full px-3 py-1 text-xs font-semibold">
                        <CheckCircle size={10} /> Free Subject
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full px-3 py-1 text-xs font-semibold">
                        <WalletIcon size={9} /> Paid Subject
                      </span>
                    )}
                    {(item.classCount ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full px-3 py-1 text-xs font-semibold">
                        <GraduationCap size={10} /> Included in {item.classCount} {item.classCount === 1 ? 'class' : 'classes'}
                      </span>
                    )}
                  </div>

                </div>

                {/* Footer */}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Subjects;
