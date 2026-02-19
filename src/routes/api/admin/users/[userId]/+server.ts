import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { users, sessions } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	const admin = requireAdmin(event);
	const userId = event.params.userId;
	const body = await event.request.json();

	if (userId === admin.id && body.role !== undefined) {
		return json({ error: 'Cannot change your own role' }, { status: 400 });
	}

	const existing = db.select().from(users).where(eq(users.id, userId)).get();
	if (!existing) return json({ error: 'User not found' }, { status: 404 });

	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	if (body.role !== undefined) {
		if (!['admin', 'member'].includes(body.role)) {
			return json({ error: 'Invalid role' }, { status: 400 });
		}
		updates.role = body.role;
	}

	if (body.name !== undefined) {
		updates.name = body.name.trim();
	}

	db.update(users).set(updates).where(eq(users.id, userId)).run();

	return json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
	const admin = requireAdmin(event);
	const userId = event.params.userId;

	if (userId === admin.id) {
		return json({ error: 'Cannot delete your own account' }, { status: 400 });
	}

	// Delete all sessions first
	db.delete(sessions).where(eq(sessions.userId, userId)).run();
	db.delete(users).where(eq(users.id, userId)).run();

	return json({ ok: true });
};
