import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { bookings, bookingEventTypes, users } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { deleteCalendarEvent } from '$lib/server/bookings/google-calendar.js';
import { sendBookingCancellation } from '$lib/server/bookings/notifications.js';

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (body.status !== 'cancelled') {
		return json({ error: 'Only cancellation is supported' }, { status: 400 });
	}

	// Verify ownership through event type
	const booking = db
		.select({
			id: bookings.id,
			eventTypeId: bookings.eventTypeId,
			inviteeName: bookings.inviteeName,
			inviteeEmail: bookings.inviteeEmail,
			startTime: bookings.startTime,
			endTime: bookings.endTime,
			timezone: bookings.timezone,
			status: bookings.status,
			notes: bookings.notes,
			googleEventId: bookings.googleEventId
		})
		.from(bookings)
		.innerJoin(bookingEventTypes, eq(bookings.eventTypeId, bookingEventTypes.id))
		.where(and(eq(bookings.id, event.params.id), eq(bookingEventTypes.userId, user.id)))
		.get();

	if (!booking) return json({ error: 'Not found' }, { status: 404 });
	if (booking.status === 'cancelled') return json({ error: 'Already cancelled' }, { status: 400 });

	db.update(bookings).set({ status: 'cancelled' }).where(eq(bookings.id, event.params.id)).run();

	// Remove from Google Calendar if present
	if (booking.googleEventId) {
		deleteCalendarEvent(user.id, booking.googleEventId).catch((err) =>
			console.error('[bookings] Failed to delete Google Calendar event:', err)
		);
	}

	// Send cancellation email
	const eventType = db
		.select({ title: bookingEventTypes.title, durationMinutes: bookingEventTypes.durationMinutes, location: bookingEventTypes.location })
		.from(bookingEventTypes)
		.where(eq(bookingEventTypes.id, booking.eventTypeId))
		.get();

	const owner = db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, user.id)).get();

	if (eventType && owner) {
		sendBookingCancellation(booking, eventType, owner).catch((err) =>
			console.error('[bookings] Failed to send cancellation email:', err)
		);
	}

	return json({ success: true });
};
