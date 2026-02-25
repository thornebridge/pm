import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, bookingCustomFields } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const [et] = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!et) return json({ error: 'Not found' }, { status: 404 });

	const updates: Record<string, unknown> = {};
	if (body.label !== undefined) updates.label = body.label.trim();
	if (body.type !== undefined) updates.type = body.type;
	if (body.required !== undefined) updates.required = body.required;
	if (body.placeholder !== undefined) updates.placeholder = body.placeholder?.trim() || null;
	if (body.options !== undefined) updates.options = body.options?.length ? JSON.stringify(body.options) : null;
	if (body.position !== undefined) updates.position = body.position;
	if (body.conditionalFieldId !== undefined) updates.conditionalFieldId = body.conditionalFieldId || null;
	if (body.conditionalValue !== undefined) updates.conditionalValue = body.conditionalValue || null;

	if (Object.keys(updates).length > 0) {
		await db
			.update(bookingCustomFields)
			.set(updates)
			.where(eq(bookingCustomFields.id, event.params.fieldId));
	}

	const [updated] = await db.select().from(bookingCustomFields).where(eq(bookingCustomFields.id, event.params.fieldId));
	return json({ ...updated, options: updated.options ? JSON.parse(updated.options) : [] });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const [et] = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!et) return json({ error: 'Not found' }, { status: 404 });

	await db.delete(bookingCustomFields).where(eq(bookingCustomFields.id, event.params.fieldId));
	return json({ success: true });
};
