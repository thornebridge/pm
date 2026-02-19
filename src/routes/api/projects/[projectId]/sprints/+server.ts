import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { sprints } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { projectId } = event.params;

	const all = db
		.select()
		.from(sprints)
		.where(eq(sprints.projectId, projectId))
		.orderBy(desc(sprints.createdAt))
		.all();

	return json(all);
};

export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const { projectId } = event.params;
	const { name, goal, startDate, endDate } = await event.request.json();

	if (!name?.trim()) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const id = nanoid(12);
	const sprint = {
		id,
		projectId,
		name: name.trim(),
		goal: goal?.trim() || null,
		startDate: startDate || null,
		endDate: endDate || null,
		status: 'planning' as const,
		createdAt: Date.now()
	};

	db.insert(sprints).values(sprint).run();

	if (globalThis.__wsBroadcast) {
		globalThis.__wsBroadcast(projectId, { type: 'sprint:created', sprint });
	}

	return json(sprint, { status: 201 });
};
