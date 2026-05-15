import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../../lib/initSupabase';
import { useSubscription } from '../../context/SubscriptionContext';
import { CheckCircle, ArrowLeft, RefreshCw, Shield } from 'lucide-react';
import { useRouter } from 'next/router';

const BillingSuccessPage = () => {
  const { 
    isTrialActive, 
    daysRemaining, 
    isSubscribed, 
    loading: subLoading, 
    subscription,
    planName: subPlanName,
    refresh 
  } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const router = useRouter();

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const currentSession = supabase.auth.session();
      if (currentSession) {
        await fetch('/api/payments/verify-success', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
        });
      }
      await refresh();
      setVerified(true);
    } catch (e) {
      console.error('Verify failed', e);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToApp = () => {
    // Try deep link back to the app
    const appUrl = 'mohamipro://settings/license';
    window.location.href = appUrl;
  };

  const handleViewLicense = () => {
    router.push('/settings/license');
  };

  const expiryDate = subscription?.current_period_end 
    ? new Date(subscription.current_period_end.replace(' ', 'T')).toLocaleDateString('ar-IQ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

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
          <RefreshCw size={32} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: '18px', color: '#64748b', marginTop: '16px' }}>جاري التحقق من الدفع...</div>
        </div>
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e5f4ff 100%)',
      fontFamily: "'Cairo', 'Almarai', sans-serif",
      direction: 'rtl',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Head>
        <title>تم الدفع بنجاح — محامي برو</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ 
        maxWidth: '500px', 
        width: '100%',
        background: 'white', 
        borderRadius: '20px', 
        padding: '40px 32px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        border: '1px solid #E2E8F0',
        textAlign: 'center'
      }}>
        {/* Success Icon */}
        <div style={{ 
          width: '80px', 
          height: '80px', 
          background: '#dcfce7', 
          borderRadius: '50%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 24px auto'
        }}>
          <CheckCircle size={48} color="#16a34a" />
        </div>

        {/* Success Message */}
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '800', 
          color: '#0F172A', 
          margin: '0 0 12px 0' 
        }}>
          تم الدفع بنجاح
        </h1>

        <p style={{ 
          fontSize: '16px', 
          color: '#64748B', 
          margin: '0 0 32px 0',
          lineHeight: '1.6'
        }}>
          تم تجديد اشتراكك بنجاح
        </p>

        {/* Plan Details */}
        {verified && subscription && (
          <div style={{ 
            background: '#F8FAFC', 
            borderRadius: '12px', 
            padding: '20px', 
            marginBottom: '32px',
            border: '1px solid #E2E8F0'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '14px', color: '#64748B' }}>الباقة:</span>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginTop: '4px' }}>
                {subPlanName}
              </div>
            </div>

            {expiryDate && (
              <div>
                <span style={{ fontSize: '14px', color: '#64748B' }}>تنتهي في:</span>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#0F172A', marginTop: '4px' }}>
                  {expiryDate}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleReturnToApp}
            style={{
              background: '#2563EB',
              color: 'white',
              padding: '14px 24px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%'
            }}
          >
            <ArrowLeft size={20} />
            العودة للتطبيق
          </button>

          <button
            onClick={handleViewLicense}
            style={{
              background: '#F8FAFC',
              color: '#475569',
              padding: '14px 24px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%'
            }}
          >
            <Shield size={20} />
            عرض الرخصة
          </button>
        </div>

        {/* Support Link */}
        <div style={{ marginTop: '24px' }}>
          <a
            href="mailto:support@mohamipro.com"
            style={{
              fontSize: '14px',
              color: '#64748B',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Shield size={16} />
            تواصل مع الدعم الفني
          </a>
        </div>
      </div>
    </div>
  );
};

export default BillingSuccessPage;
