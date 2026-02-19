import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { projects, tasks, taskStatuses, taskLabels, attachments } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const project = db.select().from(projects).where(eq(projects.id, event.params.projectId)).get();

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

	const result = db
		.update(projects)
		.set(updates)
		.where(eq(projects.id, event.params.projectId))
		.run();

	if (result.changes === 0) {
		return json({ error: 'Project not found' }, { status: 404 });
	}

	const updated = db.select().from(projects).where(eq(projects.id, event.params.projectId)).get();
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);

	// Collect attachment file paths before cascading delete
	const files = db
		.select({ path: attachments.storagePath })
		.from(attachments)
		.innerJoin(tasks, eq(attachments.taskId, tasks.id))
		.where(eq(tasks.projectId, event.params.projectId))
		.all();

	db.delete(projects).where(eq(projects.id, event.params.projectId)).run();

	// Clean up files after DB delete (non-blocking)
	for (const f of files) {
		unlink(f.path).catch(() => {});
	}

	return json({ ok: true });
};
