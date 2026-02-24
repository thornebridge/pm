import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { taskWatchers, users } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { broadcastWatcherChanged } from '$lib/server/ws/handlers.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const watchers = await db
		.select({ userId: taskWatchers.userId, userName: users.name })
		.from(taskWatchers)
		.innerJoin(users, eq(taskWatchers.userId, users.id))
		.where(eq(taskWatchers.taskId, event.params.taskId));

	return json(watchers);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const now = Date.now();

	const [existing] = await db
		.select()
		.from(taskWatchers)
		.where(and(eq(taskWatchers.taskId, event.params.taskId), eq(taskWatchers.userId, user.id)));

	if (existing) {
		return json({ watching: true });
	}

	await db.insert(taskWatchers)
		.values({
			taskId: event.params.taskId,
			userId: user.id,
			createdAt: now
		});

	broadcastWatcherChanged(event.params.projectId, user.id);
	return json({ watching: true }, { status: 201 });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);

	await db.delete(taskWatchers)
		.where(and(eq(taskWatchers.taskId, event.params.taskId), eq(taskWatchers.userId, user.id)));

	broadcastWatcherChanged(event.params.projectId, user.id);
	return json({ watching: false });
};
