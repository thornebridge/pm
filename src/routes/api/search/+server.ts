import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { tasks, projects, comments } from '$lib/server/db/schema.js';
import { like, desc, eq } from 'drizzle-orm';
import { getSearchClient } from '$lib/server/search/meilisearch.js';

export const GET: RequestHandler = async (event) => {
	requireAuth(event);
	const q = event.url.searchParams.get('q')?.trim();

	if (!q || q.length < 2) {
		return json({ tasks: [], projects: [], comments: [], contacts: [], companies: [], opportunities: [] });
	}

	// Try Meilisearch first
	const client = getSearchClient();
	if (client) {
		try {
			const results = await client.multiSearch({
				queries: [
					{ indexUid: 'tasks', q, limit: 10 },
					{ indexUid: 'projects', q, limit: 5 },
					{ indexUid: 'comments', q, limit: 5 },
					{ indexUid: 'contacts', q, limit: 5 },
					{ indexUid: 'companies', q, limit: 5 },
					{ indexUid: 'opportunities', q, limit: 5 }
				]
			});

			return json({
				tasks: results.results[0]?.hits || [],
				projects: results.results[1]?.hits || [],
				comments: results.results[2]?.hits || [],
				contacts: results.results[3]?.hits || [],
				companies: results.results[4]?.hits || [],
				opportunities: results.results[5]?.hits || []
			});
		} catch (err) {
			console.error('[search] Meilisearch query failed, falling back to SQL:', (err as Error).message);
		}
	}

	// SQL fallback
	const pattern = `%${q}%`;

	const matchedTasks = db
		.select({
			id: tasks.id,
			number: tasks.number,
			title: tasks.title,
			projectId: tasks.projectId,
			projectSlug: projects.slug,
			projectName: projects.name
		})
		.from(tasks)
		.innerJoin(projects, eq(tasks.projectId, projects.id))
		.where(like(tasks.title, pattern))
		.orderBy(desc(tasks.updatedAt))
		.limit(10)
		.all();

	const matchedProjects = db
		.select({
			id: projects.id,
			name: projects.name,
			slug: projects.slug
		})
		.from(projects)
		.where(like(projects.name, pattern))
		.limit(5)
		.all();

	const matchedComments = db
		.select({
			id: comments.id,
			body: comments.body,
			taskId: comments.taskId,
			taskNumber: tasks.number,
			taskTitle: tasks.title,
			projectSlug: projects.slug
		})
		.from(comments)
		.innerJoin(tasks, eq(comments.taskId, tasks.id))
		.innerJoin(projects, eq(tasks.projectId, projects.id))
		.where(like(comments.body, pattern))
		.orderBy(desc(comments.createdAt))
		.limit(5)
		.all();

	return json({
		tasks: matchedTasks,
		projects: matchedProjects,
		comments: matchedComments,
		contacts: [],
		companies: [],
		opportunities: []
	});
};
