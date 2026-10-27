/**
 * Routing and Deep Linking Service for AWKUM ClassHub
 * Provides Student Portal deep link mapping, route validation, and Admin root URL invariants.
 */

export type StudentRoutePath =
  | '/home'
  | '/subjects'
  | '/classes'
  | '/schedule'
  | '/assignments'
  | '/attendance'
  | '/progress'
  | '/notifications'
  | '/profile';

export interface StudentRouteState {
  activeTab: 'home' | 'schedule' | 'classes' | 'assignments' | 'progress';
  showNotifications: boolean;
  showProfile: boolean;
}

export const VALID_STUDENT_ROUTES: Record<string, StudentRouteState> = {
  '/home': { activeTab: 'home', showNotifications: false, showProfile: false },
  '/': { activeTab: 'home', showNotifications: false, showProfile: false },
  '/subjects': { activeTab: 'classes', showNotifications: false, showProfile: false },
  '/classes': { activeTab: 'classes', showNotifications: false, showProfile: false },
  '/schedule': { activeTab: 'schedule', showNotifications: false, showProfile: false },
  '/assignments': { activeTab: 'assignments', showNotifications: false, showProfile: false },
  '/attendance': { activeTab: 'progress', showNotifications: false, showProfile: false },
  '/progress': { activeTab: 'progress', showNotifications: false, showProfile: false },
  '/notifications': { activeTab: 'home', showNotifications: true, showProfile: false },
  '/profile': { activeTab: 'home', showNotifications: false, showProfile: true },
};

/**
 * Resolves student route state from current URL pathname
 */
export function getRouteStateFromPath(pathname: string): StudentRouteState | null {
  const cleanPath = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return VALID_STUDENT_ROUTES[cleanPath] || null;
}

/**
 * Derives canonical URL path for Student Portal state
 */
export function getPathFromRouteState(
  activeTab: 'home' | 'schedule' | 'classes' | 'assignments' | 'progress',
  showNotifications: boolean,
  showProfile: boolean
): string {
  if (showNotifications) return '/notifications';
  if (showProfile) return '/profile';
  switch (activeTab) {
    case 'classes':
      return '/subjects';
    case 'schedule':
      return '/schedule';
    case 'assignments':
      return '/assignments';
    case 'progress':
      return '/attendance';
    case 'home':
    default:
      return '/home';
  }
}

/**
 * Stores intended deep link path when unauthenticated visitor opens a student route
 */
export function setPendingStudentRedirect(path: string): void {
  if (typeof window === 'undefined') return;
  const cleanPath = path.toLowerCase().replace(/\/+$/, '') || '/';
  if (VALID_STUDENT_ROUTES[cleanPath] && cleanPath !== '/') {
    try {
      sessionStorage.setItem('awkum_pending_student_redirect', cleanPath);
    } catch (e) {}
  }
}

/**
 * Retrieves and clears pending student redirect path upon successful login
 */
export function popPendingStudentRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const pending = sessionStorage.getItem('awkum_pending_student_redirect');
    if (pending) {
      sessionStorage.removeItem('awkum_pending_student_redirect');
      return pending;
    }
  } catch (e) {}
  return null;
}

/**
 * Canonicalizes browser location to root URL for Master Admin or Logout
 */
export function enforceRootUrl(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname !== '/' || window.location.hash) {
    history.replaceState(null, '', '/');
  }
}
