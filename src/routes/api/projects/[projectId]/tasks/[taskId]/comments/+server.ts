import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { comments, activityLog, users, tasks, projects } from '$lib/server/db/schema.js';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastCommentAdded } from '$lib/server/ws/handlers.js';
import { notifyNewComment, notifyMention } from '$lib/server/notifications/triggers.js';
import { emitAutomationEvent } from '$lib/server/automations/emit.js';
import { indexDocument } from '$lib/server/search/meilisearch.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const result = await db
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
		.orderBy(asc(comments.createdAt));

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

	await db.insert(comments)
		.values({
			id,
			taskId: event.params.taskId,
			userId: user.id,
			body: body.trim(),
			createdAt: now,
			updatedAt: now
		});

	await db.insert(activityLog)
		.values({
			id: nanoid(12),
			taskId: event.params.taskId,
			userId: user.id,
			action: 'commented',
			detail: JSON.stringify({ commentId: id }),
			createdAt: now
		});

	const result = { id, body: body.trim(), userId: user.id, userName: user.name, createdAt: now, updatedAt: now };
	const [taskForIndex] = await db.select({ number: tasks.number, title: tasks.title, projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, event.params.taskId));
	const [projForIndex] = await db.select({ slug: projects.slug }).from(projects).where(eq(projects.id, event.params.projectId));
	indexDocument('comments', { id, body: body.trim(), taskId: event.params.taskId, taskNumber: taskForIndex?.number, taskTitle: taskForIndex?.title, projectId: event.params.projectId, projectSlug: projForIndex?.slug, createdAt: now });
	broadcastCommentAdded(event.params.projectId, event.params.taskId, result, user.id);
	notifyNewComment(event.params.taskId, user.id, user.name).catch(() => {});

	const [task] = await db.select().from(tasks).where(eq(tasks.id, event.params.taskId));
	if (task) {
		emitAutomationEvent({ event: 'comment.added', projectId: event.params.projectId, taskId: event.params.taskId, task: task as unknown as Record<string, unknown>, userId: user.id });
	}

	// Parse @mentions and notify mentioned users
	const mentionMatches = body.matchAll(/@(\w[\w\s]*?\w|\w+)/g);
	const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
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
