---
description: Repository Information Overview
alwaysApply: true
---

# Smart Law Application Information

## Summary
A Next.js application for law firms that provides case management, client management, document generation, and accounting features. The application uses Supabase for backend services and authentication.

## Structure
- **pages/**: Contains all application routes and page components
  - **api/**: API routes for backend functionality
  - **accounting/**: Accounting and financial management features
  - **cases/**: Case management components and pages
  - **client/**: Client management components and pages
  - **templates/**: Document template management
- **components/**: Reusable React components
- **lib/**: Utility functions and initialization code
- **public/**: Static assets and document templates
- **styles/**: CSS and styling files

## Language & Runtime
**Language**: JavaScript (React/Next.js)
**Version**: Next.js 12.3.4
**Build System**: Next.js build system
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- **@supabase/supabase-js**: ^1.35.7 - Backend database and authentication
- **react**: ^18.3.1 - UI framework
- **next**: ^12.3.4 - React framework
- **docxtemplater**: ^3.38.0 - Document generation
- **bootstrap**: ^5.3.1 - UI components
- **@mui/material**: ^6.3.0 - Material UI components
- **chart.js**: ^4.4.7 - Data visualization
- **react-pdf/renderer**: ^3.1.12 - PDF generation

**Development Dependencies**:
- **eslint**: 7.32.0 - Code linting
- **eslint-config-next**: 12.0.4 - Next.js ESLint configuration
- **file-loader**: ^6.2.0 - Webpack file loading

## Build & Installation
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Database Configuration
**Type**: Supabase (PostgreSQL)
**Connection**: Environment variables for Supabase URL and anonymous key
**Authentication**: Supabase authentication

## Main Files
**Entry Point**: pages/_app.js
**API Routes**: pages/api/
**Environment**: .env.local (contains Supabase credentials)
**Styling**: TailwindCSS (tailwind.config.js)

## Features
- **Case Management**: Track legal cases and their progress
- **Client Management**: Manage client information and relationships
- **Document Generation**: Create legal documents from templates
- **Accounting**: Track payments, expenses, and generate financial reports
- **User Management**: Different roles for lawyers and staff