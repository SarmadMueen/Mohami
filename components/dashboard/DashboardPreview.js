import React, { useState } from 'react';
import {
    FaGavel,
    FaCheckCircle,
    FaCalendarAlt,
    FaSearch,
    FaFolder,
    FaChevronLeft,
    FaChevronRight,
    FaUser,
    FaBalanceScale,
    FaFile,
    FaDollarSign,
    FaChartLine,
    FaTasks,
    FaClock,
    FaExclamationTriangle,
    FaBook,
    FaBell,
} from "react-icons/fa";
import { FiPlus, FiChevronDown, FiChevronUp, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { Plus, UserPlus, Scale, FileText, Briefcase, Calendar, AlertCircle, Clock as ClockIcon } from "lucide-react";
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DashboardPreview = () => {
    // Mock Data
    const stats = {
        totalCases: 125,
        activeCases: 45,
        completedCases: 72,
        pendingCases: 8,
        overdueCases: 3,
        todaySessions: 2,
        upcomingSessions: 5,
    };

    const caseStatusData = {
        total: 125,
        statusCounts: {
            'قيد العمل': 45,
            'مكتملة': 72,
            'قيد النظر': 8,
        }
    };

    const fileDistributionData = {
        'مدني': 40,
        'جنائي': 25,
        'شرعي': 30,
        'تجارية': 15,
        'إداري': 10,
        'عمل': 5
    };

    const totalCasesForChart = 125;

    // Colors
    const caseStateColors = {
        'قيد العمل': '#3B82F6',
        'مكتملة': '#10B981',
        'قيد النظر': '#F59E0B',
    };

    const caseTypeColors = {
        'مدني': '#3B82F6',
        'جنائي': '#EF4444',
        'شرعي': '#10B981',
        'تجارية': '#F59E0B',
        'إداري': '#8B5CF6',
        'عمل': '#EC4899',
    };

    // Helper Functions
    const getDonutChartGradient = (statusCounts, colors) => {
        const total = Object.values(statusCounts).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
        if (total === 0) return 'conic-gradient(#E2E8F0 0deg 360deg)';

        let currentAngle = 0;
        const segments = [];
        const entries = Object.entries(statusCounts)
            .filter(([key, value]) => value > 0)
            .sort(([, a], [, b]) => b - a);

        entries.forEach(([key, value], index) => {
            const percentage = (value / total) * 100;
            let angle = (percentage / 100) * 360;
            let color = colors[key] || '#ccc';

            const startAngle = currentAngle;
            let endAngle = currentAngle + angle;
            if (index === entries.length - 1) endAngle = 360;

            if (index === 0) {
                segments.push(`${color} 0deg ${endAngle}deg`);
            } else {
                segments.push(`${color} ${startAngle}deg ${endAngle}deg`);
            }
            currentAngle = endAngle;
        });

        return `conic-gradient(${segments.join(', ')})`;
    };

    // Calendar Logic (Simplified)
    const weekDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const today = new Date();

    // Create a static week relative to today
    const getMockWeekDates = () => {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - today.getDay() + i);
            dates.push(d);
        }
        return dates;
    };

    const weekDates = getMockWeekDates();

    // Mock Sessions for the week
    const getMockSessionsForDate = (date) => {
        // Simulate sessions on Sunday and Wednesday
        const dayIndex = date.getDay();
        if (dayIndex === 0) return 2;
        if (dayIndex === 3) return 1;
        return 0;
    };

    // Financial Chart Data (Mock)
    const financialChartData = {
        labels: ['123/ب/2024', '456/ج/2024', '789/ش/2024', '101/م/2024', '202/ت/2024'],
        datasets: [
            {
                label: 'أتعاب الدعوى',
                data: [5000000, 3000000, 2500000, 4000000, 1500000],
                backgroundColor: '#8B5CF6',
                borderRadius: 6,
            },
            {
                label: 'المبالغ المستلمة',
                data: [2500000, 3000000, 1000000, 2000000, 1500000],
                backgroundColor: '#10B981',
                borderRadius: 6,
            },
            {
                label: 'المتبقي',
                data: [2500000, 0, 1500000, 2000000, 0],
                backgroundColor: '#F59E0B',
                borderRadius: 6,
            }
        ]
    };

    const financialChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', align: 'end', labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle' } },
        },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { borderDash: [2, 2] } }
        }
    };

    return (
        <div className="dashboard-preview" style={{ direction: 'rtl', fontFamily: "'Cairo', sans-serif", width: '100%', padding: '24px', background: '#F8FAFC', borderRadius: '24px', border: '1px solid #E2E8F0' }}>

            {/* Quick Actions Bar Imitation */}
            <div className="quick-actions-bar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                    <input type="text" placeholder="البحث في القضايا، الموكلين..." style={{ width: '100%', padding: '12px 40px 12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', outline: 'none' }} disabled />
                    <FaSearch style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', border: 'none', padding: '10px 16px', borderRadius: '12px', color: 'white', cursor: 'default', fontWeight: '700', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
                        <Briefcase size={18} /> <span>قضية جديدة</span>
                    </button>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none', padding: '10px 16px', borderRadius: '12px', color: 'white', cursor: 'default', fontWeight: '700', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}>
                        <UserPlus size={18} /> <span>موكل جديد</span>
                    </button>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', border: 'none', padding: '10px 16px', borderRadius: '12px', color: 'white', cursor: 'default', fontWeight: '700', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
                        <BookOpen size={18} /> <span>القوانين العراقية</span>
                    </button>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#E5E7EB', border: 'none', padding: '10px 16px', borderRadius: '12px', color: '#374151', cursor: 'default', fontWeight: '700', boxShadow: '0 4px 12px rgba(229, 231, 235, 0.5)' }}>
                        <Plus size={18} /> <span>محامي جديد</span>
                    </button>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#E5E7EB', border: 'none', padding: '10px 16px', borderRadius: '12px', color: '#374151', cursor: 'default', fontWeight: '700', boxShadow: '0 4px 12px rgba(229, 231, 235, 0.5)' }}>
                        <Sparkles size={18} /> <span>قرارات تمييزية</span>
                    </button>
                </div>
            </div>

            <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>

                {/* Left Sidebar */}
                <div className="dashboard-column-left" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Case Status */}
                    <div className="dashboard-card" style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #F1F5F9' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#0F172A' }}>حالة الدعاوي</h3>
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', maxWidth: '160px', margin: '0 auto 20px' }}>
                            <div style={{
                                width: '100%', height: '100%', borderRadius: '50%',
                                background: getDonutChartGradient(caseStatusData.statusCounts, caseStateColors),
                                position: 'relative'
                            }}>
                                <div style={{ position: 'absolute', inset: '15%', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0F172A' }}>{caseStatusData.total}</span>
                                    <span style={{ fontSize: '12px', color: '#64748B' }}>إجمالي</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {Object.entries(caseStatusData.statusCounts).map(([status, count]) => (
                                <div key={status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: caseStateColors[status] }}></div>
                                        <span style={{ color: '#475569' }}>{status}</span>
                                    </div>
                                    <span style={{ fontWeight: 'bold', color: '#0F172A' }}>{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Case Distribution */}
                    <div className="dashboard-card" style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #F1F5F9' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#0F172A' }}>توزيع الدعاوي</h3>
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', maxWidth: '140px', margin: '0 auto 20px' }}>
                            <div style={{
                                width: '100%', height: '100%', borderRadius: '50%',
                                background: getDonutChartGradient(fileDistributionData, caseTypeColors),
                                position: 'relative'
                            }}>
                                <div style={{ position: 'absolute', inset: '20%', background: 'white', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#0F172A' }}>{totalCasesForChart}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                            {Object.entries(fileDistributionData).slice(0, 4).map(([type, count]) => (
                                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: caseTypeColors[type] || '#ccc' }}></div>
                                    <span style={{ color: '#64748B' }}>{type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Center Panel */}
                <div className="dashboard-column-center" style={{ gridColumn: 'span 10', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Agenda */}
                    <div className="dashboard-card" style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #F1F5F9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FaCalendarAlt className="text-blue-600" size={20} />
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0F172A' }}>التقويم الشهري</h2>
                            </div>
                        </div>

                        {/* Weekly Strip */}
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
                            {weekDates.map((date, idx) => {
                                const dayName = weekDays[date.getDay()];
                                const sessionCount = getMockSessionsForDate(date);
                                const isToday = date.toDateString() === today.toDateString();

                                return (
                                    <div key={idx} style={{
                                        flex: 1,
                                        minWidth: '80px',
                                        background: isToday ? '#EFF6FF' : 'white',
                                        border: isToday ? '1px solid #3B82F6' : (sessionCount > 0 ? '1px solid #E2E8F0' : '1px solid #F1F5F9'),
                                        borderRadius: '16px',
                                        padding: '16px 8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '8px',
                                        position: 'relative'
                                    }}>
                                        <span style={{ fontSize: '13px', color: isToday ? '#1E40AF' : '#64748B', fontWeight: isToday ? 'bold' : 'normal' }}>{dayName}</span>
                                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#0F172A' }}>{date.getDate()}</span>
                                        {sessionCount > 0 && (
                                            <div style={{
                                                marginTop: '4px',
                                                background: '#DBEAFE',
                                                color: '#1E40AF',
                                                fontSize: '10px',
                                                padding: '2px 8px',
                                                borderRadius: '99px',
                                                fontWeight: 'bold'
                                            }}>
                                                {sessionCount} جلسة
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Calendar Rows Mock */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '12px' }}>
                            {/* Mock Session Item */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', borderRight: '4px solid #3B82F6' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px', borderLeft: '1px solid #E2E8F0' }}>
                                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }}>09:00</span>
                                    <span style={{ fontSize: '12px', color: '#64748B' }}>ص</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ background: '#DBEAFE', color: '#1E40AF', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>جلسة مرافعة</span>
                                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0F172A' }}>دعوى رقم 123/ب/2024</span>
                                    </div>
                                    <p style={{ fontSize: '13px', color: '#64748B' }}>شركة النور للمقاولات ضد وزارة الإعمار</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>AA</div>
                                </div>
                            </div>

                            {/* Mock Task Item */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: '#F8FAFC', borderRadius: '12px', borderRight: '4px solid #10B981' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px', borderLeft: '1px solid #E2E8F0' }}>
                                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0F172A' }}>11:30</span>
                                    <span style={{ fontSize: '12px', color: '#64748B' }}>ص</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}>مهمة</span>
                                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0F172A' }}>إعداد لائحة تمييزية</span>
                                    </div>
                                    <p style={{ fontSize: '13px', color: '#64748B' }}>موعد نهائي لتقديم اللائحة في قضية الورثة</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Chart */}
                    <div className="dashboard-card" style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #F1F5F9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FaChartLine className="text-purple-600" size={20} />
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0F172A' }}>الأداء المالي</h2>
                            </div>
                        </div>
                        <div style={{ height: '300px' }}>
                            <Bar data={financialChartData} options={financialChartOptions} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPreview;
