import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { dialQueueItems } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

/** POST — bulk reorder queue items */
export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const { sessionId } = event.params;
	const body = await event.request.json();

	const items: Array<{ id: string; position: number }> = body.items;
	if (!Array.isArray(items) || items.length === 0) {
		return json({ error: 'items array is required' }, { status: 400 });
	}

	for (const item of items) {
		await db.update(dialQueueItems)
			.set({ position: item.position })
			.where(eq(dialQueueItems.id, item.id));
	}

	return json({ ok: true });
};
