import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import {
	tasks,
	projects,
	activityLog,
	comments,
	users,
	taskLabelAssignments,
	taskLabels,
	taskStatuses
} from '$lib/server/db/schema.js';
import { eq, and, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	const project = db.select().from(projects).where(eq(projects.slug, params.slug)).get();
	if (!project) throw error(404, 'Project not found');

	const task = db
		.select()
		.from(tasks)
		.where(and(eq(tasks.projectId, project.id), eq(tasks.number, parseInt(params.number))))
		.get();

	if (!task) throw error(404, 'Task not found');

	const labels = db
		.select({ id: taskLabels.id, name: taskLabels.name, color: taskLabels.color })
		.from(taskLabelAssignments)
		.innerJoin(taskLabels, eq(taskLabelAssignments.labelId, taskLabels.id))
		.where(eq(taskLabelAssignments.taskId, task.id))
		.all();

	const activity = db
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
		.orderBy(asc(activityLog.createdAt))
		.all();

	const taskComments = db
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
		.orderBy(asc(comments.createdAt))
		.all();

	const statuses = db
		.select()
		.from(taskStatuses)
		.where(eq(taskStatuses.projectId, project.id))
		.orderBy(asc(taskStatuses.position))
		.all();

	return { task, labels, activity, comments: taskComments, statuses };
};
