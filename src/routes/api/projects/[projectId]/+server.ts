import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { projects, tasks, taskStatuses, taskLabels, attachments } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { broadcastProjectChanged } from '$lib/server/ws/handlers.js';
import { indexDocument, removeDocument } from '$lib/server/search/meilisearch.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const [project] = await db.select().from(projects).where(eq(projects.id, event.params.projectId));

	if (!project) {
		return json({ error: 'Project not found' }, { status: 404 });
	}

	return json(project);
};

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	if (body.name !== undefined) updates.name = body.name.trim();
	if (body.description !== undefined) updates.description = body.description?.trim() || null;
	if (body.color !== undefined) updates.color = body.color;
	if (body.archived !== undefined) updates.archived = body.archived;
	if (body.readme !== undefined) updates.readme = body.readme?.trim() || null;
	if (body.defaultAssigneeId !== undefined) updates.defaultAssigneeId = body.defaultAssigneeId || null;

	const result = await db
		.update(projects)
		.set(updates)
		.where(eq(projects.id, event.params.projectId))
		.returning({ id: projects.id });

	if (result.length === 0) {
		return json({ error: 'Project not found' }, { status: 404 });
	}

	const [updated] = await db.select().from(projects).where(eq(projects.id, event.params.projectId));
	if (updated) indexDocument('projects', { id: updated.id, name: updated.name, slug: updated.slug, description: updated.description, archived: updated.archived, updatedAt: updated.updatedAt });
	broadcastProjectChanged('updated');
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);

	// Collect attachment file paths before cascading delete
	const files = await db
		.select({ path: attachments.storagePath })
		.from(attachments)
		.innerJoin(tasks, eq(attachments.taskId, tasks.id))
		.where(eq(tasks.projectId, event.params.projectId));

	await db.delete(projects).where(eq(projects.id, event.params.projectId));
	removeDocument('projects', event.params.projectId);

	// Clean up files after DB delete (non-blocking)
	for (const f of files) {
		unlink(f.path).catch(() => {});
	}

	broadcastProjectChanged('deleted');
	return json({ ok: true });
};
