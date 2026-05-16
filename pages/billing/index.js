import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/initSupabase';
import { useSubscription } from '../../context/SubscriptionContext';
import { CreditCard, CheckCircle, AlertCircle, Clock, ExternalLink, Shield, Users, HardDrive, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';
import { checkStorageLimit } from '../../lib/storageUtils';

const BillingPage = () => {
  const { 
    isTrialActive, 
    daysRemaining, 
    isSubscribed, 
    isReadOnly, 
    loading: subLoading, 
    subscription,
    planName: subPlanName,
    refresh 
  } = useSubscription();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = supabase.auth.user();
      if (!currentUser) {
        // Redirect to login, preserving return URL
        router.push('/login?redirect=/billing');
        return;
      }
      
      setUser(currentUser);
      
      // Check if admin
      const { data: ownData } = await supabase
        .from('user_metadata')
        .select('admin_user_id')
        .eq('user_id', currentUser.id)
        .single();

      setIsAdmin(!ownData?.admin_user_id || ownData.admin_user_id === currentUser.id);

      // Fetch storage
      const targetUserId = (ownData?.admin_user_id && ownData.admin_user_id !== currentUser.id)
        ? ownData.admin_user_id
        : currentUser.id;
      const storage = await checkStorageLimit(targetUserId);
      if (storage && !storage.error) {
        setStorageData(storage);
      }
    } catch (error) {
      console.error('Auth error:', error);
      router.push('/login?redirect=/billing');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId, amount, currency) => {
    setCheckoutLoading(true);
    setErrorMessage(null);
    try {
      const currentSession = supabase.auth.session();
      if (!currentSession) {
        setErrorMessage('يرجى تسجيل الدخول أولاً.');
        return;
      }
      
      const res = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentSession.access_token}`
        },
        body: JSON.stringify({
          plan_id: planId,
          amount,
          currency
        })
      });
      
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        let detail = '';
        if (data.details && typeof data.details === 'object') {
          if (data.details.errors && data.details.errors.length > 0) {
            detail = data.details.errors.map(e => e.code || e.message).join(', ');
          } else {
            detail = data.details.message || JSON.stringify(data.details);
          }
        } else if (data.details) {
          detail = String(data.details);
        } else {
          detail = data.error || '';
        }
        setErrorMessage(`حدث خطأ أثناء إعداد رابط الدفع: ${detail}`);
      }
    } catch (err) {
      console.error('Payment fetch error:', err);
      setErrorMessage('خطأ في الاتصال بالخادم. يرجى المحاولة لاحقاً.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading || subLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e5f4ff 100%)',
        fontFamily: "'Cairo', 'Almarai', sans-serif",
        direction: 'rtl'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', color: '#64748b' }}>جاري تحميل البيانات...</div>
        </div>
      </div>
    );
  }

  const expiryDate = subscription?.current_period_end 
    ? new Date(subscription.current_period_end.replace(' ', 'T')).toLocaleDateString('ar-IQ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e5f4ff 100%)',
      fontFamily: "'Cairo', 'Almarai', sans-serif",
      direction: 'rtl',
      padding: '20px'
    }}>
      <Head>
        <title>إدارة الاشتراك — محامي برو</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '32px',
          paddingTop: '20px'
        }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '800', 
            color: '#0F172A',
            margin: '0 0 8px 0' 
          }}>
            محامي برو — إدارة الاشتراك
          </h1>
          <p style={{ 
            fontSize: '16px', 
            color: '#64748B', 
            margin: 0 
          }}>
            إدارة الباقة والتجديد والفوترة
          </p>
        </div>

        {/* License Details Card */}
        <div style={{ 
          background: 'white', 
          borderRadius: '16px', 
          padding: '24px', 
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          border: '1px solid #E2E8F0'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '700', 
            color: '#1E293B', 
            margin: '0 0 20px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Shield size={24} color="#2563EB" />
            تفاصيل الترخيص
          </h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '12px 0',
              borderBottom: '1px dashed #E2E8F0'
            }}>
              <span style={{ color: '#64748B', fontWeight: '600' }}>رمز الرخصة</span>
              <span style={{ color: '#0F172A', fontWeight: '700' }}>{user?.id?.slice(0, 8).toUpperCase()}</span>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '12px 0',
              borderBottom: '1px dashed #E2E8F0'
            }}>
              <span style={{ color: '#64748B', fontWeight: '600' }}>الباقة</span>
              <span style={{ 
                color: '#0F172A', 
                fontWeight: '700',
                background: '#F8FAFC',
                padding: '4px 12px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0'
              }}>{subPlanName}</span>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '12px 0',
              borderBottom: '1px dashed #E2E8F0'
            }}>
              <span style={{ color: '#64748B', fontWeight: '600' }}>نوع الرخصة</span>
              <span style={{ color: '#0F172A', fontWeight: '700' }}>{isTrialActive ? 'تجريبي' : 'اشتراك مدفوع'}</span>
            </div>

            {expiryDate && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '12px 0',
                borderBottom: '1px dashed #E2E8F0'
              }}>
                <span style={{ color: '#64748B', fontWeight: '600' }}>تاريخ الانتهاء</span>
                <span style={{ color: '#DC2626', fontWeight: '700' }}>{expiryDate}</span>
              </div>
            )}

            {storageData && (
              <>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '12px 0',
                  borderBottom: '1px dashed #E2E8F0'
                }}>
                  <span style={{ color: '#64748B', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={16} /> المستخدمين
                  </span>
                  <span style={{ color: '#0F172A', fontWeight: '700' }}>{storageData.userCount} مستخدم</span>
                </div>

                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '12px 0'
                }}>
                  <span style={{ color: '#64748B', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HardDrive size={16} /> المساحة
                  </span>
                  <span style={{ color: '#0F172A', fontWeight: '700' }}>{storageData.usedGB} GB / {storageData.limitGB} GB</span>
                </div>
              </>
            )}
          </div>
        </div>

        {errorMessage && (
          <div style={{ 
            background: '#FEF2F2', 
            color: '#991B1B', 
            padding: '16px', 
            borderRadius: '12px', 
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid #FECACA'
          }}>
            <AlertCircle size={20} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Pricing Cards */}
        {isAdmin && (
          <div>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#1E293B', 
              margin: '0 0 20px 0',
              textAlign: 'center'
            }}>
              تجديد / ترقية الباقة
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {/* Basic Plan */}
              <div
                onClick={() => !checkoutLoading && handleSubscribe('basic_12m', 240000, 'IQD')}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #E2E8F0',
                  cursor: checkoutLoading ? 'default' : 'pointer',
                  transition: 'all 0.25s ease',
                  opacity: checkoutLoading ? 0.6 : 1
                }}
              >
                <h3 style={{ fontSize: '18px', color: '#64748B', margin: '0 0 12px 0' }}>الأساسي</h3>
                <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px', fontWeight: 'bold' }}>حساب مستخدم واحد (مدير فقط)</p>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#94A3B8', textDecoration: 'line-through' }}>25,000 IQD / شهرياً</span>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '28px', fontWeight: '800', color: '#0F172A' }}>240,000</span>
                  <span style={{ fontSize: '14px', color: '#64748B' }}> IQD / سنوياً</span>
                </div>
                <div style={{ 
                  marginBottom: '16px', 
                  display: 'inline-block', 
                  background: '#dcfce7', 
                  color: '#16a34a', 
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontSize: '12px', 
                  fontWeight: '700' 
                }}>
                  وفّر 20%
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: '#475569' }}>
                  <li style={{ padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>سعة تخزين 10 GB</li>
                  <li style={{ padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>إدارة القضايا الأساسية</li>
                  <li style={{ padding: '6px 0' }}>إدارة مالية أساسية</li>
                </ul>
              </div>

              {/* Advanced Plan */}
              <div
                onClick={() => !checkoutLoading && handleSubscribe('advanced_12m', 336000, 'IQD')}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '2px solid #2563EB',
                  cursor: checkoutLoading ? 'default' : 'pointer',
                  transition: 'all 0.25s ease',
                  opacity: checkoutLoading ? 0.6 : 1,
                  position: 'relative',
                  boxShadow: '0 10px 15px -3px rgba(37,99,235,0.2)'
                }}
              >
                <div style={{ 
                  position: 'absolute', 
                  top: '-12px', 
                  left: '50%', 
                  transform: 'translateX(-50%)', 
                  background: '#2563EB', 
                  color: 'white', 
                  padding: '4px 16px', 
                  fontSize: '12px', 
                  fontWeight: '700', 
                  borderRadius: '20px' 
                }}>
                  الأكثر شيوعاً
                </div>
                <h3 style={{ fontSize: '18px', color: '#64748B', margin: '0 0 12px 0' }}>المتقدمة</h3>
                <p style={{ fontSize: '13px', color: '#2563EB', marginBottom: '16px', fontWeight: 'bold' }}>حتى 3 حسابات (1 مدير + 2 محامي)</p>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#94A3B8', textDecoration: 'line-through' }}>35,000 IQD / شهرياً</span>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '28px', fontWeight: '800', color: '#0F172A' }}>336,000</span>
                  <span style={{ fontSize: '14px', color: '#64748B' }}> IQD / سنوياً</span>
                </div>
                <div style={{ 
                  marginBottom: '16px', 
                  display: 'inline-block', 
                  background: '#dcfce7', 
                  color: '#16a34a', 
                  padding: '4px 12px', 
                  borderRadius: '20px', 
                  fontSize: '12px', 
                  fontWeight: '700' 
                }}>
                  وفّر 20%
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '14px', color: '#475569' }}>
                  <li style={{ padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>سعة تخزين 25 GB</li>
                  <li style={{ padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>إدارة قضايا متقدمة</li>
                  <li style={{ padding: '6px 0' }}>تقارير إحصائية كاملة</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {!isAdmin && (
          <div style={{ 
            background: '#F8FAFC', 
            padding: '24px', 
            borderRadius: '12px', 
            textAlign: 'center',
            border: '1px solid #E2E8F0'
          }}>
            <p style={{ 
              fontSize: '16px', 
              color: '#334155', 
              margin: 0,
              fontWeight: '600'
            }}>
              هذا الحساب تتم إدارته عبر حساب المدير الرئيسي
            </p>
          </div>
        )}

        {/* Footer Links */}
        <div style={{ 
          marginTop: '32px', 
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => window.open('mailto:support@mohamipro.com', '_blank')}
            style={{
              background: '#F8FAFC',
              color: '#475569',
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Shield size={18} />
            الدعم الفني
          </button>

          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              background: '#2563EB',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ArrowLeft size={18} />
            العودة للتطبيق
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;
