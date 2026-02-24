import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, users } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const eventType = db
		.select({
			id: bookingEventTypes.id,
			title: bookingEventTypes.title,
			slug: bookingEventTypes.slug,
			description: bookingEventTypes.description,
			durationMinutes: bookingEventTypes.durationMinutes,
			color: bookingEventTypes.color,
			location: bookingEventTypes.location,
			maxDaysOut: bookingEventTypes.maxDaysOut,
			userId: bookingEventTypes.userId
		})
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.slug, params.slug), eq(bookingEventTypes.isActive, true)))
		.get();

	if (!eventType) {
		return { notFound: true, eventType: null, ownerName: null };
	}

	const owner = db.select({ name: users.name }).from(users).where(eq(users.id, eventType.userId)).get();

	return {
		notFound: false,
		eventType: {
			id: eventType.id,
			title: eventType.title,
			slug: eventType.slug,
			description: eventType.description,
			durationMinutes: eventType.durationMinutes,
			color: eventType.color,
			location: eventType.location,
			maxDaysOut: eventType.maxDaysOut
		},
		ownerName: owner?.name || 'Unknown'
	};
};
