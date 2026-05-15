# Company Manager Test Environment

This is an isolated test environment for dr.abd256@gmail.com to test a simplified company manager interface.

## ⚠️ IMPORTANT

- This is a TEST ENVIRONMENT ONLY
- Only accessible to dr.abd256@gmail.com
- Does NOT affect the existing desktop/mobile UI
- All changes are isolated to test routes

## Setup Instructions

### 1. Run Database Migration

Run the SQL migration in Supabase SQL Editor:

```sql
-- File: database/migrations/create_company_manager_test_tables.sql
```

This creates:
- `company_manager_preferences` table
- `lawyer_activity_metrics` table
- Additional columns in `cases` table
- Additional column in `user_metadata` table
- RLS policies for all new tables

### 2. Run Setup Script

```bash
node scripts/setup-company-manager-test.js
```

This will:
- Create/update the test account for dr.abd256@gmail.com
- Set up user metadata with company manager role
- Create default preferences

**Login Credentials:**
- Email: dr.abd256@gmail.com
- Password: Test@123456

## Access Routes

### Company Manager Interface
- URL: `/company-manager-test`
- Features:
  - Lawyer Management (add, view, deactivate lawyers)
  - Case Assignment (assign cases to lawyers, reassign)
  - Progress Tracking (view case status, sessions, notes)
  - Lawyer Activity Monitoring (metrics, completion rates)
  - Communication (message lawyers)
  - Settings (customize dashboard features)

### Lawyer Interface
- URL: `/lawyer-test`
- Features:
  - View assigned cases only
  - Update case status
  - Add progress notes
  - Cannot access other lawyers' cases
  - Cannot access admin functions

## Features

### Company Manager Capabilities
- ✅ Add lawyers to the system
- ✅ Create lawyer accounts linked to manager
- ✅ Assign cases to lawyers
- ✅ Reassign cases between lawyers
- ✅ Track case progress (status, sessions, documents, notes, timeline)
- ✅ Monitor lawyer activity (cases assigned, attendance, response time, completion rate)
- ✅ Communicate directly with lawyers
- ✅ Customize dashboard features via popup
- ✅ View client information (if enabled)
- ✅ View financial information (if enabled)

### Lawyer Capabilities
- ✅ View only cases assigned to them
- ✅ Update case status
- ✅ Add progress notes
- ✅ Upload documents to their cases
- ✅ Report progress
- ✅ Communicate with company manager
- ❌ Cannot access other lawyers' cases
- ❌ Cannot access company manager admin functions
- ❌ Cannot view financial information

## Security

- Email-based authentication check (only dr.abd256@gmail.com)
- RLS policies ensure data isolation
- Lawyers can only view/update their assigned cases
- Company managers can only view cases they assigned
- Test route clearly marked with warning banner

## File Structure

```
pages/
  company-manager-test/
    index.js (main dashboard)
    manage-lawyers.js (lawyer management)
    assign-case.js (case assignment)
    progress.js (progress tracking)
    lawyer-activity.js (activity monitoring)
    messages.js (communication)
    settings.js (customization)
  lawyer-test/
    index.js (lawyer's restricted interface)
  api/
    company-manager-test/
      create-lawyer.js (lawyer creation API)
database/migrations/
  create_company_manager_test_tables.sql
scripts/
  setup-company-manager-test.js
```

## Testing Checklist

- [ ] dr.abd256@gmail.com can login
- [ ] Access restricted to /company-manager-test only
- [ ] Customization popup appears on first visit
- [ ] Can add new lawyers to the system
- [ ] Lawyer accounts are linked to company manager
- [ ] Can assign cases to lawyers
- [ ] Can reassign cases between lawyers
- [ ] Progress tracking displays correctly
- [ ] Lawyer activity metrics calculate accurately
- [ ] Communication with lawyers works
- [ ] Lawyers can only view their assigned cases
- [ ] Lawyers can update case status and add notes
- [ ] Lawyers cannot access other lawyers' cases
- [ ] Lawyers cannot access company manager admin functions
- [ ] Existing desktop/mobile UI unaffected
- [ ] Regular users cannot access test route

## Isolation Verification

The test environment is completely isolated from the existing application:

1. **Separate Routes**: `/company-manager-test` and `/lawyer-test` are new routes
2. **Email-Based Access**: Only dr.abd256@gmail.com can access
3. **New Database Tables**: All new tables are separate from existing ones
4. **RLS Policies**: Strict policies prevent cross-access
5. **No Existing File Modifications**: Only new files were created
6. **Warning Banners**: Clear visual indicators this is a test environment

## Rollback Instructions

To remove the test environment:

1. Delete the test pages:
   - `pages/company-manager-test/`
   - `pages/lawyer-test/`
   - `pages/api/company-manager-test/`

2. Drop database tables:
```sql
DROP TABLE IF EXISTS company_manager_preferences;
DROP TABLE IF EXISTS lawyer_activity_metrics;
```

3. Remove columns:
```sql
ALTER TABLE cases DROP COLUMN IF EXISTS assigned_by_manager_id;
ALTER TABLE cases DROP COLUMN IF EXISTS manager_notes;
ALTER TABLE user_metadata DROP COLUMN IF EXISTS created_by_manager_id;
```

4. Delete test user in Supabase Auth

## Support

For issues or questions about the test environment, contact the development team.
