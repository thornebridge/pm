import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db/index.js';
import { finRecurringRules } from '$lib/server/db/schema.js';
import { desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const rules = await db
		.select()
		.from(finRecurringRules)
		.orderBy(desc(finRecurringRules.createdAt));

	return { rules };
};
