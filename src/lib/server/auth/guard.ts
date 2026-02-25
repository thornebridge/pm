import { json, type RequestEvent } from '@sveltejs/kit';
import type { Role } from '$lib/config/workspaces';

export function requireAuth(event: RequestEvent) {
	if (!event.locals.user) {
		throw json({ error: 'Unauthorized' }, { status: 401 });
	}
	return event.locals.user;
}

export function requireAdmin(event: RequestEvent) {
	const user = requireAuth(event);
	if (user.role !== 'admin') {
		throw json({ error: 'Forbidden' }, { status: 403 });
	}
	return user;
}

/** Require one of the specified roles */
export function requireRole(event: RequestEvent, ...roles: Role[]) {
	const user = requireAuth(event);
	if (!roles.includes(user.role as Role)) {
		throw json({ error: 'Forbidden' }, { status: 403 });
	}
	return user;
}
