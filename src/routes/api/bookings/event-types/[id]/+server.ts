import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import {
	bookingEventTypes,
	bookingAvailabilitySchedules,
	bookingAvailabilityOverrides
} from '$lib/server/db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const [row] = await db
		.select()
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!row) return json({ error: 'Not found' }, { status: 404 });

	// Fetch default schedules and overrides
	const schedules = await db
		.select()
		.from(bookingAvailabilitySchedules)
		.where(
			and(
				eq(bookingAvailabilitySchedules.eventTypeId, event.params.id),
				isNull(bookingAvailabilitySchedules.userId)
			)
		)
		.orderBy(bookingAvailabilitySchedules.dayOfWeek);

	const overrides = await db
		.select()
		.from(bookingAvailabilityOverrides)
		.where(
			and(
				eq(bookingAvailabilityOverrides.eventTypeId, event.params.id),
				isNull(bookingAvailabilityOverrides.userId)
			)
		)
		.orderBy(bookingAvailabilityOverrides.date);

	return json({ ...row, schedules, overrides });
};

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const [existing] = await db
		.select()
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!existing) return json({ error: 'Not found' }, { status: 404 });

	// Check slug uniqueness if changing
	if (body.slug !== undefined) {
		const slug = slugify(body.slug.trim());
		if (slug && slug !== existing.slug) {
			const [conflict] = await db
				.select({ id: bookingEventTypes.id })
				.from(bookingEventTypes)
				.where(eq(bookingEventTypes.slug, slug));
			if (conflict) {
				return json({ error: 'This URL slug is already taken' }, { status: 409 });
			}
		}
	}

	const updates: Record<string, unknown> = { updatedAt: Date.now() };
	if (body.title !== undefined) updates.title = body.title.trim();
	if (body.slug !== undefined) updates.slug = slugify(body.slug.trim());
	if (body.description !== undefined) updates.description = body.description?.trim() || null;
	if (body.durationMinutes !== undefined) updates.durationMinutes = body.durationMinutes;
	if (body.color !== undefined) updates.color = body.color;
	if (body.location !== undefined) updates.location = body.location?.trim() || null;
	if (body.bufferMinutes !== undefined) updates.bufferMinutes = body.bufferMinutes;
	if (body.minNoticeHours !== undefined) updates.minNoticeHours = body.minNoticeHours;
	if (body.maxDaysOut !== undefined) updates.maxDaysOut = body.maxDaysOut;
	if (body.isActive !== undefined) updates.isActive = body.isActive;
	if (body.schedulingType !== undefined) updates.schedulingType = body.schedulingType;
	if (body.roundRobinMode !== undefined) updates.roundRobinMode = body.roundRobinMode;

	await db.update(bookingEventTypes).set(updates).where(eq(bookingEventTypes.id, event.params.id));

	// Update schedules if provided (delete-and-replace default schedules)
	if (body.schedules) {
		await db.delete(bookingAvailabilitySchedules).where(
			and(
				eq(bookingAvailabilitySchedules.eventTypeId, event.params.id),
				isNull(bookingAvailabilitySchedules.userId)
			)
		);
		const scheduleRows = body.schedules.map(
			(s: { dayOfWeek: number; startTime: string; endTime: string; enabled: boolean }) => ({
				id: nanoid(12),
				eventTypeId: event.params.id,
				userId: null,
				dayOfWeek: s.dayOfWeek,
				startTime: s.startTime,
				endTime: s.endTime,
				enabled: s.enabled
			})
		);
		if (scheduleRows.length > 0) {
			await db.insert(bookingAvailabilitySchedules).values(scheduleRows);
		}
	}

	// Update overrides if provided (delete-and-replace default overrides)
	if (body.overrides) {
		await db.delete(bookingAvailabilityOverrides).where(
			and(
				eq(bookingAvailabilityOverrides.eventTypeId, event.params.id),
				isNull(bookingAvailabilityOverrides.userId)
			)
		);
		const overrideRows = body.overrides.map(
			(o: { date: string; startTime?: string; endTime?: string; isBlocked: boolean }) => ({
				id: nanoid(12),
				eventTypeId: event.params.id,
				userId: null,
				date: o.date,
				startTime: o.isBlocked ? null : o.startTime || null,
				endTime: o.isBlocked ? null : o.endTime || null,
				isBlocked: o.isBlocked
			})
		);
		if (overrideRows.length > 0) {
			await db.insert(bookingAvailabilityOverrides).values(overrideRows);
		}
	}

	const [updated] = await db.select().from(bookingEventTypes).where(eq(bookingEventTypes.id, event.params.id));
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const [existingDel] = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!existingDel) return json({ error: 'Not found' }, { status: 404 });

	await db.delete(bookingEventTypes).where(eq(bookingEventTypes.id, event.params.id));
	return json({ success: true });
};
