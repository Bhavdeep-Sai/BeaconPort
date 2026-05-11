import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { baseApi } from '../../../environment';
import {
  GraduationCap, User, Phone, Mail, BookOpen, Users,
  Eye, EyeOff, Star, Bell, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';

export default function Dashboard() {
  const [studentData, setStudentData] = useState({});
  const [notices, setNotices]          = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showCreds, setShowCreds]       = useState(false);
  const [loading, setLoading]           = useState(true);

  const fetchStudentData = async () => {
    try {
      const res = await axios.get(`${baseApi}/student/fetch-single`);
      setStudentData(res.data.student);
    } catch (err) {
      console.error('Error fetching student data:', err);
    }
  };

  const fetchNotices = async () => {
    try {
      const res  = await axios.get(`${baseApi}/notice/active`);
      const data = res.data?.data;
      setNotices(Array.isArray(data) ? data.filter(n => n.isImportant) : []);
    } catch (err) {
      console.error('Error fetching notices:', err);
    }
  };

  useEffect(() => {
    Promise.all([fetchStudentData(), fetchNotices()]).finally(() => setLoading(false));
  }, []);

  const infoRows = [
    { label: 'Name',       value: studentData.name,                    icon: <User    size={13} /> },
    { label: 'Age',        value: studentData.age,                     icon: <User    size={13} /> },
    { label: 'Gender',     value: studentData.gender,                  icon: <User    size={13} /> },
    { label: 'Class',      value: studentData.studentClass?.classText, icon: <BookOpen size={13} /> },
    { label: 'Parent',     value: studentData.parent,                  icon: <Users   size={13} /> },
    { label: 'Contact No', value: studentData.parentNum,               icon: <Phone   size={13} /> },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">

      {/* ─── Hero ─── */}
      <div className="bg-gradient-to-br from-green-600/25 via-green-500/10 to-gray-900 border border-green-500/20 rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-green-500/15 rounded-xl border border-green-500/20">
            <GraduationCap size={20} className="text-green-400" />
          </div>
          <span className="text-xs text-green-400 font-semibold uppercase tracking-widest">Student Dashboard</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          Welcome back,&nbsp;
          <span className="text-green-400">{studentData.name || 'Student'}</span>
        </h1>
        {studentData.studentClass?.classText && (
          <p className="text-gray-400 mt-1 text-sm">
            Class: {studentData.studentClass.classText}
          </p>
        )}
      </div>

      {/* ─── Profile Section ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Info card */}
        <div className="lg:col-span-3 bg-gray-900/50 border border-green-500/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-green-500/15 bg-green-500/5">
            <User size={16} className="text-green-400" />
            <h2 className="font-semibold text-white text-sm">Personal Information</h2>
          </div>
          <div className="divide-y divide-gray-800/60">
            {infoRows.map((row, i) => (
              <div key={i} className="flex items-center px-5 py-3 hover:bg-green-500/5 transition-colors">
                <span className="text-gray-400 text-sm w-32 flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-green-400/70">{row.icon}</span>
                  {row.label}
                </span>
                <span className="text-white text-sm">{row.value || '—'}</span>
              </div>
            ))}
          </div>

          {/* Collapsible credentials */}
          <div className="border-t border-green-500/15">
            <button
              onClick={() => setShowCreds(p => !p)}
              className="w-full flex items-center justify-between px-5 py-3 text-green-400 hover:bg-green-500/5 transition-colors text-sm"
            >
              <span className="flex items-center gap-2">
                <Mail size={13} /> Account Credentials
              </span>
              {showCreds ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showCreds && (
              <div className="divide-y divide-gray-800/60">
                <div className="flex items-center px-5 py-3 hover:bg-green-500/5 transition-colors">
                  <span className="text-gray-400 text-sm w-32 flex-shrink-0">Email</span>
                  <span className="text-white text-sm break-all">{studentData.email || '—'}</span>
                </div>
                <div className="flex items-center px-5 py-3 hover:bg-green-500/5 transition-colors">
                  <span className="text-gray-400 text-sm w-32 flex-shrink-0">Password</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-green-500/10 border border-green-500/20 text-green-300 px-3 py-1 rounded-lg">
                      {showPassword ? studentData.password : '••••••••'}
                    </span>
                    <button
                      onClick={() => setShowPassword(p => !p)}
                      className="p-1.5 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 hover:bg-green-500/20 transition-colors"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profile image */}
        <div className="lg:col-span-2 flex items-start justify-center">
          <div className="relative w-full max-w-xs">
            <div className="p-0.5 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl shadow-xl shadow-green-900/20">
              <img
                src={studentData.studentImg}
                alt={studentData.name || 'Student'}
                className="w-full h-72 lg:h-96 object-cover rounded-2xl"
                onError={e => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentData.name || 'S')}&background=166534&color=fff&size=400`;
                }}
              />
            </div>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-900 border border-green-500/30 rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Active Student</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Important Notices ─── */}
      <div className="bg-gray-900/50 border border-green-500/20 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-green-500/15 bg-green-500/5">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-green-400" />
            <h2 className="font-semibold text-white text-sm">Important Notices</h2>
          </div>
          {notices.length > 0 && (
            <span className="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
              {notices.length}
            </span>
          )}
        </div>

        {notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500">
            <Bell size={30} className="opacity-30" />
            <p className="text-sm">No important notices right now</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60 max-h-72 overflow-y-auto">
            {notices.map(notice => (
              <div key={notice._id} className="px-5 py-4 hover:bg-green-500/5 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-green-500/10 rounded-lg mt-0.5 flex-shrink-0">
                    <Star size={12} className="text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white text-sm">{notice.title}</h3>
                    <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">{notice.message}</p>
                    <p className="text-green-400/60 text-xs mt-1 italic">
                      {new Date(notice.createdAt).toDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
