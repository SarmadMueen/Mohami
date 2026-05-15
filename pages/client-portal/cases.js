import { useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import withClientAuth from '../../lib/withClientAuth';
import { ClientPortalProvider, useClientPortal } from '../../context/ClientPortalContext';
import ClientLayout from '../../components/client-portal/ClientLayout';
import {
  Briefcase, Search, Filter, CheckCircle, TrendingUp,
  Clock, ChevronLeft, AlertCircle
} from 'lucide-react';

const CasesContent = () => {
  const { cases, loading } = useClientPortal();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredCases = useMemo(() => {
    let result = [...cases];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.case_number || '').toLowerCase().includes(q) ||
        (c.caseType || '').toLowerCase().includes(q) ||
        (c.court || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'active') {
      result = result.filter(c => {
        const s = (c.caseState || '').toLowerCase();
        return !s.includes('مكتملة') && !s.includes('مغلقة') && !s.includes('منتهية');
      });
    } else if (statusFilter === 'completed') {
      result = result.filter(c => {
        const s = (c.caseState || '').toLowerCase();
        return s.includes('مكتملة') || s.includes('مغلقة') || s.includes('منتهية');
      });
    }

    return result;
  }, [cases, searchQuery, statusFilter]);

  const formatDate = (d) => {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return d; }
  };

  const getStatusInfo = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('مكتملة') || s.includes('مغلقة') || s.includes('منتهية')) {
      return { label: 'مكتملة', color: '#10B981', bg: '#ECFDF5', icon: CheckCircle };
    }
    if (s.includes('قيد النظر') || s.includes('قيد العمل')) {
      return { label: 'قيد النظر', color: '#F59E0B', bg: '#FFFBEB', icon: Clock };
    }
    return { label: status || 'نشطة', color: '#3B82F6', bg: '#EFF6FF', icon: TrendingUp };
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>جاري التحميل...</div>;
  }

  return (
    <>
      <Head><title>قضاياي - بوابة الموكل | محامي برو</title></Head>
      <div className="cp-cases-page">
        <div className="page-header">
          <h1><Briefcase size={24} /> قضاياي</h1>
          <p>{cases.length} قضية</p>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="search-box">
            <Search size={18} />
            <input placeholder="بحث بالرقم أو النوع..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="filter-tabs">
            {[
              { key: 'all', label: 'الكل' },
              { key: 'active', label: 'النشطة' },
              { key: 'completed', label: 'المكتملة' }
            ].map(f => (
              <button key={f.key} className={statusFilter === f.key ? 'active' : ''} onClick={() => setStatusFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cases Grid */}
        {filteredCases.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={32} />
            <p>لا توجد قضايا {statusFilter !== 'all' ? 'بهذا الفلتر' : ''}</p>
          </div>
        ) : (
          <div className="cases-grid">
            {filteredCases.map(c => {
              const si = getStatusInfo(c.caseState);
              const Icon = si.icon;
              return (
                <Link href={`/client-portal/case-details?id=${c.id}`} key={c.id}>
                  <a className="case-card">
                    <div className="case-card-top">
                      <span className="case-number">#{c.case_number}</span>
                      <span className="case-status" style={{ background: si.bg, color: si.color }}>
                        <Icon size={12} /> {si.label}
                      </span>
                    </div>
                    <h3 className="case-type">
                      {c.caseType || c.caseType2 || 'غير محدد'}
                      {c.caseSubject && <span style={{ display: 'block', fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 'normal' }}>موضوع القضية: {c.caseSubject}</span>}
                    </h3>
                    <div className="case-details">
                      {(c.totalAmount || c.totalAmount === 0) && (
                        <span className="case-detail">💰 قيمة الدعوى: {parseFloat(c.totalAmount).toLocaleString('ar-IQ')} {c.currency === 'USD' ? 'دولار أمريكي' : (c.currency || 'دينار عراقي')}</span>
                      )}
                      {c.court && <span className="case-detail">🏛 المحكمة: {c.court}</span>}
                      {c.caseLawyerName && <span className="case-detail">👤 المحامي: {c.caseLawyerName}</span>}
                      <span className="case-detail">📅 أُضيفت في: {formatDate(c.created_at)}</span>
                    </div>
                    <div className="case-card-footer">
                      <span>عرض التفاصيل</span>
                      <ChevronLeft size={16} />
                    </div>
                  </a>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .cp-cases-page { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .page-header { margin-bottom: 24px; }
        .page-header h1 { display: flex; align-items: center; gap: 10px; font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
        .page-header p { margin: 0; font-size: 14px; color: #64748b; }

        .filters-bar { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .search-box { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; transition: all 0.2s ease; }
        .search-box:focus-within { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .search-box input { border: none; outline: none; font-size: 14px; width: 100%; font-family: inherit; background: none; color: #1e293b; }
        .search-box input::placeholder { color: #94a3b8; }
        
        @media (max-width: 768px) {
          .search-box {
            padding: 14px 16px;
            min-height: 48px;
            width: 100%;
          }
          .search-box input {
            font-size: 16px; /* Prevent iOS zoom */
          }
        }
        .filter-tabs { display: flex; gap: 4px; background: white; padding: 4px; border-radius: 10px; border: 1px solid #e2e8f0; -webkit-overflow-scrolling: touch; }
        .filter-tabs button { padding: 10px 18px; border: none; background: none; border-radius: 8px; font-size: 14px; font-weight: 500; color: #64748b; cursor: pointer; font-family: inherit; transition: all 0.2s; min-height: 44px; white-space: nowrap; }
        .filter-tabs button:hover { background: #f1f5f9; }
        .filter-tabs button.active { background: #3B82F6; color: white; }
        
        @media (max-width: 768px) {
          .filter-tabs {
            overflow-x: auto;
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* IE/Edge */
          }
          .filter-tabs::-webkit-scrollbar {
            display: none; /* Chrome/Safari */
          }
          .filter-tabs button {
            padding: 12px 20px;
            font-size: 15px;
          }
        }

        .empty-state { text-align: center; padding: 64px 20px; color: #94a3b8; background: white; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03); }
        .empty-state p { margin: 12px 0 0; font-size: 16px; }

        .cases-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
        
        @media (max-width: 768px) {
          .cases-grid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
        }

        .case-card { display: block; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-decoration: none; transition: all 0.25s ease; cursor: pointer; position: relative; overflow: hidden; width: 100%; }
        .case-card::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 3px;
          height: 100%;
          background: linear-gradient(to bottom, #3B82F6, #1E3A8A);
          border-radius: 0 12px 12px 0;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .case-card:hover {
          border-color: #3B82F6;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(59,130,246,0.04);
        }
        .case-card:hover::before {
          opacity: 1;
        }
        .case-card:active {
          transform: translateY(0);
        }
        
        @media (max-width: 768px) {
          .case-card {
            padding: 20px 16px;
            border-radius: 8px;
            width: 100%;
          }
        }

        .case-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; gap: 8px; }
        .case-number { font-size: 16px; font-weight: 700; color: #1E3A8A; }
        .case-status { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px; white-space: nowrap; }
        
        @media (max-width: 768px) {
          .case-card-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
          .case-number {
            font-size: 15px;
          }
          .case-status {
            font-size: 10px;
            padding: 3px 8px;
          }
        }

        .case-type { font-size: 15px; font-weight: 600; color: #334155; margin: 0 0 12px; line-height: 1.4; }
        
        @media (max-width: 768px) {
          .case-type {
            font-size: 14px;
            margin-bottom: 10px;
          }
        }

        .case-details { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .case-detail { font-size: 12px; color: #64748b; line-height: 1.4; }
        
        @media (max-width: 768px) {
          .case-details {
            gap: 4px;
            margin-bottom: 12px;
          }
          .case-detail {
            font-size: 11px;
          }
        }

        .case-card-footer { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; color: #3B82F6; transition: all 0.2s ease; }
        .case-card-footer:hover { color: #1E3A8A; }
        
        @media (max-width: 768px) {
          .case-card-footer {
            font-size: 12px;
            padding-top: 10px;
          }
        }

        @media (max-width: 768px) {
          .page-header h1 { font-size: 20px; }
          .cases-grid { grid-template-columns: 1fr; }
          .filters-bar { flex-direction: column; gap: 12px; }
          .search-box { width: 100%; }
        }
      `}</style>
    </>
  );
};

const ClientCasesPage = ({ clientAccount }) => (
  <ClientPortalProvider clientAccount={clientAccount}>
    <ClientLayout><CasesContent /></ClientLayout>
  </ClientPortalProvider>
);

export default withClientAuth(ClientCasesPage);
