import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { taskLabels } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastLabelChanged } from '$lib/server/ws/handlers.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const labels = await db
		.select()
		.from(taskLabels)
		.where(eq(taskLabels.projectId, event.params.projectId));

	return json(labels);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { name, color } = await event.request.json();

	if (!name?.trim()) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const label = {
		id: nanoid(12),
		projectId: event.params.projectId,
		name: name.trim(),
		color: color || '#6366f1',
		createdAt: Date.now()
	};

	await db.insert(taskLabels).values(label);
	broadcastLabelChanged(event.params.projectId, user.id);
	return json(label, { status: 201 });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { id } = await event.request.json();

	if (!id) {
		return json({ error: 'id is required' }, { status: 400 });
	}

	// CASCADE on task_label_assignments handles cleanup
	await db.delete(taskLabels)
		.where(and(eq(taskLabels.id, id), eq(taskLabels.projectId, event.params.projectId)));

	broadcastLabelChanged(event.params.projectId, user.id);
	return json({ ok: true });
};
