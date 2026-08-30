import { NavTab } from '../components/layout/DesktopSidebar';

export const TAB_ROUTES: Record<NavTab, string> = {
  dashboard: '/',
  chat: '/chat',
  vision: '/vision',
  listen: '/listen',
  tasks: '/tasks',
  calendar: '/calendar',
  history: '/history',
  reminders: '/calendar',
  settings: '/settings',
  profile: '/profile',
};

export function getTabFromPathname(pathname: string): NavTab {
  if (pathname === '/') return 'dashboard';
  if (pathname === '/chat' || pathname.startsWith('/session/')) return 'chat';
  if (pathname.startsWith('/vision')) return 'vision';
  if (pathname.startsWith('/listen') || pathname.startsWith('/conversation')) return 'listen';
  if (pathname.startsWith('/tasks')) return 'tasks';
  if (pathname.startsWith('/calendar') || pathname.startsWith('/reminders')) return 'reminders';
  if (pathname.startsWith('/history')) return 'history';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'dashboard';
}

export function getPathForTab(tab: NavTab): string {
  return TAB_ROUTES[tab] || '/';
}
