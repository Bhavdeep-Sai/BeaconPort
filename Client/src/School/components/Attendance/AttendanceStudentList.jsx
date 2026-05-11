import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { baseApi } from '../../../environment';
import Attendee from './Attendee';
import {
  BarChart2, Search, X, Filter, Eye, GraduationCap, Users,
  ChevronDown, ChevronUp, UserCheck, BookOpen, AlertCircle,
} from 'lucide-react';

const pctColor = (pct) => {
  if (pct === null || pct === undefined) return { bg: 'bg-gray-500/15', text: 'text-gray-400', border: 'border-gray-500/25' };
  if (pct >= 80) return { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/25' };
  if (pct >= 50) return { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25' };
  return { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/25' };
};

export default function AttendanceStudentList() {
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [classes, setClasses]             = useState([]);
  const [students, setStudents]           = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [filterClass, setFilterClass]     = useState('');
  const [search, setSearch]               = useState('');
  const [selectedClass, setSelectedClass] = useState(null);
  const [filtersOpen, setFiltersOpen]     = useState(true);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${baseApi}/class/all`, { headers: { Authorization: `Bearer ${token}` } });
      setClasses(res.data.data || []);
    } catch { setError('Failed to fetch classes'); }
  };

  const fetchStudentsByFilters = async (classId, searchText) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = {};
      if (classId)    params.studentClass = classId;
      if (searchText) params.search       = searchText;
      const res = await axios.get(`${baseApi}/student/fetch-with-query`, {
        params, headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.data.students || [];
      setStudents(list);
      if (list.length > 0) await fetchAttendanceForStudents(list);
      else setAttendanceData({});
    } catch { setError('Failed to fetch students'); setStudents([]); setAttendanceData({}); }
    finally { setLoading(false); }
  };

  const fetchAttendanceForStudents = async (list) => {
    const map = {};
    const token = localStorage.getItem('token');
    await Promise.all(list.map(s =>
      axios.get(`${baseApi}/attendance/${s._id}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          const records = r.data.attendance || [];
          const present = records.filter(rec => rec.status === 'Present').length;
          map[s._id] = records.length > 0 ? (present / records.length) * 100 : 0;
        })
        .catch(() => { map[s._id] = null; })
    ));
    setAttendanceData(map);
  };

  const handleClassChange = (e) => {
    const id = e.target.value;
    setSelectedClass(id || null);
    setFilterClass(id);
    fetchStudentsByFilters(id, search);
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    fetchStudentsByFilters(filterClass, val);
  };

  const handleClearFilter = () => {
    setFilterClass(''); setSearch(''); setSelectedClass(null);
    fetchStudentsByFilters('', '');
  };

  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchClasses(); fetchStudentsByFilters('', ''); }, []);

  /* derived stats */
  const validPcts = Object.values(attendanceData).filter(v => v !== null && v !== undefined);
  const avgPct    = validPcts.length > 0 ? validPcts.reduce((a, b) => a + b, 0) / validPcts.length : null;
  const avgPc     = pctColor(avgPct);

  const selectedClassName = classes.find(c => c._id === filterClass)?.classText || '';

  return (
    <div className="text-gray-100 space-y-5">

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-600/25 via-orange-500/10 to-gray-900 border border-orange-500/20 rounded-2xl px-6 py-5">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-orange-500/20 border border-orange-500/30">
              <BarChart2 size={22} className="text-orange-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-100">Student Attendance</h1>
              <p className="text-xs text-gray-400 mt-0.5">Track and review attendance records across all classes</p>
            </div>
          </div>
          <div className="sm:ml-auto flex flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-xs bg-gray-800/60 border border-gray-700/60 px-3 py-1.5 rounded-lg">
              <Users size={12} className="text-orange-400" />
              <span className="text-gray-400">{students.length} students</span>
            </div>
            {avgPct !== null && (
              <div className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg ${avgPc.bg} ${avgPc.border}`}>
                <UserCheck size={12} className={avgPc.text} />
                <span className={avgPc.text}>Avg {avgPct.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stat pills ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Students', count: students.length, icon: <GraduationCap size={18}/>, color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20' },
          { label: 'Classes',        count: classes.length,  icon: <BookOpen size={18}/>,      color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
          {
            label: 'Avg Attendance',
            count: avgPct !== null ? `${avgPct.toFixed(1)}%` : '—',
            icon: <BarChart2 size={18}/>,
            color: avgPct === null ? 'text-gray-400' : avgPct >= 80 ? 'text-green-400' : avgPct >= 50 ? 'text-amber-400' : 'text-red-400',
            bg:    avgPct === null ? 'bg-gray-500/10' : avgPct >= 80 ? 'bg-green-500/10' : avgPct >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10',
            border: avgPct === null ? 'border-gray-500/20' : avgPct >= 80 ? 'border-green-500/20' : avgPct >= 50 ? 'border-amber-500/20' : 'border-red-500/20',
          },
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

      {/* ── Error ───────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <div className="flex items-center gap-2"><AlertCircle size={14}/><span>{error}</span></div>
          <button onClick={() => setError(null)}><X size={14}/></button>
        </div>
      )}

      {/* ── Filter Panel ────────────────────────────────────────────── */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl overflow-hidden">
        <button
          className="w-full flex items-center gap-2 px-5 py-3.5 text-sm text-left"
          onClick={() => setFiltersOpen(o => !o)}
        >
          <Filter size={14} className="text-orange-400" />
          <span className="font-semibold text-gray-100 flex-1">Search &amp; Filter</span>
          {(filterClass || search) && (
            <span className="text-[10px] font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/25 px-2 py-0.5 rounded-full mr-1">
              Active
            </span>
          )}
          {filtersOpen ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </button>

        {filtersOpen && (
          <div className="px-5 pb-5 border-t border-gray-700/60">
            <div className="flex flex-wrap gap-3 mt-4 items-end">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by student name…"
                  value={search}
                  onChange={handleSearch}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors placeholder-gray-600"
                />
                {search && (
                  <button onClick={() => { setSearch(''); fetchStudentsByFilters(filterClass, ''); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    <X size={13}/>
                  </button>
                )}
              </div>

              {/* Class selector */}
              <select value={filterClass} onChange={handleClassChange}
                className="flex-1 min-w-[180px] px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 transition-colors cursor-pointer">
                <option value="">All Classes</option>
                {classes.map(c => <option key={c._id} value={c._id}>{c.classText}</option>)}
              </select>

              {(filterClass || search) && (
                <button onClick={handleClearFilter}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-colors whitespace-nowrap">
                  <X size={13}/> Clear Filters
                </button>
              )}
            </div>

            {/* Active filter chips */}
            {(filterClass || search) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedClassName && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2.5 py-1 rounded-full">
                    <BookOpen size={10}/> Class: {selectedClassName}
                  </span>
                )}
                {search && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full">
                    <Search size={10}/> &ldquo;{search}&rdquo;
                  </span>
                )}
              </div>
            )}

            {/* Attendee panel */}
            {selectedClass && (
              <div className="mt-4 pt-4 border-t border-gray-700/60">
                <Attendee classId={selectedClass} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Students Table ──────────────────────────────────────────── */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl overflow-hidden">
        {/* Table header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700/60 bg-gray-800/60">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-orange-400" />
            <span className="font-semibold text-gray-100 text-sm">Students</span>
            <span className="ml-0.5 text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
              {students.length}
            </span>
          </div>
          {loading && (
            <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          )}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-700/60 bg-gray-900/40">
              <tr>
                {['Student', 'Gender', 'Class', 'Parent', 'Contact', 'Attendance', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/40">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3 text-center">
                        <div className="h-3 bg-gray-700/60 rounded animate-pulse mx-auto" style={{ width: '70%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : students.length > 0 ? (
                students.map(s => {
                  const pct = attendanceData[s._id];
                  const pc  = pctColor(pct);
                  return (
                    <tr key={s._id} className="hover:bg-orange-500/5 transition-colors group">
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center gap-2.5 justify-center">
                          <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/20 flex-shrink-0 flex items-center justify-center">
                            <span className="text-xs font-bold text-orange-400">{getInitials(s.name)}</span>
                          </div>
                          <span className="font-semibold text-gray-100">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400 capitalize text-xs">{s.gender}</td>
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">{s.studentClass?.classText || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">{s.parent || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-500 text-xs">{s.parentNum || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {pct !== undefined ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${pc.bg} ${pc.text} ${pc.border}`}>
                              {pct !== null ? `${pct.toFixed(1)}%` : 'No Data'}
                            </span>
                            {pct !== null && (
                              <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }} />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link to={`/school/attendance/${s._id}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg transition-colors text-xs font-medium">
                          <Eye size={12}/> View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <GraduationCap size={44} className="text-gray-700 mx-auto mb-3" />
                    <p className="text-gray-300 font-semibold">No Students Found</p>
                    <p className="text-gray-500 text-xs mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3 space-y-3">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3 space-y-2 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700/60" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <div className="h-3 bg-gray-700/60 rounded w-2/3" />
                    <div className="h-2.5 bg-gray-700/60 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))
          ) : students.length > 0 ? (
            students.map(s => {
              const pct = attendanceData[s._id];
              const pc  = pctColor(pct);
              return (
                <div key={s._id} className="bg-gray-800/60 border border-gray-700/60 rounded-xl overflow-hidden hover:border-orange-500/40 transition-colors">
                  <div className="h-0.5 bg-gradient-to-r from-orange-500 to-amber-500" />
                  <div className="p-3">
                    <div className="flex items-start gap-2.5 mb-2">
                      <div className="w-10 h-10 rounded-full bg-orange-500/15 border border-orange-500/20 flex-shrink-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-orange-400">{getInitials(s.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-100 text-sm">{s.name}</p>
                        <p className="text-xs text-gray-500 capitalize">{s.gender} &bull; {s.studentClass?.classText || 'Unassigned'}</p>
                      </div>
                      {pct !== undefined ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${pc.bg} ${pc.text} ${pc.border}`}>
                            {pct !== null ? `${pct.toFixed(1)}%` : 'No Data'}
                          </span>
                          {pct !== null && (
                            <div className="w-12 h-1 bg-gray-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5 mb-2.5">
                      {s.parent    && <p>Parent: <span className="text-gray-400">{s.parent}</span></p>}
                      {s.parentNum && <p>Contact: <span className="text-gray-400">{s.parentNum}</span></p>}
                    </div>
                    <div className="flex justify-end">
                      <Link to={`/school/attendance/${s._id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-400 border border-orange-500/30 rounded-lg hover:bg-orange-500/10 transition-colors">
                        <Eye size={12}/> View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center">
              <GraduationCap size={44} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-300 font-semibold text-sm">No Students Found</p>
              <p className="text-gray-500 text-xs mt-1">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
