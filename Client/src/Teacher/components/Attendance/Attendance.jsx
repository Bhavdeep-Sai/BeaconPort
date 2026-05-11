import { useEffect, useState } from 'react';
import axios from 'axios';
import { baseApi } from '../../../environment';
import {
  Users, CheckCircle, XCircle, AlertTriangle, RefreshCw, ClipboardList,
} from 'lucide-react';

const getTodayDate      = () => new Date().toISOString().split('T')[0];
const getTodayFormatted = () => new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

export default function Attendance() {
  const [attendeeClass, setAttendeeClass]   = useState([]);
  const [selectedClass, setSelectedClass]   = useState('');
  const [loading, setLoading]               = useState(true);
  const [students, setStudents]             = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({});
  const [submitting, setSubmitting]         = useState(false);
  const [attendanceTaken, setAttendanceTaken] = useState(false);
  const [noAttendeeRole, setNoAttendeeRole] = useState(false);
  const [toast, setToast]                   = useState(null); // { msg, type }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── fetch classes ──────────────────────────────────────────────────────
  const fetchAttendeeClass = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${baseApi}/class/attendee`);
      if (res.data?.data?.length > 0) {
        setAttendeeClass(res.data.data);
        setNoAttendeeRole(false);
        if (res.data.data.length === 1) setSelectedClass(res.data.data[0]._id);
      } else {
        setAttendeeClass([]);
        setNoAttendeeRole(true);
      }
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        setNoAttendeeRole(true);
      } else {
        showToast('Failed to fetch classes', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!selectedClass) return;
    try {
      setLoading(true);
      const res = await axios.get(`${baseApi}/student/fetch-with-query`, { params: { studentClass: selectedClass } });
      const list = res.data.students || [];
      setStudents(list);
      const init = {};
      list.forEach(s => { init[s._id] = 'Present'; });
      setAttendanceStatus(init);
    } catch {
      showToast('Failed to fetch students', 'error');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const checkAttendanceStatus = async () => {
    if (!selectedClass) return;
    try {
      const res = await axios.get(`${baseApi}/attendance/check/${selectedClass}`);
      setAttendanceTaken(res.data.attendanceTaken);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchAttendeeClass(); }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
      checkAttendanceStatus();
    } else {
      setStudents([]);
      setAttendanceStatus({});
      setAttendanceTaken(false);
    }
  }, [selectedClass]);

  // ── bulk mark helpers ──────────────────────────────────────────────────
  const markAll = (status) => {
    if (attendanceTaken) return;
    const next = {};
    students.forEach(s => { next[s._id] = status; });
    setAttendanceStatus(next);
  };

  // ── submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedClass)    return showToast('Please select a class first', 'error');
    if (!students.length)  return showToast('No students in this class', 'error');
    if (attendanceTaken)   return showToast('Attendance already taken today', 'error');

    setSubmitting(true);
    try {
      const res = await axios.post(`${baseApi}/attendance/mark-bulk`, {
        attendanceData: students.map(s => ({ studentId: s._id, status: attendanceStatus[s._id] || 'Present', notes: '' })),
        classId: selectedClass,
        date: getTodayDate(),
      });
      if (res.data.success) {
        showToast(res.data.message, 'success');
        setAttendanceTaken(true);
      } else {
        showToast(res.data.message || 'Failed to submit', 'error');
      }
    } catch (err) {
      if (err.response?.status === 409) {
        showToast('Attendance already taken for this class today', 'error');
        setAttendanceTaken(true);
      } else {
        showToast(err.response?.data?.message || 'Failed to submit attendance', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── derived stats ──────────────────────────────────────────────────────
  const presentCount = Object.values(attendanceStatus).filter(s => s === 'Present').length;
  const absentCount  = Object.values(attendanceStatus).filter(s => s === 'Absent').length;
  const pct          = students.length > 0 ? (presentCount / students.length) * 100 : 0;

  // ── loading skeleton ───────────────────────────────────────────────────
  if (loading && attendeeClass.length === 0) {
    return (
      <div className="text-gray-100 space-y-4">
        <div className="h-8 w-56 bg-gray-700/50 rounded-lg animate-pulse" />
        <div className="h-4 w-44 bg-gray-700/40 rounded animate-pulse" />
        <div className="h-24 bg-gray-800/40 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-800/40 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  // ── no role ────────────────────────────────────────────────────────────
  if (noAttendeeRole) {
    return (
      <div className="text-gray-100 flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-10 text-center max-w-md">
          <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
          <p className="text-gray-400 text-sm mb-6">You are not assigned as an attendee for any classes. Contact your administrator.</p>
          <button
            onClick={fetchAttendeeClass}
            className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
          >
            <RefreshCw size={14} /> Refresh Access
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-gray-100 space-y-5">
      {/* Toast */}
      {toast && (
        <div className={[
          'fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border',
          toast.type === 'success'
            ? 'bg-green-500/20 border-green-500/40 text-green-300'
            : 'bg-red-500/20 border-red-500/40 text-red-300',
        ].join(' ')}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <ClipboardList size={22} className="text-blue-400" />
            Attendance Management
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{getTodayFormatted()}</p>
        </div>
      </div>

      {/* Class Selector — only show when assigned to multiple classes */}
      {attendeeClass.length > 1 && (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={13} className="text-blue-400" />
            <label className="text-sm font-medium text-gray-300">Select a Class</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {attendeeClass.map(cls => (
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
                {cls.classText}{cls.section ? ` - ${cls.section}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}
      {attendeeClass.length === 1 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl">
          <ClipboardList size={13} className="text-blue-400 shrink-0" />
          <p className="text-sm text-gray-300">Taking attendance for</p>
          <span className="text-sm font-semibold text-blue-400">
            {attendeeClass[0].classText}{attendeeClass[0].section ? ` - ${attendeeClass[0].section}` : ''}
          </span>
        </div>
      )}

      {/* Already taken warning */}
      {attendanceTaken && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-sm">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          Attendance has already been taken for today for this class. You cannot modify it.
        </div>
      )}

      {/* Loading students */}
      {loading && selectedClass && (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-10 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading students...</p>
        </div>
      )}

      {/* Stats + Table */}
      {!loading && students.length > 0 && (
        <>
          {/* Progress bar */}
          <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-gray-400 font-medium">Overall Attendance</span>
              <span className={pct >= 75 ? 'text-green-400 font-semibold' : 'text-amber-400 font-semibold'}>{pct.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 bg-gray-700/60 rounded-full overflow-hidden">
              <div
                className={['h-full rounded-full transition-all duration-500', pct >= 75 ? 'bg-green-500' : 'bg-amber-500'].join(' ')}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Students', count: students.length,  icon: <Users size={20} />,        color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'Present',        count: presentCount,      icon: <CheckCircle size={20} />,  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
              { label: 'Absent',         count: absentCount,       icon: <XCircle size={20} />,      color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
            ].map(item => (
              <div key={item.label} className={`border rounded-xl p-4 text-center ${item.bg}`}>
                <div className={`flex justify-center mb-1 ${item.color}`}>{item.icon}</div>
                <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Bulk actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => markAll('Present')}
              disabled={attendanceTaken}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/15 border border-green-500/25 text-green-400 rounded-lg hover:bg-green-500/25 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle size={14} /> Mark All Present
            </button>
            <button
              onClick={() => markAll('Absent')}
              disabled={attendanceTaken}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/15 border border-red-500/25 text-red-400 rounded-lg hover:bg-red-500/25 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <XCircle size={14} /> Mark All Absent
            </button>
          </div>

          {/* Table */}
          <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-500/10 border-b border-gray-700/60">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {students.map((student, idx) => {
                    const status = attendanceStatus[student._id] || 'Present';
                    return (
                      <tr key={student._id} className="hover:bg-gray-700/20 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                              {student.name?.charAt(0) || 'S'}
                            </div>
                            <span className="font-medium text-gray-200">{student.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <select
                            value={status}
                            onChange={e => setAttendanceStatus(prev => ({ ...prev, [student._id]: e.target.value }))}
                            disabled={attendanceTaken}
                            className={[
                              'text-xs rounded-lg px-2.5 py-1.5 border focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                              status === 'Present'
                                ? 'bg-green-500/15 border-green-500/30 text-green-400'
                                : 'bg-red-500/15 border-red-500/30 text-red-400',
                            ].join(' ')}
                          >
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-center pt-1">
            <button
              onClick={handleSubmit}
              disabled={submitting || attendanceTaken}
              className="flex items-center gap-2 px-8 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:text-gray-400 text-white font-semibold rounded-xl transition-colors text-sm shadow-lg disabled:cursor-not-allowed"
            >
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
                : attendanceTaken
                  ? 'Attendance Already Taken'
                  : <><CheckCircle size={16} /> Submit Attendance</>
              }
            </button>
          </div>
        </>
      )}

      {/* No students */}
      {!loading && selectedClass && students.length === 0 && (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-10 text-center">
          <Users size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400 font-medium">No students found in the selected class.</p>
          <p className="text-sm text-gray-500 mt-1">Check if students are enrolled in this class.</p>
        </div>
      )}
    </div>
  );
}


