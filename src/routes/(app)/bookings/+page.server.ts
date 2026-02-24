import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, bookings, calendarIntegrations } from '$lib/server/db/schema.js';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	const userId = locals.user!.id;

	const eventTypes = await db
		.select({
			id: bookingEventTypes.id,
			title: bookingEventTypes.title,
			slug: bookingEventTypes.slug,
			description: bookingEventTypes.description,
			durationMinutes: bookingEventTypes.durationMinutes,
			color: bookingEventTypes.color,
			location: bookingEventTypes.location,
			bufferMinutes: bookingEventTypes.bufferMinutes,
			minNoticeHours: bookingEventTypes.minNoticeHours,
			maxDaysOut: bookingEventTypes.maxDaysOut,
			isActive: bookingEventTypes.isActive,
			createdAt: bookingEventTypes.createdAt,
			bookingCount: sql<number>`(SELECT COUNT(*) FROM bookings WHERE bookings.event_type_id = ${bookingEventTypes.id} AND bookings.status = 'confirmed')`
		})
		.from(bookingEventTypes)
		.where(eq(bookingEventTypes.userId, userId))
		.orderBy(bookingEventTypes.createdAt);

	const now = Date.now();
	const upcomingBookings = await db
		.select({
			id: bookings.id,
			eventTypeTitle: bookingEventTypes.title,
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
				eq(bookingEventTypes.userId, userId),
				gte(bookings.startTime, now),
				eq(bookings.status, 'confirmed')
			)
		)
		.orderBy(bookings.startTime)
		.limit(50);

	const [calendarRow] = await db
		.select({ id: calendarIntegrations.id })
		.from(calendarIntegrations)
		.where(eq(calendarIntegrations.userId, userId));
	const calendarConnected = !!calendarRow;

	return { eventTypes, upcomingBookings, calendarConnected };
};
