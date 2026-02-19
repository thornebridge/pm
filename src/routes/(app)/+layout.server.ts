import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { folders, projects } from '$lib/server/db/schema.js';
import { desc } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const allFolders = db.select().from(folders).orderBy(folders.position).all();
	const allProjects = db
		.select({
			id: projects.id,
			name: projects.name,
			slug: projects.slug,
			color: projects.color,
			folderId: projects.folderId
		})
		.from(projects)
		.orderBy(desc(projects.updatedAt))
		.all();

	return {
		user: locals.user,
		folders: allFolders,
		sidebarProjects: allProjects
	};
};
