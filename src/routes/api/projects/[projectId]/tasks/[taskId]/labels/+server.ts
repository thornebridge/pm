import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { taskLabelAssignments, activityLog } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { labelId } = await event.request.json();

	if (!labelId) {
		return json({ error: 'labelId is required' }, { status: 400 });
	}

	db.insert(taskLabelAssignments)
		.values({ taskId: event.params.taskId, labelId })
		.onConflictDoNothing()
		.run();

	db.insert(activityLog)
		.values({
			id: nanoid(12),
			taskId: event.params.taskId,
			userId: user.id,
			action: 'label_added',
			detail: JSON.stringify({ labelId }),
			createdAt: Date.now()
		})
		.run();

	return json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { labelId } = await event.request.json();

	if (!labelId) {
		return json({ error: 'labelId is required' }, { status: 400 });
	}

	db.delete(taskLabelAssignments)
		.where(
			and(
				eq(taskLabelAssignments.taskId, event.params.taskId),
				eq(taskLabelAssignments.labelId, labelId)
			)
		)
		.run();

	db.insert(activityLog)
		.values({
			id: nanoid(12),
			taskId: event.params.taskId,
			userId: user.id,
			action: 'label_removed',
			detail: JSON.stringify({ labelId }),
			createdAt: Date.now()
		})
		.run();

	return json({ ok: true });
};
