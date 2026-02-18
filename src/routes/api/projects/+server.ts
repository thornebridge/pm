import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { projects, taskStatuses } from '$lib/server/db/schema.js';
import { desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const all = db.select().from(projects).orderBy(desc(projects.updatedAt)).all();
	return json(all);
};

const DEFAULT_STATUSES = [
	{ name: 'Backlog', color: '#64748b', position: 0, isClosed: false },
	{ name: 'Todo', color: '#3b82f6', position: 1, isClosed: false },
	{ name: 'In Progress', color: '#f59e0b', position: 2, isClosed: false },
	{ name: 'Done', color: '#22c55e', position: 3, isClosed: true }
];

function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { name, description, color } = await event.request.json();

	if (!name?.trim()) {
		return json({ error: 'Name is required' }, { status: 400 });
	}

	const now = Date.now();
	const id = nanoid(12);
	const slug = slugify(name) || id;

	const project = {
		id,
		name: name.trim(),
		slug,
		description: description?.trim() || null,
		color: color || '#6366f1',
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	db.insert(projects).values(project).run();

	// Create default statuses
	for (const s of DEFAULT_STATUSES) {
		db.insert(taskStatuses)
			.values({
				id: nanoid(12),
				projectId: id,
				name: s.name,
				color: s.color,
				position: s.position,
				isClosed: s.isClosed,
				createdAt: now
			})
			.run();
	}

	return json(project, { status: 201 });
};
