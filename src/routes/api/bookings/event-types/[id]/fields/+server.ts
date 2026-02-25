import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes, bookingCustomFields } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const [et] = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!et) return json({ error: 'Not found' }, { status: 404 });

	const fields = await db
		.select()
		.from(bookingCustomFields)
		.where(eq(bookingCustomFields.eventTypeId, event.params.id))
		.orderBy(bookingCustomFields.position);

	return json(fields.map((f) => ({
		...f,
		options: f.options ? JSON.parse(f.options) : []
	})));
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const [et] = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!et) return json({ error: 'Not found' }, { status: 404 });

	if (!body.label?.trim()) return json({ error: 'Label is required' }, { status: 400 });
	if (!body.type) return json({ error: 'Type is required' }, { status: 400 });

	const field = {
		id: nanoid(12),
		eventTypeId: event.params.id,
		label: body.label.trim(),
		type: body.type,
		required: body.required ?? false,
		placeholder: body.placeholder?.trim() || null,
		options: body.options ? JSON.stringify(body.options) : null,
		position: body.position ?? 0,
		conditionalFieldId: body.conditionalFieldId || null,
		conditionalValue: body.conditionalValue || null
	};

	await db.insert(bookingCustomFields).values(field);
	return json({ ...field, options: body.options || [] }, { status: 201 });
};

/** Bulk replace all fields (for drag-and-drop reordering) */
export const PUT: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	const [et] = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!et) return json({ error: 'Not found' }, { status: 404 });

	if (!Array.isArray(body.fields)) return json({ error: 'fields array is required' }, { status: 400 });

	// Delete all existing fields and recreate
	await db.delete(bookingCustomFields).where(eq(bookingCustomFields.eventTypeId, event.params.id));

	const fields = body.fields.map(
		(f: { label: string; type: string; required?: boolean; placeholder?: string; options?: string[]; conditionalFieldId?: string; conditionalValue?: string }, i: number) => ({
			id: nanoid(12),
			eventTypeId: event.params.id,
			label: f.label.trim(),
			type: f.type,
			required: f.required ?? false,
			placeholder: f.placeholder?.trim() || null,
			options: f.options?.length ? JSON.stringify(f.options) : null,
			position: i,
			conditionalFieldId: f.conditionalFieldId || null,
			conditionalValue: f.conditionalValue || null
		})
	);

	if (fields.length > 0) {
		await db.insert(bookingCustomFields).values(fields);
	}

	return json(fields.map((f: typeof fields[number]) => ({ ...f, options: f.options ? JSON.parse(f.options) : [] })));
};
