import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, bookings, users, bookingCustomFields, bookingCustomFieldValues } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getAvailableSlots } from '$lib/server/bookings/availability.js';
import { createCalendarEvent, getValidToken } from '$lib/server/bookings/google-calendar.js';
import { sendBookingConfirmation } from '$lib/server/bookings/notifications.js';
import { selectRoundRobinMember } from '$lib/server/bookings/round-robin.js';

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

	// Determine assigned user
	let assignedUserId = eventType.userId;
	if (eventType.schedulingType === 'round_robin') {
		const memberId = await selectRoundRobinMember(eventType.id, startTime, endTime, dateStr, body.timezone);
		if (!memberId) {
			return json({ error: 'No team members available for this slot' }, { status: 409 });
		}
		assignedUserId = memberId;
	}

	const now = Date.now();
	const bookingId = nanoid(12);

	// Create Google Calendar event if connected
	let googleEventId: string | null = null;
	let meetLink: string | null = null;
	const generateMeet = eventType.location?.toLowerCase() === 'google meet';
	const hasGcal = await getValidToken(assignedUserId);
	if (hasGcal) {
		const result = await createCalendarEvent(assignedUserId, {
			summary: `${eventType.title} with ${body.name.trim()}`,
			description: body.notes?.trim() || undefined,
			location: eventType.location || undefined,
			start: startTime,
			end: endTime,
			attendeeEmail: body.email.trim(),
			generateMeet
		});
		googleEventId = result.eventId;
		meetLink = result.meetLink;
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
		meetLink,
		assignedUserId,
		createdAt: now
	};

	await db.insert(bookings).values(booking);

	// Store custom field values
	if (body.customFields && typeof body.customFields === 'object') {
		const fields = await db
			.select()
			.from(bookingCustomFields)
			.where(eq(bookingCustomFields.eventTypeId, eventType.id));

		const fieldValues = fields
			.filter((f) => body.customFields[f.id] !== undefined && body.customFields[f.id] !== '')
			.map((f) => ({
				id: nanoid(12),
				bookingId,
				fieldId: f.id,
				value: String(body.customFields[f.id])
			}));

		if (fieldValues.length > 0) {
			await db.insert(bookingCustomFieldValues).values(fieldValues);
		}
	}

	// Send confirmation emails
	const [owner] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, assignedUserId));
	if (owner) {
		sendBookingConfirmation(booking, eventType, owner, meetLink).catch((err) =>
			console.error('[bookings] Failed to send confirmation:', err)
		);
	}

	return json({
		id: booking.id,
		eventType: eventType.title,
		startTime: booking.startTime,
		endTime: booking.endTime,
		timezone: booking.timezone,
		meetLink
	}, { status: 201 });
};
