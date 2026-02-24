import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '$lib/server/auth/password.js';

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();
	const now = Date.now();

	const updates: Record<string, unknown> = { updatedAt: now };

	if (body.name !== undefined) {
		const name = body.name?.trim();
		if (!name) return json({ error: 'Name is required' }, { status: 400 });
		updates.name = name;
	}

	if (body.email !== undefined) {
		const email = body.email?.trim().toLowerCase();
		if (!email) return json({ error: 'Email is required' }, { status: 400 });
		const [existing] = await db.select().from(users).where(eq(users.email, email));
		if (existing && existing.id !== user.id) {
			return json({ error: 'Email already in use' }, { status: 400 });
		}
		updates.email = email;
	}

	if (body.newPassword) {
		if (!body.currentPassword) {
			return json({ error: 'Current password is required' }, { status: 400 });
		}
		const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
		if (!dbUser) return json({ error: 'User not found' }, { status: 404 });

		const valid = await verifyPassword(dbUser.passwordHash, body.currentPassword);
		if (!valid) return json({ error: 'Current password is incorrect' }, { status: 400 });

		if (body.newPassword.length < 8) {
			return json({ error: 'New password must be at least 8 characters' }, { status: 400 });
		}
		updates.passwordHash = await hashPassword(body.newPassword);
	}

	await db.update(users).set(updates).where(eq(users.id, user.id));

	const [updated] = await db
		.select({ id: users.id, name: users.name, email: users.email, role: users.role })
		.from(users)
		.where(eq(users.id, user.id));

	return json(updated);
};
