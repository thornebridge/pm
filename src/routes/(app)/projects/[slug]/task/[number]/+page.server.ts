import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	tasks,
	projects,
	activityLog,
	comments,
	commentReactions,
	users,
	taskLabelAssignments,
	taskLabels,
	taskStatuses,
	checklistItems,
	taskWatchers
} from '$lib/server/db/schema.js';
import { eq, and, asc, sql, inArray } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();
	const [project] = await db.select().from(projects).where(eq(projects.slug, params.slug));
	if (!project) throw error(404, 'Project not found');

	const [task] = await db
		.select()
		.from(tasks)
		.where(and(eq(tasks.projectId, project.id), eq(tasks.number, parseInt(params.number))));

	if (!task) throw error(404, 'Task not found');

	const labels = await db
		.select({ id: taskLabels.id, name: taskLabels.name, color: taskLabels.color })
		.from(taskLabelAssignments)
		.innerJoin(taskLabels, eq(taskLabelAssignments.labelId, taskLabels.id))
		.where(eq(taskLabelAssignments.taskId, task.id));

	const activity = await db
		.select({
			id: activityLog.id,
			action: activityLog.action,
			detail: activityLog.detail,
			createdAt: activityLog.createdAt,
			userName: users.name
		})
		.from(activityLog)
		.innerJoin(users, eq(activityLog.userId, users.id))
		.where(eq(activityLog.taskId, task.id))
		.orderBy(asc(activityLog.createdAt));

	const taskComments = await db
		.select({
			id: comments.id,
			body: comments.body,
			createdAt: comments.createdAt,
			userId: comments.userId,
			userName: users.name
		})
		.from(comments)
		.innerJoin(users, eq(comments.userId, users.id))
		.where(eq(comments.taskId, task.id))
		.orderBy(asc(comments.createdAt));

	// Load reactions for all comments
	const commentIds = taskComments.map((c) => c.id);
	const reactions = commentIds.length > 0
		? await db
			.select({
				commentId: commentReactions.commentId,
				userId: commentReactions.userId,
				userName: users.name,
				emoji: commentReactions.emoji
			})
			.from(commentReactions)
			.innerJoin(users, eq(commentReactions.userId, users.id))
			.where(inArray(commentReactions.commentId, commentIds))
		: [];

	// Group reactions by comment
	const reactionsByComment = new Map<string, typeof reactions>();
	for (const r of reactions) {
		const arr = reactionsByComment.get(r.commentId) || [];
		arr.push(r);
		reactionsByComment.set(r.commentId, arr);
	}

	const commentsWithReactions = taskComments.map((c) => ({
		...c,
		reactions: reactionsByComment.get(c.id) || []
	}));

	const statuses = await db
		.select()
		.from(taskStatuses)
		.where(eq(taskStatuses.projectId, project.id))
		.orderBy(asc(taskStatuses.position));

	const checklist = await db
		.select()
		.from(checklistItems)
		.where(eq(checklistItems.taskId, task.id))
		.orderBy(asc(checklistItems.position));

	const watcherRows = await db
		.select({ userId: taskWatchers.userId, userName: users.name })
		.from(taskWatchers)
		.innerJoin(users, eq(taskWatchers.userId, users.id))
		.where(eq(taskWatchers.taskId, task.id));

	const isWatching = user ? watcherRows.some((w) => w.userId === user.id) : false;

	// Subtasks
	const subtasks = await db
		.select({
			id: tasks.id,
			number: tasks.number,
			title: tasks.title,
			statusId: tasks.statusId,
			priority: tasks.priority,
			type: tasks.type,
			assigneeId: tasks.assigneeId
		})
		.from(tasks)
		.where(eq(tasks.parentId, task.id))
		.orderBy(asc(tasks.createdAt));

	// Parent info (if this is a subtask)
	let parentTask = null;
	if (task.parentId) {
		const [pt] = await db
			.select({ id: tasks.id, number: tasks.number, title: tasks.title })
			.from(tasks)
			.where(eq(tasks.id, task.parentId));
		parentTask = pt || null;
	}

	const members = await db
		.select({ id: users.id, name: users.name })
		.from(users);

	return {
		task,
		labels,
		activity,
		comments: commentsWithReactions,
		statuses,
		checklist,
		watchers: watcherRows,
		isWatching,
		subtasks,
		parentTask,
		members
	};
};
