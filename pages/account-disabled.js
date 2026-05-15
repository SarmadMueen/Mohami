import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Ban, LogOut, Mail } from 'lucide-react';
import { supabase } from '../lib/initSupabase';

const AccountDisabledPage = () => {
    const router = useRouter();
    const [isSigningOut, setIsSigningOut] = React.useState(false);

    const handleSignOut = async () => {
        setIsSigningOut(true);
        try {
            await supabase.auth.signOut();
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
            setIsSigningOut(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            fontFamily: 'Cairo, sans-serif'
        }}>
            <Head>
                <title>حساب معطل - محامي برو</title>
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </Head>

            <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '48px',
                maxWidth: '480px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.25)',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px'
                }}>
                    <Ban size={40} style={{ color: 'white' }} />
                </div>

                <h1 style={{
                    fontSize: '28px',
                    fontWeight: '800',
                    color: '#1e293b',
                    margin: '0 0 12px'
                }}>
                    حساب معطل
                </h1>

                <p style={{
                    fontSize: '16px',
                    color: '#64748b',
                    lineHeight: '1.6',
                    margin: '0 0 32px'
                }}>
                    عذراً، تم تعطيل حسابك من قبل المسؤول. يرجى التواصل مع الدعم الفني للمزيد من المعلومات.
                </p>

                <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '32px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px'
                    }}>
                        <Mail size={20} style={{ color: '#dc2626' }} />
                        <span style={{
                            fontSize: '14px',
                            fontWeight: '700',
                            color: '#991b1b'
                        }}>
                            تواصل معنا
                        </span>
                    </div>
                    <a
                        href="mailto:support@example.com"
                        style={{
                            fontSize: '15px',
                            color: '#dc2626',
                            textDecoration: 'none',
                            fontWeight: '600'
                        }}
                    >
                        support@example.com
                    </a>
                </div>

                <button
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                        border: 'none',
                        borderRadius: '12px',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: '700',
                        cursor: isSigningOut ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        opacity: isSigningOut ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                        if (!isSigningOut) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(220, 38, 38, 0.3)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isSigningOut) {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }
                    }}
                >
                    <LogOut size={20} />
                    {isSigningOut ? 'جاري تسجيل الخروج...' : 'تسجيل الخروج'}
                </button>
            </div>
        </div>
    );
};

export default AccountDisabledPage;
