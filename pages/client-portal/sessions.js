import Head from 'next/head';
import withClientAuth from '../../lib/withClientAuth';
import { ClientPortalProvider, useClientPortal } from '../../context/ClientPortalContext';
import ClientLayout from '../../components/client-portal/ClientLayout';
import { Calendar, Clock, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

const SessionsContent = () => {
  const { sessions, loading } = useClientPortal();
  const [view, setView] = useState('upcoming');

  const now = new Date();
  const upcoming = useMemo(() => sessions.filter(s => s.sessiondate && new Date(s.sessiondate) >= now).sort((a, b) => new Date(a.sessiondate) - new Date(b.sessiondate)), [sessions]);
  const past = useMemo(() => sessions.filter(s => s.sessiondate && new Date(s.sessiondate) < now).sort((a, b) => new Date(b.sessiondate) - new Date(a.sessiondate)), [sessions]);
  const displayed = view === 'upcoming' ? upcoming : past;

  const formatDate = (d) => { try { return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }); } catch { return d; } };

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>جاري التحميل...</div>;

  return (
    <>
      <Head><title>جلساتي - بوابة الموكل | محامي برو</title></Head>
      <div className="cp-sessions">
        <div className="page-header"><h1><Calendar size={24} /> جلساتي</h1><p>{sessions.length} جلسة</p></div>
        <div className="view-tabs">
          <button className={view === 'upcoming' ? 'active' : ''} onClick={() => setView('upcoming')}>القادمة ({upcoming.length})</button>
          <button className={view === 'past' ? 'active' : ''} onClick={() => setView('past')}>السابقة ({past.length})</button>
        </div>
        {displayed.length === 0 ? (
          <div className="empty"><Calendar size={32} /><p>لا توجد جلسات {view === 'upcoming' ? 'قادمة' : 'سابقة'}</p></div>
        ) : (
          <div className="sessions-list">
            {displayed.map((s, i) => (
              <div key={i} className="session-card">
                <div className="session-date-box"><span className="sd">{new Date(s.sessiondate).getDate()}</span><span className="sm">{new Date(s.sessiondate).toLocaleDateString('ar-IQ', { month: 'short' })}</span></div>
                <div className="session-info">
                  <h3>{s.sessionname || 'جلسة'}</h3>
                  <p className="si-case">قضية #{s.case_number}</p>
                  <p className="si-date">{formatDate(s.sessiondate)}</p>
                  {s.sessiondetails && <p className="si-details">{s.sessiondetails}</p>}
                  {s.next_session_date && <p className="si-next"><Clock size={12} /> الجلسة القادمة: {formatDate(s.next_session_date)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style jsx>{`
        .cp-sessions { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .page-header { margin-bottom: 24px; }
        .page-header h1 { display: flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
        .page-header p { margin: 0; font-size: 14px; color: #64748b; }
        
        @media (max-width: 768px) {
          .page-header h1 {
            font-size: 20px;
          }
          .page-header p {
            font-size: 13px;
          }
        }
        .view-tabs { display: flex; gap: 4px; background: white; padding: 4px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 24px; width: fit-content; }
        .view-tabs button { padding: 10px 20px; border: none; background: none; border-radius: 8px; font-size: 14px; font-weight: 500; color: #64748b; cursor: pointer; font-family: inherit; transition: all 0.2s; min-height: 44px; }
        .view-tabs button:hover { background: #f1f5f9; }
        .view-tabs button.active { background: #3B82F6; color: white; }
        
        @media (max-width: 768px) {
          .view-tabs {
            width: 100%;
            justify-content: stretch;
          }
          .view-tabs button {
            flex: 1;
            padding: 12px 16px;
            font-size: 15px;
          }
        }
        .empty { text-align: center; padding: 48px 20px; color: #94a3b8; background: white; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03); }
        .empty p { margin: 12px 0 0; font-size: 16px; }
        
        @media (max-width: 768px) {
          .empty {
            padding: 48px 16px;
            border-radius: 12px;
          }
          .empty p {
            font-size: 15px;
          }
        }
        .sessions-list { display: flex; flex-direction: column; gap: 12px; }
        .session-card { display: flex; gap: 16px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; transition: all 0.2s; position: relative; overflow: hidden; width: 100%; }
        .session-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 3px;
          height: 100%;
          background: linear-gradient(to bottom, #7c3aed, #5b21b6);
          border-radius: 0 12px 12px 0;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .session-card:hover {
          border-color: #c7d2fe;
          box-shadow: 0 2px 4px rgba(79, 70, 229, 0.04);
          transform: translateY(-1px);
        }
        .session-card:hover::before {
          opacity: 1;
        }
        .session-card:active {
          transform: translateY(0);
        }
        
        @media (max-width: 768px) {
          .sessions-list {
            gap: 8px;
          }
          .session-card {
            padding: 20px 16px;
            border-radius: 8px;
            width: 100%;
          }
        }
        .session-date-box { min-width: 60px; text-align: center; background: linear-gradient(135deg, #EFF6FF, #DBEAFE); border-radius: 12px; padding: 10px 8px; border: 1px solid #BFDBFE; flex-shrink: 0; }
        .sd { display: block; font-size: 24px; font-weight: 800; color: #1E3A8A; line-height: 1; }
        .sm { display: block; font-size: 12px; font-weight: 600; color: #3B82F6; margin-top: 2px; }
        
        @media (max-width: 768px) {
          .session-date-box {
            min-width: 56px;
          }
          .sd {
            font-size: 18px;
          }
          .sm {
            font-size: 11px;
            margin-top: 0;
          }
        }
        .session-info h3 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
        .si-case { font-size: 13px; color: #3B82F6; font-weight: 600; margin: 0 0 4px; }
        .si-date { font-size: 13px; color: #64748b; margin: 0 0 4px; }
        .si-details { font-size: 13px; color: #94a3b8; margin: 0 0 4px; }
        .si-next { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #F59E0B; font-weight: 600; margin: 0; }
      `}</style>
    </>
  );
};

const ClientSessionsPage = ({ clientAccount }) => (
  <ClientPortalProvider clientAccount={clientAccount}><ClientLayout><SessionsContent /></ClientLayout></ClientPortalProvider>
);
export default withClientAuth(ClientSessionsPage);
