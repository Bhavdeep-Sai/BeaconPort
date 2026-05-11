/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import ScheduleManagement from './ScheduleManagement';
import { baseApi } from '../../../environment';
import axios from 'axios';
import {
  CalendarDays, Plus, Edit, Trash2, X, ArrowLeft, Check, BookOpen
} from 'lucide-react';

const localizer = momentLocalizer(moment);

const Schedule = () => {
  const [newPeriod, setNewPeriod]       = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [classes, setClasses]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [events, setEvents]             = useState([]);
  const [currentView, setCurrentView]   = useState('day');
  const [calViews, setCalViews]         = useState(['month', 'week', 'day', 'agenda']);
  const [date, setDate]                 = useState(new Date());
  const [toast, setToast]               = useState({ text: '', type: '' });
  const [editMode, setEditMode]         = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: '', type: '' }), 5000);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) fetchEvents(selectedClass);
  }, [selectedClass]);

  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth <= 768;
      const views = mobile ? ['day', 'agenda'] : ['month', 'week', 'day', 'agenda'];
      setCalViews(views);
      if (!views.includes(currentView)) setCurrentView(views[0]);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [currentView]);

  const fetchClasses = () => {
    setLoading(true);
    axios.get(`${baseApi}/class/all`)
      .then(res => {
        const data = res.data?.data || [];
        setClasses(data);
        if (data.length > 0) setSelectedClass(data[0]._id);
      })
      .catch(() => showToast('Error loading classes', 'error'))
      .finally(() => setLoading(false));
  };

  const fetchEvents = (classId) => {
    if (!classId) return;
    setLoading(true);
    axios.get(`${baseApi}/schedule/fetch-with-class/${classId}`)
      .then(res => {
        const scheduleEvents = (res.data?.data || []).map(e => ({
          id: e._id, title: e.subject?.subjectName || 'Untitled',
          start: new Date(e.startTime), end: new Date(e.endTime),
          teacher: e.teacher?.name || 'Unassigned', status: e.status || 'active', eventType: 'schedule',
        }));
        fetchExamsByClass(classId, scheduleEvents);
      })
      .catch(() => { fetchExamsByClass(classId, []); })
      .finally(() => setLoading(false));
  };

  const fetchExamsByClass = async (classId, scheduleEvents) => {
    try {
      const res = await axios.get(`${baseApi}/examination/class/${classId}`);
      if (res.data.success) {
        const examEvents = (res.data.data || []).map(exam => {
          const base = new Date(exam.examDate);
          let start = new Date(base), end = new Date(base);
          if (exam.startTime) { const [h, m] = exam.startTime.split(':').map(Number); start.setHours(h, m, 0); }
          if (exam.endTime)   { const [h, m] = exam.endTime.split(':').map(Number); end.setHours(h, m, 0); }
          else if (exam.duration) end = new Date(start.getTime() + exam.duration * 60000);
          else end = new Date(start.getTime() + 120 * 60000);
          return { id: exam._id, title: `EXAM: ${exam.subject?.subjectName || exam.examType || 'Exam'}`,
            start, end, status: 'active', eventType: 'exam' };
        });
        setEvents([...scheduleEvents, ...examEvents]);
      } else setEvents(scheduleEvents);
    } catch { setEvents(scheduleEvents); }
    finally { setLoading(false); }
  };

  const handleEventClick = (event) => {
    if (event.status === 'completed') { showToast('This event has been completed and cannot be modified.'); return; }
    if (event.eventType === 'exam')   { showToast('This is an examination. Use Examinations to edit.'); return; }
    setSelectedEvent({ id: event.id, title: event.title, teacher: event.teacher, start: event.start, end: event.end });
    setEditMode(true); setNewPeriod(true);
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    setLoading(true);
    axios.delete(`${baseApi}/schedule/delete/${selectedEvent.id}`)
      .then(res => {
        if (res.data.success) {
          showToast('Schedule period deleted');
          setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
          setDeleteOpen(false); setSelectedEvent(null); setEditMode(false); setNewPeriod(false);
        } else throw new Error(res.data.message);
      })
      .catch(err => showToast(err.response?.data?.message || 'Error deleting schedule', 'error'))
      .finally(() => setLoading(false));
  };

  const handleUpdateSuccess = () => { showToast('Schedule updated'); fetchEvents(selectedClass); setEditMode(false); setNewPeriod(false); setSelectedEvent(null); };
  const handleCreateSuccess = () => { showToast('Schedule period created'); fetchEvents(selectedClass); setNewPeriod(false); };
  const closeForm = () => { setEditMode(false); setNewPeriod(false); setSelectedEvent(null); };
  const toggleNewPeriod = () => { setNewPeriod(p => !p); if (!newPeriod) { setSelectedEvent(null); setEditMode(false); } };

  const eventStyleGetter = (event) => {
    if (event.eventType === 'exam') return { style: { backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '6px' } };
    if (event.status === 'completed') return { style: { backgroundColor: '#073B3A', opacity: 0.8, border: 'none', borderRadius: '6px' } };
    if (event.status === 'cancelled') return { style: { backgroundColor: '#555', color: '#f9fafb', textDecoration: 'line-through', border: 'none', borderRadius: '6px' } };
    return { style: { backgroundColor: '#ea6c0c', border: 'none', borderRadius: '6px', color: 'white' } };
  };

  const EventComponent = ({ event }) => (
    <div className="p-0.5 h-full flex flex-col justify-center items-center text-center overflow-hidden cursor-pointer">
      <p className="font-bold text-[0.78rem] leading-tight">{event.title}</p>
      {event.teacher && <p className="text-[0.62rem] opacity-80 leading-tight">{event.teacher}</p>}
    </div>
  );

  const selectedClassName = classes.find(c => c._id === selectedClass)?.classText || '';

  return (
    <div className="text-gray-100 p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/15 rounded-xl border border-orange-500/20">
            <CalendarDays className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">Class Schedule</h1>
            <p className="text-sm text-gray-500">View and manage class timetable and events</p>
          </div>
        </div>
        {!newPeriod && (
          <button onClick={toggleNewPeriod}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-xl transition-all">
            <Plus className="w-4 h-4" /> Add Period
          </button>
        )}
      </div>

      {/* Toast */}
      {toast.text && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${
          toast.type === 'error' ? 'bg-red-900/20 border-red-700/40 text-red-300' : 'bg-green-900/20 border-green-700/40 text-green-300'
        }`}>
          <span className="flex-1">{toast.text}</span>
          <button onClick={() => setToast({ text: '', type: '' })}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Class selector */}
      <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <CalendarDays className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-semibold text-gray-400">Class:</span>
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 text-sm bg-gray-800 border border-gray-700 text-gray-200 rounded-xl outline-none focus:border-orange-500 transition-colors cursor-pointer">
          {classes.map(c => <option key={c._id} value={c._id}>{c.classText}</option>)}
        </select>
        {loading && <div className="w-4 h-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />}
      </div>

      {/* Schedule form panel */}
      {newPeriod && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <button onClick={closeForm}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Calendar
            </button>
          </div>
          <ScheduleManagement
            selectedClass={selectedClass}
            selectedEvent={selectedEvent}
            editMode={editMode}
            onScheduleAdded={handleCreateSuccess}
            onScheduleUpdated={handleUpdateSuccess}
          />
          {editMode && selectedEvent && (
            <div className="mt-3 flex justify-end">
              <button onClick={() => setDeleteOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-4 h-4" /> Delete Period
              </button>
            </div>
          )}
        </div>
      )}

      {/* Calendar */}
      {!newPeriod && (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-2xl overflow-hidden">
          <style>{`
            .rbc-calendar { background: transparent; color: #e2e8f0; font-family: inherit; }
            .rbc-toolbar { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); }
            .rbc-toolbar button { color: #94a3b8; border: 1px solid #334155; background: rgba(30,41,59,0.8); border-radius: 8px; padding: 4px 12px; font-size: 0.8rem; }
            .rbc-toolbar button:hover { background: rgba(249,115,22,0.15); color: #f97316; border-color: rgba(249,115,22,0.4); }
            .rbc-toolbar button.rbc-active { background: rgba(249,115,22,0.2); color: #f97316; border-color: rgba(249,115,22,0.5); }
            .rbc-toolbar .rbc-toolbar-label { color: #f1f5f9; font-weight: 700; font-size: 1rem; }
            .rbc-header { background: rgba(15,23,42,0.8); color: #64748b; border-bottom: 1px solid rgba(255,255,255,0.07); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 4px; }
            .rbc-month-view { border: none; }
            .rbc-day-bg { border-right: 1px solid rgba(255,255,255,0.05); }
            .rbc-day-bg.rbc-today { background: rgba(249,115,22,0.06); }
            .rbc-off-range-bg { background: rgba(0,0,0,0.3); }
            .rbc-date-cell { color: #94a3b8; font-size: 0.8rem; padding: 4px 6px; }
            .rbc-date-cell.rbc-now a { color: #f97316; font-weight: 700; }
            .rbc-time-view { border: none; }
            .rbc-time-header { background: rgba(15,23,42,0.8); border-bottom: 1px solid rgba(255,255,255,0.07); }
            .rbc-time-header-content { border-left: 1px solid rgba(255,255,255,0.07); }
            .rbc-time-content { border-top: 1px solid rgba(255,255,255,0.07); }
            .rbc-time-gutter .rbc-timeslot-group { border-bottom: none; }
            .rbc-time-gutter .rbc-label { color: #475569; font-size: 0.72rem; padding: 0 8px; }
            .rbc-timeslot-group { border-bottom: 1px solid rgba(255,255,255,0.04); }
            .rbc-time-slot { border-top: 1px solid rgba(255,255,255,0.02); }
            .rbc-current-time-indicator { background: #f97316; }
            .rbc-agenda-view { background: transparent; }
            .rbc-agenda-table { border-collapse: collapse; }
            .rbc-agenda-date-cell, .rbc-agenda-time-cell { color: #94a3b8; font-size: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(15,23,42,0.6); }
            .rbc-agenda-event-cell { color: #f1f5f9; border-bottom: 1px solid rgba(255,255,255,0.06); }
            .rbc-event { border-radius: 6px !important; font-size: 0.8rem; }
            .rbc-show-more { color: #f97316; font-size: 0.72rem; }
          `}</style>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            views={calViews}
            view={currentView}
            onView={setCurrentView}
            date={date}
            onNavigate={setDate}
            onSelectEvent={handleEventClick}
            eventPropGetter={eventStyleGetter}
            components={{ event: EventComponent }}
            style={{ height: 580 }}
            popup
          />
        </div>
      )}

      {/* Legend */}
      {!newPeriod && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#ea6c0c] inline-block" /> Active Period</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#073B3A] inline-block" /> Completed</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#555] inline-block" /> Cancelled</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#e53e3e] inline-block" /> Examination</span>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteOpen(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-500/10 rounded-xl"><Trash2 className="w-5 h-5 text-red-400" /></div>
              <h3 className="font-bold text-gray-100">Delete Schedule Period</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6">Are you sure? This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200 border border-gray-600 rounded-xl transition-colors">
                Cancel
              </button>
              <button onClick={handleDeleteEvent} disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50 transition-colors">
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
