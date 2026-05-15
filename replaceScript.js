const fs = require('fs');
let c = fs.readFileSync('pages/index.js', 'utf8');

// The exact string in the file (normalized to avoid \r\n issues if needed, but we'll try straight reading)
const targetH1 = `            <h1 style={{
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
            </h1>`;

let newH1 = `            <h1 style={{
                fontFamily: "'Cairo', sans-serif",
                fontSize: 'clamp(38px, 4.5vw, 68px)',
                fontWeight: '900',
                color: '#0f172a', /* Slate 900 */
                lineHeight: '1.2',
                letterSpacing: '-0.02em',
                marginBottom: '16px',
            }}>
                الحل الرقمي المتكامل لإدارة
                <br />
                <span className="rotating-text-wrapper" style={{ color: '#2563EB', display: 'inline-flex', height: '1.2em', overflow: 'hidden', verticalAlign: 'bottom' }}>
                    <div className="rotating-text-container">
                        <div className="rotating-item" style={{ height: '1.2em' }}>ملفات الدعاوى والقرارات</div>
                        <div className="rotating-item" style={{ height: '1.2em' }}>جدول الجلسات والمواعيد</div>
                        <div className="rotating-item" style={{ height: '1.2em' }}>بيانات الموكلين والمالية</div>
                        <div className="rotating-item" style={{ height: '1.2em' }}>ملفات الدعاوى والقرارات</div>
                    </div>
                </span>
            </h1>`;

const targetBtn = `            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', direction: 'rtl' }}>
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
                    onMouseOut={(e) => e.target.style.background = '#e03124'}>`;

const newBtn = `            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', direction: 'rtl' }}>
                <button onClick={handleGetStarted} style={{
                    background: '#2563EB',
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
                    onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
                    onMouseOut={(e) => e.target.style.background = '#2563EB'}>`;

// Normalize newline variations just in case
const norm = (s) => s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

c = norm(c);
const normTargetH1 = norm(targetH1);
const normNewH1 = norm(newH1);
const normTargetBtn = norm(targetBtn);
const normNewBtn = norm(newBtn);

if (!c.includes(normTargetH1)) {
    console.log("Could not find targetH1");
} else {
    c = c.replace(normTargetH1, normNewH1);
}

if (!c.includes(normTargetBtn)) {
    console.log("Could not find targetBtn");
} else {
    c = c.replace(normTargetBtn, normNewBtn);
}

fs.writeFileSync('pages/index.js', c);
console.log("Replacements complete");
