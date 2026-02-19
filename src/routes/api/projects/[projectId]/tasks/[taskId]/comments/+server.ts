import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { comments, activityLog, users } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastCommentAdded } from '$lib/server/ws/handlers.js';
import { notifyNewComment, notifyMention } from '$lib/server/notifications/triggers.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const result = db
		.select({
			id: comments.id,
			body: comments.body,
			createdAt: comments.createdAt,
			updatedAt: comments.updatedAt,
			userId: comments.userId,
			userName: users.name
		})
		.from(comments)
		.innerJoin(users, eq(comments.userId, users.id))
		.where(eq(comments.taskId, event.params.taskId))
		.orderBy(asc(comments.createdAt))
		.all();

	return json(result);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { body } = await event.request.json();

	if (!body?.trim()) {
		return json({ error: 'Comment body is required' }, { status: 400 });
	}

	const now = Date.now();
	const id = nanoid(12);

	db.insert(comments)
		.values({
			id,
			taskId: event.params.taskId,
			userId: user.id,
			body: body.trim(),
			createdAt: now,
			updatedAt: now
		})
		.run();

	db.insert(activityLog)
		.values({
			id: nanoid(12),
			taskId: event.params.taskId,
			userId: user.id,
			action: 'commented',
			detail: JSON.stringify({ commentId: id }),
			createdAt: now
		})
		.run();

	const result = { id, body: body.trim(), userId: user.id, userName: user.name, createdAt: now, updatedAt: now };
	broadcastCommentAdded(event.params.projectId, event.params.taskId, result, user.id);
	notifyNewComment(event.params.taskId, user.id, user.name).catch(() => {});

	// Parse @mentions and notify mentioned users
	const mentionMatches = body.matchAll(/@(\w[\w\s]*?\w|\w+)/g);
	const allUsers = db.select({ id: users.id, name: users.name }).from(users).all();
	const userNameMap = new Map(allUsers.map((u: { id: string; name: string }) => [u.name.toLowerCase(), u.id]));
	for (const match of mentionMatches) {
		const mentionedName = match[1].trim().toLowerCase();
		const mentionedId = userNameMap.get(mentionedName);
		if (mentionedId && mentionedId !== user.id) {
			notifyMention(event.params.taskId, mentionedId, user.name, user.id).catch(() => {});
		}
	}

	return json(result, { status: 201 });
};
