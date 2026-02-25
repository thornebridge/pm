import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, bookings, calendarIntegrations, users } from '$lib/server/db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';

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
			schedulingType: bookingEventTypes.schedulingType,
			roundRobinMode: bookingEventTypes.roundRobinMode,
			logoMimeType: bookingEventTypes.logoMimeType,
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
			eventTypeSlug: bookingEventTypes.slug,
			inviteeName: bookings.inviteeName,
			inviteeEmail: bookings.inviteeEmail,
			startTime: bookings.startTime,
			endTime: bookings.endTime,
			timezone: bookings.timezone,
			status: bookings.status,
			notes: bookings.notes,
			meetLink: bookings.meetLink,
			assignedUserId: bookings.assignedUserId,
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

	// Stats
	const activeCount = eventTypes.filter((et) => et.isActive).length;
	const weekStart = now - 7 * 24 * 60 * 60 * 1000;
	const [weekResult] = await db
		.select({ c: sql<number>`COUNT(*)` })
		.from(bookings)
		.innerJoin(bookingEventTypes, eq(bookings.eventTypeId, bookingEventTypes.id))
		.where(
			and(
				eq(bookingEventTypes.userId, userId),
				gte(bookings.createdAt, weekStart),
				eq(bookings.status, 'confirmed')
			)
		);
	const bookingsThisWeek = Number(weekResult?.c ?? 0);
	const totalBookings = eventTypes.reduce((sum, et) => sum + Number(et.bookingCount), 0);

	return {
		eventTypes,
		upcomingBookings,
		calendarConnected,
		stats: { activeCount, bookingsThisWeek, totalBookings }
	};
};
