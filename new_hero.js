{/* Databricks Inspired Hero Section */ }
<section className="hero-section" style={{
    position: 'relative',
    background: '#ffffff',
    padding: '120px 0 80px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    minHeight: '85vh',
}}>
    {/* Subtle Dot Pattern floating in the background */}
    <div className="dot-pattern-overlay" style={{
        position: 'absolute',
        top: '50%',
        right: '45%',
        width: '300px',
        height: '400px',
        transform: 'translateY(-50%)',
        backgroundImage: 'radial-gradient(#cbd5e1 2px, transparent 2px)',
        backgroundSize: '20px 20px',
        opacity: 0.6,
        zIndex: 1
    }}></div>

    <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0 24px',
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '80px',
        flexWrap: 'wrap',
        width: '100%',
    }}>

        {/* Text Content */}
        <div style={{ flex: '1 1 500px', maxWidth: '600px', textAlign: 'right', direction: 'rtl' }}>
            <h1 style={{
                fontFamily: "'Cairo', sans-serif",
                fontSize: 'clamp(38px, 4.5vw, 68px)',
                fontWeight: '900',
                color: '#0f172a', /* Slate 900 */
                lineHeight: '1.2',
                letterSpacing: '-0.02em',
                marginBottom: '16px',
            }}>
                انقل مكتبك للمستقبل.
                <br />
                <span style={{ color: '#e03124' }}>
                    ابدأ مع محامي برو.
                </span>
            </h1>

            <p style={{
                fontFamily: "'Cairo', sans-serif",
                fontSize: 'clamp(18px, 1.5vw, 24px)',
                color: '#475569',
                lineHeight: '1.6',
                marginBottom: '40px',
                fontWeight: '500',
                maxWidth: '95%'
            }}>
                منصة سحابية متكاملة صُممت لتنظيم وإدارة كافة مراحل الدعاوى ومتابعة المهام، الجلسات، والمالية بدقة وأمان.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', direction: 'rtl' }}>
                <button onClick={handleGetStarted} style={{
                    background: '#e03124',
                    color: 'white',
                    padding: '16px 36px',
                    borderRadius: '4px',
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: '18px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    minWidth: '200px',
                    textAlign: 'center'
                }}
                    onMouseOver={(e) => e.target.style.background = '#c81b10'}
                    onMouseOut={(e) => e.target.style.background = '#e03124'}>
                    استكشف المنتج
                </button>
                <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} style={{
                    background: '#1e293b',
                    color: 'white',
                    padding: '16px 36px',
                    borderRadius: '4px',
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: '18px',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    minWidth: '200px',
                    textAlign: 'center'
                }}
                    onMouseOver={(e) => e.target.style.background = '#0f172a'}
                    onMouseOut={(e) => e.target.style.background = '#1e293b'}>
                    رؤية العرض
                </button>
            </div>
        </div>

        {/* Dashboard Mockup */}
        <div style={{ flex: '1 1 500px', position: 'relative' }}>
            <div style={{
                position: 'absolute',
                top: '-5%',
                right: '-5%',
                bottom: '-5%',
                left: '-15%',
                background: '#f8fafc',
                borderRadius: '16px',
                zIndex: 0
            }}></div>

            <div style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(229, 231, 235, 0.8)',
                background: 'white',
                zIndex: 2,
            }}>
                <img
                    src="/dashboard.png"
                    alt="لوحة التحكم"
                    style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block',
                    }}
                    onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                    }}
                />

                <div style={{
                    display: 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    aspectRatio: '16/9',
                    background: 'radial-gradient(circle, #e2e8f0 1.5px, transparent 1.5px)',
                    backgroundSize: '24px 24px',
                    color: '#94a3b8',
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: '18px',
                    fontWeight: '700',
                    position: 'relative',
                    backgroundColor: '#f8fafc'
                }}>
                    صورة لوحة التحكم (/dashboard.png)
                </div>
            </div>
        </div>

    </div>
</section>
