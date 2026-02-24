import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { projects, taskStatuses, taskLabels, taskTemplates } from '$lib/server/db/schema.js';
import { desc, eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { broadcastProjectChanged } from '$lib/server/ws/handlers.js';
import { indexDocument } from '$lib/server/search/meilisearch.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const all = await db.select().from(projects).orderBy(desc(projects.updatedAt));
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
	const { name, description, color, templateProjectId } = await event.request.json();

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
		color: color || '#2d4f3e',
		createdBy: user.id,
		createdAt: now,
		updatedAt: now
	};

	await db.insert(projects).values(project);

	if (templateProjectId) {
		// Clone statuses from template project
		const templateStatuses = await db
			.select()
			.from(taskStatuses)
			.where(eq(taskStatuses.projectId, templateProjectId))
			.orderBy(asc(taskStatuses.position));

		for (const s of templateStatuses) {
			await db.insert(taskStatuses)
				.values({
					id: nanoid(12),
					projectId: id,
					name: s.name,
					color: s.color,
					position: s.position,
					isClosed: s.isClosed,
					createdAt: now
				});
		}

		// Clone labels from template project
		const templateLabels = await db
			.select()
			.from(taskLabels)
			.where(eq(taskLabels.projectId, templateProjectId));

		for (const l of templateLabels) {
			await db.insert(taskLabels)
				.values({
					id: nanoid(12),
					projectId: id,
					name: l.name,
					color: l.color,
					createdAt: now
				});
		}

		// Clone task templates
		const templates = await db
			.select()
			.from(taskTemplates)
			.where(eq(taskTemplates.projectId, templateProjectId));

		for (const t of templates) {
			await db.insert(taskTemplates)
				.values({
					id: nanoid(12),
					projectId: id,
					name: t.name,
					title: t.title,
					description: t.description,
					priority: t.priority,
					createdAt: now
				});
		}

		// If no statuses were copied (template had none), add defaults
		if (templateStatuses.length === 0) {
			for (const s of DEFAULT_STATUSES) {
				await db.insert(taskStatuses)
					.values({ id: nanoid(12), projectId: id, ...s, createdAt: now });
			}
		}
	} else {
		// Create default statuses
		for (const s of DEFAULT_STATUSES) {
			await db.insert(taskStatuses)
				.values({ id: nanoid(12), projectId: id, ...s, createdAt: now });
		}
	}

	indexDocument('projects', { id: project.id, name: project.name, slug: project.slug, description: project.description, archived: false, updatedAt: project.updatedAt });
	broadcastProjectChanged('created');
	return json(project, { status: 201 });
};
