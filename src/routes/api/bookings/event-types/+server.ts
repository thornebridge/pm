import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, bookings, bookingAvailabilitySchedules } from '$lib/server/db/schema.js';
import { eq, sql } from 'drizzle-orm';
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
			schedulingType: bookingEventTypes.schedulingType,
			roundRobinMode: bookingEventTypes.roundRobinMode,
			logoMimeType: bookingEventTypes.logoMimeType,
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

const DEFAULT_SCHEDULES = [
	{ dayOfWeek: 0, startTime: '09:00', endTime: '17:00', enabled: false },
	{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00', enabled: true },
	{ dayOfWeek: 2, startTime: '09:00', endTime: '17:00', enabled: true },
	{ dayOfWeek: 3, startTime: '09:00', endTime: '17:00', enabled: true },
	{ dayOfWeek: 4, startTime: '09:00', endTime: '17:00', enabled: true },
	{ dayOfWeek: 5, startTime: '09:00', endTime: '17:00', enabled: true },
	{ dayOfWeek: 6, startTime: '09:00', endTime: '17:00', enabled: false }
];

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
	const eventTypeId = nanoid(12);
	const eventType = {
		id: eventTypeId,
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
		schedulingType: body.schedulingType || 'individual',
		roundRobinMode: body.roundRobinMode || null,
		lastAssignedUserId: null,
		logoData: null,
		logoMimeType: null,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(bookingEventTypes).values(eventType);

	// Create availability schedules
	const schedules = body.schedules || DEFAULT_SCHEDULES;
	const scheduleRows = schedules.map((s: { dayOfWeek: number; startTime: string; endTime: string; enabled: boolean }) => ({
		id: nanoid(12),
		eventTypeId: eventTypeId,
		userId: null,
		dayOfWeek: s.dayOfWeek,
		startTime: s.startTime,
		endTime: s.endTime,
		enabled: s.enabled
	}));

	if (scheduleRows.length > 0) {
		await db.insert(bookingAvailabilitySchedules).values(scheduleRows);
	}

	return json(eventType, { status: 201 });
};
