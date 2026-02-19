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
	const { name, description, color } = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	if (name !== undefined) updates.name = name.trim();
	if (description !== undefined) updates.description = description?.trim() || null;
	if (color !== undefined) updates.color = color;

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
