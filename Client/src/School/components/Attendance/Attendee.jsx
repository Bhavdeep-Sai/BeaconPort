import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { baseApi } from '../../../environment';
import { ClipboardList, User, Edit, Check, X, UserPlus, School } from 'lucide-react';

const Attendee = ({ classId }) => {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedClassData, setSelectedClassData] = useState(null);
  const [edit, setEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (classId) { fetchTeachers(); fetchSelectedClass(); }
  }, [classId]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${baseApi}/teacher/fetch-with-query`, {
        params: { teacherClass: classId },
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeachers(res.data.teachers || []);
    } catch { setMessage({ type: 'error', text: 'Failed to load teachers for this class' }); }
    finally { setLoading(false); }
  };

  const fetchSelectedClass = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${baseApi}/class/${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.data) {
        setSelectedClassData(res.data.data);
        if (res.data.data.attendee) setSelectedTeacher(res.data.data.attendee._id || res.data.data.attendee);
      }
    } catch { setMessage({ type: 'error', text: 'Failed to load class information' }); }
  };

  const handleSubmit = async () => {
    if (!selectedTeacher) { setMessage({ type: 'error', text: 'Please select a teacher' }); return; }
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.put(`${baseApi}/class/update/${classId}`, { attendee: selectedTeacher },
        { headers: { Authorization: `Bearer ${token}` } });
      setMessage({ type: 'success', text: 'Attendee assigned successfully' });
      fetchSelectedClass(); setEdit(false);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to assign attendee' });
    } finally { setSubmitting(false); }
  };

  const handleCancel = () => {
    setEdit(false);
    setSelectedTeacher(selectedClassData?.attendee?._id || selectedClassData?.attendee || '');
    setMessage({ type: '', text: '' });
  };

  const getTeacherName = (id) => teachers.find(t => t._id === id)?.name || 'Unknown Teacher';
  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const currentAttendee = selectedClassData?.attendee;
  const attendeeName = currentAttendee && typeof currentAttendee === 'object'
    ? currentAttendee.name : getTeacherName(currentAttendee);

  return (
    <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-orange-500 to-red-500" />
      <div className="p-4">

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-orange-500/15 rounded-lg border border-orange-500/20">
            <ClipboardList className="w-4 h-4 text-orange-400" />
          </div>
          <h3 className="font-bold text-gray-100 text-sm">Class Attendee Management</h3>
        </div>

        {/* Toast */}
        {message.text && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs mb-3 ${
            message.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-green-500/10 border-green-500/30 text-green-400'
          }`}>
            <span className="flex-1">{message.text}</span>
            <button onClick={() => setMessage({ type: '', text: '' })} className="opacity-60 hover:opacity-100">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Current attendee */}
        {currentAttendee && !edit && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-orange-500/5 border border-orange-500/15 rounded-xl mb-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Attendee</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-green-400">{attendeeName ? getInitials(attendeeName) : '?'}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-100 text-sm">{attendeeName}</p>
                  <p className="text-xs text-gray-500">Class Teacher / Attendee</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-500/15 text-green-400 border border-green-500/25 rounded-full font-semibold">
                <Check className="w-3 h-3" /> Active
              </span>
              <button onClick={() => setEdit(true)}
                className="p-1.5 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-lg transition-colors" title="Edit Attendee">
                <Edit className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* No attendee */}
        {!currentAttendee && !edit && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <UserPlus className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <p className="font-bold text-gray-100 text-sm">No Attendee Assigned</p>
              <p className="text-xs text-gray-500">This class doesn&apos;t have an attendee assigned yet</p>
            </div>
            <button onClick={() => setEdit(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors">
              <UserPlus className="w-4 h-4" /> Assign Attendee
            </button>
          </div>
        )}

        {/* Edit form */}
        {edit && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-700/60">
              <School className="w-4 h-4 text-orange-400" />
              <p className="font-semibold text-gray-100 text-sm">
                {currentAttendee ? 'Change Attendee' : 'Assign New Attendee'}
              </p>
            </div>

            <select
              value={selectedTeacher}
              onChange={e => setSelectedTeacher(e.target.value)}
              disabled={loading || submitting}
              className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              <option value="">Select a teacher...</option>
              {teachers.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>

            {teachers.length === 0 && !loading && (
              <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                No teachers assigned to this class. Teachers must be assigned to appear here.
              </p>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={handleCancel} disabled={submitting}
                className="px-3 py-2 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button onClick={handleSubmit} disabled={loading || submitting || !selectedTeacher}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl disabled:opacity-50 transition-colors">
                {submitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />}
                <Check className="w-3.5 h-3.5" />
                {submitting ? 'Saving...' : currentAttendee ? 'Update' : 'Assign'}
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && !edit && (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendee;
