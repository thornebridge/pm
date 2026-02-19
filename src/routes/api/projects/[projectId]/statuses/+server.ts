import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { taskStatuses, tasks } from '$lib/server/db/schema.js';
import { eq, asc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const statuses = db
		.select()
		.from(taskStatuses)
		.where(eq(taskStatuses.projectId, event.params.projectId))
		.orderBy(asc(taskStatuses.position))
		.all();

	return json(statuses);
};

export const POST: RequestHandler = async (event) => {
	requireAuth(event);
	const { name, color, position, isClosed } = await event.request.json();

	if (!name?.trim()) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const status = {
		id: nanoid(12),
		projectId: event.params.projectId,
		name: name.trim(),
		color: color || '#64748b',
		position: position ?? 0,
		isClosed: isClosed ?? false,
		createdAt: Date.now()
	};

	db.insert(taskStatuses).values(status).run();
	return json(status, { status: 201 });
};

// Batch reorder
export const PUT: RequestHandler = async (event) => {
	requireAuth(event);
	const { order } = await event.request.json();

	if (!Array.isArray(order)) {
		return json({ error: 'order must be an array of { id, position }' }, { status: 400 });
	}

	for (const item of order) {
		db.update(taskStatuses)
			.set({ position: item.position })
			.where(eq(taskStatuses.id, item.id))
			.run();
	}

	return json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { id } = await event.request.json();

	if (!id) {
		return json({ error: 'id is required' }, { status: 400 });
	}

	// Check if any tasks use this status
	const usage = db
		.select({ id: tasks.id })
		.from(tasks)
		.where(and(eq(tasks.statusId, id), eq(tasks.projectId, event.params.projectId)))
		.limit(1)
		.all();

	if (usage.length > 0) {
		return json({ error: 'Cannot delete status — tasks are still using it. Move or delete those tasks first.' }, { status: 400 });
	}

	db.delete(taskStatuses)
		.where(and(eq(taskStatuses.id, id), eq(taskStatuses.projectId, event.params.projectId)))
		.run();

	return json({ ok: true });
};
