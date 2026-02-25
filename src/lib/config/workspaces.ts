// ─── Role-Based Workspace Config ────────────────────────────────────────────
// Single source of truth for role→workspace mappings.
// To add a new scoped role: add one entry to ROLES, ROLE_MODES, ROLE_DEFAULT_ROUTE, and ROLE_LABELS.

export const ROLES = ['admin', 'member', 'sales'] as const;
export type Role = (typeof ROLES)[number];

export type SidebarMode = 'ops' | 'sales' | 'finance' | 'admin';

/** Which sidebar modes each role can access */
export const ROLE_MODES: Record<Role, SidebarMode[]> = {
	admin: ['ops', 'sales', 'finance', 'admin'],
	member: ['ops', 'sales', 'finance'],
	sales: ['sales']
};

/** Where each role lands after login / root access */
export const ROLE_DEFAULT_ROUTE: Record<Role, string> = {
	admin: '/dashboard',
	member: '/dashboard',
	sales: '/crm/pipeline'
};

/** Human-readable labels for role dropdowns */
export const ROLE_LABELS: Record<Role, string> = {
	admin: 'Admin',
	member: 'Member',
	sales: 'Sales'
};

// ─── Internal route mappings ────────────────────────────────────────────────

const MODE_ROUTES: Record<SidebarMode, string[]> = {
	ops: ['/dashboard', '/projects', '/my-tasks', '/activity', '/bookings'],
	sales: ['/crm'],
	finance: ['/financials'],
	admin: ['/admin']
};

const COMMON_ROUTES = ['/settings', '/notifications', '/api/'];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Check if a role can access a given pathname */
export function canAccessRoute(role: Role, pathname: string): boolean {
	if (COMMON_ROUTES.some((p) => pathname.startsWith(p))) return true;
	const modes = ROLE_MODES[role];
	for (const mode of modes) {
		if (MODE_ROUTES[mode].some((p) => pathname === p || pathname.startsWith(p + '/'))) return true;
	}
	return false;
}

/** Returns the sidebar modes visible for a role */
export function getVisibleModes(role: Role): SidebarMode[] {
	return ROLE_MODES[role];
}
