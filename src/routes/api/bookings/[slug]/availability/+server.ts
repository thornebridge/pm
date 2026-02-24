import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { getAvailableSlots } from '$lib/server/bookings/availability.js';

export const GET: RequestHandler = async (event) => {
	const slug = event.params.slug;
	const date = event.url.searchParams.get('date');
	const timezone = event.url.searchParams.get('timezone') || 'America/New_York';

	if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
		return json({ error: 'date parameter required (YYYY-MM-DD)' }, { status: 400 });
	}

	const eventType = db
		.select({ id: bookingEventTypes.id, isActive: bookingEventTypes.isActive })
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.slug, slug), eq(bookingEventTypes.isActive, true)))
		.get();

	if (!eventType) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	const slots = await getAvailableSlots(eventType.id, date, timezone);
	return json({ slots });
};
