import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, bookings, users } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getAvailableSlots } from '$lib/server/bookings/availability.js';
import { createCalendarEvent, getValidToken } from '$lib/server/bookings/google-calendar.js';
import { sendBookingConfirmation } from '$lib/server/bookings/notifications.js';

export const POST: RequestHandler = async (event) => {
	const slug = event.params.slug;
	const body = await event.request.json();

	if (!body.name?.trim()) return json({ error: 'Name is required' }, { status: 400 });
	if (!body.email?.trim()) return json({ error: 'Email is required' }, { status: 400 });
	if (!body.startTime) return json({ error: 'Start time is required' }, { status: 400 });
	if (!body.timezone) return json({ error: 'Timezone is required' }, { status: 400 });

	const [eventType] = await db
		.select()
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.slug, slug), eq(bookingEventTypes.isActive, true)));

	if (!eventType) return json({ error: 'Not found' }, { status: 404 });

	const startTime = body.startTime;
	const endTime = startTime + eventType.durationMinutes * 60 * 1000;

	// Re-verify the slot is still available (prevents race conditions)
	const dateStr = new Date(startTime).toISOString().split('T')[0];
	const available = await getAvailableSlots(eventType.id, dateStr, body.timezone);
	const slotValid = available.some((s) => s.startTime === startTime);

	if (!slotValid) {
		return json({ error: 'This time slot is no longer available' }, { status: 409 });
	}

	const now = Date.now();
	const bookingId = nanoid(12);

	// Create Google Calendar event if connected
	let googleEventId: string | null = null;
	const hasGcal = await getValidToken(eventType.userId);
	if (hasGcal) {
		googleEventId = await createCalendarEvent(eventType.userId, {
			summary: `${eventType.title} with ${body.name.trim()}`,
			description: body.notes?.trim() || undefined,
			location: eventType.location || undefined,
			start: startTime,
			end: endTime,
			attendeeEmail: body.email.trim()
		});
	}

	const booking = {
		id: bookingId,
		eventTypeId: eventType.id,
		inviteeName: body.name.trim(),
		inviteeEmail: body.email.trim(),
		startTime,
		endTime,
		timezone: body.timezone,
		status: 'confirmed' as const,
		notes: body.notes?.trim() || null,
		googleEventId,
		createdAt: now
	};

	await db.insert(bookings).values(booking);

	// Send confirmation emails
	const [owner] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, eventType.userId));
	if (owner) {
		sendBookingConfirmation(booking, eventType, owner).catch((err) =>
			console.error('[bookings] Failed to send confirmation:', err)
		);
	}

	return json({
		id: booking.id,
		eventType: eventType.title,
		startTime: booking.startTime,
		endTime: booking.endTime,
		timezone: booking.timezone
	}, { status: 201 });
};
