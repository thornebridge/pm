import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { projects } from '$lib/server/db/schema.js';
import { desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const allProjects = await db
		.select({ id: projects.id, name: projects.name, slug: projects.slug })
		.from(projects)
		.orderBy(desc(projects.updatedAt));

	return { existingProjects: allProjects };
};
