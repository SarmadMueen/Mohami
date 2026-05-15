import { ROLES } from './roles';

export function checkAuthorization(userRole, requiredRoles = []) {
  // If the user role is in the list of required roles, they have permission.
  if (requiredRoles.includes(userRole)) {
    return true;
  }
  return false;
}

// Default export for Next.js page requirement
export default function AuthorizationPage() {
  return null; // This is a utility file, not a page component
}