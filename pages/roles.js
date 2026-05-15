export const ROLES = {
  SUPER_ADMIN: 'super_admin',  // System owner only - can manage all trial requests
  CATEGORY_1: 'الفئة 1',        // Firm Admin - law firm owner
  CATEGORY_2: 'الفئة 2',        // Lawyer - works under a firm
  CLIENT: 'client',
};

// Default export for Next.js page requirement
export default function RolesPage() {
  return null; // This is a constants file, not a page component
}
