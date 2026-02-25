import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { bookingEventTypes } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

const MAX_LOGO_SIZE = 512 * 1024; // 512KB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const [existing] = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!existing) return json({ error: 'Not found' }, { status: 404 });

	const formData = await event.request.formData();
	const file = formData.get('file') as File | null;

	if (!file) return json({ error: 'No file provided' }, { status: 400 });
	if (file.size > MAX_LOGO_SIZE) return json({ error: 'Logo must be under 512KB' }, { status: 400 });
	if (!ALLOWED_TYPES.includes(file.type)) {
		return json({ error: 'Logo must be PNG, JPEG, SVG, or WebP' }, { status: 400 });
	}

	const arrayBuffer = await file.arrayBuffer();
	const base64 = Buffer.from(arrayBuffer).toString('base64');

	await db
		.update(bookingEventTypes)
		.set({
			logoData: base64,
			logoMimeType: file.type,
			updatedAt: Date.now()
		})
		.where(eq(bookingEventTypes.id, event.params.id));

	return json({ success: true, mimeType: file.type });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const [existing] = await db
		.select({ id: bookingEventTypes.id })
		.from(bookingEventTypes)
		.where(and(eq(bookingEventTypes.id, event.params.id), eq(bookingEventTypes.userId, user.id)));

	if (!existing) return json({ error: 'Not found' }, { status: 404 });

	await db
		.update(bookingEventTypes)
		.set({
			logoData: null,
			logoMimeType: null,
			updatedAt: Date.now()
		})
		.where(eq(bookingEventTypes.id, event.params.id));

	return json({ success: true });
};
