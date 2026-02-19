import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { comments } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { body } = await event.request.json();

	if (!body?.trim()) {
		return json({ error: 'Comment body is required' }, { status: 400 });
	}

	const comment = db
		.select()
		.from(comments)
		.where(and(eq(comments.id, event.params.commentId), eq(comments.taskId, event.params.taskId)))
		.get();

	if (!comment) return json({ error: 'Comment not found' }, { status: 404 });
	if (comment.userId !== user.id) return json({ error: 'Forbidden' }, { status: 403 });

	db.update(comments)
		.set({ body: body.trim(), updatedAt: Date.now() })
		.where(eq(comments.id, event.params.commentId))
		.run();

	return json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const comment = db
		.select()
		.from(comments)
		.where(and(eq(comments.id, event.params.commentId), eq(comments.taskId, event.params.taskId)))
		.get();

	if (!comment) return json({ error: 'Comment not found' }, { status: 404 });
	if (comment.userId !== user.id && user.role !== 'admin') {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	db.delete(comments).where(eq(comments.id, event.params.commentId)).run();
	return json({ ok: true });
};
