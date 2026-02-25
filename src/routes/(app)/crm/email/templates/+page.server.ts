import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { emailTemplates } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user) redirect(302, '/login');

	const templates = await db.select()
		.from(emailTemplates)
		.where(eq(emailTemplates.userId, event.locals.user.id))
		.orderBy(desc(emailTemplates.updatedAt));

	return { templates };
};
