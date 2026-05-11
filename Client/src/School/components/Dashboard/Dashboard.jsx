/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useRef, useState } from 'react';
import { baseApi } from '../../../environment';
import axios from 'axios';
import {
  Users, GraduationCap, BookOpen, Building2, Bell,
  Calendar as CalendarIcon, Edit, Eye, Upload, X,
  ArrowLeft, Check, DollarSign, Banknote,
  ChevronLeft, ChevronRight, AlertCircle, TrendingUp
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip,
} from 'recharts';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const WEEKDAYS = ['S','M','T','W','T','F','S'];

const getCurrentTerm = (freq) => {
  const m = new Date().getMonth();
  if (freq === 'half-yearly') return m < 6 ? 'H1' : 'H2';
  if (freq === 'quarterly')   return ['Q1','Q1','Q1','Q2','Q2','Q2','Q3','Q3','Q3','Q4','Q4','Q4'][m];
  if (freq === 'monthly')     return String(m + 1).padStart(2, '0');
  return 'Annual';
};

const fmt = (n) => {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-gray-200">{payload[0].name}</p>
      <p className="text-gray-400">{fmt(payload[0].value)}</p>
    </div>
  );
};

const Dashboard = () => {
  const [schoolData, setSchoolData]   = useState(null);
  const [error, setError]             = useState(null);
  const [success, setSuccess]         = useState(null);
  const [preview, setPreview]         = useState(false);
  const [edit, setEdit]               = useState(false);
  const [schoolName, setSchoolName]   = useState('');
  const [ownerName, setOwnerName]     = useState('');
  const [email, setEmail]             = useState('');

  const [stats, setStats]             = useState({ students: 0, teachers: 0, classes: 0, subjects: 0 });
  const [feeStats, setFeeStats]       = useState(null);
  const [feePeriodLabel, setFeePeriodLabel] = useState('');
  const [salaryStats, setSalaryStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const [notices, setNotices]         = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const today                         = new Date();

  const [file, setFile]               = useState(null);
  const [imageUrl, setImageUrl]       = useState(null);
  const fileInputRef                  = useRef(null);

  const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  // ── Fetch school profile ────────────────────────────────────────────────────
  const fetchSchool = () => {
    axios.get(`${baseApi}/school/fetch-single`, { headers: authH() })
      .then(res => { if (res.data?.school) setSchoolData(res.data.school); })
      .catch(e => setError(e.response?.data?.message || 'Failed to load school data'));
  };

  // ── Fetch all stats in parallel ─────────────────────────────────────────────
  const fetchStats = async () => {
    setLoadingStats(true);
    const currentYear = new Date().getFullYear();
    try {
      const h = authH();

      // Fetch the school's fee frequency setting first so we can scope
      // the stats to the *current term* — same as Fee Management does.
      let frequency = 'half-yearly';
      try {
        const settingsRes = await axios.get(`${baseApi}/fee/settings`, { headers: h });
        if (settingsRes.data?.feeFrequency) frequency = settingsRes.data.feeFrequency;
      } catch { /* fall back to half-yearly */ }
      const currentTerm = getCurrentTerm(frequency);

      const [studentsR, teachersR, classesR, subjectsR, feeR, salaryR] = await Promise.allSettled([
        axios.get(`${baseApi}/student/fetch-with-query`, { headers: h }),
        axios.get(`${baseApi}/teacher/fetch-with-query`, { headers: h }),
        axios.get(`${baseApi}/class/all`,                { headers: h }),
        axios.get(`${baseApi}/subject/all`,              { headers: h }),
        axios.get(`${baseApi}/fee/stats`,    { headers: h, params: { year: currentYear, term: currentTerm } }),
        axios.get(`${baseApi}/salary/stats`, { headers: h, params: { year: currentYear } }),
      ]);

      const safe = (settled, fn) => {
        if (settled.status === 'fulfilled') return fn(settled.value.data) ?? 0;
        return settled.reason?.response?.status === 404 ? 0 : null;
      };

      setStats({
        students: safe(studentsR, d => d.students?.length) ?? 0,
        teachers: safe(teachersR, d => d.teachers?.length) ?? 0,
        classes:  safe(classesR,  d => d.data?.length)     ?? 0,
        subjects: safe(subjectsR, d => d.data?.length)     ?? 0,
      });

      // Build a human-readable label matching Fee Management
      const termLabels = {
        H1: 'H1 (Jan–Jun)', H2: 'H2 (Jul–Dec)',
        Q1: 'Q1', Q2: 'Q2', Q3: 'Q3', Q4: 'Q4',
        Annual: 'Full Year',
      };
      setFeePeriodLabel(`${termLabels[currentTerm] || currentTerm} · ${currentYear}`);

      if (feeR.status === 'fulfilled' && feeR.value.data?.stats)
        setFeeStats(feeR.value.data.stats);

      if (salaryR.status === 'fulfilled' && salaryR.value.data?.stats)
        setSalaryStats(salaryR.value.data.stats);

    } catch { setError('Failed to load dashboard statistics'); }
    finally  { setLoadingStats(false); }
  };

  // ── Fetch active notices ─────────────────────────────────────────────────────
  const fetchNotices = async () => {
    setLoadingNotices(true);
    try {
      const res = await axios.get(`${baseApi}/notice/active`, { headers: authH() });
      if (res.data?.data) {
        setNotices(res.data.data.map(n => ({
          id:        n._id,
          title:     n.title,
          content:   n.message,
          important: n.isImportant === true,
          audience:  n.audience,
          rawDate:   new Date(n.expiryDate),
          dateLabel: new Date(n.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        })));
      }
    } catch { /* silent — notices are non-critical */ }
    finally { setLoadingNotices(false); }
  };

  useEffect(() => { fetchSchool(); fetchStats(); fetchNotices(); }, []);
  useEffect(() => {
    if (schoolData) {
      setSchoolName(schoolData.schoolName);
      setOwnerName(schoolData.ownerName);
      setEmail(schoolData.email);
    }
  }, [schoolData]);

  // ── Image helpers ───────────────────────────────────────────────────────────
  const addImage = (e) => {
    const f = e.target.files[0];
    if (f) { setImageUrl(URL.createObjectURL(f)); setFile(f); }
  };
  const clearFile = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFile(null); setImageUrl(null);
  };

  // ── Save edits ─────────────────────────────────────────────────────────────
  const handleEditSubmit = () => {
    setError(null); setSuccess(null);
    const fd = new FormData();
    fd.append('schoolName', schoolName);
    fd.append('ownerName', ownerName);
    fd.append('email', email);
    if (file) fd.append('image', file);
    axios.put(`${baseApi}/school/update`, fd, {
      headers: { ...authH(), 'Content-Type': 'multipart/form-data' },
    })
      .then(res => {
        if (res.data?.success) {
          setSchoolData(res.data.school);
          setSuccess(res.data.message || 'School updated successfully');
          setEdit(false); fetchSchool(); clearFile();
        }
      })
      .catch(e => setError(e.response?.data?.message || 'Failed to update school'));
  };

  const cancelEdit = () => {
    setEdit(false); setError(null); setSuccess(null);
    if (schoolData) {
      setSchoolName(schoolData.schoolName);
      setOwnerName(schoolData.ownerName);
      setEmail(schoolData.email);
    }
    clearFile();
  };

  // ── Calendar helpers ────────────────────────────────────────────────────────
  const prevMonth = () => { const d = new Date(currentDate); d.setMonth(d.getMonth() - 1); setCurrentDate(d); };
  const nextMonth = () => { const d = new Date(currentDate); d.setMonth(d.getMonth() + 1); setCurrentDate(d); };
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay    = (y, m) => new Date(y, m, 1).getDay();

  // ── Fee chart data ──────────────────────────────────────────────────────────
  const feeChartData = feeStats
    ? [
        { name: 'Collected', value: feeStats.paidAmt    || 0, color: '#22c55e' },
        { name: 'Pending',   value: feeStats.pendingAmt || 0, color: '#f97316' },
        { name: 'Overdue',   value: feeStats.overdueAmt || 0, color: '#ef4444' },
      ].filter(d => d.value > 0)
    : [];

  const inputCls = 'w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors placeholder-gray-600';

  // ── Stats config ────────────────────────────────────────────────────────────
  const kpiCards = [
    { icon: <Users         className="w-6 h-6 text-blue-400"   />, label: 'Students', value: stats.students, bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   num: 'text-blue-200'   },
    { icon: <GraduationCap className="w-6 h-6 text-purple-400" />, label: 'Teachers', value: stats.teachers, bg: 'bg-purple-500/10', border: 'border-purple-500/20', num: 'text-purple-200' },
    { icon: <BookOpen      className="w-6 h-6 text-teal-400"   />, label: 'Classes',  value: stats.classes,  bg: 'bg-teal-500/10',   border: 'border-teal-500/20',   num: 'text-teal-200'   },
    { icon: <Building2     className="w-6 h-6 text-amber-400"  />, label: 'Subjects', value: stats.subjects, bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  num: 'text-amber-200'  },
  ];

  return (
    <div className="text-gray-100 p-4 md:p-6 space-y-5">

      {/* ── Edit Full-Screen Overlay ─────────────────────────────────────────── */}
      {edit && (
        <div className="fixed inset-0 z-50 flex overflow-hidden bg-gray-950">
          {/* Decorative left panel */}
          <div className="hidden md:flex flex-col w-[340px] flex-shrink-0 border-r border-orange-500/20 bg-gradient-to-b from-gray-900 to-gray-950 relative overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-orange-500 to-red-500 flex-shrink-0" />
            <div className="flex-1 flex flex-col px-7 pt-10 pb-6 z-10">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-5">
                <Building2 className="w-8 h-8 text-orange-400" />
              </div>
              <h2 className="text-2xl font-black text-gray-100 leading-tight">Edit Your</h2>
              <h2 className="text-2xl font-black text-orange-400 leading-tight mb-3">School Info</h2>
              <p className="text-xs text-gray-500 leading-relaxed mb-6 max-w-xs">
                Update your school's name, contact details and branding image. Changes take effect instantly across the platform.
              </p>
              {[
                { icon: <Edit   className="w-3.5 h-3.5 text-orange-400" />, label: 'Update Details',   sub: 'Change school name, owner & email' },
                { icon: <Upload className="w-3.5 h-3.5 text-orange-400" />, label: 'Change Image',      sub: 'Upload a new banner or logo' },
                { icon: <Check  className="w-3.5 h-3.5 text-orange-400" />, label: 'Instant Updates',   sub: 'Reflects across the entire platform' },
              ].map(({ icon, label, sub }, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/8 transition-colors mb-2">
                  <div className="p-1.5 bg-orange-500/15 rounded-lg flex-shrink-0">
                    {icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-200">{label}</p>
                    <p className="text-xs text-gray-600">{sub}</p>
                  </div>
                </div>
              ))}
              <div className="flex-1" />
              <button onClick={cancelEdit}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-200 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </button>
            </div>
          </div>

          {/* Form panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
            <div className="h-0.5 bg-gradient-to-r from-orange-500/30 via-orange-500 to-red-500 flex-shrink-0" />
            {/* Mobile top bar */}
            <div className="flex md:hidden items-center gap-2 px-4 py-3 border-b border-gray-800 flex-shrink-0">
              <button onClick={cancelEdit} className="p-1.5 text-gray-400 hover:text-gray-200">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="font-bold text-gray-100 text-sm">Edit School Info</span>
            </div>
            <div className="flex-1 overflow-auto px-6 md:px-12 py-8">
              <div className="hidden md:flex items-center gap-3 mb-6">
                <div className="w-1 h-9 rounded-full bg-orange-500 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold text-gray-100">School Information</h3>
                  <p className="text-xs text-gray-500">Update your school's profile details</p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{success}</span>
                  <button onClick={() => setSuccess(null)}><X className="w-4 h-4" /></button>
                </div>
              )}

              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Institute Name</label>
                  <input className={inputCls} value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="Enter school name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Owner Name</label>
                  <input className={inputCls} value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Enter owner name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                  <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter email" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">School Image</label>
                  <input ref={fileInputRef} type="file" onChange={addImage} accept="image/*" className="hidden" id="upload-img-dash" />
                  <label htmlFor="upload-img-dash"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-xl cursor-pointer hover:bg-orange-500/20 transition-colors">
                    <Upload className="w-4 h-4" /> Upload Image
                  </label>
                  {file && <p className="text-xs text-gray-500 mt-1.5">{file.name}</p>}
                  {!imageUrl && schoolData?.schoolImg && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Current Image</p>
                      <img src={schoolData.schoolImg} alt="Current" className="h-28 rounded-xl border border-gray-700 object-contain" />
                    </div>
                  )}
                  {imageUrl && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">New Preview</p>
                      <img src={imageUrl} alt="Preview" className="h-28 rounded-xl border border-gray-700 object-contain" />
                      <button onClick={clearFile} className="text-xs text-red-400 hover:text-red-300 mt-1.5">Remove</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-8 max-w-lg">
                <button onClick={cancelEdit}
                  className="flex-1 py-2.5 text-sm font-semibold text-gray-400 border border-gray-700 rounded-xl hover:border-gray-500 hover:text-gray-200 transition-colors">
                  Cancel
                </button>
                <button onClick={handleEditSubmit}
                  className="flex-[2] flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl transition-all">
                  <Check className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ─────────────────────────────────────────────────────── */}
      {preview && schoolData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-orange-500 to-red-500" />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-100 leading-tight">{schoolData.schoolName}</h3>
                <button onClick={() => setPreview(false)}
                  className="p-1.5 text-gray-500 hover:text-gray-200 transition-colors flex-shrink-0 ml-3">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {schoolData.schoolImg && (
                <img src={schoolData.schoolImg} alt="School"
                  className="w-full h-48 object-contain rounded-xl border border-gray-700/60 mb-4 bg-gray-800" />
              )}
              <div className="border-t border-gray-700/60 pt-4 space-y-3">
                {[
                  { label: 'Owner',      value: schoolData.ownerName },
                  { label: 'Email',      value: schoolData.email },
                  { label: 'Registered', value: new Date(schoolData.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">{item.label}</p>
                    <p className="text-sm text-gray-200 break-all">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Global error banner ──────────────────────────────────────────────── */}
      {error && !edit && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── School Hero Banner ────────────────────────────────────────────────── */}
      {schoolData ? (
        <div className="relative rounded-2xl overflow-hidden border border-gray-700/60 h-52 md:h-64 group">
          {schoolData.schoolImg ? (
            <img src={schoolData.schoolImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-800/80 to-gray-900" />
          )}
          {/* gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent" />

          {/* school info */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-7">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-semibold uppercase tracking-wider">Active</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white drop-shadow-lg mb-2">
              {schoolData.schoolName}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-300">
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-orange-400" />
                {schoolData.ownerName}
              </span>
              <span className="hidden sm:flex items-center gap-1.5">
                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                {schoolData.email}
              </span>
            </div>
          </div>

          {/* action buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={() => setPreview(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-black/50 hover:bg-black/70 border border-white/15 rounded-xl backdrop-blur-sm transition-colors">
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button onClick={() => setEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-orange-500/80 hover:bg-orange-600 border border-orange-400/30 rounded-xl backdrop-blur-sm transition-colors">
              <Edit className="w-3.5 h-3.5" /> Edit
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-700/60 bg-gray-800/60 h-52 md:h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      )}

      {/* ── KPI STAT CARDS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map(({ icon, label, value, bg, border, num }) => (
          <div key={label}
            className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-4 md:p-5 flex items-center gap-4 hover:border-gray-600 transition-colors group">
            <div className={`${bg} ${border} border p-3 rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform`}>
              {icon}
            </div>
            <div className="min-w-0">
              {loadingStats ? (
                <div className="h-8 w-12 bg-gray-700 rounded animate-pulse mb-1" />
              ) : (
                <p className={`text-3xl font-black ${num} leading-none`}>{value}</p>
              )}
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── FINANCIAL OVERVIEW ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Fee Collection card */}
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-green-500 to-emerald-500" />
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-100">Fee Collection</h3>
                <p className="text-xs text-gray-500">{feePeriodLabel || `${new Date().getFullYear()} overview`}</p>
              </div>
              {feeStats && (
                <div className="ml-auto flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-lg">
                  <TrendingUp className="w-3 h-3" />
                  {feeStats.totalRecords || 0} records
                </div>
              )}
            </div>

            {loadingStats ? (
              <div className="h-32 bg-gray-700/40 rounded-xl animate-pulse" />
            ) : !feeStats ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-600">
                <DollarSign className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No fee data yet</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-5">
                  {/* Donut chart */}
                  <div className="w-28 h-28 flex-shrink-0">
                    {feeChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={feeChartData}
                            cx="50%" cy="50%" innerRadius={26} outerRadius={48}
                            paddingAngle={feeChartData.length > 1 ? 3 : 0} dataKey="value"
                            strokeWidth={0}
                          >
                            {feeChartData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <ReTooltip content={<PieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <svg viewBox="0 0 56 56" className="w-full h-full">
                        <circle cx="28" cy="28" r="22" fill="none" stroke="#374151" strokeWidth="6" strokeDasharray="4 3" />
                        <text x="28" y="33" textAnchor="middle" fill="#4b5563" fontSize="9" fontWeight="600">No fees</text>
                      </svg>
                    )}
                  </div>

                  {/* Legend rows */}
                  <div className="flex-1 space-y-2.5">
                    {[
                      { label: 'Collected', amt: feeStats.paidAmt    || 0, count: feeStats.paid    || 0, dot: 'bg-green-400',  text: 'text-green-400'  },
                      { label: 'Pending',   amt: feeStats.pendingAmt || 0, count: feeStats.pending || 0, dot: 'bg-orange-400', text: 'text-orange-400' },
                      { label: 'Overdue',   amt: feeStats.overdueAmt || 0, count: feeStats.overdue || 0, dot: 'bg-red-400',    text: 'text-red-400'    },
                    ].map(item => {
                      const isEmpty = item.amt === 0 && item.count === 0;
                      return (
                        <div key={item.label} className={`flex items-center justify-between gap-2 ${isEmpty ? 'opacity-35' : ''}`}>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isEmpty ? 'bg-gray-600' : item.dot}`} />
                            <span className="text-xs text-gray-400">{item.label}</span>
                          </div>
                          <div className="text-right">
                            {isEmpty
                              ? <span className="text-xs text-gray-600">—</span>
                              : <>
                                  <span className={`text-sm font-bold ${item.text}`}>{fmt(item.amt)}</span>
                                  <span className="text-xs text-gray-600 ml-1">({item.count})</span>
                                </>
                            }
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Collection rate bar */}
                {(() => {
                  const total = (feeStats.paidAmt || 0) + (feeStats.pendingAmt || 0) + (feeStats.overdueAmt || 0);
                  const pct = total > 0 ? Math.round((feeStats.paidAmt || 0) / total * 100) : 0;
                  return (
                    <div className="mt-4 pt-4 border-t border-gray-700/60">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500">Collection rate</span>
                        <span className="text-green-400 font-bold">{pct}%</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* Salary Expenses card */}
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-purple-500 to-pink-500" />
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <Banknote className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-100">Salary Expenses</h3>
                <p className="text-xs text-gray-500">{new Date().getFullYear()} overview</p>
              </div>
              {salaryStats && (
                <div className="ml-auto text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-lg">
                  {salaryStats.totalRecords || 0} records
                </div>
              )}
            </div>

            {loadingStats ? (
              <div className="h-32 bg-gray-700/40 rounded-xl animate-pulse" />
            ) : !salaryStats ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-600">
                <Banknote className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">No salary data yet</p>
              </div>
            ) : (
              <>
                {/* 3 summary tiles */}
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  {[
                    { label: 'Paid',    value: salaryStats.paid    || 0, from: 'from-green-500/10',  border: 'border-green-500/20',  text: 'text-green-300'  },
                    { label: 'Pending', value: salaryStats.pending || 0, from: 'from-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-300' },
                    { label: 'Overdue', value: salaryStats.overdue || 0, from: 'from-red-500/10',    border: 'border-red-500/20',    text: 'text-red-300'    },
                  ].map(item => {
                    const isEmpty = item.value === 0;
                    return (
                      <div key={item.label}
                        className={`p-3 rounded-xl border text-center transition-opacity ${
                          isEmpty ? 'border-gray-700/40 bg-gray-800/30 opacity-40' : `${item.border} bg-gradient-to-b ${item.from} to-transparent`
                        }`}>
                        {isEmpty
                          ? <p className="text-lg font-black text-gray-600 leading-none">—</p>
                          : <p className={`text-lg font-black ${item.text} leading-none`}>{fmt(item.value)}</p>
                        }
                        <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Stacked disbursement bar */}
                {(() => {
                  const total = (salaryStats.paid || 0) + (salaryStats.pending || 0) + (salaryStats.overdue || 0);
                  const paidPct    = total > 0 ? (salaryStats.paid    || 0) / total * 100 : 0;
                  const pendPct    = total > 0 ? (salaryStats.pending || 0) / total * 100 : 0;
                  const overduePct = total > 0 ? (salaryStats.overdue || 0) / total * 100 : 0;
                  return (
                    <div className="mt-2 pt-4 border-t border-gray-700/60">
                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden flex">
                        <div className="h-full bg-green-500  transition-all duration-500" style={{ width: `${paidPct}%` }} />
                        <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${pendPct}%` }} />
                        <div className="h-full bg-red-500    transition-all duration-500" style={{ width: `${overduePct}%` }} />
                      </div>
                      <div className="flex justify-between text-xs mt-2">
                        <span className="text-gray-500">Total: <span className="text-gray-300 font-bold">{fmt(total)}</span></span>
                        <span className="text-green-400 font-bold">{Math.round(paidPct)}% disbursed</span>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── NOTICES + CALENDAR ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Notices — 3 cols */}
        <div className="lg:col-span-3 bg-gray-800/60 border border-gray-700/60 rounded-2xl overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-orange-500 to-red-500" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                  <Bell className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-100">Active Notices</h3>
                  <p className="text-xs text-gray-500">{notices.length} notice{notices.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              {notices.some(n => n.important) && (
                <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                  {notices.filter(n => n.important).length} urgent
                </span>
              )}
            </div>

            {loadingNotices ? (
              <div className="space-y-2">
                {[0, 1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-gray-700/40 animate-pulse" />)}
              </div>
            ) : notices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="p-4 bg-gray-700/30 rounded-2xl mb-3">
                  <Bell className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-500 text-sm">No active notices</p>
                <p className="text-gray-600 text-xs mt-1">Notices you create will appear here</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                {notices.slice(0, 8).map(notice => (
                  <div key={notice.id}
                    className={`flex gap-3 p-3.5 rounded-xl bg-gray-900/50 hover:bg-gray-900 border-l-2 transition-colors ${notice.important ? 'border-l-red-400' : 'border-l-orange-400/60'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {notice.important && (
                          <span className="text-xs font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded flex-shrink-0">URGENT</span>
                        )}
                        <p className="text-sm font-semibold text-gray-200 truncate">{notice.title}</p>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{notice.content}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-gray-600 whitespace-nowrap">{notice.dateLabel}</p>
                      {notice.audience && (
                        <span className="text-xs text-gray-700 capitalize">{notice.audience}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Calendar — 2 cols */}
        <div className="lg:col-span-2 bg-gray-800/60 border border-gray-700/60 rounded-2xl overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <CalendarIcon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-sm font-bold text-gray-100">Calendar</h3>
            </div>

            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth}
                className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-gray-200">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <button onClick={nextMonth}
                className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekday header row */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d, i) => (
                <div key={i} className="flex items-center justify-center h-7">
                  <span className="text-xs font-semibold text-gray-600">{d}</span>
                </div>
              ))}
            </div>

            {/* Day cells */}
            {(() => {
              const y = currentDate.getFullYear(), m = currentDate.getMonth();
              const daysInMonth = getDaysInMonth(y, m);
              const firstDay    = getFirstDay(y, m);
              const cells       = [];

              for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);

              for (let d = 1; d <= daysInMonth; d++) {
                const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
                const hasEvent = notices.some(n => {
                  const nd = n.rawDate;
                  return nd.getDate() === d && nd.getMonth() === m && nd.getFullYear() === y;
                });
                cells.push(
                  <div key={d} className="flex flex-col items-center justify-center h-8">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-colors
                      ${isToday ? 'bg-orange-500 text-white font-bold shadow-lg shadow-orange-500/30' : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 cursor-default'}`}>
                      {d}
                    </span>
                    {hasEvent && !isToday && (
                      <span className="w-1 h-1 rounded-full bg-orange-400 mt-0.5" />
                    )}
                  </div>
                );
              }
              return <div className="grid grid-cols-7">{cells}</div>;
            })()}

            {/* Today footer */}
            <div className="mt-4 pt-3 border-t border-gray-700/60 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
              <p className="text-xs text-gray-500">
                Today: <span className="text-gray-300 font-semibold">
                  {today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
