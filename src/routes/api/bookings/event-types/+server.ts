import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, bookings } from '$lib/server/db/schema.js';
import { eq, sql, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const rows = await db
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
			createdAt: bookingEventTypes.createdAt,
			bookingCount: sql<number>`(SELECT COUNT(*) FROM bookings WHERE bookings.event_type_id = ${bookingEventTypes.id} AND bookings.status = 'confirmed')`
		})
		.from(bookingEventTypes)
		.where(eq(bookingEventTypes.userId, user.id))
		.orderBy(bookingEventTypes.createdAt);

	return json(rows);
};

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (!body.title?.trim()) {
		return json({ error: 'Title is required' }, { status: 400 });
	}

	const slug = body.slug?.trim() ? slugify(body.slug.trim()) : slugify(body.title.trim());
	if (!slug) {
		return json({ error: 'A valid slug is required' }, { status: 400 });
	}

	// Check slug uniqueness
	const [existing] = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(eq(bookingEventTypes.slug, slug));
	if (existing) {
		return json({ error: 'This URL slug is already taken' }, { status: 409 });
	}

	const now = Date.now();
	const eventType = {
		id: nanoid(12),
		userId: user.id,
		title: body.title.trim(),
		slug,
		description: body.description?.trim() || null,
		durationMinutes: body.durationMinutes || 30,
		color: body.color || '#6366f1',
		location: body.location?.trim() || null,
		bufferMinutes: body.bufferMinutes ?? 0,
		minNoticeHours: body.minNoticeHours ?? 4,
		maxDaysOut: body.maxDaysOut ?? 60,
		isActive: true,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(bookingEventTypes).values(eventType);
	return json(eventType, { status: 201 });
};
