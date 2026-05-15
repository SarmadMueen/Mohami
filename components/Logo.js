import React from 'react';

const Logo = ({ height = '40px', className = '', iconOnly = false, light = false }) => {
    // If iconOnly, we just return the scale icon (which is logo.png)
    // We wrap it in an SVG to maintain the "unified SVG logo" component structure
    // and allow for easy scaling/masking if needed.

    if (iconOnly) {
        return (
            <img
                src="/logo.png"
                alt="Mohami Pro"
                style={{ height, width: 'auto' }}
                className={className}
            />
        );
    }

    const titleColor = light ? '#FFFFFF' : '#1E3A8A';
    const subtitleColor = light ? 'rgba(255, 255, 255, 0.8)' : '#3B82F6';

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height }} className={className}>
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'center', whiteSpace: 'nowrap' }}>
                <span style={{ fontFamily: "'Tajawal', sans-serif", fontSize: '17px', fontWeight: '700', color: titleColor, lineHeight: '1.2', whiteSpace: 'nowrap' }}>محامي برو</span>
                <span style={{ fontFamily: "'Tajawal', sans-serif", fontSize: '12px', fontWeight: '500', color: subtitleColor, letterSpacing: '0.2px', whiteSpace: 'nowrap' }}>Mohami Pro</span>
            </div>
            <img src="/logo.png" alt="Mohami Pro" style={{ height: '100%', width: 'auto' }} />
        </div>
    );
};

export default Logo;
