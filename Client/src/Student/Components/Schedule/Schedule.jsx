import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { baseApi } from '../../../environment';
import {
  CalendarDays, BookOpen, FlaskConical, Clock, Users,
  AlertCircle, GraduationCap
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

const fmtTime = iso => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return ''; }
};

const fmtDate = iso => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
};

const DAY_OF_WEEK = iso => {
  const d = new Date(iso);
  // 0=Sun,1=Mon,...,6=Sat  — map to our DAYS array (Mon=idx0)
  const map = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
  return map[d.getDay()] || null;
};

export default function Schedule() {
  const [studentData, setStudentData]     = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [scheduleEvents, setScheduleEvents] = useState([]);
  const [examEvents, setExamEvents]       = useState([]);
  const [activeDay, setActiveDay]         = useState(() => {
    const d = new Date().getDay();
    const map = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };
    return map[d] || 'Monday';
  });

  // ─── Fetch student → class → schedule + exams ─────────────────────
  const fetchStudentData = async () => {
    setLoading(true);
    setError('');
    try {
      const res     = await axios.get(`${baseApi}/student/fetch-single`);
      const student = res.data?.student;
      if (!student?.studentClass) {
        setError('Student class information not found. Please contact administrator.');
        return;
      }
      setStudentData(student);
      await fetchClassEvents(student.studentClass._id || student.studentClass);
    } catch {
      setError('Error loading student information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassEvents = async (classId) => {
    // Fetch schedule
    let parsedSchedule = [];
    try {
      const res = await axios.get(`${baseApi}/schedule/fetch-with-class/${classId}`);
      if (res.data?.data) {
        parsedSchedule = res.data.data.map(ev => ({
          id:        ev._id,
          title:     ev.subject?.subjectName || 'Untitled',
          start:     new Date(ev.startTime),
          end:       new Date(ev.endTime),
          teacher:   ev.teacher?.name || 'Unassigned',
          status:    ev.status || 'active',
          type:      'schedule',
        }));
      }
    } catch {}

    setScheduleEvents(parsedSchedule);

    // Fetch exams
    try {
      const res = await axios.get(`${baseApi}/examination/class/${classId}`);
      if (res.data?.success && res.data?.data) {
        const exams = res.data.data.map(exam => {
          const base = new Date(exam.examDate);
          let start  = new Date(base);
          let end    = new Date(base);
          if (exam.startTime) { const [h,m] = exam.startTime.split(':'); start.setHours(+h, +m, 0); }
          else start.setHours(9, 0, 0);
          if (exam.endTime)   { const [h,m] = exam.endTime.split(':'); end.setHours(+h, +m, 0); }
          else end = new Date(start.getTime() + 7200000);
          return {
            id:      exam._id,
            title:   exam.subject?.subjectName || exam.examType || 'Examination',
            examType: exam.examType,
            start,
            end,
            examDate: exam.examDate,
            type:    'exam',
          };
        });
        setExamEvents(exams);
      }
    } catch {}
  };

  useEffect(() => { fetchStudentData(); }, []);

  // ─── Derived data ─────────────────────────────────────────────────
  // Group schedule events by weekday
  const byDay = DAYS.reduce((acc, d) => ({ ...acc, [d]: [] }), {});
  scheduleEvents.forEach(ev => {
    const day = DAY_OF_WEEK(ev.start);
    if (day) byDay[day].push(ev);
  });
  // Sort each day by start time
  DAYS.forEach(d => byDay[d].sort((a, b) => a.start - b.start));

  const todayEvents   = byDay[activeDay] || [];
  const upcomingExams = [...examEvents]
    .filter(e => new Date(e.examDate) >= new Date())
    .sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
  const pastExams = examEvents.filter(e => new Date(e.examDate) < new Date());

  const totalSchedule = scheduleEvents.filter(e => e.status !== 'cancelled').length;
  const totalExams    = examEvents.length;
  const classText     = studentData?.studentClass?.classText || 'Loading…';

  // ─── Status badge ─────────────────────────────────────────────────
  const statusBadge = status => {
    if (status === 'completed') return 'bg-gray-700/50 border-gray-600 text-gray-400';
    if (status === 'cancelled') return 'bg-red-500/10 border-red-500/20 text-red-400 line-through';
    return 'bg-green-500/10 border-green-500/20 text-green-400';
  };

  // ─── Major exam types ─────────────────────────────────────────────
  const majorTypes = ['Mid Term', 'Final Term', 'Annual Exam', 'Semester Exam'];
  const examBadge  = type => majorTypes.includes(type)
    ? 'bg-red-500/15 border-red-500/30 text-red-400'
    : 'bg-blue-500/15 border-blue-500/30 text-blue-400';

  // ─── Render ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">

      {/* ─── Hero ─── */}
      <div className="bg-gradient-to-br from-green-600/25 via-green-500/10 to-gray-900 border border-green-500/20 rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-500/15 rounded-xl border border-green-500/20">
            <CalendarDays size={20} className="text-green-400" />
          </div>
          <span className="text-xs text-green-400 font-semibold uppercase tracking-widest">Schedule</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Class Schedule</h1>
        {studentData && (
          <p className="text-gray-400 mt-1 text-sm">
            {studentData.name} &bull; Class: {classText}
          </p>
        )}
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ─── Stat cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'My Class',         value: classText,      icon: <GraduationCap size={18} />, color: 'text-green-400' },
          { label: 'Weekly Sessions',  value: totalSchedule,  icon: <BookOpen      size={18} />, color: 'text-emerald-400' },
          { label: 'Examinations',     value: totalExams,     icon: <FlaskConical  size={18} />, color: 'text-blue-400' },
        ].map((s, i) => (
          <div key={i} className="bg-gray-900/50 border border-green-500/20 rounded-2xl p-5 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-green-500/10 border border-green-500/20 ${s.color}`}>{s.icon}</div>
            <div className="min-w-0">
              <p className={`text-2xl font-bold truncate ${s.color}`}>{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Weekly Timetable ─── */}
      <div className="bg-gray-900/50 border border-green-500/20 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-green-500/15 bg-green-500/5">
          <CalendarDays size={16} className="text-green-400" />
          <h2 className="font-semibold text-white text-sm">Weekly Timetable</h2>
        </div>

        {/* Day tabs */}
        <div className="flex overflow-x-auto border-b border-green-500/10 bg-gray-900/30">
          {DAYS.map(day => {
            const count     = byDay[day].length;
            const isToday   = day === activeDay;
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`flex-shrink-0 px-4 py-3 text-xs font-medium border-b-2 transition-colors relative ${
                  isToday
                    ? 'border-green-500 text-green-400 bg-green-500/5'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
                }`}
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{DAY_SHORT[day]}</span>
                {count > 0 && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    isToday ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Day events */}
        <div className="p-5 min-h-[180px]">
          {todayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-600">
              <CalendarDays size={32} className="opacity-30" />
              <p className="text-sm">No classes on {activeDay}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayEvents.map(ev => (
                <div
                  key={ev.id}
                  className={`rounded-xl border p-4 transition-colors hover:bg-green-500/5 ${statusBadge(ev.status)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <BookOpen size={14} className="text-green-400 flex-shrink-0" />
                        <p className="font-medium text-white text-sm">{ev.title}</p>
                        {ev.status === 'cancelled' && (
                          <span className="text-xs bg-red-500/15 border border-red-500/30 text-red-400 px-2 py-0.5 rounded-full">Cancelled</span>
                        )}
                        {ev.status === 'completed' && (
                          <span className="text-xs bg-gray-700/60 border border-gray-600 text-gray-400 px-2 py-0.5 rounded-full">Completed</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-green-400" />
                          {fmtTime(ev.start)} – {fmtTime(ev.end)}
                        </span>
                        {ev.teacher && (
                          <span className="flex items-center gap-1">
                            <Users size={11} className="text-green-400" />
                            {ev.teacher}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 px-5 py-3 border-t border-green-500/10 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" />Regular Class</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-500" />Completed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" />Cancelled</span>
        </div>
      </div>

      {/* ─── Upcoming Exams ─── */}
      {upcomingExams.length > 0 && (
        <div className="bg-gray-900/50 border border-green-500/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-green-500/15 bg-green-500/5">
            <FlaskConical size={16} className="text-green-400" />
            <h2 className="font-semibold text-white text-sm">Upcoming Examinations</h2>
            <span className="ml-auto text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              {upcomingExams.length}
            </span>
          </div>
          <div className="divide-y divide-gray-800/60">
            {upcomingExams.map(exam => (
              <div key={exam.id} className="px-5 py-4 hover:bg-green-500/5 transition-colors flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex-shrink-0">
                    <FlaskConical size={14} className="text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{exam.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <CalendarDays size={10} />{fmtDate(exam.examDate)}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} />{fmtTime(exam.start)} – {fmtTime(exam.end)}
                      </span>
                    </div>
                  </div>
                </div>
                {exam.examType && (
                  <span className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${examBadge(exam.examType)}`}>
                    {exam.examType}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Past Exams (collapsed) ─── */}
      {pastExams.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-700/30 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-700/30">
            <FlaskConical size={16} className="text-gray-500" />
            <h2 className="font-medium text-gray-400 text-sm">Past Examinations ({pastExams.length})</h2>
          </div>
          <div className="divide-y divide-gray-800/40 max-h-64 overflow-y-auto">
            {[...pastExams].sort((a, b) => new Date(b.examDate) - new Date(a.examDate)).map(exam => (
              <div key={exam.id} className="px-5 py-3 flex items-center justify-between gap-4 opacity-60">
                <div className="min-w-0">
                  <p className="text-gray-400 text-sm truncate">{exam.title}</p>
                  <p className="text-gray-600 text-xs">{fmtDate(exam.examDate)}</p>
                </div>
                {exam.examType && (
                  <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full bg-gray-700/50 border border-gray-600 text-gray-500">
                    {exam.examType}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {scheduleEvents.length === 0 && examEvents.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-600">
          <CalendarDays size={40} className="opacity-20" />
          <p className="text-sm">No schedule data loaded yet</p>
        </div>
      )}

    </div>
  );
}
