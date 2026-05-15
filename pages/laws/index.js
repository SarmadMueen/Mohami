import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import withAuth from '../../lib/withAuth';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/initSupabase';
import { BookOpen, Scale, FileText, Calendar, Hash, ArrowLeft, ArrowRight, BarChart3, Clock, Heart } from 'lucide-react';

const LawsPage = () => {
  const router = useRouter();
  const [penalCodeStats, setPenalCodeStats] = useState({ count: 0, year: null });
  const [criminalProceduresStats, setCriminalProceduresStats] = useState({ count: 0, year: null });
  const [personalStatusStats, setPersonalStatusStats] = useState({ count: 0, year: null });
  const [civilLawStats, setCivilLawStats] = useState({ count: 0, year: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLawStats();
  }, []);

  const fetchLawStats = async () => {
    try {
      setLoading(true);
      
      // Fetch penal code stats
      const { data: penalData, error: penalError } = await supabase
        .from('legal_codes')
        .select('id, law_year')
        .eq('law_type', 'عقوبات')
        .limit(1);

      if (!penalError && penalData && penalData.length > 0) {
        const { count } = await supabase
          .from('legal_codes')
          .select('*', { count: 'exact', head: true })
          .eq('law_type', 'عقوبات');
        
        setPenalCodeStats({
          count: count || 0,
          year: penalData[0].law_year
        });
      }

      // Fetch criminal procedures stats
      const { data: proceduresData, error: proceduresError } = await supabase
        .from('criminal_procedures_law')
        .select('id, law_year')
        .limit(1);

      if (!proceduresError && proceduresData && proceduresData.length > 0) {
        const { count } = await supabase
          .from('criminal_procedures_law')
          .select('*', { count: 'exact', head: true });
        
        setCriminalProceduresStats({
          count: count || 0,
          year: proceduresData[0].law_year
        });
      }

      // Fetch personal status law stats
      const { data: personalStatusData, error: personalStatusError } = await supabase
        .from('legal_articles')
        .select('id, law_title')
        .eq('law_id', 'law_188_1959')
        .limit(1);

      if (!personalStatusError && personalStatusData && personalStatusData.length > 0) {
        const { count } = await supabase
          .from('legal_articles')
          .select('*', { count: 'exact', head: true })
          .eq('law_id', 'law_188_1959');
        
        setPersonalStatusStats({
          count: count || 0,
          year: personalStatusData[0].law_title
        });
      }

      // Fetch civil law stats
      const { data: civilLawData, error: civilLawError } = await supabase
        .from('civil_law')
        .select('id, law_year')
        .limit(1);

      if (!civilLawError && civilLawData && civilLawData.length > 0) {
        const { count } = await supabase
          .from('civil_law')
          .select('*', { count: 'exact', head: true });
        
        setCivilLawStats({
          count: count || 0,
          year: civilLawData[0].law_year
        });
      }
    } catch (error) {
      console.error('Error fetching law stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const laws = [
    {
      id: 'penal-code',
      title: 'قانون العقوبات العراقي',
      subtitle: 'القانون رقم 111 لسنة 1969',
      description: 'قانون العقوبات العراقي يحدد الجرائم والعقوبات المقررة لها',
      icon: Scale,
      color: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
      bgColor: '#eff6ff',
      iconColor: '#3b82f6',
      route: '/laws/penal-code',
      stats: penalCodeStats,
      tableName: 'legal_codes'
    },
    {
      id: 'criminal-procedures',
      title: 'قانون أصول المحاكمات الجزائية العراقي',
      subtitle: 'القانون رقم 23 لسنة 1971 المعدل',
      description: 'قانون أصول المحاكمات الجزائية يحدد الإجراءات والمرافعات في القضايا الجزائية',
      icon: FileText,
      color: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
      bgColor: '#faf5ff',
      iconColor: '#a855f7',
      route: '/laws/criminal-procedures',
      stats: criminalProceduresStats,
      tableName: 'criminal_procedures_law'
    },
    {
      id: 'personal-status',
      title: 'قانون الأحوال الشخصية العراقي',
      subtitle: 'القانون رقم 188 لسنة 1959 وتعديلاته',
      description: 'قانون الأحوال الشخصية ينظم شؤون الزواج والطلاق والميراث والوصية والحضانة',
      icon: Heart,
      color: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
      bgColor: '#fef2f2',
      iconColor: '#ef4444',
      route: '/laws/personal-status',
      stats: personalStatusStats,
      tableName: 'legal_articles'
    },
    {
      id: 'civil-law',
      title: 'القانون المدني العراقي',
      subtitle: 'القانون رقم 40 لسنة 1951',
      description: 'القانون المدني العراقي ينظم المعاملات المدنية والعقود والالتزامات والمسؤولية المدنية',
      icon: BookOpen,
      color: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      bgColor: '#f0fdf4',
      iconColor: '#10b981',
      route: '/laws/civil-law',
      stats: civilLawStats,
      tableName: 'legal_codes'
    }
  ];

  return (
    <Layout>
      <Head>
        <title>القوانين العراقية - نظام إدارة القضايا</title>
      </Head>
      <div style={{ padding: '32px 24px', direction: 'rtl', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          padding: '24px 32px',
          marginBottom: '32px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          maxWidth: '1400px',
          margin: '0 auto 32px auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <ArrowLeft size={20} style={{ color: '#64748b' }} />
            </button>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              flexShrink: 0
            }}>
              <BookOpen size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', margin: 0, color: '#1e293b' }}>
                القوانين العراقية
              </h1>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '6px 0 0 0' }}>
                تصفح القوانين العراقية والمواد القانونية
              </p>
            </div>
          </div>
        </div>

        {/* Laws Cards Grid */}
        {loading ? (
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            width: '100%'
          }}>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: '600',
              color: '#2563eb',
              textAlign: 'center'
            }}>
              جاري التحميل...
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 380px))',
            gap: '24px',
            justifyContent: 'center',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>
            {laws.map((law) => {
              const IconComponent = law.icon;
              // Extract solid color from gradient for border
              const borderColor = 
                law.id === 'penal-code' ? '#3b82f6' : 
                law.id === 'criminal-procedures' ? '#a855f7' : 
                law.id === 'civil-law' ? '#10b981' :
                '#ef4444';
              
              return (
                <div
                  key={law.id}
                  onClick={() => router.push(law.route)}
                  style={{
                    background: 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                    borderBottom: `4px solid ${borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    position: 'relative'
                  }}
                >
                  {/* Title */}
                  <h2 style={{ 
                    fontSize: '18px', 
                    fontWeight: '700', 
                    margin: '0 0 8px 0', 
                    color: '#1e293b',
                    lineHeight: '1.4'
                  }}>
                    {law.title}
                  </h2>

                  {/* Stats Row */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '10px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      color: '#64748b'
                    }}>
                      <BarChart3 size={16} style={{ color: '#94a3b8' }} />
                      <span style={{ fontWeight: '500' }}>
                        {law.stats.count > 0 ? `${law.stats.count} مادة` : '...'}
                      </span>
                    </div>
                    {law.stats.year && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px',
                        color: '#64748b'
                      }}>
                        <Clock size={16} style={{ color: '#94a3b8' }} />
                        <span style={{ fontWeight: '500' }}>{law.stats.year}</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <p style={{
                    fontSize: '14px',
                    color: '#475569',
                    lineHeight: '1.6',
                    marginBottom: '12px',
                    flex: 1,
                    minHeight: '48px'
                  }}>
                    {law.description}
                  </p>

                  {/* Action Button */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid #f1f5f9',
                    marginTop: 'auto'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(law.route);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: borderColor,
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 0',
                        fontFamily: 'inherit'
                      }}
                    >
                      <span>عرض التفاصيل</span>
                      <ArrowLeft size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap');
        body {
          font-family: 'Almarai', sans-serif;
        }
      `}</style>
    </Layout>
  );
};

export default withAuth(LawsPage);

