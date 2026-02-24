import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { bookings, bookingEventTypes } from '$lib/server/db/schema.js';
import { eq, desc, gte, and } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const filter = event.url.searchParams.get('filter') || 'upcoming'; // upcoming | past | all

	const userEventTypeRows = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(eq(bookingEventTypes.userId, user.id));
	const userEventTypes = userEventTypeRows.map((et) => et.id);

	if (userEventTypes.length === 0) return json([]);

	const now = Date.now();
	const rows = await db
		.select({
			id: bookings.id,
			eventTypeId: bookings.eventTypeId,
			eventTypeTitle: bookingEventTypes.title,
			eventTypeSlug: bookingEventTypes.slug,
			inviteeName: bookings.inviteeName,
			inviteeEmail: bookings.inviteeEmail,
			startTime: bookings.startTime,
			endTime: bookings.endTime,
			timezone: bookings.timezone,
			status: bookings.status,
			notes: bookings.notes,
			createdAt: bookings.createdAt
		})
		.from(bookings)
		.innerJoin(bookingEventTypes, eq(bookings.eventTypeId, bookingEventTypes.id))
		.where(
			and(
				eq(bookingEventTypes.userId, user.id),
				...(filter === 'upcoming'
					? [gte(bookings.startTime, now), eq(bookings.status, 'confirmed')]
					: [])
			)
		)
		.orderBy(filter === 'upcoming' ? bookings.startTime : desc(bookings.startTime))
		.limit(100);

	return json(rows);
};
