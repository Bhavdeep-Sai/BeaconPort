import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { baseApi } from '../../../environment';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import moment from 'moment';
import {
  UserCheck, Calendar, CheckCircle, XCircle,
  TrendingUp, TrendingDown, BarChart2, AlertCircle, User
} from 'lucide-react';

const PRESENT_COLOR = '#22c55e';
const ABSENT_COLOR  = '#ef4444';
const RATE_COLOR    = '#86efac';

export default function AttendanceDetails() {
  const { id: studentId } = useParams();
  const [attendanceData, setAttendanceData] = useState([]);
  const [studentInfo, setStudentInfo]       = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);

  const fetchAttendanceData = async (id) => {
    try {
      setLoading(true);
      const token    = localStorage.getItem('token');
      const response = await axios.get(`${baseApi}/attendance/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAttendanceData(response.data.attendance || []);
      if (response.data.student) setStudentInfo(response.data.student);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) fetchAttendanceData(studentId);
  }, [studentId]);

  // ─── Derived stats ────────────────────────────────────────────────
  const totalClasses   = attendanceData.length;
  const presentCount   = attendanceData.filter(r => r.status === 'Present').length;
  const absentCount    = totalClasses - presentCount;
  const attendanceRate = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

  const getStatus = () => {
    if (attendanceRate >= 90) return { label: 'Excellent', color: 'text-green-400' };
    if (attendanceRate >= 75) return { label: 'Good',      color: 'text-emerald-400' };
    if (attendanceRate >= 60) return { label: 'Average',   color: 'text-yellow-400' };
    return                           { label: 'Poor',      color: 'text-red-400' };
  };
  const statusInfo = getStatus();

  const pieData = [
    { name: 'Present', value: presentCount, color: PRESENT_COLOR },
    { name: 'Absent',  value: absentCount,  color: ABSENT_COLOR  },
  ];

  const getMonthlyData = () => {
    const map = {};
    attendanceData.forEach(r => {
      const key = moment(r.date).format('MMM YY');
      if (!map[key]) map[key] = { month: key, present: 0, absent: 0 };
      r.status === 'Present' ? map[key].present++ : map[key].absent++;
    });
    return Object.values(map);
  };

  const getWeeklyTrend = () => {
    const map = {};
    attendanceData.forEach(r => {
      const key = moment(r.date).format('WW-YYYY');
      const lbl = `W${moment(r.date).format('WW')}`;
      if (!map[key]) map[key] = { week: lbl, attendance: 0, total: 0 };
      map[key].total++;
      if (r.status === 'Present') map[key].attendance++;
    });
    return Object.values(map).map(i => ({ ...i, percentage: (i.attendance / i.total) * 100 }));
  };

  // ─── Sub-components ───────────────────────────────────────────────
  const StatCard = ({ label, value, sub, icon, barPct, colorClass }) => (
    <div className="bg-gray-900/50 border border-green-500/20 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
          <p className="text-gray-400 text-sm mt-0.5">{label}</p>
          {sub && (
            <span className={`text-xs mt-1.5 inline-block px-2 py-0.5 rounded-full border bg-green-500/10 border-green-500/20 ${colorClass}`}>
              {sub}
            </span>
          )}
        </div>
        <div className={`p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 ${colorClass}`}>
          {icon}
        </div>
      </div>
      {barPct !== undefined && (
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span className={colorClass}>{Number(barPct).toFixed(1)}%</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(barPct, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  // ─── Loading / Error ──────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-6 text-center">
      <div className="inline-flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3">
        <AlertCircle size={18} />
        <span className="text-sm">{error}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">

      {/* ─── Hero ─── */}
      <div className="bg-gradient-to-br from-green-600/25 via-green-500/10 to-gray-900 border border-green-500/20 rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-500/15 rounded-xl border border-green-500/20">
            <UserCheck size={20} className="text-green-400" />
          </div>
          <span className="text-xs text-green-400 font-semibold uppercase tracking-widest">Attendance</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Attendance</h1>
        {studentInfo && (
          <p className="text-gray-400 mt-1 text-sm">
            {studentInfo.name} &bull; {studentInfo.studentClass?.classText || 'No Class Assigned'}
          </p>
        )}
      </div>

      {/* ─── Student Info Banner ─── */}
      {studentInfo && (
        <div className="bg-gray-900/50 border border-green-500/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-green-500/30 flex-shrink-0">
            <img
              src={studentInfo.studentImg}
              alt={studentInfo.name}
              className="w-full h-full object-cover"
              onError={e => {
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentInfo.name || 'S')}&background=166534&color=fff&size=200`;
              }}
            />
          </div>
          <div>
            <p className="font-semibold text-white">{studentInfo.name}</p>
            <p className="text-green-400 text-sm">{studentInfo.studentClass?.classText}</p>
            <p className={`text-sm font-medium mt-0.5 ${statusInfo.color}`}>
              Attendance Status: {statusInfo.label}
            </p>
          </div>
        </div>
      )}

      {/* ─── Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Classes"
          value={totalClasses}
          sub="This Semester"
          icon={<Calendar size={18} />}
          colorClass="text-green-400"
        />
        <StatCard
          label="Classes Attended"
          value={presentCount}
          sub="Present"
          icon={<CheckCircle size={18} />}
          barPct={attendanceRate}
          colorClass="text-emerald-400"
        />
        <StatCard
          label="Classes Missed"
          value={absentCount}
          sub="Absent"
          icon={<XCircle size={18} />}
          barPct={absentCount > 0 ? (absentCount / totalClasses) * 100 : 0}
          colorClass="text-red-400"
        />
        <StatCard
          label="Attendance Rate"
          value={`${attendanceRate.toFixed(1)}%`}
          sub={statusInfo.label}
          icon={attendanceRate >= 75 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          barPct={attendanceRate}
          colorClass={statusInfo.color}
        />
      </div>

      {/* ─── Charts ─── */}
      {attendanceData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Pie */}
          <div className="bg-gray-900/50 border border-green-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Attendance Overview</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  dataKey="value"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #166534', borderRadius: 8, color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Bar */}
          <div className="bg-gray-900/50 border border-green-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Monthly Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={getMonthlyData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #166534', borderRadius: 8, color: '#fff' }}
                />
                <Bar dataKey="present" fill={PRESENT_COLOR} radius={[3,3,0,0]} />
                <Bar dataKey="absent"  fill={ABSENT_COLOR}  radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Area */}
          <div className="bg-gray-900/50 border border-green-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Weekly Attendance %</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={getWeeklyTrend()}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="week" tick={{ fill: '#6b7280', fontSize: 11 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #166534', borderRadius: 8, color: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="percentage"
                  stroke={PRESENT_COLOR}
                  fill={`${PRESENT_COLOR}30`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── Records Table ─── */}
      {attendanceData.length > 0 && (
        <div className="bg-gray-900/50 border border-green-500/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-green-500/15 bg-green-500/5">
            <BarChart2 size={16} className="text-green-400" />
            <h2 className="font-semibold text-white text-sm">Detailed Records</h2>
            <span className="ml-auto text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2.5 py-0.5 rounded-full">
              {attendanceData.length} records
            </span>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-950 text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left">#</th>
                  <th className="px-5 py-3 text-left">Date</th>
                  <th className="px-5 py-3 text-left">Day</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {[...attendanceData]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((record, i) => (
                    <tr key={record._id} className="hover:bg-green-500/5 transition-colors">
                      <td className="px-5 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-5 py-3 text-white">{moment(record.date).format('MMM DD, YYYY')}</td>
                      <td className="px-5 py-3 text-gray-400">{moment(record.date).format('dddd')}</td>
                      <td className="px-5 py-3 text-center">
                        {record.status === 'Present' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-medium">
                            <CheckCircle size={11} /> Present
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium">
                            <XCircle size={11} /> Absent
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-gray-800/60 max-h-96 overflow-y-auto">
            {[...attendanceData]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((record, i) => (
                <div key={record._id} className="px-4 py-3 flex items-center justify-between hover:bg-green-500/5 transition-colors">
                  <div>
                    <p className="text-white text-sm font-medium">{moment(record.date).format('MMM DD, YYYY')}</p>
                    <p className="text-gray-500 text-xs">{moment(record.date).format('dddd')}</p>
                  </div>
                  {record.status === 'Present' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-green-400 text-xs">
                      <CheckCircle size={10} /> Present
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs">
                      <XCircle size={10} /> Absent
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {attendanceData.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
          <UserCheck size={40} className="opacity-20" />
          <p className="text-sm">No attendance records found</p>
        </div>
      )}

    </div>
  );
}
