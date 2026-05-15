# Dashboard Redesign Plan

## Overview
Redesign the dashboard to match the provided UI design with a clean, modern 3-column layout.

## Design Language (from attached image)
- **Color Scheme**: Light backgrounds (#F1F5F9, #FFFFFF), blue accents (#2563EB, #3B82F6)
- **Typography**: Clean, readable Arabic fonts (Cairo, Almarai)
- **Cards**: White cards with subtle shadows, rounded corners (8-12px)
- **Spacing**: Generous padding (16-20px), consistent gaps (12-16px)
- **Icons**: Consistent icon usage with colored backgrounds
- **Charts**: Donut charts with center values, clean legends

## 3-Column Layout Structure

### Column 1 (Left): Case Status & Distribution
1. **حالة الدعاوي (Case Status)**
   - Large donut chart showing case status breakdown
   - Center: Total cases count
   - Legend: Status items with colored dots and counts
   - Statistics below: Active, Resolved, Pending, Postponed cases

2. **توزيع الدعاوي (Case Distribution)**
   - Donut chart showing case type distribution
   - Center: Total cases
   - Legend: Case types with colored dots and counts

### Column 2 (Middle): Sessions & Work Schedule
1. **جلسات هذا الأسبوع (This Week's Sessions)**
   - Horizontal calendar display (Sunday to Saturday)
   - Each day shows: Day name, date, session count
   - Highlight current day
   - Date range display at top

2. **جدول الأعمال والمتابعة (Work and Follow-up Schedule)**
   - Calendar grid view (multiple weeks)
   - Show sessions, tasks, and reminders
   - Color-coded items:
     - Blue: Session reminders
     - Orange: Warning/overdue items
     - Red: Critical alerts
   - Navigation arrows for date range

### Column 3 (Right): Financial, Tasks & Appointments
1. **الوضع المالي للدعاوي (Financial Status of Cases)**
   - Financial summary cards:
     - Collected Fees (الأتعاب المحصلة)
     - Pending Amounts (المبالغ المعلقة)
     - Collection Rate (نسبة التحصيل) with progress bar
   - Clean card design with icons

2. **المهام اليومية (Daily Tasks)**
   - Header: Completion status (X/Y completed)
   - Task list with:
     - Task title
     - Time/date
     - Status indicator (completed/pending)
     - Icons for different task types

3. **مواعيد مهمة (Important Appointments)**
   - List of critical dates/events
   - Each item shows:
     - Icon (red/orange/blue based on urgency)
     - Title
     - Date/time (Today, Tomorrow, or specific date)
   - Color coding:
     - Red: Urgent/critical
     - Orange: Important
     - Blue: Normal

## Implementation Steps

1. **Restructure JSX Layout**
   - Create 3-column grid container
   - Move widgets to appropriate columns
   - Ensure proper ordering

2. **Enhance Widgets**
   - Improve case status widget with better donut chart
   - Add case distribution widget below case status
   - Enhance weekly sessions with horizontal calendar
   - Improve work schedule calendar
   - Add financial summary with collection rate
   - Enhance daily tasks with completion status
   - Create important appointments widget

3. **Apply Design Language**
   - Update card styles (white background, subtle shadows)
   - Apply consistent spacing and padding
   - Use blue accent colors
   - Improve typography
   - Add proper icon styling

4. **Add New Compatible Widgets**
   - Recent activity feed (if space allows)
   - Quick statistics cards
   - Any other relevant widgets based on app data

## Technical Details

### Data Sources
- Cases: `casesData` state
- Sessions: `sessionsData` state
- Financial: `casesFinancialData` state
- Tasks: `tasks` state
- Case types: `allCaseTypes` state
- Case states: `allCaseStates` state

### Key Functions to Use
- `getCaseStatusDistribution()` - Case status data
- `getFileDistributionData()` - Case type distribution
- `getWeekDates()` - Week dates
- `getSessionsForDate()` - Sessions for specific date
- `getCalendarViewDates()` - Calendar view dates
- `getDonutChartGradient()` - Donut chart gradients

### Styling Approach
- Use existing CSS-in-JS style tag
- Maintain responsive design
- Ensure RTL support
- Match color scheme from image






