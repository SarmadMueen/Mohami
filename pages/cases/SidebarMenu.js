import React, { useState, useEffect } from 'react';

// Import the necessary icons
import {
    FileText, Paperclip, Users, Calendar, Scale, RefreshCw,
    CheckSquare, Bell, Calculator, DollarSign, FileCheck, StickyNote, Receipt, GitBranch, Link,
    ChevronLeft, ChevronRight, ChevronDown
} from "lucide-react";

// The SidebarMenu component now receives all handlers as props
const SidebarMenu = ({
    highlightedButton,
    handleCaseDetailsClick,
    handleAttachmentsClick,
    handleOpponentsClick,
    handleSessionsClick,
    handleActionsClick,
    handleUpdatesClick,
    handleCaseProgressClick,
    handleTasksClick,
    handleCourtDecisionClick,
    handleRemindersClick,
    handleAccountStatementClick,
    handleLawyerFeesClick,
    handleNotesClick,
    handleExpensesClick,
    handleRelatedCasesClick,
    isCollapsed,
    onToggleCollapse,
    mobileContentRef
}) => {
    const [isMobileView, setIsMobileView] = useState(false);

    useEffect(() => {
        const check = () => setIsMobileView(window.innerWidth <= 1024);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    // The menu data is now self-contained within the component
    const menuSections = [
        {
            title: "القائمة الرئيسية",
            items: [
                { id: "caseDetails", label: "تفاصيل الدعوى", icon: FileText, onClick: handleCaseDetailsClick, colorClass: "text-sky-500" },
                { id: "relatedCases", label: "دعاوى متصلة", icon: Link, onClick: handleRelatedCasesClick, colorClass: "text-sky-500" },
                { id: "attachments", label: "الملفات المرفقة", icon: Paperclip, onClick: handleAttachmentsClick, colorClass: "text-sky-500" },
                { id: "opponents", label: "الخصوم", icon: Users, onClick: handleOpponentsClick, colorClass: "text-sky-500" },
                { id: "notes", label: "الملاحظات", icon: StickyNote, onClick: handleNotesClick, colorClass: "text-sky-500" },
            ]
        },
        {
            title: "الإجراءات",
            items: [
                { id: "sessions", label: "الجلسات", icon: Calendar, onClick: handleSessionsClick, colorClass: "text-emerald-500" },
                { id: "actions", label: "الإجراءات القانونية", icon: Scale, onClick: handleActionsClick, colorClass: "text-emerald-500" },
                { id: "updates", label: "التحديثات", icon: RefreshCw, onClick: handleUpdatesClick, colorClass: "text-emerald-500" },
                { id: "caseProgress", label: "سير الدعوى", icon: GitBranch, onClick: handleCaseProgressClick, colorClass: "text-emerald-500" },
                { id: "jobTasks", label: "المهام الوظيفية", icon: CheckSquare, onClick: handleTasksClick, colorClass: "text-emerald-500" },
                { id: "courtDecision", label: "حكم المحكمة", icon: FileCheck, onClick: handleCourtDecisionClick, colorClass: "text-emerald-500" },
            ]
        },
        {
            title: "الحسابات والإدارة",
            items: [
                { id: "reminders", label: "تذكيراتي", icon: Bell, onClick: handleRemindersClick, colorClass: "text-violet-500" },
                { id: "lawyerFees", label: "أتعاب الدعوى", icon: DollarSign, onClick: handleLawyerFeesClick, colorClass: "text-violet-500" },
                { id: "expenses", label: "الرسوم", icon: Receipt, onClick: handleExpensesClick, colorClass: "text-violet-500" },
            ]
        }
    ];

    return (
        <>
            <div className={`sidebar-menu ${isCollapsed ? 'collapsed' : ''}`}>
                <button
                    className="toggle-collapse-btn"
                    onClick={onToggleCollapse}
                    title={isCollapsed ? "عرض القائمة" : "تصغير القائمة"}
                >
                    {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </button>
                <nav>
                    {menuSections.map((section) => (
                        <div key={section.title} className="menu-section">
                            {!isCollapsed && <h3 className="menu-section-title">{section.title}</h3>}
                            <div className="menu-items-container">
                                {section.items.map((item) => {
                                    const IconComponent = item.icon;
                                    const isActive = highlightedButton === item.id;
                                    return (
                                        <React.Fragment key={item.id}>
                                            <button
                                                className={`menu-item ${isActive ? 'active' : ''}`}
                                                onClick={item.onClick}
                                                title={item.label}
                                            >
                                                <div className="menu-item-content">
                                                    {IconComponent &&
                                                        <IconComponent className={`menu-item-icon ${!isActive ? item.colorClass : ''}`} size={isCollapsed ? 24 : 18} />
                                                    }
                                                    {!isCollapsed && <span>{item.label}</span>}
                                                </div>
                                                {item.count && <span className="menu-item-badge">{item.count}</span>}
                                                {/* Mobile: show chevron indicator for active item */}
                                                {isMobileView && isActive && (
                                                    <ChevronDown size={16} className="mobile-active-chevron" />
                                                )}
                                            </button>
                                            {/* Mobile accordion: render content portal target directly after active tab */}
                                            {isMobileView && isActive && (
                                                <div
                                                    className="mobile-tab-content-portal"
                                                    ref={mobileContentRef}
                                                />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>
            </div>

            <style jsx>{`
                /* --- Sidebar Styles --- */
                .sidebar-menu {
                    position: relative;
                    direction: rtl;
                    width: 280px;
                    background: linear-gradient(to bottom, #ffffff 0%, #f8fafc 100%);
                    border-right: 1px solid #e2e8f0;
                    padding: 10px 0 15px 0;
                    flex-shrink: 0;
                    z-index: 100;
                    overflow: visible; /* Ensure toggle button isn't clipped */
                    box-sizing: border-box;
                    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
                }

                .sidebar-menu.collapsed {
                    width: 80px;
                }

                .sidebar-menu nav {
                    height: 100%;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    scrollbar-width: none !important;
                    -ms-overflow-style: none !important;
                    padding-bottom: 30px;
                }

                .toggle-collapse-btn {
                    position: absolute;
                    top: 16px;
                    left: -20px;
                    width: 32px;
                    height: 32px;
                    background: #3b82f6;
                    border: 2px solid #ffffff;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 1000;
                    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3), 0 1px 3px rgba(0, 0, 0, 0.1);
                    color: #ffffff;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .toggle-collapse-btn:hover {
                    background: #2563eb;
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
                }

                .sidebar-menu.collapsed .menu-item {
                    justify-content: center;
                    padding: 14px 0;
                }

                .sidebar-menu.collapsed .menu-item-content {
                    justify-content: center;
                    gap: 0;
                }

                .sidebar-menu.collapsed .menu-item-icon {
                    width: 24px;
                    height: 24px;
                }

                .menu-section {
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 12px;
                    padding: 0 4px;
                }

                .menu-section:first-child {
                    margin-top: 0;
                    overflow: visible;
                }

                .menu-section-title {
                    padding: 12px 20px 10px 20px;
                    font-size: 12px;
                    font-weight: 600;
                    color: #64748b;
                    margin-bottom: 6px;
                    text-align: right;
                    font-family: 'Cairo', 'Almarai', sans-serif;
                    letter-spacing: 0.02em;
                    border-bottom: 1px solid #e2e8f0;
                }
                
                /* Make القائمة الرئيسية text stand out */
                .menu-section:first-child .menu-section-title {
                    color: #1e40af;
                    font-weight: 700;
                    font-size: 16px;
                    border-bottom: 2px solid #3b82f6;
                    padding: 6px 20px 10px 20px;
                    margin-bottom: 10px;
                    background: linear-gradient(to left, #eff6ff 0%, #f8fafc 100%);
                    letter-spacing: 0.01em;
                }

                .menu-items-container {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .menu-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    padding: 10px 20px;
                    text-align: right;
                    border-radius: 6px;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    background: transparent;
                    border: none;
                    border-right: 3px solid transparent;
                    cursor: pointer;
                    color: #000000;
                    position: relative;
                }
                
                .menu-section:first-child .menu-item {
                    margin: 0;
                    padding: 10px 20px;
                }

                .menu-item-content {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                    font-weight: 700;
                    font-family: 'Cairo', 'Almarai', sans-serif;
                    flex: 1;
                    letter-spacing: 0.01em;
                }
                
                /* Menu item text color */
                .menu-item span {
                    color: inherit;
                }

                .menu-item-icon {
                    width: 18px;
                    height: 18px;
                    flex-shrink: 0;
                    transition: color 0.2s ease;
                    stroke-width: 2;
                    color: #475569;
                }

                /* --- States --- */
                .menu-item.active {
                    background: linear-gradient(to left, #dbeafe 0%, #eff6ff 100%) !important;
                    color: #000000 !important;
                    font-weight: 700;
                    border-right: 3px solid #3b82f6 !important;
                    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.15);
                }

                .menu-item.active:hover,
                .menu-item.active:active {
                    background: linear-gradient(to left, #bfdbfe 0%, #dbeafe 100%) !important;
                    color: #000000 !important;
                    box-shadow: 0 3px 6px rgba(59, 130, 246, 0.2);
                }

                .menu-item.active:focus {
                    outline: none;
                }

                .menu-item:not(.active) {
                    color: #000000;
                }

                .menu-item:not(.active):hover {
                    background: linear-gradient(to left, #f8fafc 0%, #f1f5f9 100%);
                    color: #000000;
                    border-right: 3px solid #94a3b8;
                }

                .menu-item.active .menu-item-icon {
                    color: #3b82f6;
                }
                
                .menu-item:not(.active):hover .menu-item-icon {
                    color: #64748b;
                }

                .menu-item-badge {
                    background: #ef4444;
                    color: #ffffff;
                    font-size: 11px;
                    font-weight: 600;
                    padding: 2px 6px;
                    border-radius: 10px;
                    min-width: 18px;
                    text-align: center;
                    line-height: 1.4;
                }

                .menu-item.active .menu-item-badge {
                    background: rgba(255, 255, 255, 0.3);
                    color: #ffffff;
                }

                /* --- Icon Colors (non-active state) --- */
                :global(.menu-item-icon.text-sky-500),
                :global(.menu-item-icon.text-emerald-500),
                :global(.menu-item-icon.text-violet-500) { color: #475569; }

                /* Mobile chevron indicator - hidden on desktop */
                :global(.mobile-active-chevron) {
                    display: none;
                }

                /* Mobile portal target - hidden on desktop */
                .mobile-tab-content-portal {
                    display: none;
                }

                /* --- Mobile Accordion Layout --- */
                @media (max-width: 1024px) {
                    .sidebar-menu {
                        width: 100%;
                        height: auto;
                        padding: 8px 10px;
                        border-right: none;
                        border-bottom: none;
                        overflow-y: visible;
                        background: #ffffff;
                        box-shadow: none;
                    }

                    .toggle-collapse-btn {
                        display: none;
                    }

                    .sidebar-menu nav {
                        display: flex;
                        flex-direction: column;
                        flex-wrap: nowrap;
                        gap: 4px;
                        justify-content: flex-start;
                    }

                    .menu-section {
                        margin-bottom: 0;
                        padding: 0;
                        flex-direction: column;
                        flex-wrap: nowrap;
                        gap: 4px;
                        width: 100%;
                    }

                    .menu-section-title {
                        display: none; /* Hide headings on mobile */
                    }

                    .menu-items-container {
                        display: flex;
                        flex-direction: column;
                        flex-wrap: nowrap;
                        gap: 4px;
                        width: 100%;
                    }

                    .menu-item {
                        width: 100%;
                        flex: 0 0 auto;
                        padding: 14px 16px;
                        border-radius: 12px;
                        border-right: none !important; /* Remove active bar */
                        border: 1px solid #e2e8f0;
                        background: #ffffff;
                        margin: 0;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
                        transition: all 0.2s ease;
                    }

                    .menu-section:first-child .menu-item {
                        margin: 0;
                        padding: 14px 16px;
                    }

                    .menu-item.active {
                        border: 2px solid #3b82f6 !important;
                        border-radius: 12px 12px 0 0 !important;
                        margin-bottom: 0 !important;
                        background: linear-gradient(to left, #dbeafe 0%, #eff6ff 100%) !important;
                        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15) !important;
                    }

                    .menu-item-content {
                        gap: 12px;
                        font-size: 15px;
                        font-weight: 700;
                    }

                    .menu-item-icon {
                        width: 16px;
                        height: 16px;
                    }

                    /* Show chevron on mobile for active item */
                    :global(.mobile-active-chevron) {
                        display: block !important;
                        color: #3b82f6;
                        flex-shrink: 0;
                    }

                    /* Show portal target on mobile */
                    .mobile-tab-content-portal {
                        display: block !important;
                        width: 100%;
                        border: 2px solid #3b82f6;
                        border-top: none;
                        border-radius: 0 0 10px 10px;
                        background: #ffffff;
                        margin-top: -4px;
                        margin-bottom: 4px;
                        min-height: 100px;
                        overflow: hidden;
                    }
                }
            `}</style>
        </>
    );
};

export default SidebarMenu;
