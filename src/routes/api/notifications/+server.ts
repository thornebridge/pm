import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { notifications, users } from '$lib/server/db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const countOnly = event.url.searchParams.get('countOnly');

	if (countOnly) {
		const result = db
			.select({ count: sql<number>`count(*)` })
			.from(notifications)
			.where(and(eq(notifications.userId, user.id), eq(notifications.read, false)))
			.get();
		return json({ count: result?.count ?? 0 });
	}

	const all = db
		.select({
			id: notifications.id,
			type: notifications.type,
			title: notifications.title,
			body: notifications.body,
			url: notifications.url,
			read: notifications.read,
			createdAt: notifications.createdAt,
			actorName: users.name
		})
		.from(notifications)
		.leftJoin(users, eq(notifications.actorId, users.id))
		.where(eq(notifications.userId, user.id))
		.orderBy(desc(notifications.createdAt))
		.limit(50)
		.all();

	return json(all);
};

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { action, id } = await event.request.json();

	if (action === 'mark_all_read') {
		db.update(notifications)
			.set({ read: true })
			.where(and(eq(notifications.userId, user.id), eq(notifications.read, false)))
			.run();
		return json({ ok: true });
	}

	if (action === 'mark_read' && id) {
		db.update(notifications)
			.set({ read: true })
			.where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
			.run();
		return json({ ok: true });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
