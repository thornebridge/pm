import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, bookingCustomFields, users } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const [eventType] = await db
		.select({
			id: bookingEventTypes.id,
			title: bookingEventTypes.title,
			slug: bookingEventTypes.slug,
			description: bookingEventTypes.description,
			durationMinutes: bookingEventTypes.durationMinutes,
			color: bookingEventTypes.color,
			location: bookingEventTypes.location,
			maxDaysOut: bookingEventTypes.maxDaysOut,
			userId: bookingEventTypes.userId,
			logoData: bookingEventTypes.logoData,
			logoMimeType: bookingEventTypes.logoMimeType
		})
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.slug, params.slug), eq(bookingEventTypes.isActive, true)));

	if (!eventType) {
		return { notFound: true, eventType: null, ownerName: null, customFields: [] };
	}

	const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, eventType.userId));

	const customFields = await db
		.select()
		.from(bookingCustomFields)
		.where(eq(bookingCustomFields.eventTypeId, eventType.id))
		.orderBy(bookingCustomFields.position);

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
			maxDaysOut: eventType.maxDaysOut,
			logoData: eventType.logoData,
			logoMimeType: eventType.logoMimeType
		},
		ownerName: owner?.name || 'Unknown',
		customFields: customFields.map((f) => ({
			id: f.id,
			label: f.label,
			type: f.type,
			required: f.required,
			placeholder: f.placeholder,
			options: f.options ? JSON.parse(f.options) : [],
			position: f.position,
			conditionalFieldId: f.conditionalFieldId,
			conditionalValue: f.conditionalValue
		}))
	};
};
