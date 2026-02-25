import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, bookingEventTypeMembers } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const [et] = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!et) return json({ error: 'Not found' }, { status: 404 });

	const updates: Record<string, unknown> = {};
	if (body.position !== undefined) updates.position = body.position;

	if (Object.keys(updates).length > 0) {
		await db
			.update(bookingEventTypeMembers)
			.set(updates)
			.where(eq(bookingEventTypeMembers.id, event.params.memberId));
	}

	return json({ success: true });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const [et] = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!et) return json({ error: 'Not found' }, { status: 404 });

	await db
		.delete(bookingEventTypeMembers)
		.where(eq(bookingEventTypeMembers.id, event.params.memberId));

	return json({ success: true });
};
