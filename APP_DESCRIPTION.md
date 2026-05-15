# Mohami Pro- Law Firm Management System
## Comprehensive Application Description

---

## **Application Overview**

**Mohami Pro** is a comprehensive, cloud-based law firm management system designed specifically for Iraqi legal practices. Built with Next.js and Supabase, it provides a complete solution for managing legal cases, clients, documents, finances, and team collaboration within a single integrated platform.

---

## **Core Aim & Mission**

The primary aim of Mohami Pro is to **digitize and streamline all aspects of law firm operations**, enabling legal professionals to:
- Manage cases efficiently from initiation to completion
- Maintain comprehensive client relationships
- Generate legal documents automatically from templates
- Track financial transactions and generate reports
- Coordinate team activities and manage permissions
- Ensure compliance and maintain organized records

---

## **Primary Objectives**

### 1. **Case Management Excellence**
- Track all legal cases with detailed information (case type, court, status, dates)
- Monitor case progress through multiple stages
- Manage case-related sessions and court appearances
- Link cases to clients, lawyers, and documents
- Generate case reports and statements

### 2. **Client Relationship Management**
- Maintain comprehensive client databases
- Track client contracts and power of attorney documents
- Manage client communications and updates
- Organize client files and attachments
- Generate client reports

### 3. **Document Automation**
- Create and manage legal document templates
- Generate documents automatically with variable substitution
- Support Arabic and English document generation
- Export documents in multiple formats (PDF, Word, etc.)
- Maintain a template library for common legal documents

### 4. **Financial Management**
- Track payments received from clients
- Record expenses and fees
- Generate invoices and billing statements
- Create financial reports and summaries
- Monitor accounting by case, client, or time period

### 5. **Team Collaboration & Access Control**
- Manage multiple user roles (Admin, Lawyer, Staff)
- Control permissions for different user categories
- Assign cases to specific lawyers
- Track individual lawyer performance
- Maintain user accounts and profiles

### 6. **Calendar & Scheduling**
- Manage court sessions and appointments
- Track upcoming sessions and deadlines
- View calendar in multiple formats (month, week, day)
- Set reminders for important dates
- Integrate with Google Calendar

---

## **Core Functions & Features**

### **1. Dashboard & Analytics**
- **Quick Overview**: Real-time statistics on cases, clients, sessions, and finances
- **Weekly Sessions View**: Visual calendar showing sessions for the current week
- **Case Status Distribution**: Donut charts showing case status breakdown
- **Case Type Distribution**: Visualization of cases by type (دعاوى التحقيق، دعاوى الجنح، دعاوى الجنايات)
- **Quick Actions**: Fast access to create new cases, clients, sessions, invoices, and lawyers
- **Search Functionality**: Global search across cases, clients, and sessions

### **2. Case Management Module**
- **Case Creation & Editing**: Add new cases with comprehensive details
- **Case Details Page**: Complete case information including:
  - Case number, type, and classification
  - Court information and addresses
  - Client information
  - Assigned lawyers
  - Case status and progress
  - Related sessions
  - Case updates and notes
  - Actions and procedures
  - Financial transactions
  - Document attachments
- **Case Filtering & Search**: Filter by status, type, date, governorate, assigned user, client group
- **Case Reports**: Generate detailed case statements and reports
- **Case Actions Feed**: Track all actions taken on cases
- **Case Updates Feed**: Monitor case progress and updates

### **3. Client Management Module**
- **Client Database**: Comprehensive client information management
- **Client Types**: Support for individual clients, companies, and organizations
- **Client Information**: Store contact details, addresses, identification numbers
- **Contracts Management**: Track client contracts with dates, amounts, and documents
- **Power of Attorney (وكالات)**: Manage power of attorney documents
- **Client Attachments**: Organize client files in folders (docs, main, session_register)
- **Client Reports**: Generate client-related reports
- **Client Search & Filtering**: Advanced search and filtering capabilities

### **4. Sessions Management**
- **Session Scheduling**: Create and manage court sessions
- **Session Details**: Track session dates, times, locations, and details
- **Next Session Planning**: Schedule and track upcoming sessions
- **Session Filtering**: View sessions by today, upcoming, this week, or all
- **Session Statistics**: Track session counts and schedules
- **Session Calendar Integration**: View sessions in calendar format

### **5. Document Templates & Generation**
- **Template Library**: Maintain a library of legal document templates
- **Template Editor**: Rich text editor with Arabic support for creating/editing templates
- **Variable System**: Use variables in templates that auto-populate from case/client data
- **Document Generation**: Generate documents automatically from templates
- **Multiple Formats**: Export documents as PDF, Word, or HTML
- **Template Categories**: Organize templates by type (contracts, power of attorney, etc.)

### **6. Accounting & Financial Management**
- **Payment Tracking**: Record payments received from clients
- **Expense Management**: Track expenses and fees
- **Invoice Generation**: Create and manage invoices
- **Financial Reports**: Generate comprehensive financial reports
- **Accounting Summary**: Overview of financial status
- **Case Statements**: Financial statements per case
- **Client Statements**: Financial statements per client
- **Reports**: Generate accounting reports by various criteria

### **7. User & Permission Management**
- **User Accounts**: Create and manage user accounts for lawyers and staff
- **Role-Based Access Control**: Different permission levels (Admin, Lawyer categories)
- **Permission Profiles**: Define what each user role can do:
  - Add/edit/delete cases
  - View clients
  - Edit templates
  - Add lawyers
  - View settings
- **User Settings**: Manage user information, passwords, and preferences
- **My Account**: Personal dashboard showing user's cases, sessions, updates, notes, actions

### **8. Settings & Configuration**
- **General Settings**: Office information, logo, header, address
- **System Values**: Manage fixed system values (court names, case statuses, etc.)
- **User Settings**: Manage users and their permissions
- **Access Control**: Configure permission profiles for different user roles
- **Office Branding**: Customize office logo and information

### **9. Calendar & Scheduling**
- **Monthly View**: View all events in monthly calendar format
- **Week View**: Weekly calendar view
- **Day View**: Detailed daily schedule
- **Event Types**: Sessions, reminders, tasks
- **Google Calendar Integration**: Sync with Google Calendar
- **Event Filtering**: Filter events by type or user

### **10. Reports & Analytics**
- **Case Reports**: Detailed case reports with filtering options
- **Client Reports**: Comprehensive client reports
- **Accounting Reports**: Financial reports and summaries
- **Custom Reports**: Generate reports based on various criteria
- **Data Visualization**: Charts and graphs for data analysis

---

## **Technical Architecture**

### **Technology Stack**
- **Frontend**: Next.js 12.3.4, React 18.3.1
- **Backend**: Supabase (PostgreSQL database)
- **Authentication**: Supabase Auth
- **Styling**: CSS Modules, styled-jsx, Bootstrap 5.3.1
- **UI Components**: Material-UI, React Icons, Lucide React
- **Document Generation**: DocxTemplater, React-PDF, PDF-lib
- **Charts**: Chart.js, React-Chartjs-2
- **Date Handling**: date-fns, React-DatePicker

### **Database Structure**
- **Cases Table**: Stores all case information
- **Clients Table**: Client information and details
- **Sessions Table**: Court sessions and appointments
- **Users & User Metadata**: User accounts and roles
- **Templates Table**: Document templates
- **Accounting Tables**: Payments, expenses, invoices
- **Permission Profiles**: Role-based access control

### **Key Features**
- **RTL Support**: Full right-to-left layout for Arabic
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Live data synchronization
- **File Management**: Upload and organize attachments
- **Search & Filter**: Advanced search across all modules
- **Export Capabilities**: Export data and documents

---

## **User Roles & Permissions**

### **Admin (الفئة 1)**
- Full system access
- Manage all cases, clients, and users
- Configure system settings
- View all reports and analytics
- Manage permissions

### **Lawyer Categories (Various)**
- View and manage assigned cases
- Access client information
- Create sessions and updates
- Generate documents
- View personal reports

### **Staff**
- Limited access based on permissions
- View assigned cases
- Basic data entry
- View reports (if permitted)

---

## **Brand Identity Elements**

### **Visual Style**
- **Primary Color**: Blue (#3B82F6, #2563EB) - Trust, professionalism
- **Success Color**: Green (#10B981) - Positive outcomes, completion
- **Warning Color**: Orange (#F59E0B) - Pending items, attention needed
- **Danger Color**: Red (#EF4444) - Overdue items, alerts
- **Background**: Light gray-blue (#F1F5F9) - Clean, modern
- **Cards**: White (#FFFFFF) with subtle borders (#E2E8F0)

### **Typography**
- **Primary Font**: Cairo (Arabic), Almarai (Arabic)
- **Font Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **RTL Support**: Full right-to-left text layout

### **Design Principles**
- **Clean & Modern**: Minimalist design with focus on functionality
- **Professional**: Business-appropriate aesthetic
- **Data-Dense**: Efficient use of space for information display
- **Card-Based**: Information organized in cards for clarity
- **Consistent Spacing**: 8px spacing system throughout

---

## **Target Users**

1. **Law Firm Administrators**: Manage entire firm operations
2. **Lawyers**: Handle cases, clients, and documents
3. **Legal Assistants**: Support lawyers with data entry and organization
4. **Accounting Staff**: Manage financial transactions and reports
5. **Office Managers**: Oversee operations and settings

---

## **Key Differentiators**

1. **Arabic-First Design**: Built specifically for Arabic-speaking law firms
2. **Comprehensive Integration**: All modules work together seamlessly
3. **Document Automation**: Save time with automated document generation
4. **Role-Based Security**: Granular permission control
5. **Real-Time Collaboration**: Multiple users can work simultaneously
6. **Cloud-Based**: Access from anywhere, automatic backups
7. **Scalable**: Supports firms of all sizes

---

## **Future Enhancement Opportunities**

- Mobile app development
- Advanced AI features for document analysis
- Integration with court systems
- Multi-language support expansion
- Advanced analytics and business intelligence
- Client portal for self-service
- Automated reminder system
- Video conferencing integration

---

This comprehensive system serves as the central nervous system for modern law firms, enabling them to operate more efficiently, maintain better client relationships, and make data-driven decisions.



