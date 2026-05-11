import { useState, useEffect } from 'react';
import axios from 'axios';
import { baseApi } from '../../../environment';
import {
  Eye, EyeOff, ChevronDown, ChevronUp, Bell, BookOpen, Users,
  ChevronLeft, ChevronRight, GraduationCap, Mail, User,
  Calendar, Clock, ShieldCheck, Layers,
} from 'lucide-react';

/* ─── Mini Calendar ────────────────────────────────────────────────── */
const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS    = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function MiniCalendar() {
  const today = new Date();
  const [cur, setCur] = useState({ month: today.getMonth(), year: today.getFullYear() });
  const prev = () => setCur(c => c.month === 0 ? { month: 11, year: c.year - 1 } : { month: c.month - 1, year: c.year });
  const next = () => setCur(c => c.month === 11 ? { month: 0, year: c.year + 1 } : { month: c.month + 1, year: c.year });
  const firstDay    = new Date(cur.year, cur.month, 1).getDay();
  const daysInMonth = new Date(cur.year, cur.month + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={prev} className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
          <ChevronLeft size={14} />
        </button>
        <span className="text-sm font-bold text-gray-200">{MONTHS_FULL[cur.month]} {cur.year}</span>
        <button onClick={next} className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1.5">
        {DAYS.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-600 pb-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          const isToday = day && day === today.getDate() && cur.month === today.getMonth() && cur.year === today.getFullYear();
          return (
            <div key={i} className={[
              'flex items-center justify-center h-7 text-xs rounded-lg transition-colors cursor-default',
              !day ? '' : isToday
                ? 'bg-blue-500 text-white font-bold shadow-lg shadow-blue-500/30'
                : 'text-gray-400 hover:bg-gray-700/60 hover:text-gray-200',
            ].join(' ')}>
              {day || ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Dashboard ───────────────────────────────────────────────── */
export default function Dashboard() {
  const [teacherData, setTeacherData]                   = useState({});
  const [notices, setNotices]                           = useState([]);
  const [showPassword, setShowPassword]                 = useState(false);
  const [expandedCredentials, setExpandedCredentials]   = useState(false);
  const [loading, setLoading]                           = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${baseApi}/teacher/fetch-single`).then(r => setTeacherData(r.data.teacher || {})).catch(() => {}),
      axios.get(`${baseApi}/notice/important`).then(r => setNotices(r.data.data || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const initials = teacherData.name
    ? teacherData.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'T';

  const todayFull = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const classCount   = teacherData.teacherClasses?.length  || 0;
  const subjectCount = teacherData.subjects?.length        || 0;
  const noticeCount  = notices.length;

  /* skeleton */
  if (loading) return (
    <div className="text-gray-100 space-y-5 animate-pulse">
      <div className="h-36 bg-gray-800/60 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-800/50 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 h-72 bg-gray-800/40 rounded-xl" />
        <div className="lg:col-span-4 h-72 bg-gray-800/40 rounded-xl" />
        <div className="lg:col-span-3 h-72 bg-gray-800/40 rounded-xl" />
      </div>
    </div>
  );

  return (
    <div className="text-gray-100 space-y-5">

      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600/25 via-blue-500/10 to-gray-900 border border-blue-500/20 rounded-2xl p-5 md:p-6">
        {/* decorative circles */}
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="absolute right-20 bottom-0 w-24 h-24 rounded-full bg-blue-400/8 blur-xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Avatar / Photo */}
          {teacherData.teacherImg ? (
            <img src={teacherData.teacherImg} alt="Teacher"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-500/40 shadow-xl shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-blue-500/20 border-2 border-blue-500/40 flex items-center justify-center text-2xl font-bold text-blue-300 shrink-0 shadow-xl">
              {initials}
            </div>
          )}

          {/* Name & meta */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl md:text-2xl font-bold text-gray-100 truncate">{teacherData.name || 'Teacher'}</h1>
              <span className="shrink-0 text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full">Teacher</span>
            </div>
            {teacherData.qualification && (
              <p className="text-sm text-gray-400 flex items-center gap-1.5 mb-1">
                <GraduationCap size={13} className="text-blue-400 shrink-0" />
                {teacherData.qualification}
              </p>
            )}
            {teacherData.email && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <Mail size={12} className="text-blue-400 shrink-0" />
                {teacherData.email}
              </p>
            )}
          </div>

          {/* Today pill */}
          <div className="shrink-0 hidden md:flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Clock size={12} className="text-blue-400" />
              <span>{todayFull}</span>
            </div>
            <span className="text-2xl font-bold text-blue-300">{new Date().toLocaleDateString('en-US', { weekday: 'short' })}</span>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Classes Assigned',  value: classCount,   icon: <Layers size={18} />,        color: 'text-blue-400',   bg: 'bg-blue-500/10',  border: 'border-blue-500/20' },
          { label: 'Subjects Teaching', value: subjectCount, icon: <BookOpen size={18} />,      color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
          { label: 'Active Notices',    value: noticeCount,  icon: <Bell size={18} />,           color: 'text-amber-400',  bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 flex items-center gap-3`}>
            <div className={`${s.color} shrink-0`}>{s.icon}</div>
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main 3-column Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Left: Profile Card (5 cols) ─────────────────────────── */}
        <div className="lg:col-span-5 bg-gray-800/40 border border-gray-700/60 rounded-xl overflow-hidden flex flex-col">
          {/* Card header */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-700/60 bg-gray-800/60">
            <User size={14} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-200">Personal Information</h2>
          </div>

          {/* Info rows */}
          <div className="flex-1 divide-y divide-gray-700/40">
            {[
              { label: 'Full Name',      value: teacherData.name,          icon: <User size={12}/> },
              { label: 'Age',            value: teacherData.age,           icon: <User size={12}/> },
              { label: 'Gender',         value: teacherData.gender,        icon: <User size={12}/> },
              { label: 'Qualification',  value: teacherData.qualification, icon: <GraduationCap size={12}/> },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="text-gray-500 flex items-center gap-1.5 shrink-0 w-36">
                  <span className="text-blue-400/70">{row.icon}</span>
                  {row.label}
                </span>
                <span className="text-gray-200 font-medium text-right">{row.value || '—'}</span>
              </div>
            ))}

            {/* Classes row */}
            <div className="px-5 py-3 text-sm">
              <div className="flex items-center gap-1.5 text-gray-500 mb-2">
                <Layers size={12} className="text-blue-400/70" />
                Classes Assigned
              </div>
              <div className="flex flex-wrap gap-1.5">
                {classCount > 0
                  ? teacherData.teacherClasses.map(cls => (
                      <span key={cls._id} className="text-xs bg-blue-500/15 text-blue-300 border border-blue-500/25 px-2.5 py-1 rounded-lg font-medium">
                        {cls.classText}
                      </span>
                    ))
                  : <span className="text-gray-600 text-xs">None assigned</span>
                }
              </div>
            </div>

            {/* Subjects row */}
            <div className="px-5 py-3 text-sm">
              <div className="flex items-center gap-1.5 text-gray-500 mb-2">
                <BookOpen size={12} className="text-violet-400/70" />
                Subjects Teaching
              </div>
              <div className="flex flex-wrap gap-1.5">
                {subjectCount > 0
                  ? teacherData.subjects.map(s => (
                      <span key={s._id} className="text-xs bg-violet-500/15 text-violet-300 border border-violet-500/25 px-2.5 py-1 rounded-lg font-medium">
                        {s.subjectName}
                      </span>
                    ))
                  : <span className="text-gray-600 text-xs">None assigned</span>
                }
              </div>
            </div>
          </div>

          {/* Credentials toggle */}
          <div className="border-t border-gray-700/60">
            <button
              onClick={() => setExpandedCredentials(p => !p)}
              className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-blue-400 hover:bg-blue-500/5 transition-colors"
            >
              <span className="flex items-center gap-1.5"><ShieldCheck size={14}/> Credentials</span>
              {expandedCredentials ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expandedCredentials && (
              <div className="divide-y divide-gray-700/40 border-t border-gray-700/60">
                <div className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5 shrink-0">
                    <Mail size={12} className="text-blue-400/70" /> Email
                  </span>
                  <span className="text-gray-200 text-right break-all text-xs ml-4">{teacherData.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="text-gray-500 flex items-center gap-1.5 shrink-0">
                    <ShieldCheck size={12} className="text-blue-400/70" /> Password
                  </span>
                  <div className="flex items-center gap-2 ml-4">
                    <span className="font-mono text-gray-200 bg-gray-700/60 border border-gray-600/40 px-2 py-0.5 rounded text-xs">
                      {showPassword ? teacherData.password : '••••••••'}
                    </span>
                    <button onClick={() => setShowPassword(p => !p)} className="text-gray-500 hover:text-blue-400 transition-colors shrink-0">
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Middle: Calendar (4 cols) ────────────────────────────── */}
        <div className="lg:col-span-4 bg-gray-800/40 border border-gray-700/60 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-700/60 bg-gray-800/60">
            <Calendar size={14} className="text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-200">Calendar</h2>
            <span className="ml-auto text-xs text-gray-500">{new Date().toLocaleDateString('en-US',{month:'short', year:'numeric'})}</span>
          </div>
          <div className="p-4">
            <MiniCalendar />
          </div>

          {/* Quick date info strip */}
          <div className="mx-4 mb-4 bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-0.5">Today</p>
            <p className="text-sm text-gray-200 font-medium">{new Date().toLocaleDateString('en-US',{weekday:'long', month:'long', day:'numeric'})}</p>
            <p className="text-xs text-gray-500 mt-0.5">{new Date().getFullYear()}</p>
          </div>
        </div>

        {/* ── Right: Notices (3 cols) ──────────────────────────────── */}
        <div className="lg:col-span-3 bg-gray-800/40 border border-gray-700/60 rounded-xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-700/60 bg-gray-800/60 shrink-0">
            <Bell size={14} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-200">Notices</h2>
            {noticeCount > 0 && (
              <span className="ml-auto text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-full">{noticeCount}</span>
            )}
          </div>

          {/* Notice list */}
          <div className="flex-1 overflow-y-auto">
            {noticeCount === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 gap-2">
                <Bell size={28} className="text-gray-700" />
                <p className="text-xs text-gray-600 italic">No notices yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700/40">
                {notices.map((notice, idx) => (
                  <div key={notice._id} className="px-4 py-3.5 hover:bg-gray-700/20 transition-colors">
                    <div className="flex items-start gap-2 mb-1">
                      <span className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-blue-400' : 'bg-gray-600'}`} />
                      <p className="text-xs font-semibold text-gray-200 leading-tight">{notice.title}</p>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 pl-3.5">{notice.message}</p>
                    <p className="text-[10px] text-gray-600 mt-1.5 pl-3.5">{new Date(notice.createdAt).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'})}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
