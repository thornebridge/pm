import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { savedViews } from '$lib/server/db/schema.js';
import { eq, and, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastViewChanged } from '$lib/server/ws/handlers.js';

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const views = await db
		.select()
		.from(savedViews)
		.where(
			or(
				and(eq(savedViews.projectId, event.params.projectId), eq(savedViews.userId, user.id)),
				and(eq(savedViews.projectId, event.params.projectId), eq(savedViews.shared, true))
			)
		)
		.orderBy(savedViews.createdAt);

	return json(views);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { name, filters, shared } = await event.request.json();

	if (!name?.trim()) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const now = Date.now();
	const view = {
		id: nanoid(12),
		projectId: event.params.projectId,
		userId: user.id,
		name: name.trim(),
		filters: JSON.stringify(filters || {}),
		shared: shared === true,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(savedViews).values(view);
	broadcastViewChanged(event.params.projectId, user.id);
	return json(view, { status: 201 });
};

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { id, name, filters, shared } = await event.request.json();

	if (!id) {
		return json({ error: 'View ID is required' }, { status: 400 });
	}

	// Only the owner can update
	const [existing] = await db
		.select()
		.from(savedViews)
		.where(and(eq(savedViews.id, id), eq(savedViews.userId, user.id)));

	if (!existing) {
		return json({ error: 'View not found' }, { status: 404 });
	}

	const updates: Record<string, unknown> = { updatedAt: Date.now() };
	if (name !== undefined) updates.name = name.trim();
	if (filters !== undefined) updates.filters = JSON.stringify(filters);
	if (shared !== undefined) updates.shared = shared === true;

	await db.update(savedViews)
		.set(updates)
		.where(eq(savedViews.id, id));

	const [updated] = await db.select().from(savedViews).where(eq(savedViews.id, id));
	broadcastViewChanged(event.params.projectId, user.id);
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { id } = await event.request.json();

	await db.delete(savedViews)
		.where(and(eq(savedViews.id, id), eq(savedViews.userId, user.id)));

	broadcastViewChanged(event.params.projectId, user.id);
	return json({ ok: true });
};
