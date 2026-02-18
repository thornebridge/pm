import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { notificationPreferences } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const prefs = db
		.select()
		.from(notificationPreferences)
		.where(eq(notificationPreferences.userId, user.id))
		.get();

	return json(prefs || { onAssigned: true, onStatusChange: true, onComment: true });
};

export const PUT: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { onAssigned, onStatusChange, onComment } = await event.request.json();

	const existing = db
		.select()
		.from(notificationPreferences)
		.where(eq(notificationPreferences.userId, user.id))
		.get();

	if (existing) {
		db.update(notificationPreferences)
			.set({
				onAssigned: onAssigned ?? existing.onAssigned,
				onStatusChange: onStatusChange ?? existing.onStatusChange,
				onComment: onComment ?? existing.onComment
			})
			.where(eq(notificationPreferences.userId, user.id))
			.run();
	} else {
		db.insert(notificationPreferences)
			.values({
				id: nanoid(12),
				userId: user.id,
				onAssigned: onAssigned ?? true,
				onStatusChange: onStatusChange ?? true,
				onComment: onComment ?? true
			})
			.run();
	}

	return json({ ok: true });
};
