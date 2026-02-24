import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const [row] = await db
		.select()
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!row) return json({ error: 'Not found' }, { status: 404 });
	return json(row);
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

	await db.update(bookingEventTypes).set(updates).where(eq(bookingEventTypes.id, event.params.id));

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
