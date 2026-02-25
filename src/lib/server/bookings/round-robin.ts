import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, bookingEventTypeMembers, bookings } from '$lib/server/db/schema.js';
import { eq, and, gte, count } from 'drizzle-orm';
import { getAvailableSlotsForUser } from './availability.js';

/**
 * Select the round robin member to assign a booking to.
 * Returns the userId of the selected member, or null if nobody is available.
 */
export async function selectRoundRobinMember(
	eventTypeId: string,
	startTime: number,
	endTime: number,
	dateStr: string,
	timezone: string
): Promise<string | null> {
	const [eventType] = await db
		.select({
			roundRobinMode: bookingEventTypes.roundRobinMode,
			lastAssignedUserId: bookingEventTypes.lastAssignedUserId
		})
		.from(bookingEventTypes)
		.where(eq(bookingEventTypes.id, eventTypeId));

	if (!eventType) return null;

	const members = await db
		.select({ userId: bookingEventTypeMembers.userId, position: bookingEventTypeMembers.position })
		.from(bookingEventTypeMembers)
		.where(eq(bookingEventTypeMembers.eventTypeId, eventTypeId))
		.orderBy(bookingEventTypeMembers.position);

	if (members.length === 0) return null;

	// Filter to members who are available for this specific slot
	const availableMembers: string[] = [];
	for (const m of members) {
		const slots = await getAvailableSlotsForUser(eventTypeId, m.userId, dateStr, timezone);
		if (slots.some((s) => s.startTime === startTime)) {
			availableMembers.push(m.userId);
		}
	}

	if (availableMembers.length === 0) return null;

	let selectedUserId: string;

	if (eventType.roundRobinMode === 'load_balanced') {
		// Pick member with fewest confirmed upcoming bookings
		let minCount = Infinity;
		selectedUserId = availableMembers[0];

		for (const userId of availableMembers) {
			const [result] = await db
				.select({ c: count() })
				.from(bookings)
				.where(
					and(
						eq(bookings.assignedUserId, userId),
						eq(bookings.status, 'confirmed'),
						gte(bookings.startTime, Date.now())
					)
				);
			const bookingCount = Number(result?.c ?? 0);
			if (bookingCount < minCount) {
				minCount = bookingCount;
				selectedUserId = userId;
			}
		}
	} else {
		// Strict rotation: pick next after lastAssignedUserId
		const lastIdx = availableMembers.indexOf(eventType.lastAssignedUserId || '');
		const nextIdx = lastIdx === -1 ? 0 : (lastIdx + 1) % availableMembers.length;
		selectedUserId = availableMembers[nextIdx];
	}

	// Update last assigned
	await db
		.update(bookingEventTypes)
		.set({ lastAssignedUserId: selectedUserId })
		.where(eq(bookingEventTypes.id, eventTypeId));

	return selectedUserId;
}
