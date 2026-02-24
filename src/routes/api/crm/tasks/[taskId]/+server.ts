import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmTasks } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { taskId } = event.params;

	const [existing] = await db.select().from(crmTasks).where(eq(crmTasks.id, taskId));
	if (!existing) return json({ error: 'Task not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	const fields = [
		'title',
		'description',
		'dueDate',
		'completedAt',
		'priority',
		'companyId',
		'contactId',
		'opportunityId',
		'assigneeId'
	];
	for (const f of fields) {
		if (f in body) updates[f] = body[f];
	}

	// Toggle completion
	if ('completed' in body) {
		updates.completedAt = body.completed ? Date.now() : null;
	}

	await db.update(crmTasks).set(updates).where(eq(crmTasks.id, taskId));
	const [updated] = await db.select().from(crmTasks).where(eq(crmTasks.id, taskId));
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { taskId } = event.params;

	const [existing] = await db.select().from(crmTasks).where(eq(crmTasks.id, taskId));
	if (!existing) return json({ error: 'Task not found' }, { status: 404 });

	await db.delete(crmTasks).where(eq(crmTasks.id, taskId));
	return json({ ok: true });
};
