import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { taskLabels } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const labels = db
		.select()
		.from(taskLabels)
		.where(eq(taskLabels.projectId, event.params.projectId))
		.all();

	return json(labels);
};

export const POST: RequestHandler = async (event) => {
	requireAuth(event);
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

	db.insert(taskLabels).values(label).run();
	return json(label, { status: 201 });
};
