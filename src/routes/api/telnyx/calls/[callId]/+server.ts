import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { telnyxCallLogs } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

/** PATCH — update call notes or status */
export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { callId } = event.params;
	const body = await event.request.json();

	const [existing] = await db.select().from(telnyxCallLogs).where(eq(telnyxCallLogs.id, callId));
	if (!existing) {
		return json({ error: 'Call log not found' }, { status: 404 });
	}

	const updates: Record<string, unknown> = { updatedAt: Date.now() };
	if (typeof body.notes === 'string') updates.notes = body.notes;
	if (typeof body.status === 'string') updates.status = body.status;
	if (typeof body.endedAt === 'number') updates.endedAt = body.endedAt;
	if (typeof body.answeredAt === 'number') updates.answeredAt = body.answeredAt;
	if (typeof body.durationSeconds === 'number') updates.durationSeconds = body.durationSeconds;
	if (typeof body.telnyxCallControlId === 'string') updates.telnyxCallControlId = body.telnyxCallControlId;
	if (typeof body.telnyxCallSessionId === 'string') updates.telnyxCallSessionId = body.telnyxCallSessionId;

	await db.update(telnyxCallLogs).set(updates).where(eq(telnyxCallLogs.id, callId));

	return json({ ...existing, ...updates });
};
