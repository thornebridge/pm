import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, bookings } from '$lib/server/db/schema.js';
import { eq, and, gte, lt, inArray } from 'drizzle-orm';
import { getFreeBusy, getValidToken } from './google-calendar.js';

export interface TimeSlot {
	startTime: number;
	endTime: number;
}

/**
 * Returns available booking slots for a given event type on a specific date.
 * Works with or without Google Calendar — if not connected, only existing bookings
 * are used as conflicts against Mon-Fri 9am-5pm working hours.
 */
export async function getAvailableSlots(
	eventTypeId: string,
	dateStr: string, // YYYY-MM-DD
	timezone: string
): Promise<TimeSlot[]> {
	const [eventType] = await db
		.select()
		.from(bookingEventTypes)
		.where(eq(bookingEventTypes.id, eventTypeId));
	if (!eventType || !eventType.isActive) return [];

	const now = Date.now();
	const minTime = now + eventType.minNoticeHours * 60 * 60 * 1000;
	const maxTime = now + eventType.maxDaysOut * 24 * 60 * 60 * 1000;

	// Check date is within allowed range
	const workStart = localTimeToUtc(dateStr, 9, 0, timezone);
	const workEnd = localTimeToUtc(dateStr, 17, 0, timezone);
	if (workStart > maxTime) return [];

	// Check it's a weekday (Mon-Fri)
	const dayOfWeek = getDayOfWeek(dateStr, timezone);
	if (dayOfWeek === 0 || dayOfWeek === 6) return [];

	// Generate candidate slots
	const slotDuration = eventType.durationMinutes * 60 * 1000;
	const bufferMs = eventType.bufferMinutes * 60 * 1000;
	const step = slotDuration + bufferMs;

	const candidates: TimeSlot[] = [];
	for (let start = workStart; start + slotDuration <= workEnd; start += step) {
		if (start < minTime) continue;
		candidates.push({ startTime: start, endTime: start + slotDuration });
	}
	if (candidates.length === 0) return [];

	// Collect busy periods from existing bookings across all owner's event types
	const ownerEventTypes = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(eq(bookingEventTypes.userId, eventType.userId));
	const ownerEventTypeIds = ownerEventTypes.map((et) => et.id);

	const busyPeriods: Array<{ start: number; end: number }> = [];

	if (ownerEventTypeIds.length > 0) {
		const existingBookings = await db
			.select({ startTime: bookings.startTime, endTime: bookings.endTime })
			.from(bookings)
			.where(
				and(
					inArray(bookings.eventTypeId, ownerEventTypeIds),
					eq(bookings.status, 'confirmed'),
					gte(bookings.startTime, workStart),
					lt(bookings.startTime, workEnd)
				)
			);
		for (const b of existingBookings) {
			busyPeriods.push({ start: b.startTime, end: b.endTime });
		}
	}

	// Google Calendar busy times (optional — no-op if not connected)
	const hasGoogleCalendar = await getValidToken(eventType.userId);
	if (hasGoogleCalendar) {
		const gcalBusy = await getFreeBusy(eventType.userId, workStart, workEnd);
		busyPeriods.push(...gcalBusy);
	}

	// Filter out conflicting slots (check buffer around the slot)
	return candidates.filter((slot) => {
		const bufferedEnd = slot.endTime + bufferMs;
		return !busyPeriods.some((busy) => slot.startTime < busy.end && bufferedEnd > busy.start);
	});
}

/**
 * Convert a local time (date + hours:minutes in a timezone) to a UTC unix timestamp.
 */
function localTimeToUtc(dateStr: string, hours: number, minutes: number, timezone: string): number {
	// Create a rough UTC guess, then measure the timezone offset at that point
	const [year, month, day] = dateStr.split('-').map(Number);
	const guess = new Date(Date.UTC(year, month - 1, day, hours, minutes));

	// Format the guess time in the target timezone and in UTC to find the offset
	const localStr = guess.toLocaleString('en-US', { timeZone: timezone });
	const utcStr = guess.toLocaleString('en-US', { timeZone: 'UTC' });
	const offsetMs = new Date(utcStr).getTime() - new Date(localStr).getTime();

	// Apply offset: if timezone is behind UTC, offset is positive, meaning
	// the local time corresponds to a later UTC time
	return guess.getTime() + offsetMs;
}

function getDayOfWeek(dateStr: string, timezone: string): number {
	const noon = localTimeToUtc(dateStr, 12, 0, timezone);
	const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).formatToParts(new Date(noon));
	const weekday = parts.find((p) => p.type === 'weekday')?.value;
	const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
	return map[weekday || ''] ?? 0;
}
