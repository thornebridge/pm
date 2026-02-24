import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { dialSessions } from '$lib/server/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/** GET — list dial sessions for the current user */
export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const url = event.url;

	const status = url.searchParams.get('status');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const conditions = [eq(dialSessions.userId, user.id)];
	if (status) {
		conditions.push(eq(dialSessions.status, status as 'active' | 'paused' | 'completed'));
	}

	const where = conditions.length === 1 ? conditions[0] : and(...conditions);

	const sessions = db
		.select()
		.from(dialSessions)
		.where(where)
		.orderBy(desc(dialSessions.createdAt))
		.limit(limit)
		.offset(offset)
		.all();

	return json(sessions);
};

/** POST — create a new dial session */
export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	if (!body.name?.trim()) {
		return json({ error: 'Session name is required' }, { status: 400 });
	}

	const now = Date.now();
	const session = {
		id: nanoid(12),
		name: body.name.trim(),
		status: 'active' as const,
		userId: user.id,
		totalContacts: 0,
		completedContacts: 0,
		totalConnected: 0,
		totalNoAnswer: 0,
		totalDurationSeconds: 0,
		startedAt: null,
		endedAt: null,
		createdAt: now,
		updatedAt: now
	};

	db.insert(dialSessions).values(session).run();
	return json(session, { status: 201 });
};
