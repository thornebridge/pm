import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { taskDependencies, tasks } from '$lib/server/db/schema.js';
import { eq, and, or, inArray } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);

	const taskId = event.params.taskId;

	// Get all dependencies where this task is involved (both directions)
	const dependencies = db
		.select({
			taskId: taskDependencies.taskId,
			dependsOnTaskId: taskDependencies.dependsOnTaskId,
			type: taskDependencies.type
		})
		.from(taskDependencies)
		.where(
			or(
				eq(taskDependencies.taskId, taskId),
				eq(taskDependencies.dependsOnTaskId, taskId)
			)
		)
		.all();

	// Collect related task IDs to fetch their details
	const relatedIds = new Set<string>();
	for (const dep of dependencies) {
		if (dep.taskId !== taskId) relatedIds.add(dep.taskId);
		if (dep.dependsOnTaskId !== taskId) relatedIds.add(dep.dependsOnTaskId);
	}

	const relatedTasks = relatedIds.size > 0
		? db
				.select({
					id: tasks.id,
					number: tasks.number,
					title: tasks.title,
					statusId: tasks.statusId
				})
				.from(tasks)
				.where(inArray(tasks.id, [...relatedIds]))
				.all()
		: [];

	const taskMap = new Map(relatedTasks.map((t) => [t.id, t]));

	const result = dependencies.map((dep) => {
		const otherId = dep.taskId === taskId ? dep.dependsOnTaskId : dep.taskId;
		const otherTask = taskMap.get(otherId);
		return {
			...dep,
			relatedTask: otherTask ?? null
		};
	});

	return json(result);
};

export const POST: RequestHandler = async (event) => {
	requireAuth(event);

	const taskId = event.params.taskId;
	const body = await event.request.json();
	const { dependsOnTaskId, type } = body;

	if (!dependsOnTaskId) {
		return json({ error: 'dependsOnTaskId is required' }, { status: 400 });
	}

	if (dependsOnTaskId === taskId) {
		return json({ error: 'A task cannot depend on itself' }, { status: 400 });
	}

	const validTypes = ['blocks', 'blocked_by'];
	if (type && !validTypes.includes(type)) {
		return json({ error: `type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
	}

	// Verify both tasks exist
	const task = db.select().from(tasks).where(eq(tasks.id, taskId)).get();
	const dependsOnTask = db.select().from(tasks).where(eq(tasks.id, dependsOnTaskId)).get();

	if (!task) {
		return json({ error: 'Task not found' }, { status: 404 });
	}
	if (!dependsOnTask) {
		return json({ error: 'Dependency task not found' }, { status: 404 });
	}

	// Check if dependency already exists
	const existing = db
		.select()
		.from(taskDependencies)
		.where(
			and(
				eq(taskDependencies.taskId, taskId),
				eq(taskDependencies.dependsOnTaskId, dependsOnTaskId)
			)
		)
		.get();

	if (existing) {
		return json({ error: 'Dependency already exists' }, { status: 409 });
	}

	db.insert(taskDependencies)
		.values({
			taskId,
			dependsOnTaskId,
			type: type || 'blocks'
		})
		.run();

	return json({ taskId, dependsOnTaskId, type: type || 'blocks' }, { status: 201 });
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);

	const taskId = event.params.taskId;
	const body = await event.request.json();
	const { dependsOnTaskId } = body;

	if (!dependsOnTaskId) {
		return json({ error: 'dependsOnTaskId is required' }, { status: 400 });
	}

	const existing = db
		.select()
		.from(taskDependencies)
		.where(
			and(
				eq(taskDependencies.taskId, taskId),
				eq(taskDependencies.dependsOnTaskId, dependsOnTaskId)
			)
		)
		.get();

	if (!existing) {
		return json({ error: 'Dependency not found' }, { status: 404 });
	}

	db.delete(taskDependencies)
		.where(
			and(
				eq(taskDependencies.taskId, taskId),
				eq(taskDependencies.dependsOnTaskId, dependsOnTaskId)
			)
		)
		.run();

	return json({ ok: true });
};
