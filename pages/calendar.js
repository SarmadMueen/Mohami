import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import { supabase } from '../lib/initSupabase';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
  isValid
} from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckSquare,
  Clock,
  Filter,
  X,
  MapPin,
  User,
  Briefcase,
  Bell
} from 'lucide-react';

const CalendarPage = () => {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    sessions: true,
    tasks: true,
    reminders: true
  });
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch data
  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const user = supabase.auth.user();
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Get User Metadata & Role
      const { data: userMetadata, error: metadataError } = await supabase
        .from('user_metadata')
        .select('admin_user_id, new_lawyer_id, user_id, role')
        .or(`admin_user_id.eq.${user.id},new_lawyer_id.eq.${user.id},user_id.eq.${user.id}`)
        .limit(1)
        .maybeSingle();

      if (metadataError) throw metadataError;

      const userId = user.id;
      const isAdmin = userMetadata?.admin_user_id === userId;

      const adminId = isAdmin ? userId : userMetadata?.admin_user_id;
      let firmUserIds = [userId];

      if (adminId) {
        const { data: firmMembers } = await supabase
          .from('user_metadata')
          .select('new_lawyer_id, user_id')
          .or(`admin_user_id.eq.${adminId},user_id.eq.${adminId}`);

        if (firmMembers) {
          const lIds = firmMembers.map(u => u.new_lawyer_id).filter(Boolean);
          const uIds = firmMembers.map(u => u.user_id).filter(Boolean);
          firmUserIds = [...new Set([adminId, userId, ...lIds, ...uIds])];
        }
      }

      // 2. Fetch Cases
      let casesQuery = supabase
        .from('cases')
        .select('case_number, client_name, opponentName, courtAddress, caseType2, id');

      if (isAdmin) {
        casesQuery = casesQuery.or(`admin_id.eq.${userId},lawyer_id.in.(${firmUserIds.join(',')}),caseLawyerId.in.(${firmUserIds.join(',')})`);
      } else {
        casesQuery = casesQuery.or(`lawyer_id.eq.${userId},caseLawyerId.eq.${userId}`);
      }

      const { data: casesData, error: casesError } = await casesQuery;
      if (casesError) throw casesError;

      const caseNumbers = casesData?.map(c => c.case_number).filter(Boolean) || [];
      const casesMap = (casesData || []).reduce((acc, c) => {
        acc[c.case_number] = c;
        if (c.id) acc[c.id] = c;
        return acc;
      }, {});

      // 3. Fetch Sessions (Scoped by User IDs AND Case Numbers)
      let allSessions = [];
      if (caseNumbers.length > 0) {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('sessions')
          .select('*')
          .in('case_number', caseNumbers)
          .in('user_id', firmUserIds); // Match dashboard limitation logic

        if (sessionsError) throw sessionsError;
        allSessions = sessionsData || [];
      }

      // 4. Fetch Tasks
      let tasksQuery = supabase
        .from('tasks')
        .select('*');

      if (isAdmin) {
        tasksQuery = tasksQuery.or(`admin_id.in.(${firmUserIds.join(',')}),lawyer_id.in.(${firmUserIds.join(',')})`);
      } else {
        tasksQuery = tasksQuery.or(`lawyer_id.eq.${userId},admin_id.eq.${userId}`);
      }

      const { data: tasksData, error: tasksError } = await tasksQuery;
      if (tasksError) throw tasksError;

      // 5. Fetch Reminders
      let reminderOrQuery = isAdmin
        ? `admin_id.in.(${firmUserIds.join(',')}),user_id.in.(${firmUserIds.join(',')})`
        : `user_id.eq.${userId}`;

      const { data: remindersData, error: remindersError } = await supabase
        .from('reminders')
        .select('*')
        .or(reminderOrQuery)
        .or('status.is.null,status.neq.ended');

      if (remindersError) throw remindersError;

      // 5. Process Data
      const processedEvents = [];

      allSessions.forEach(session => {
        if (!session.sessiondate) return;
        const caseInfo = casesMap[session.case_number] || {};

        processedEvents.push({
          id: `session-${session.id}`,
          originalId: session.id,
          type: 'session',
          title: `تفاصيل الجلسة: ${session.sessiondetails || (caseInfo.client_name || session.case_number)}`,
          date: new Date(session.sessiondate),
          time: session.sessiontime,
          details: session.sessiondetails,
          caseNumber: session.case_number,
          caseId: caseInfo.id,
          clientName: caseInfo.client_name,
          court: caseInfo.courtAddress,
          colorType: 'session'
        });

        if (session.next_session_date) {
          processedEvents.push({
            id: `next-session-${session.id}`,
            originalId: session.id,
            type: 'session',
            title: `جلسة قادمة: ${session.next_session_req || (caseInfo.client_name || session.case_number)}`,
            date: new Date(session.next_session_date),
            time: session.next_session_time,
            details: `المطلوب: ${session.next_session_req || '-'}`,
            caseNumber: session.case_number,
            caseId: caseInfo.id,
            clientName: caseInfo.client_name,
            court: caseInfo.courtAddress,
            colorType: 'next-session'
          });
        }
      });

      (tasksData || []).forEach(task => {
        if (!task.task_deadline) return;

        processedEvents.push({
          id: `task-${task.id}`,
          originalId: task.id,
          type: 'task',
          title: `مهمة: ${task.task_title}`,
          date: new Date(task.task_deadline),
          time: null,
          details: task.task_details,
          priority: task.task_priority,
          status: task.task_status,
          caseNumber: task.task_case,
          caseId: casesMap[task.task_case]?.id,
          colorType: 'task'
        });
      });

      (remindersData || []).forEach(reminder => {
        if (!reminder.reminder_date) return;

        processedEvents.push({
          id: `reminder-${reminder.id}`,
          originalId: reminder.id,
          type: 'reminder',
          title: `تذكير: ${reminder.title || 'بدون عنوان'}`,
          date: new Date(reminder.reminder_date),
          time: null,
          details: reminder.description,
          status: reminder.status,
          caseNumber: reminder.case_id ? (casesMap[reminder.case_id]?.case_number || undefined) : undefined,
          caseId: reminder.case_id,
          colorType: 'reminder'
        });
      });

      setEvents(processedEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 6 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 6 });
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const dayEvents = (date) => {
    return events.filter(event =>
      isSameDay(event.date, date) &&
      ((event.type === 'session' && filters.sessions) ||
        (event.type === 'task' && filters.tasks) ||
        (event.type === 'reminder' && filters.reminders))
    );
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  return (
    <Layout>
      <Head>
        <title>التقويم - محامي برو</title>
      </Head>

      <div className="calendar-page" dir="rtl">
        <div className="page-header">
          <div className="controls-section">
            <div className="calendar-nav">
              <button onClick={prevMonth} className="nav-btn"><ChevronRight size={20} /></button>
              <span className="current-month">{format(currentDate, 'MMMM yyyy', { locale: ar })}</span>
              <button onClick={nextMonth} className="nav-btn"><ChevronLeft size={20} /></button>
            </div>

            <div className="actions">
              <button onClick={goToToday} className="btn-today" title="اليوم">
                <CalendarIcon size={18} />
                <span className="icon-label">اليوم</span>
              </button>
              <div className="filters">
                <button
                  onClick={() => setFilters({ ...filters, sessions: !filters.sessions })}
                  className={`filter-btn ${filters.sessions ? 'active session' : ''}`}
                >
                  <Briefcase size={18} />
                  <span className="icon-label">الجلسات</span>
                </button>
                <button
                  onClick={() => setFilters({ ...filters, tasks: !filters.tasks })}
                  className={`filter-btn ${filters.tasks ? 'active task' : ''}`}
                  title="المهام"
                >
                  <CheckSquare size={18} />
                  <span className="icon-label">المهام</span>
                </button>
                <button
                  onClick={() => setFilters({ ...filters, reminders: !filters.reminders })}
                  className={`filter-btn ${filters.reminders ? 'active reminder' : ''}`}
                  title="التذكيرات"
                >
                  <Bell size={18} />
                  <span className="icon-label">التذكيرات</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="calendar-main-content">
          <div className="calendar-container">
            <div className="calendar-header">
              {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((day) => (
                <div key={day} className="day-name">{day}</div>
              ))}
            </div>

            <div className="calendar-grid">
              {dateRange.map((day) => {
                const daysEvents = dayEvents(day);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={day.toString()}
                    className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isTodayDate ? 'today' : ''}`}
                    onClick={() => handleDateClick(day)}
                  >
                    <div className="day-number">
                      <span>{format(day, 'd')}</span>
                      {daysEvents.length > 0 && <span className="event-count-badge">{daysEvents.length}</span>}
                    </div>

                    <div className="day-events">
                      {daysEvents.slice(0, 4).map((event) => (
                        <div
                          key={event.id}
                          className={`mini-event ${event.colorType}`}
                          title={event.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          <span className="event-title-text">{event.title}</span>
                        </div>
                      ))}
                      {daysEvents.length > 4 && (
                        <div className="more-events-link">+{daysEvents.length - 4} المزيد</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="details-section">
            <h2 className="details-title">
              <CalendarIcon size={20} />
              أحداث {format(selectedDate, 'EEEE d MMMM yyyy', { locale: ar })}
            </h2>

            <div className="details-scroll-area">
              {dayEvents(selectedDate).length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon-wrapper">
                    <CalendarIcon size={40} />
                  </div>
                  <p>لا توجد أحداث في هذا اليوم</p>
                </div>
              ) : (
                <div className="events-list">
                  {dayEvents(selectedDate).map(event => (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={`event-card ${event.colorType}`}
                    >
                      <div className="event-header">
                        <span className="event-type">
                          {event.type === 'session' ? 'جلسة' : 'مهمة'}
                        </span>
                        {event.time && (
                          <span className="event-time">
                            <Clock size={14} />
                            {event.time}
                          </span>
                        )}
                      </div>
                      <h3>{event.title}</h3>

                      <div className="event-meta">
                        {event.caseNumber && (
                          <div className="meta-item">
                            <Briefcase size={14} />
                            <span>{event.caseNumber}</span>
                          </div>
                        )}
                        {event.court && (
                          <div className="meta-item">
                            <MapPin size={14} />
                            <span>{event.court}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {showEventModal && selectedEvent && (
          <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <button className="close-btn" onClick={() => setShowEventModal(false)}>
                <X size={20} />
              </button>

              <div className={`modal-header ${selectedEvent.colorType}`}>
                <div className="modal-badge">
                  {selectedEvent.type === 'session' ? <CalendarIcon size={16} /> :
                    selectedEvent.type === 'task' ? <CheckSquare size={16} /> :
                      <Bell size={16} />}
                  {selectedEvent.type === 'session' ? 'تفاصيل الجلسة' :
                    selectedEvent.type === 'task' ? 'تفاصيل المهمة' : 'تذكير'}
                </div>
                <h2>{selectedEvent.title}</h2>
              </div>

              <div className="modal-body">
                <div className="info-grid">
                  <div className="info-box">
                    <label>التاريخ</label>
                    <div className="value">
                      <CalendarIcon size={16} />
                      {format(selectedEvent.date, 'dd/MM/yyyy')}
                    </div>
                  </div>
                  {selectedEvent.time && (
                    <div className="info-box">
                      <label>الوقت</label>
                      <div className="value">
                        <Clock size={16} />
                        {selectedEvent.time}
                      </div>
                    </div>
                  )}
                </div>

                {selectedEvent.details && (
                  <div className="details-box">
                    <label>التفاصيل</label>
                    <p>{selectedEvent.details}</p>
                  </div>
                )}

                <div className="meta-list">
                  {selectedEvent.caseNumber && (
                    <div className="meta-row">
                      <span>رقم القضية</span>
                      <strong>{selectedEvent.caseNumber}</strong>
                    </div>
                  )}
                  {selectedEvent.clientName && (
                    <div className="meta-row">
                      <span>الموكل</span>
                      <strong>{selectedEvent.clientName}</strong>
                    </div>
                  )}
                  {selectedEvent.court && (
                    <div className="meta-row">
                      <span>المكان</span>
                      <strong>{selectedEvent.court}</strong>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button
                    onClick={() => {
                      if (selectedEvent.caseNumber || selectedEvent.caseId) {
                        let tab = 'sessions';
                        if (selectedEvent.type === 'task') tab = 'jobTasks';
                        if (selectedEvent.type === 'reminder') tab = 'reminders'; // assuming a hypothetical reminders tab, gracefully degrades
                        const url = new URL(window.location.origin + '/cases/CaseDetailsPage');
                        if (selectedEvent.caseId) url.searchParams.set('caseId', selectedEvent.caseId);
                        if (selectedEvent.caseNumber) url.searchParams.set('caseNumber', selectedEvent.caseNumber);
                        url.searchParams.set('tab', tab);
                        url.searchParams.set('highlightType', selectedEvent.type);
                        url.searchParams.set('highlightId', selectedEvent.originalId);

                        router.push(url.pathname + url.search);
                      } else {
                        setShowEventModal(false);
                      }
                    }}
                    className="action-btn"
                  >
                    فتح الملف
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .calendar-page {
          padding: 12px 24px 24px 24px;
          max-width: 100%;
          margin: 0 auto;
          font-family: 'Cairo', sans-serif;
          color: #334155;
          display: flex;
          flex-direction: column;
          min-height: auto;
          height: auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .title-section h1 {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 8px 0;
        }

        .title-section p {
          color: #64748b;
          margin: 0;
        }

        .controls-section {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .calendar-nav {
          display: flex;
          align-items: center;
          background: white;
          padding: 4px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .nav-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #64748b;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .nav-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .icon-label {
          font-size: 12px;
          margin-right: 6px;
          font-weight: 600;
        }

        .current-month {
          font-weight: 700;
          font-size: 16px;
          color: #0f172a;
          padding: 0 16px;
          min-width: 140px;
          text-align: center;
        }

        .actions {
          display: flex;
          gap: 12px;
        }

        .btn-today {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 13px;
        }

        .btn-today:hover {
          background: #2563eb;
        }

        .filters {
          display: flex;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 8px;
        }

        .filter-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          color: #64748b;
          font-size: 13px;
        }

        .filter-btn.active {
          background: white;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }

        .filter-btn.active.session {
          color: #3b82f6;
        }

        .filter-btn.active.task {
          color: #10b981;
        }

        .calendar-main-content {
          display: flex;
          gap: 24px;
          flex: 1;
        }

        .calendar-container {
          flex: 1;
          background: white;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
        }

        .calendar-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .day-name {
          padding: 16px 8px;
          text-align: center;
          font-weight: 900;
          color: #000000;
          font-size: 14px;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          auto-rows: minmax(130px, 1fr);
        }

        .calendar-day {
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
          padding: 8px;
          cursor: pointer;
          transition: background 0.2s;
          position: relative;
        }

        .calendar-day:nth-child(7n) {
          border-left: none; /* In RTL, right is left visually for grid lines if we want to remove outer border, but simpler to keep right border */
        }

        .calendar-day:hover {
          background: #f8fafc;
        }

        .calendar-day.other-month {
          background: #fcfcfc;
          color: #cbd5e1;
        }

        .calendar-day.selected {
          background: #eff6ff;
          box-shadow: inset 0 0 0 2px #3b82f6;
        }

        .calendar-day.today .day-number span {
          background: #3b82f6;
          color: white;
        }

        .day-number {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .day-number span {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 14px;
          font-weight: 600;
        }

        .event-count-badge {
          font-size: 10px !important;
          background: #e2e8f0 !important;
          color: #64748b !important;
          width: auto !important;
          height: auto !important;
          padding: 2px 6px !important;
          border-radius: 10px !important;
        }

        .day-events {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-top: 4px;
        }

        .mini-event {
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          border-right: 3px solid transparent;
          transition: all 0.2s;
        }

        .mini-event:hover {
          filter: brightness(0.95);
          transform: translateX(-2px);
        }

        .mini-event.session { 
          background-color: #eff6ff; 
          color: #1e40af;
          border-right-color: #3b82f6;
        }
        .mini-event.next-session { 
          background-color: #eef2ff; 
          color: #3730a3;
          border-right-color: #6366f1;
        }
        .mini-event.task { 
          background-color: #ecfdf5; 
          color: #065f46;
          border-right-color: #10b981;
        }
        .mini-event.reminder { 
          background-color: #fef2f2; 
          color: #991b1b;
          border-right-color: #ef4444;
        }

        .more-events-link {
          font-size: 11px;
          color: #64748b;
          font-weight: 700;
          margin-top: 2px;
          padding-right: 4px;
        }

        .event-title-text {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Details Section */
        .details-section {
          width: 300px;
          background: #f8fafc;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          min-height: 0;
          position: relative;
        }

        .details-title {
          padding: 20px;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          color: #1e293b;
          border-bottom: 1px solid #e2e8f0;
          background: white;
          border-radius: 16px 16px 0 0;
          font-weight: 700;
        }

        .details-scroll-area {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }

        .details-scroll-area::-webkit-scrollbar {
          width: 6px;
        }

        .details-scroll-area::-webkit-scrollbar-track {
          background: transparent;
        }

        .details-scroll-area::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 10px;
        }

        .empty-state {
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
        }

        .empty-icon-wrapper {
          width: 80px;
          height: 80px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          color: #cbd5e1;
        }

        .empty-state p {
          margin: 0;
          font-size: 15px;
          font-weight: 500;
        }

        .events-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .event-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s;
          border-right: 4px solid transparent;
        }

        .event-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .event-card.session { border-right-color: #3b82f6; }
        .event-card.next-session { border-right-color: #6366f1; }
        .event-card.task { border-right-color: #10b981; }
        .event-card.reminder { border-right-color: #ef4444; }

        .event-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .event-type {
          font-size: 12px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 4px;
          background: #f1f5f9;
          color: #475569;
        }

        .event-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #64748b;
        }

        .event-card h3 {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 12px 0;
          line-height: 1.4;
        }

        .event-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #64748b;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: white;
          width: 100%;
          max-width: 500px;
          border-radius: 16px;
          position: relative;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .close-btn {
          position: absolute;
          left: 16px;
          top: 16px;
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .modal-header {
          padding: 24px;
          border-radius: 16px 16px 0 0;
          color: white;
        }

        .modal-header.session { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
        .modal-header.next-session { background: linear-gradient(135deg, #6366f1, #4f46e5); }
        .modal-header.task { background: linear-gradient(135deg, #10b981, #059669); }
        .modal-header.reminder { background: linear-gradient(135deg, #ef4444, #dc2626); }

        .modal-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 12px;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.4;
        }

        .modal-body {
          padding: 24px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        .info-box {
          background: #f8fafc;
          padding: 12px;
          border-radius: 8px;
        }

        .info-box label {
          display: block;
          font-size: 12px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .info-box .value {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          color: #0f172a;
        }

        .details-box {
          background: #fff;
          border: 1px solid #e2e8f0;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .details-box label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #3b82f6;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .details-box p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          color: #334155;
        }

        .meta-list {
          border-top: 1px solid #e2e8f0;
          padding-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }

        .meta-row span { color: #64748b; }
        .meta-row strong { color: #0f172a; }

        .modal-actions {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
          text-align: left; /* Align button to left in RTL */
        }

        .action-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .action-btn:hover {
          background: #2563eb;
        }

        @media (max-width: 1100px) {
          .calendar-page {
            height: auto;
            overflow: visible;
          }
          .calendar-main-content {
            flex-direction: column;
            overflow: visible;
          }
          .details-section {
            width: 100%;
            height: auto;
            margin-top: 24px;
          }
          .details-scroll-area {
            max-height: 500px;
          }
        }

        @media (max-width: 768px) {
          .calendar-page {
            padding: 12px 12px 0 12px;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .calendar-header .day-name {
            font-size: 11px;
            padding: 8px 2px;
            color: #475569;
          }

          .calendar-grid {
            auto-rows: minmax(64px, 1fr);
          }
          
          .calendar-day {
            padding: 4px;
          }

          .day-number {
            margin-bottom: 2px;
            justify-content: center;
          }

          .day-number span:not(.event-count-badge) {
            width: 24px;
            height: 24px;
            font-size: 12px;
          }

          .event-count-badge {
            display: none !important; /* Hide badge, use dots instead */
          }

          .day-events {
            flex-direction: row;
            flex-wrap: wrap;
            justify-content: center;
            gap: 3px;
            margin-top: 2px;
          }

          .mini-event {
            width: 6px;
            height: 6px;
            padding: 0;
            border-radius: 50%;
            border: none;
            overflow: hidden;
            font-size: 0;
            color: transparent;
          }
          
          /* Set solid colors for mobile dots */
          .mini-event.session { background-color: #3b82f6; }
          .mini-event.next-session { background-color: #6366f1; }
          .mini-event.task { background-color: #10b981; }
          .mini-event.reminder { background-color: #ef4444; }

          .event-title-text {
            display: none;
          }

          .more-events-link {
            display: none;
          }
        }
      `}</style>
    </Layout >
  );
};

export default CalendarPage;
