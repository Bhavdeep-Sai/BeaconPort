import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { baseApi } from '../../../environment';
import moment from 'moment';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import {
  TrendingUp, Calendar, CheckCircle, XCircle,
  BarChart2, User, Star, AlertTriangle, ArrowLeft,
  CalendarDays, Clock,
} from 'lucide-react';

const CHART_COLORS = ['#22c55e', '#f87171', '#f97316', '#60a5fa'];

const AttendanceDetails = () => {
  const { id: studentId } = useParams();
  const [attendanceData, setAttendanceData] = useState([]);
  const [studentInfo, setStudentInfo]       = useState(null);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);

  useEffect(() => {
    if (studentId) fetchAttendanceData(studentId);
  }, [studentId]);

  const fetchAttendanceData = async (id) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${baseApi}/attendance/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAttendanceData(res.data.attendance || []);
      if (res.data.student) setStudentInfo(res.data.student);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch attendance data');
    } finally { setLoading(false); }
  };

  const stats = React.useMemo(() => {
    const total   = attendanceData.length;
    const present = attendanceData.filter(r => r.status === 'Present').length;
    return { total, present, absent: total - present, pct: total > 0 ? (present / total) * 100 : 0 };
  }, [attendanceData]);

  const chartData = [
    { name: 'Present', value: stats.present, color: CHART_COLORS[0] },
    { name: 'Absent',  value: stats.absent,  color: CHART_COLORS[1] },
  ];

  const monthlyData = React.useMemo(() => {
    const map = {};
    attendanceData.forEach(r => {
      const m = moment(r.date).format('MMM YYYY');
      if (!map[m]) map[m] = { month: m, present: 0, absent: 0 };
      r.status === 'Present' ? map[m].present++ : map[m].absent++;
    });
    return Object.values(map);
  }, [attendanceData]);

  const weeklyData = React.useMemo(() => {
    const map = {};
    attendanceData.forEach(r => {
      const key   = moment(r.date).format('WW-YYYY');
      const label = `Wk ${moment(r.date).format('WW')}`;
      if (!map[key]) map[key] = { week: label, total: 0, present: 0 };
      map[key].total++;
      if (r.status === 'Present') map[key].present++;
    });
    return Object.values(map).map(w => ({ ...w, percentage: (w.present / w.total) * 100 }));
  }, [attendanceData]);

  const statusInfo = React.useMemo(() => {
    const p = stats.pct;
    if (p >= 90) return { label: 'Excellent', color: '#22c55e',  colorCls: 'text-green-400',  bgCls: 'bg-green-500/15',  borderCls: 'border-green-500/25',  Icon: Star          };
    if (p >= 75) return { label: 'Good',      color: '#60a5fa',  colorCls: 'text-blue-400',   bgCls: 'bg-blue-500/15',   borderCls: 'border-blue-500/25',   Icon: CheckCircle   };
    if (p >= 60) return { label: 'Average',   color: '#f97316',  colorCls: 'text-amber-400',  bgCls: 'bg-amber-500/15',  borderCls: 'border-amber-500/25',  Icon: AlertTriangle };
    return               { label: 'Poor',     color: '#f87171',  colorCls: 'text-red-400',    bgCls: 'bg-red-500/15',    borderCls: 'border-red-500/25',    Icon: XCircle       };
  }, [stats.pct]);

  const ChartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-200 shadow-xl">
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.fill || p.stroke }}>
            {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
          </div>
        ))}
      </div>
    );
  };

  /* ── Loading ────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="flex flex-col items-center justify-center py-28 text-gray-500">
      <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4" />
      <p className="text-sm">Loading attendance data…</p>
    </div>
  );

  /* ── Error ────────────────────────────────────────────────────── */
  if (error) return (
    <div className="p-4 md:p-6 space-y-4">
      <Link to="/school/attendance"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-orange-400 transition-colors">
        <ArrowLeft size={14}/> Back to Attendance
      </Link>
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>
    </div>
  );

  const { Icon: StatusIcon } = statusInfo;

  return (
    <div className="text-gray-100 space-y-5">

      {/* ── Hero / Student Banner ────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-600/25 via-orange-500/10 to-gray-900 border border-orange-500/20 rounded-2xl px-6 py-5">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Back link */}
          <Link to="/school/attendance"
            className="sm:hidden inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-400 transition-colors mb-1">
            <ArrowLeft size={12}/> Back
          </Link>

          {/* Avatar */}
          <div className="shrink-0">
            {studentInfo?.studentImg ? (
              <img src={studentInfo.studentImg} alt={studentInfo?.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-orange-500/50" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-orange-500/15 border-2 border-orange-500/30 flex items-center justify-center">
                <User size={28} className="text-orange-400" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-100 truncate">{studentInfo?.name || 'Student'}</h1>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.bgCls} ${statusInfo.colorCls} ${statusInfo.borderCls}`}>
                <StatusIcon size={10}/> {statusInfo.label}
              </span>
            </div>
            <p className="text-sm text-gray-400">{studentInfo?.studentClass?.classText || 'No class assigned'}</p>
            <div className="flex flex-wrap gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <CalendarDays size={11} className="text-orange-400"/> {stats.total} total records
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock size={11} className="text-orange-400"/> Overall: <span style={{ color: statusInfo.color }} className="font-bold ml-0.5">{stats.pct.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Back button desktop */}
          <Link to="/school/attendance"
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-400 border border-gray-700 rounded-xl hover:text-orange-400 hover:border-orange-500/40 transition-colors shrink-0">
            <ArrowLeft size={12}/> Back
          </Link>
        </div>
      </div>

      {/* ── 4 Stat Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Classes', value: stats.total,             sub: null,           color: '#f97316', progressPct: undefined },
          { title: 'Present',       value: stats.present,           sub: 'Attended',     color: '#22c55e', progressPct: stats.pct },
          { title: 'Absent',        value: stats.absent,            sub: 'Missed',       color: '#f87171', progressPct: stats.total > 0 ? (stats.absent / stats.total) * 100 : 0 },
          { title: 'Attendance',    value: `${stats.pct.toFixed(1)}%`, sub: statusInfo.label, color: statusInfo.color, progressPct: stats.pct },
        ].map(card => (
          <div key={card.title} className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-4 flex flex-col gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{card.title}</p>
              <p className="text-2xl font-black" style={{ color: card.color }}>{card.value}</p>
              {card.sub && (
                <span className="text-xs px-2 py-0.5 rounded-full border font-semibold mt-1 inline-block"
                  style={{ color: card.color, backgroundColor: card.color + '20', borderColor: card.color + '40' }}>
                  {card.sub}
                </span>
              )}
            </div>
            {card.progressPct !== undefined && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span style={{ color: card.color }}>{Number(card.progressPct).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(card.progressPct, 100)}%`, backgroundColor: card.color }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Charts ──────────────────────────────────────────────────── */}
      {attendanceData.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Pie */}
            <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <BarChart2 size={13} className="text-orange-400" />
                </div>
                <p className="text-sm font-semibold text-gray-100">Overview</p>
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" outerRadius={72} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false} strokeWidth={2} stroke="rgba(255,255,255,0.05)">
                    {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RechartsTooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar */}
            <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <TrendingUp size={13} className="text-orange-400" />
                </div>
                <p className="text-sm font-semibold text-gray-100">Monthly Trend</p>
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <RechartsBarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} />
                  <YAxis stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Bar dataKey="present" name="Present" fill={CHART_COLORS[0]} radius={[3,3,0,0]} />
                  <Bar dataKey="absent"  name="Absent"  fill={CHART_COLORS[1]} radius={[3,3,0,0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>

            {/* Area */}
            <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <Calendar size={13} className="text-orange-400" />
                </div>
                <p className="text-sm font-semibold text-gray-100">Weekly Trend (%)</p>
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="week" stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} />
                  <YAxis stroke="#64748b" fontSize={10} tick={{ fill: '#64748b' }} domain={[0, 100]} />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="percentage" name="Attendance %"
                    stroke={CHART_COLORS[2]} fill={CHART_COLORS[2] + '30'} strokeWidth={2}
                    dot={{ fill: CHART_COLORS[2], strokeWidth: 2, r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Records Table ──────────────────────────────────────── */}
          <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700/60 bg-gray-800/60">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-orange-400" />
                <h3 className="font-semibold text-gray-100 text-sm">Attendance Records</h3>
                <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full ml-0.5">
                  {attendanceData.length}
                </span>
              </div>
              <p className="text-xs text-gray-500">Sorted newest first</p>
            </div>

            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800/95 border-b border-gray-700/60 backdrop-blur-sm">
                  <tr>
                    {['#', 'Date', 'Day', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/40">
                  {[...attendanceData].sort((a, b) => new Date(b.date) - new Date(a.date)).map((rec, i) => {
                    const isPresent = rec.status === 'Present';
                    return (
                      <tr key={rec._id} className="hover:bg-orange-500/5 transition-colors">
                        <td className="px-4 py-3 text-center text-gray-600 text-xs">{i + 1}</td>
                        <td className="px-4 py-3 text-center text-gray-200 font-medium text-sm">{moment(rec.date).format('MMM DD, YYYY')}</td>
                        <td className="px-4 py-3 text-center text-gray-400 text-xs">{moment(rec.date).format('dddd')}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            isPresent
                              ? 'bg-green-500/15 text-green-400 border-green-500/25'
                              : 'bg-red-500/15 text-red-400 border-red-500/25'
                          }`}>
                            {isPresent ? <CheckCircle size={11}/> : <XCircle size={11}/>}
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden p-3 space-y-2 max-h-[400px] overflow-y-auto">
              {[...attendanceData].sort((a, b) => new Date(b.date) - new Date(a.date)).map(rec => {
                const isPresent = rec.status === 'Present';
                return (
                  <div key={rec._id} className="flex items-center justify-between px-3 py-2.5 bg-gray-800/60 border border-gray-700/60 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-gray-200">{moment(rec.date).format('MMM DD, YYYY')}</p>
                      <p className="text-xs text-gray-500">{moment(rec.date).format('dddd')}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                      isPresent ? 'bg-green-500/15 text-green-400 border-green-500/25' : 'bg-red-500/15 text-red-400 border-red-500/25'
                    }`}>
                      {isPresent ? <CheckCircle size={10}/> : <XCircle size={10}/>}
                      {rec.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {attendanceData.length === 0 && !loading && (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl flex flex-col items-center py-16 gap-3 text-center">
          <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-1">
            <Calendar size={36} className="text-orange-400" />
          </div>
          <p className="font-semibold text-gray-300">No Records Found</p>
          <p className="text-sm text-gray-500 max-w-xs">No attendance records exist for this student yet.</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceDetails;
