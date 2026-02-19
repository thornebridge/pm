import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { timeEntries } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { entryId } = event.params;
	const body = await event.request.json();

	const updates: Record<string, unknown> = {};
	if (body.description !== undefined) updates.description = body.description?.trim() || null;
	if (body.stoppedAt !== undefined) updates.stoppedAt = body.stoppedAt;
	if (body.durationMs !== undefined) updates.durationMs = body.durationMs;

	if (Object.keys(updates).length > 0) {
		db.update(timeEntries).set(updates).where(eq(timeEntries.id, entryId)).run();
	}

	const updated = db.select().from(timeEntries).where(eq(timeEntries.id, entryId)).get();
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { entryId } = event.params;
	db.delete(timeEntries).where(eq(timeEntries.id, entryId)).run();
	return json({ ok: true });
};
