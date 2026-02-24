import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { timeEntries, users } from '$lib/server/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastTimeEntryChanged } from '$lib/server/ws/handlers.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { taskId } = event.params;

	const entries = await db
		.select({
			id: timeEntries.id,
			description: timeEntries.description,
			startedAt: timeEntries.startedAt,
			stoppedAt: timeEntries.stoppedAt,
			durationMs: timeEntries.durationMs,
			userName: users.name
		})
		.from(timeEntries)
		.innerJoin(users, eq(timeEntries.userId, users.id))
		.where(eq(timeEntries.taskId, taskId))
		.orderBy(desc(timeEntries.startedAt));

	return json(entries);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { taskId } = event.params;
	const { description, startedAt, stoppedAt, durationMs } = await event.request.json();

	const id = nanoid(12);
	const now = Date.now();

	const entry = {
		id,
		taskId,
		userId: user.id,
		description: description?.trim() || null,
		startedAt: startedAt || now,
		stoppedAt: stoppedAt || null,
		durationMs: durationMs || null,
		createdAt: now
	};

	await db.insert(timeEntries).values(entry);
	broadcastTimeEntryChanged(event.params.projectId, user.id);
	return json(entry, { status: 201 });
};
