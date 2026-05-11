/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { baseApi } from '../../../environment';
import axios from 'axios';
import { Check, X, BookOpen, User, Calendar, Clock } from 'lucide-react';

const ScheduleManagement = ({ selectedClass, selectedEvent, editMode, onScheduleAdded, onScheduleUpdated }) => {
  const [formData, setFormData] = useState({ teacher: '', subject: '', date: '', startTime: '', endTime: '', status: 'active' });
  const [teachers, setTeachers] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputCls = 'w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-colors placeholder-gray-600 disabled:opacity-50 [color-scheme:dark]';
  const selectCls = inputCls + ' cursor-pointer';

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (editMode && selectedEvent) {
      const start = new Date(selectedEvent.start);
      const end   = new Date(selectedEvent.end);
      setFormData(prev => ({
        ...prev,
        date:      start.toISOString().split('T')[0],
        startTime: start.toTimeString().slice(0, 5),
        endTime:   end.toTimeString().slice(0, 5),
      }));
      fetchEventDetails(selectedEvent.id);
    }
  }, [editMode, selectedEvent]);

  const fetchEventDetails = async (eventId) => {
    try {
      setLoading(true);
      const res = await axios.get(`${baseApi}/schedule/fetch/${eventId}`);
      if (res.data?.data) {
        const d = res.data.data;
        setFormData(prev => ({ ...prev, teacher: d.teacher?._id || '', subject: d.subject?._id || '', status: d.status || 'active' }));
        if (d.teacher?._id) fetchTeacherSubjects(d.teacher._id);
      }
    } catch { setError('Failed to load schedule details'); }
    finally { setLoading(false); }
  };

  const fetchTeachers = async () => {
    try {
      const res = await axios.get(`${baseApi}/teacher/fetch-with-query`);
      if (res.data?.teachers) setTeachers(res.data.teachers);
    } catch { setError('Failed to load teachers'); }
  };

  const fetchTeacherSubjects = async (teacherId) => {
    if (!teacherId) { setAvailableSubjects([]); return; }
    try {
      setLoading(true);
      const res = await axios.get(`${baseApi}/schedule/teacher/subjects/${teacherId}`);
      const subs = res.data?.subjects || [];
      setAvailableSubjects(subs);
      if (editMode && formData.subject) {
        const exists = subs.some(s => s._id === formData.subject);
        if (!exists) setFormData(p => ({ ...p, subject: '' }));
      }
    } catch { setError('Failed to load subjects for this teacher'); setAvailableSubjects([]); }
    finally { setLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'teacher') {
      setFormData(prev => ({ ...prev, teacher: value, subject: '' }));
      fetchTeacherSubjects(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    setError('');
  };

  const validateForm = () => {
    if (!formData.teacher || !formData.subject || !formData.date || !formData.startTime || !formData.endTime) {
      setError('All fields are required'); return false;
    }
    const s = new Date(`${formData.date}T${formData.startTime}`);
    const e = new Date(`${formData.date}T${formData.endTime}`);
    if (e <= s) { setError('End time must be after start time'); return false; }
    if (availableSubjects.length > 0 && !availableSubjects.some(sub => sub._id === formData.subject)) {
      setError('Selected subject is not assigned to this teacher'); return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      let res;
      if (editMode && selectedEvent) {
        res = await axios.put(`${baseApi}/schedule/update/${selectedEvent.id}`, formData);
        if (res.data.success) {
          setSuccess('Schedule updated successfully');
          if (onScheduleUpdated) onScheduleUpdated(res.data.data);
        } else setError(res.data.message || 'Failed to update schedule');
      } else {
        res = await axios.post(`${baseApi}/schedule/create`, { ...formData, selectedClass });
        if (res.data.success) {
          setSuccess('Schedule created successfully');
          setFormData({ teacher: '', subject: '', date: '', startTime: '', endTime: '', status: 'active' });
          setAvailableSubjects([]);
          if (onScheduleAdded) onScheduleAdded();
        } else setError(res.data.message || 'Failed to create schedule');
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editMode ? 'update' : 'create'} schedule`);
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl overflow-hidden">
      <div className="h-0.5 bg-gradient-to-r from-orange-500 to-red-500" />
      <div className="p-5">

        <h2 className="text-base font-bold text-orange-400 mb-1">
          {editMode ? 'Update Schedule' : 'Create New Schedule'}
        </h2>
        {selectedClass && <p className="text-xs text-gray-500 mb-4">Class: {selectedClass}</p>}

        {/* Alerts */}
        {error && (
          <div className="flex items-center justify-between px-3 py-2 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
            <span>{error}</span>
            <button onClick={() => setError('')}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {success && (
          <div className="flex items-center justify-between px-3 py-2 mb-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-xs">
            <span>{success}</span>
            <button onClick={() => setSuccess('')}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Teacher */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Teacher *
              </label>
              <select name="teacher" value={formData.teacher} onChange={handleChange}
                disabled={loading} required className={selectCls}>
                <option value="">Select teacher...</option>
                {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Subject *
              </label>
              <select name="subject" value={formData.subject} onChange={handleChange}
                disabled={loading || !formData.teacher} required className={selectCls}>
                <option value="">
                  {formData.teacher
                    ? availableSubjects.length === 0 ? 'No subjects assigned' : 'Select subject...'
                    : 'Select teacher first'}
                </option>
                {availableSubjects.map(s => <option key={s._id} value={s._id}>{s.subjectName}</option>)}
              </select>
              {formData.teacher && availableSubjects.length === 0 && (
                <p className="text-xs text-amber-400 mt-1">No subjects assigned to this teacher</p>
              )}
            </div>
          </div>

          {/* Date + times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Date *</label>
              <input type="date" name="date" value={formData.date} onChange={handleChange}
                min={new Date().toISOString().split('T')[0]} max="2030-12-31"
                required disabled={loading} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Start Time *</label>
              <input type="time" name="startTime" value={formData.startTime} onChange={handleChange}
                required disabled={loading} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">End Time *</label>
              <input type="time" name="endTime" value={formData.endTime} onChange={handleChange}
                required disabled={loading} className={inputCls} />
            </div>
          </div>

          {/* Status (edit only) */}
          {editMode && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</label>
              <div className="flex gap-2">
                {[
                  { value: 'active',    label: 'Active',    active: 'border-green-500/60 bg-green-500/15 text-green-300' },
                  { value: 'completed', label: 'Completed', active: 'border-blue-500/60 bg-blue-500/15 text-blue-300' },
                  { value: 'cancelled', label: 'Cancelled', active: 'border-red-500/60 bg-red-500/15 text-red-300' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setFormData(p => ({ ...p, status: opt.value }))}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                      formData.status === opt.value ? opt.active : 'border-gray-700 bg-gray-800 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl disabled:opacity-50 transition-all">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            <Check className="w-4 h-4" />
            {editMode ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ScheduleManagement;
