import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { savedViews } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const views = db
		.select()
		.from(savedViews)
		.where(and(eq(savedViews.projectId, event.params.projectId), eq(savedViews.userId, user.id)))
		.orderBy(savedViews.createdAt)
		.all();

	return json(views);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { name, filters } = await event.request.json();

	if (!name?.trim()) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const view = {
		id: nanoid(12),
		projectId: event.params.projectId,
		userId: user.id,
		name: name.trim(),
		filters: JSON.stringify(filters || {}),
		createdAt: Date.now()
	};

	db.insert(savedViews).values(view).run();
	return json(view, { status: 201 });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { id } = await event.request.json();

	db.delete(savedViews)
		.where(and(eq(savedViews.id, id), eq(savedViews.userId, user.id)))
		.run();

	return json({ ok: true });
};
