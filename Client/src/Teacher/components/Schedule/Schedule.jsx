/* eslint-disable no-unused-vars */
import { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { baseApi } from '../../../environment';
import {
  CalendarDays, BookOpen, ClipboardList, Layers,
  ChevronLeft, ChevronRight, Clock, CheckCircle,
  XCircle, AlertCircle, LayoutGrid,
} from 'lucide-react';

const localizer = momentLocalizer(moment);

/* ── event colours ─────────────────────────────────────────────────── */
const getEventStyle = (event) => {
  if (event.eventType === 'exam')       return { backgroundColor: '#ef4444', border: 'none', borderRadius: '4px' };
  if (event.status === 'completed')     return { backgroundColor: '#16a34a', border: 'none', borderRadius: '4px' };
  if (event.status === 'cancelled')     return { backgroundColor: '#6b7280', border: 'none', borderRadius: '4px', textDecoration: 'line-through', opacity: 0.7 };
  return { backgroundColor: '#3b82f6', border: 'none', borderRadius: '4px' };
};

function EventComponent({ event }) {
  return (
    <div className="px-1.5 py-0.5 h-full flex flex-col justify-center overflow-hidden">
      <span className="text-[0.75rem] font-bold leading-tight truncate text-white drop-shadow">{event.title}</span>
      {event.teacher && <span className="text-[0.68rem] opacity-85 truncate text-white/80">{event.teacher}</span>}
    </div>
  );
}

/* ── view label map ─────────────────────────────────────────────────── */
const VIEW_LABELS = { month: 'Month', week: 'Week', day: 'Day', agenda: 'Agenda' };

export default function Schedule() {
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [events, setEvents]               = useState([]);
  const [error, setError]                 = useState('');
  const [date, setDate]                   = useState(new Date());
  const [currentView, setCurrentView]     = useState('day');
  const [calendarViews, setCalendarViews] = useState(['month','week','day','agenda']);

  /* responsive views */
  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth <= 768;
      const views  = mobile ? ['day','agenda'] : ['month','week','day','agenda'];
      setCalendarViews(views);
      setCurrentView(v => views.includes(v) ? v : views[0]);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /* fetch teacher classes */
  const fetchClasses = () => {
    setInitialLoading(true); setError('');
    axios.get(`${baseApi}/teacher/fetch-single`)
      .then(res => {
        const data = res.data?.teacher;
        if (data && Array.isArray(data.teacherClasses)) {
          setClasses(data.teacherClasses);
          if (data.teacherClasses.length === 1) setSelectedClass(data.teacherClasses[0]._id);
        } else { setClasses([]); setError('Failed to load class data.'); }
      })
      .catch(() => { setClasses([]); setError('Error loading classes.'); })
      .finally(() => setInitialLoading(false));
  };

  const fetchExaminationsByClass = async (classId, scheduleEvents = []) => {
    try {
      const res = await axios.get(`${baseApi}/examination/class/${classId}`);
      if (res.data.success) {
        const examEvents = res.data.data.map(exam => {
          const examDate = new Date(exam.examDate);
          let start = new Date(examDate);
          if (exam.startTime) { const [h,m] = exam.startTime.split(':').map(Number); start.setHours(h,m,0); }
          let end = new Date(examDate);
          if (exam.endTime)        { const [h,m] = exam.endTime.split(':').map(Number); end.setHours(h,m,0); }
          else if (exam.duration)  end = new Date(start.getTime() + exam.duration * 60000);
          else                     end = new Date(start.getTime() + 120 * 60000);
          return {
            id: exam._id,
            title: `EXAM: ${exam.subject?.subjectName || exam.examType || 'Exam'}`,
            start, end, status: 'active', eventType: 'exam', examDetails: exam,
          };
        });
        setEvents([...scheduleEvents, ...examEvents]);
      }
    } catch {
      setError('Failed to fetch examinations.');
      setEvents(scheduleEvents);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = (classId) => {
    if (!classId) return;
    setLoading(true); setError('');
    axios.get(`${baseApi}/schedule/fetch-with-class/${classId}`)
      .then(res => {
        const formatted = (res.data?.data || []).map(ev => ({
          id: ev._id,
          title: ev.subject?.subjectName || 'Untitled',
          start: new Date(ev.startTime),
          end:   new Date(ev.endTime),
          teacher: ev.teacher?.name || 'Unassigned',
          status: ev.status || 'active',
          eventType: 'schedule',
        }));
        fetchExaminationsByClass(classId, formatted);
      })
      .catch(() => { setError('Error loading schedule.'); fetchExaminationsByClass(classId, []); });
  };

  useEffect(() => { fetchClasses(); }, []);
  useEffect(() => { if (selectedClass) { setEvents([]); fetchEvents(selectedClass); } }, [selectedClass]);

  const scheduleCount = events.filter(e => e.eventType === 'schedule').length;
  const examCount     = events.filter(e => e.eventType === 'exam').length;
  const selectedClassName = classes.find(c => c._id === selectedClass)?.classText || '';

  return (
    <div className="text-gray-100 space-y-5">

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600/25 via-blue-500/10 to-gray-900 border border-blue-500/20 rounded-2xl px-6 py-5">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
              <CalendarDays size={22} className="text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-100">Class Schedule</h1>
              <p className="text-xs text-gray-400 mt-0.5">View your timetable and upcoming examinations</p>
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/60 border border-gray-700/60 px-3 py-1.5 rounded-lg">
            <Clock size={12} className="text-blue-400" />
            {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'My Classes',      count: classes.length, icon: <Layers size={18}/>,       color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
          { label: 'Schedule Events', count: scheduleCount,  icon: <CalendarDays size={18}/>, color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
          { label: 'Examinations',    count: examCount,       icon: <ClipboardList size={18}/>,color: 'text-red-400',   bg: 'bg-red-500/10',    border: 'border-red-500/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 flex items-center gap-3`}>
            <div className={`p-2 rounded-lg ${s.bg} border ${s.border} ${s.color} shrink-0`}>{s.icon}</div>
            <div>
              <p className={`text-2xl font-bold leading-none ${s.color}`}>{s.count}</p>
              <p className="text-xs text-gray-500 mt-1 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Class Selector ──────────────────────────────────────────── */}
      {initialLoading ? (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4">
          <div className="h-4 w-32 bg-gray-700/50 rounded animate-pulse mb-3" />
          <div className="flex gap-2">
            {[1,2,3].map(i => <div key={i} className="h-8 w-24 bg-gray-700/40 rounded-lg animate-pulse" />)}
          </div>
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-5 flex items-center gap-3 text-amber-400">
          <AlertCircle size={16} className="shrink-0" />
          <p className="text-sm">No classes assigned to your account yet.</p>
        </div>
      ) : classes.length === 1 ? (
        /* Single class — no selection needed, just show an info badge */
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <BookOpen size={13} className="text-blue-400 shrink-0" />
          <p className="text-sm text-gray-300">Showing schedule for</p>
          <span className="text-sm font-semibold text-blue-400">{selectedClassName}</span>
          {error && <span className="ml-auto text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11}/>{error}</span>}
        </div>
      ) : (
        /* Multiple classes — show selector buttons */
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={13} className="text-blue-400" />
            <p className="text-sm font-medium text-gray-300">Select a Class</p>
            {selectedClassName && (
              <span className="ml-auto text-xs bg-blue-500/15 text-blue-400 border border-blue-500/25 px-2.5 py-0.5 rounded-full font-medium">
                Viewing: {selectedClassName}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {classes.map(cls => (
              <button
                key={cls._id}
                onClick={() => setSelectedClass(cls._id)}
                className={[
                  'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                  selectedClass === cls._id
                    ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                    : 'bg-gray-700/50 text-gray-300 border-gray-600/60 hover:bg-gray-700 hover:text-gray-100 hover:border-gray-500',
                ].join(' ')}
              >
                {cls.classText}
              </button>
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11}/>{error}</p>}
        </div>
      )}

      {/* ── Calendar Section ────────────────────────────────────────── */}
      {!initialLoading && selectedClass && (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl overflow-hidden">

          {/* Calendar header bar */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700/60 bg-gray-800/60">
            <div className="flex items-center gap-2">
              <LayoutGrid size={14} className="text-blue-400" />
              <h2 className="text-sm font-semibold text-gray-200">
                Schedule — <span className="text-blue-400">{selectedClassName}</span>
              </h2>
            </div>
            {/* Custom view switcher */}
            <div className="flex items-center gap-1 bg-gray-700/60 border border-gray-600/60 rounded-lg p-0.5">
              {calendarViews.map(v => (
                <button
                  key={v}
                  onClick={() => setCurrentView(v)}
                  className={[
                    'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    currentView === v
                      ? 'bg-blue-500 text-white shadow'
                      : 'text-gray-400 hover:text-gray-200',
                  ].join(' ')}
                >
                  {VIEW_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          {/* Loading overlay */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading schedule...</p>
            </div>
          ) : (
            <div>
              <style>{`
                .teacher-cal .rbc-calendar { background: transparent; color: #e2e8f0; font-family: inherit; }
                .teacher-cal .rbc-toolbar { padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); }
                .teacher-cal .rbc-toolbar button { color: #94a3b8; border: 1px solid #334155; background: rgba(30,41,59,0.8); border-radius: 8px; padding: 4px 12px; font-size: 0.8rem; }
                .teacher-cal .rbc-toolbar button:hover { background: rgba(59,130,246,0.15); color: #60a5fa; border-color: rgba(59,130,246,0.4); }
                .teacher-cal .rbc-toolbar button.rbc-active { background: rgba(59,130,246,0.2); color: #60a5fa; border-color: rgba(59,130,246,0.5); }
                .teacher-cal .rbc-toolbar .rbc-toolbar-label { color: #f1f5f9; font-weight: 700; font-size: 1rem; }
                .teacher-cal .rbc-header { background: rgba(15,23,42,0.8); color: #60a5fa; border-bottom: 1px solid rgba(255,255,255,0.07); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 4px; }
                .teacher-cal .rbc-month-view { border: none; }
                .teacher-cal .rbc-day-bg { border-right: 1px solid rgba(255,255,255,0.05); }
                .teacher-cal .rbc-day-bg.rbc-today { background: rgba(59,130,246,0.07); }
                .teacher-cal .rbc-today { background: rgba(59,130,246,0.07) !important; }
                .teacher-cal .rbc-off-range-bg { background: rgba(0,0,0,0.3); }
                .teacher-cal .rbc-date-cell { color: #94a3b8; font-size: 0.8rem; padding: 4px 6px; }
                .teacher-cal .rbc-date-cell.rbc-now a { color: #60a5fa; font-weight: 700; }
                .teacher-cal .rbc-time-view { border: none; }
                .teacher-cal .rbc-time-header { background: rgba(15,23,42,0.8); border-bottom: 1px solid rgba(255,255,255,0.07); }
                .teacher-cal .rbc-time-header-content { border-left: 1px solid rgba(255,255,255,0.07); }
                .teacher-cal .rbc-time-content { border-top: 1px solid rgba(255,255,255,0.07); scrollbar-width: none; -ms-overflow-style: none; }
                .teacher-cal .rbc-time-content::-webkit-scrollbar { display: none; }
                .teacher-cal .rbc-time-gutter .rbc-timeslot-group { border-bottom: none; }
                .teacher-cal .rbc-time-gutter .rbc-label { color: #475569; font-size: 0.72rem; padding: 0 8px; }
                .teacher-cal .rbc-timeslot-group { border-bottom: 1px solid rgba(255,255,255,0.04); }
                .teacher-cal .rbc-time-slot { border-top: 1px solid rgba(255,255,255,0.02); }
                .teacher-cal .rbc-current-time-indicator { background: #3b82f6; height: 2px; }
                .teacher-cal .rbc-agenda-view { background: transparent; }
                .teacher-cal .rbc-agenda-table { border-collapse: collapse; }
                .teacher-cal .rbc-agenda-date-cell, .teacher-cal .rbc-agenda-time-cell { color: #60a5fa; font-size: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(15,23,42,0.6); }
                .teacher-cal .rbc-agenda-event-cell { color: #f1f5f9; border-bottom: 1px solid rgba(255,255,255,0.06); }
                .teacher-cal .rbc-event { border-radius: 6px !important; font-size: 0.8rem; }
                .teacher-cal .rbc-show-more { color: #60a5fa; font-size: 0.72rem; }
                .teacher-cal .rbc-toolbar { display: none; }
              `}</style>
              {/* Custom toolbar replacement row */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-700/60 bg-gray-900/40 teacher-cal-toolbar">
                <button
                  onClick={() => setDate(d => { const n = new Date(d); if (currentView==='month') n.setMonth(n.getMonth()-1); else if (currentView==='week') n.setDate(n.getDate()-7); else n.setDate(n.getDate()-1); return n; })}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-100">
                    {currentView === 'month' && moment(date).format('MMMM YYYY')}
                    {currentView === 'week'  && `${moment(date).startOf('week').format('MMM D')} – ${moment(date).endOf('week').format('MMM D, YYYY')}`}
                    {currentView === 'day'   && moment(date).format('dddd, MMMM D, YYYY')}
                    {currentView === 'agenda'&& `Agenda – ${moment(date).format('MMMM YYYY')}`}
                  </p>
                  <button
                    onClick={() => setDate(new Date())}
                    className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Today
                  </button>
                </div>
                <button
                  onClick={() => setDate(d => { const n = new Date(d); if (currentView==='month') n.setMonth(n.getMonth()+1); else if (currentView==='week') n.setDate(n.getDate()+7); else n.setDate(n.getDate()+1); return n; })}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="teacher-cal">
                <Calendar
                  localizer={localizer}
                  events={events}
                  date={date}
                  onNavigate={setDate}
                  view={currentView}
                  onView={setCurrentView}
                  views={calendarViews}
                  toolbar={false}
                  step={60}
                  timeslots={1}
                  startAccessor="start"
                  endAccessor="end"
                  min={new Date(0,0,0,7,0,0)}
                  max={new Date(0,0,0,19,30,0)}
                  style={{ height: '70vh', width: '100%' }}
                  components={{ event: EventComponent }}
                  eventPropGetter={(event) => ({ style: getEventStyle(event) })}
                  popup
                />
              </div>
            </div>
          )}

          {/* Legend */}
          {!loading && events.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 border-t border-gray-700/60 bg-gray-900/30">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mr-1">Legend</span>
              {[
                { color: 'bg-blue-500',    label: 'Classes',   icon: <CalendarDays size={10}/> },
                { color: 'bg-red-500',     label: 'Exam',      icon: <ClipboardList size={10}/> },
                { color: 'bg-green-600',   label: 'Completed', icon: <CheckCircle size={10}/> },
                { color: 'bg-gray-500',    label: 'Cancelled', icon: <XCircle size={10}/> },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <div className={`w-2.5 h-2.5 rounded-sm ${l.color} shrink-0`} />
                  {l.label}
                </div>
              ))}
            </div>
          )}

          {/* No events */}
          {!loading && events.length === 0 && (
            <div className="flex flex-col items-center py-16 gap-3">
              <CalendarDays size={40} className="text-gray-700" />
              <p className="text-gray-500 font-medium text-sm">No events found for this class</p>
              <p className="text-xs text-gray-600">Schedule or examinations will appear here once added</p>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state: no class selected ──────────────────────────── */}
      {!initialLoading && !selectedClass && classes.length > 0 && (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-14 flex flex-col items-center gap-3 text-center">
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-1">
            <CalendarDays size={36} className="text-blue-400" />
          </div>
          <p className="font-semibold text-gray-300">Select a class above</p>
          <p className="text-sm text-gray-500 max-w-xs">Choose one of your assigned classes to load the timetable and examination schedule.</p>
        </div>
      )}
    </div>
  );
}
