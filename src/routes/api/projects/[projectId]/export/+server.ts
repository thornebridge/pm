import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { tasks, taskStatuses, users, projects } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const { projectId } = event.params;

	const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
	if (!project) {
		return json({ error: 'Project not found' }, { status: 404 });
	}

	const allTasks = await db
		.select({
			number: tasks.number,
			title: tasks.title,
			description: tasks.description,
			priority: tasks.priority,
			statusName: taskStatuses.name,
			assigneeName: users.name,
			dueDate: tasks.dueDate,
			startDate: tasks.startDate,
			estimatePoints: tasks.estimatePoints,
			createdAt: tasks.createdAt,
			updatedAt: tasks.updatedAt
		})
		.from(tasks)
		.leftJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
		.leftJoin(users, eq(tasks.assigneeId, users.id))
		.where(eq(tasks.projectId, projectId))
		.orderBy(tasks.number);

	const headers = ['Number', 'Title', 'Description', 'Priority', 'Status', 'Assignee', 'Due Date', 'Start Date', 'Estimate Points', 'Created', 'Updated'];

	function escapeCSV(value: unknown): string {
		if (value === null || value === undefined) return '';
		const str = String(value);
		if (str.includes(',') || str.includes('"') || str.includes('\n')) {
			return `"${str.replace(/"/g, '""')}"`;
		}
		return str;
	}

	function formatDate(ts: number | null): string {
		if (!ts) return '';
		return new Date(ts).toISOString().split('T')[0];
	}

	const rows = allTasks.map((t) => [
		t.number,
		escapeCSV(t.title),
		escapeCSV(t.description),
		t.priority,
		t.statusName || '',
		t.assigneeName || '',
		formatDate(t.dueDate),
		formatDate(t.startDate),
		t.estimatePoints || '',
		formatDate(t.createdAt),
		formatDate(t.updatedAt)
	].join(','));

	const csv = [headers.join(','), ...rows].join('\n');

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename="${project.slug}-tasks.csv"`
		}
	});
};
