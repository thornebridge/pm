import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { tasks, taskStatuses, activityLog, users } from '$lib/server/db/schema.js';
import { eq, asc, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

interface ImportRow {
	title: string;
	description?: string;
	priority?: string;
	status?: string;
	assignee?: string;
	dueDate?: string;
}

function parseCSV(text: string): ImportRow[] {
	const lines = text.split('\n').filter((l) => l.trim());
	if (lines.length < 2) return [];

	// Parse header
	const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
	const rows: ImportRow[] = [];

	for (let i = 1; i < lines.length; i++) {
		const values = parseLine(lines[i]);
		const row: Record<string, string> = {};
		for (let j = 0; j < headers.length; j++) {
			row[headers[j]] = values[j]?.trim() ?? '';
		}

		if (!row.title) continue;

		rows.push({
			title: row.title,
			description: row.description || undefined,
			priority: row.priority || undefined,
			status: row.status || undefined,
			assignee: row.assignee || row.assignee_email || undefined,
			dueDate: row.due_date || row.duedate || row.due || undefined
		});
	}

	return rows;
}

function parseLine(line: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (ch === ',' && !inQuotes) {
			result.push(current);
			current = '';
		} else {
			current += ch;
		}
	}
	result.push(current);
	return result;
}

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const projectId = event.params.projectId;

	const formData = await event.request.formData();
	const file = formData.get('file') as File;
	if (!file) {
		return json({ error: 'No file uploaded' }, { status: 400 });
	}

	const text = await file.text();
	const rows = parseCSV(text);

	if (rows.length === 0) {
		return json({ error: 'No valid rows found in CSV' }, { status: 400 });
	}

	// Load project statuses
	const statuses = db
		.select()
		.from(taskStatuses)
		.where(eq(taskStatuses.projectId, projectId))
		.orderBy(asc(taskStatuses.position))
		.all();

	const statusNameMap = new Map(statuses.map((s) => [s.name.toLowerCase(), s.id]));
	const defaultStatusId = statuses[0]?.id;
	if (!defaultStatusId) {
		return json({ error: 'No statuses configured' }, { status: 400 });
	}

	// Load users for assignee matching
	const allUsers = db.select({ id: users.id, name: users.name, email: users.email }).from(users).all();
	const userNameMap = new Map(allUsers.map((u) => [u.name.toLowerCase(), u.id]));
	const userEmailMap = new Map(allUsers.map((u) => [u.email.toLowerCase(), u.id]));

	// Get current max number
	const maxNum = db
		.select({ max: sql<number>`coalesce(max(${tasks.number}), 0)` })
		.from(tasks)
		.where(eq(tasks.projectId, projectId))
		.get();

	let nextNumber = (maxNum?.max || 0) + 1;

	const validPriorities = new Set(['urgent', 'high', 'medium', 'low']);
	const now = Date.now();
	let imported = 0;

	for (const row of rows) {
		const statusId = row.status
			? statusNameMap.get(row.status.toLowerCase()) ?? defaultStatusId
			: defaultStatusId;

		const priority = row.priority && validPriorities.has(row.priority.toLowerCase())
			? row.priority.toLowerCase()
			: 'medium';

		let assigneeId: string | null = null;
		if (row.assignee) {
			assigneeId = userNameMap.get(row.assignee.toLowerCase())
				?? userEmailMap.get(row.assignee.toLowerCase())
				?? null;
		}

		let dueDate: number | null = null;
		if (row.dueDate) {
			const parsed = new Date(row.dueDate);
			if (!isNaN(parsed.getTime())) dueDate = parsed.getTime();
		}

		const id = nanoid(12);
		db.insert(tasks)
			.values({
				id,
				projectId,
				number: nextNumber++,
				title: row.title,
				description: row.description || null,
				statusId,
				priority: priority as 'urgent' | 'high' | 'medium' | 'low',
				assigneeId,
				createdBy: user.id,
				dueDate,
				position: imported + 1,
				createdAt: now,
				updatedAt: now
			})
			.run();

		db.insert(activityLog)
			.values({
				id: nanoid(12),
				taskId: id,
				userId: user.id,
				action: 'created',
				detail: JSON.stringify({ source: 'csv_import' }),
				createdAt: now
			})
			.run();

		imported++;
	}

	return json({ imported, total: rows.length });
};
