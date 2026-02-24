import { db } from '$lib/server/db/index.js';
import {
	bookingEventTypes,
	bookings,
	bookingAvailabilitySchedules,
	bookingAvailabilityOverrides,
	bookingEventTypeMembers
} from '$lib/server/db/schema.js';
import { eq, and, gte, lt, inArray, isNull } from 'drizzle-orm';
import { getFreeBusy, getValidToken } from './google-calendar.js';

export interface TimeSlot {
	startTime: number;
	endTime: number;
}

interface WorkingHours {
	startHour: number;
	startMinute: number;
	endHour: number;
	endMinute: number;
}

/**
 * Get working hours for a specific event type on a given date.
 * Checks date overrides first, then falls back to weekly schedule.
 * userId = null means the event type's default schedule.
 */
async function getWorkingHours(
	eventTypeId: string,
	userId: string | null,
	dateStr: string,
	timezone: string
): Promise<WorkingHours | null> {
	// Check for a date override first
	const overrideConditions = [
		eq(bookingAvailabilityOverrides.eventTypeId, eventTypeId),
		eq(bookingAvailabilityOverrides.date, dateStr)
	];
	if (userId) {
		overrideConditions.push(eq(bookingAvailabilityOverrides.userId, userId));
	} else {
		overrideConditions.push(isNull(bookingAvailabilityOverrides.userId));
	}

	const [override] = await db
		.select()
		.from(bookingAvailabilityOverrides)
		.where(and(...overrideConditions));

	if (override) {
		if (override.isBlocked) return null;
		if (override.startTime && override.endTime) {
			return parseTimeRange(override.startTime, override.endTime);
		}
	}

	// Fall back to weekly schedule
	const dayOfWeek = getDayOfWeek(dateStr, timezone);

	const scheduleConditions = [
		eq(bookingAvailabilitySchedules.eventTypeId, eventTypeId),
		eq(bookingAvailabilitySchedules.dayOfWeek, dayOfWeek)
	];
	if (userId) {
		scheduleConditions.push(eq(bookingAvailabilitySchedules.userId, userId));
	} else {
		scheduleConditions.push(isNull(bookingAvailabilitySchedules.userId));
	}

	const [schedule] = await db
		.select()
		.from(bookingAvailabilitySchedules)
		.where(and(...scheduleConditions));

	if (!schedule || !schedule.enabled) return null;

	return parseTimeRange(schedule.startTime, schedule.endTime);
}

function parseTimeRange(startTime: string, endTime: string): WorkingHours {
	const [startHour, startMinute] = startTime.split(':').map(Number);
	const [endHour, endMinute] = endTime.split(':').map(Number);
	return { startHour, startMinute, endHour, endMinute };
}

/**
 * Returns available booking slots for a given event type on a specific date.
 * For individual event types, uses the default schedule (userId = null).
 */
export async function getAvailableSlots(
	eventTypeId: string,
	dateStr: string,
	timezone: string
): Promise<TimeSlot[]> {
	const [eventType] = await db
		.select()
		.from(bookingEventTypes)
		.where(eq(bookingEventTypes.id, eventTypeId));
	if (!eventType || !eventType.isActive) return [];

	if (eventType.schedulingType === 'round_robin') {
		return getAvailableSlotsRoundRobin(eventTypeId, dateStr, timezone, eventType);
	}

	return getAvailableSlotsForUser(eventTypeId, eventType.userId, dateStr, timezone, eventType);
}

/**
 * Returns available slots for a specific user on a given event type and date.
 * Used directly for individual event types, and per-member for round robin.
 */
export async function getAvailableSlotsForUser(
	eventTypeId: string,
	userId: string,
	dateStr: string,
	timezone: string,
	eventType?: typeof bookingEventTypes.$inferSelect
): Promise<TimeSlot[]> {
	if (!eventType) {
		const [et] = await db
			.select()
			.from(bookingEventTypes)
			.where(eq(bookingEventTypes.id, eventTypeId));
		if (!et || !et.isActive) return [];
		eventType = et;
	}

	const now = Date.now();
	const minTime = now + eventType.minNoticeHours * 60 * 60 * 1000;
	const maxTime = now + eventType.maxDaysOut * 24 * 60 * 60 * 1000;

	// Try member-specific schedule first, fall back to default
	let hours = await getWorkingHours(eventTypeId, userId, dateStr, timezone);
	if (!hours) {
		hours = await getWorkingHours(eventTypeId, null, dateStr, timezone);
	}
	if (!hours) return [];

	const workStart = localTimeToUtc(dateStr, hours.startHour, hours.startMinute, timezone);
	const workEnd = localTimeToUtc(dateStr, hours.endHour, hours.endMinute, timezone);
	if (workStart > maxTime) return [];

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

	// Collect busy periods from existing bookings assigned to this user
	const busyPeriods: Array<{ start: number; end: number }> = [];

	// Check bookings assigned to this user (across all event types)
	const ownerEventTypes = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(eq(bookingEventTypes.userId, userId));
	const ownerEventTypeIds = ownerEventTypes.map((et) => et.id);

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

	// Also check bookings where this user is assigned (round robin)
	const assignedBookings = await db
		.select({ startTime: bookings.startTime, endTime: bookings.endTime })
		.from(bookings)
		.where(
			and(
				eq(bookings.assignedUserId, userId),
				eq(bookings.status, 'confirmed'),
				gte(bookings.startTime, workStart),
				lt(bookings.startTime, workEnd)
			)
		);
	for (const b of assignedBookings) {
		busyPeriods.push({ start: b.startTime, end: b.endTime });
	}

	// Google Calendar busy times
	const hasGoogleCalendar = await getValidToken(userId);
	if (hasGoogleCalendar) {
		const gcalBusy = await getFreeBusy(userId, workStart, workEnd);
		busyPeriods.push(...gcalBusy);
	}

	// Filter out conflicting slots
	return candidates.filter((slot) => {
		const bufferedEnd = slot.endTime + bufferMs;
		return !busyPeriods.some((busy) => slot.startTime < busy.end && bufferedEnd > busy.start);
	});
}

/**
 * Returns the union of available slots across all round robin members.
 * A slot is available if at least one member can take it.
 */
async function getAvailableSlotsRoundRobin(
	eventTypeId: string,
	dateStr: string,
	timezone: string,
	eventType: typeof bookingEventTypes.$inferSelect
): Promise<TimeSlot[]> {
	const members = await db
		.select({ userId: bookingEventTypeMembers.userId })
		.from(bookingEventTypeMembers)
		.where(eq(bookingEventTypeMembers.eventTypeId, eventTypeId))
		.orderBy(bookingEventTypeMembers.position);

	if (members.length === 0) return [];

	// Query each member's availability in parallel
	const memberSlots = await Promise.all(
		members.map((m) => getAvailableSlotsForUser(eventTypeId, m.userId, dateStr, timezone, eventType))
	);

	// Union all slots, deduplicated by startTime
	const slotMap = new Map<number, TimeSlot>();
	for (const slots of memberSlots) {
		for (const slot of slots) {
			if (!slotMap.has(slot.startTime)) {
				slotMap.set(slot.startTime, slot);
			}
		}
	}

	return Array.from(slotMap.values()).sort((a, b) => a.startTime - b.startTime);
}

/**
 * Convert a local time (date + hours:minutes in a timezone) to a UTC unix timestamp.
 */
function localTimeToUtc(dateStr: string, hours: number, minutes: number, timezone: string): number {
	const [year, month, day] = dateStr.split('-').map(Number);
	const guess = new Date(Date.UTC(year, month - 1, day, hours, minutes));

	const localStr = guess.toLocaleString('en-US', { timeZone: timezone });
	const utcStr = guess.toLocaleString('en-US', { timeZone: 'UTC' });
	const offsetMs = new Date(utcStr).getTime() - new Date(localStr).getTime();

	return guess.getTime() + offsetMs;
}

function getDayOfWeek(dateStr: string, timezone: string): number {
	const noon = localTimeToUtc(dateStr, 12, 0, timezone);
	const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).formatToParts(new Date(noon));
	const weekday = parts.find((p) => p.type === 'weekday')?.value;
	const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
	return map[weekday || ''] ?? 0;
}
